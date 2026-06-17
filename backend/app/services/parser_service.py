import os
import re
import pdfplumber
import PyPDF2

# Predefined list of popular technical skills for local matching/parsing
COMMON_SKILLS = [
    "python", "javascript", "react", "reactjs", "flask", "django", "node.js", "node", "express",
    "sql", "mysql", "mongodb", "postgresql", "html", "css", "tailwind", "aws", "docker",
    "kubernetes", "git", "java", "c++", "c#", "php", "ruby", "typescript", "angular", "vue",
    "machine learning", "deep learning", "nlp", "data science", "tableau", "power bi",
    "excel", "c", "swift", "kotlin", "go", "rust", "scala", "pandas", "numpy", "scikit-learn",
    "pytorch", "tensorflow", "keras", "devops", "ci/cd", "agile", "scrum", "project management"
]

def extract_text_from_pdf(file_path):
    """
    Extracts text from PDF using pdfplumber, falling back to PyPDF2.
    """
    text = ""
    if not os.path.exists(file_path):
        return text

    # Try pdfplumber
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"pdfplumber failed to open: {e}")

    # Fallback to PyPDF2 if pdfplumber returned empty text
    if not text.strip():
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e2:
            print(f"PyPDF2 failed: {e2}")

    return text.strip()


def parse_skills(text):
    """
    Scans the resume text for common skills and returns a list of matched skills.
    """
    if not text:
        return []
    
    text_lower = text.lower()
    matched_skills = []
    
    for skill in COMMON_SKILLS:
        # Use word boundaries to avoid partial matches (e.g., 'c' matching in 'cat')
        # For skills with special characters, compile regex safely
        escaped_skill = re.escape(skill)
        pattern = r'\b' + escaped_skill + r'\b'
        # Handle cases like node.js, c++
        if '++' in skill or '#' in skill or '.' in skill:
            pattern = escaped_skill
            
        if re.search(pattern, text_lower):
            # Normalize display name
            display_name = skill.title()
            if skill in ["reactjs", "react"]:
                display_name = "React"
            elif skill == "node" or skill == "node.js":
                display_name = "Node.js"
            elif skill == "aws":
                display_name = "AWS"
            elif skill == "ci/cd":
                display_name = "CI/CD"
            elif skill == "nlp":
                display_name = "NLP"
            elif skill == "html":
                display_name = "HTML"
            elif skill == "css":
                display_name = "CSS"
            elif skill == "sql":
                display_name = "SQL"
                
            if display_name not in matched_skills:
                matched_skills.append(display_name)
                
    return matched_skills

def parse_experience_years(text):
    """
    Estimates years of experience using regex patterns looking for numbers near experience phrases.
    """
    if not text:
        return 0.0
        
    text_lower = text.lower()
    
    # 1. Search for explicit patterns like "5 years of experience", "3+ yrs exp"
    patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)\b',
        r'(?:experience|exp)[:\s\-]+(\d+(?:\.\d+)?)\s*(?:years?|yrs?)',
        r'(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\b'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        if matches:
            # Take the highest value found as a heuristic, capping at 30 years
            try:
                years = max([float(m) for m in matches])
                if years <= 30.0:
                    return years
            except ValueError:
                continue
                
    return 0.0

def parse_projects(text):
    """
    Extracts sections that look like projects from the resume.
    Returns a list of paragraph sections or structured text.
    """
    if not text:
        return []
        
    # Heuristically split text into sections
    lines = text.split('\n')
    project_lines = []
    in_project_section = False
    
    # Section headers triggering project parsing
    project_headers = ['project', 'projects', 'academic projects', 'key projects', 'personal projects']
    # Section headers indicating end of project section
    end_headers = ['education', 'skills', 'experience', 'employment', 'certifications', 'hobbies', 'languages', 'summary']
    
    for line in lines:
        cleaned_line = line.strip().lower()
        if not cleaned_line:
            continue
            
        # Check if line is a project header
        if any(cleaned_line == header or cleaned_line.startswith(header + ':') or cleaned_line.startswith(header + ' ') for header in project_headers):
            in_project_section = True
            continue
            
        # Check if line is another header, which ends the project section
        if in_project_section and any(cleaned_line == header or cleaned_line.startswith(header + ':') or cleaned_line.startswith(header + ' ') for header in end_headers):
            in_project_section = False
            break
            
        if in_project_section:
            project_lines.append(line.strip())
            
    # Group lines into simple sections
    if project_lines:
        # Join lines but split by list bullets or empty parts
        full_proj_text = " ".join(project_lines)
        # Split by bullet markers (e.g. •, -, *, or numbering)
        split_projects = re.split(r'[\u2022\-\*\u25aa]\s*', full_proj_text)
        cleaned_projs = [p.strip() for p in split_projects if len(p.strip()) > 15]
        if cleaned_projs:
            return cleaned_projs
        return [full_proj_text]
        
    return []

def get_gemini_api_key_local():
    try:
        from app.models.setting import SystemSetting
        setting = SystemSetting.query.filter_by(key='GEMINI_API_KEY').first()
        if setting and setting.value:
            return setting.value.strip()
    except Exception as e:
        print(f"Error fetching GEMINI_API_KEY from database in parser: {e}")
    return os.environ.get('GEMINI_API_KEY')

def extract_text_from_image_via_gemini(file_path):
    api_key = get_gemini_api_key_local()
    if not api_key:
        raise Exception("Gemini API key is not configured. Please set it in Recruiter Settings to enable image OCR parsing.")

    import base64
    import requests

    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

    ext = file_path.rsplit('.', 1)[1].lower() if '.' in file_path else 'png'
    mime_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = "Please transcribe all the text from this resume image. Do not summarize or explain; write down exactly what is written, keeping structure where possible."
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": encoded_string
                        }
                    }
                ]
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, timeout=25)
        response.raise_for_status()
        res_data = response.json()
        text = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
        return text
    except Exception as e:
        print(f"Gemini OCR extraction failed: {e}")
        raise Exception(f"Failed to perform OCR on resume image: {str(e)}")

def extract_text_from_docx(file_path):
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text_elems = root.findall('.//w:t', namespaces)
            return "".join([el.text for el in text_elems if el.text])
    except Exception as e:
        print(f"Failed to extract text from docx: {e}")
        return ""

def extract_text_from_doc(file_path):
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            text = ""
            for byte in content:
                if 32 <= byte <= 126 or byte in [9, 10, 13]:
                    text += chr(byte)
                else:
                    text += ' '
            return " ".join(text.split())
    except Exception as e:
        print(f"Failed to extract text from doc: {e}")
        return ""

def calculate_resume_confidence(text):
    if not text or len(text.strip()) < 100:
        return 0
        
    score = 0
    text_lower = text.lower()
    
    # 1. Check for standard headings (2 points each, max 12 points)
    headings = {
        'skills': ['skills', 'skill set', 'technologies', 'core competencies', 'expertise'],
        'education': ['education', 'academic background', 'qualification', 'academic profile', 'university', 'degree'],
        'experience': ['experience', 'work history', 'professional experience', 'employment history', 'career history', 'positions held'],
        'projects': ['projects', 'academic projects', 'personal projects', 'key projects'],
        'certifications': ['certifications', 'licenses', 'courses', 'credentials'],
        'summary': ['summary', 'professional summary', 'objective', 'about me', 'profile']
    }
    
    for section, keywords in headings.items():
        found = False
        for kw in keywords:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, text_lower):
                found = True
                break
        if found:
            score += 2

    # 2. Check for contact details
    # Email pattern (3 points)
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    if re.search(email_pattern, text):
        score += 3
        
    # Phone pattern (2 points)
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b'
    if re.search(phone_pattern, text):
        score += 2
        
    # 3. Check for year indicators (2 points)
    year_pattern = r'\b(19\d{2}|20\d{2})\b\s*(?:-|to|–)\s*(?:\b(19\d{2}|20\d{2})\b|present|current)'
    if re.search(year_pattern, text_lower):
        score += 2
        
    # 4. Check for typical resume verbs/nouns (1 point each, max 5 points)
    resume_keywords = ['resume', 'cv', 'curriculum vitae', 'gpa', 'university', 'college', 'bachelor', 'master', 'intern', 'internship', 'developed', 'managed', 'implemented', 'designed']
    keyword_matches = 0
    for kw in resume_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            keyword_matches += 1
            
    score += min(keyword_matches, 5)
    
    # Max score is 24. Normalize to 0-100 percentage.
    normalized_score = int((score / 24.0) * 100)
    return normalized_score

def parse_resume(file_path):
    """
    Parse a resume file (PDF, DOC, DOCX, or Image) and return structured information.
    """
    ext = file_path.rsplit('.', 1)[1].lower() if '.' in file_path else ''
    
    if ext == 'pdf':
        text = extract_text_from_pdf(file_path)
    elif ext == 'docx':
        text = extract_text_from_docx(file_path)
    elif ext == 'doc':
        text = extract_text_from_doc(file_path)
    elif ext in ['png', 'jpg', 'jpeg', 'webp']:
        text = extract_text_from_image_via_gemini(file_path)
    else:
        text = ""

    skills = parse_skills(text)
    experience_years = parse_experience_years(text)
    projects = parse_projects(text)

    return {
        'extracted_text': text,
        'skills': skills,
        'experience_years': experience_years,
        'projects': projects
    }
