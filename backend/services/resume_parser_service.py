import os
import re
import json
import base64
import requests
from pathlib import Path
from pypdf import PdfReader
import docx

COMMON_SKILLS = [
    "python", "javascript", "react", "reactjs", "flask", "django", "node.js", "node", "express",
    "sql", "mysql", "mongodb", "postgresql", "html", "css", "tailwind", "aws", "docker",
    "kubernetes", "git", "java", "c++", "c#", "php", "ruby", "typescript", "angular", "vue",
    "machine learning", "deep learning", "nlp", "data science", "tableau", "power bi",
    "excel", "c", "swift", "kotlin", "go", "rust", "scala", "pandas", "numpy", "scikit-learn",
    "pytorch", "tensorflow", "keras", "devops", "ci/cd", "agile", "scrum", "project management"
]


def extract_text_from_pdf(file_path: str) -> str:
    text_parts = []
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    except Exception as ex:
        print(f"pypdf extraction failed: {ex}")
    return "\n".join(text_parts).strip()


def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        texts = [p.text for p in doc.paragraphs if p.text]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text:
                        texts.append(cell.text)
        return " ".join(texts).strip()
    except Exception as ex:
        print(f"DOCX extraction failed: {ex}")
        return ""


def extract_text_from_doc(file_path: str) -> str:
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        chars = []
        for b in content:
            if (32 <= b <= 126) or b in (9, 10, 13):
                chars.append(chr(b))
            else:
                chars.append(' ')
        raw = "".join(chars)
        return re.sub(r'\s+', ' ', raw).strip()
    except Exception as ex:
        print(f"DOC extraction failed: {ex}")
        return ""


def extract_text_from_image_via_gemini(file_path: str) -> str:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("Gemini API key is not configured. Please set GEMINI_API_KEY to enable image OCR parsing.")

    with open(file_path, 'rb') as f:
        data_bytes = f.read()
    b64_data = base64.b64encode(data_bytes).decode('utf-8')

    ext = Path(file_path).suffix.lower().lstrip('.')
    mime_type = "image/jpeg" if ext == "jpg" else f"image/{ext}"

    model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Please transcribe all the text from this resume image. Do not summarize or explain; write down exactly what is written, keeping structure where possible."},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": b64_data
                        }
                    }
                ]
            }
        ]
    }

    res = requests.post(url, json=payload, timeout=30)
    res.raise_for_status()
    data = res.json()

    candidates = data.get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        if parts:
            return parts[0].get("text", "").strip()
    return ""


def extract_text(file_path: str) -> str:
    if not file_path:
        return ""

    from services.storage_service import open_or_download_temp

    try:
        with open_or_download_temp(file_path) as local_path:
            if not os.path.exists(local_path):
                return ""

            ext = Path(local_path).suffix.lower().lstrip('.')
            if ext == "pdf":
                return extract_text_from_pdf(local_path)
            elif ext == "docx":
                return extract_text_from_docx(local_path)
            elif ext == "doc":
                return extract_text_from_doc(local_path)
            elif ext in ("png", "jpg", "jpeg", "webp"):
                return extract_text_from_image_via_gemini(local_path)
    except Exception as ex:
        print(f"Error during extract_text for {file_path}: {ex}")
        return ""

    return ""


def parse_skills(text: str) -> list[str]:
    if not text:
        return []

    text_lower = text.lower()
    matched_skills = []

    for skill in COMMON_SKILLS:
        escaped = re.escape(skill)
        pattern = rf'\b{escaped}\b'
        if "++" in skill or "#" in skill or "." in skill:
            pattern = escaped

        if re.search(pattern, text_lower):
            display_name = skill
            if skill in ("reactjs", "react"):
                display_name = "React"
            elif skill in ("node", "node.js"):
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
            elif skill == "c#":
                display_name = "C#"
            elif skill == "c++":
                display_name = "C++"
            else:
                display_name = skill.capitalize()

            if not any(display_name.lower() == s.lower() for s in matched_skills):
                matched_skills.append(display_name)

    return matched_skills


def parse_experience_years(text: str) -> float:
    if not text:
        return 0.0

    text_lower = text.lower()
    patterns = [
        r'(?P<years>\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)\b',
        r'(?:experience|exp)[:\s\-]+(?P<years>\d+(?:\.\d+)?)\s*(?:years?|yrs?)',
        r'(?P<years>\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\b'
    ]

    max_years = 0.0
    for p in patterns:
        for m in re.finditer(p, text_lower):
            try:
                y = float(m.group("years"))
                if 0.0 < y <= 30.0 and y > max_years:
                    max_years = y
            except (ValueError, TypeError):
                pass

    return max_years


def parse_projects(text: str) -> list[str]:
    if not text:
        return []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    project_lines = []
    in_section = False

    project_headers = ["project", "projects", "academic projects", "key projects", "personal projects"]
    end_headers = ["education", "skills", "experience", "employment", "certifications", "hobbies", "languages", "summary"]

    for raw_line in lines:
        line = raw_line.lower()
        if any(line == h or line.startswith(h + ":") or line.startswith(h + " ") for h in project_headers):
            in_section = True
            continue

        if in_section and any(line == h or line.startswith(h + ":") or line.startswith(h + " ") for h in end_headers):
            break

        if in_section:
            project_lines.append(raw_line)

    if project_lines:
        full_text = " ".join(project_lines)
        split = re.split(r'[\u2022\-\*\u25aa]\s*', full_text)
        cleaned = [s.strip() for s in split if len(s.strip()) > 15]
        if cleaned:
            return cleaned
        return [full_text]

    return []


def calculate_resume_confidence(text: str) -> int:
    if not text or len(text.strip()) < 100:
        return 0

    score = 0
    text_lower = text.lower()

    headings = {
        "skills": ["skills", "skill set", "technologies", "core competencies", "expertise"],
        "education": ["education", "academic background", "qualification", "academic profile", "university", "degree"],
        "experience": ["experience", "work history", "professional experience", "employment history", "career history", "positions held"],
        "projects": ["projects", "academic projects", "personal projects", "key projects"],
        "certifications": ["certifications", "licenses", "courses", "credentials"],
        "summary": ["summary", "professional summary", "objective", "about me", "profile"]
    }

    for k, v in headings.items():
        if any(re.search(rf'\b{re.escape(kw)}\b', text_lower) for kw in v):
            score += 2

    if re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text):
        score += 3

    if re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b', text):
        score += 2

    if re.search(r'\b(19\d{2}|20\d{2})\b\s*(?:-|to|–)\s*(?:\b(19\d{2}|20\d{2})\b|present|current)', text_lower):
        score += 2

    resume_keywords = ["resume", "cv", "curriculum vitae", "gpa", "university", "college", "bachelor", "master", "intern", "internship", "developed", "managed", "implemented", "designed"]
    keyword_matches = sum(1 for kw in resume_keywords if re.search(rf'\b{re.escape(kw)}\b', text_lower))
    score += min(keyword_matches, 5)

    return int((score / 24.0) * 100)


def parse_resume(file_path: str) -> dict:
    text = extract_text(file_path)

    skills = parse_skills(text)
    exp_years = parse_experience_years(text)
    projects = parse_projects(text)

    return {
        "extracted_text": text,
        "skills": skills,
        "experience_years": exp_years,
        "projects": projects
    }


def guess_name_from_text_and_filename(text: str, filename: str) -> str:
    if text:
        lines = [line.strip() for line in text.splitlines() if line.strip()][:5]
        for line in lines:
            cleaned = re.sub(r'[^a-zA-Z\s]', '', line).strip()
            words = cleaned.split()
            if 2 <= len(words) <= 4:
                stop_words = {"resume", "cv", "curriculum", "vitae", "page", "email", "phone", "contact", "address", "profile"}
                if not any(w.lower() in stop_words for w in words):
                    return cleaned

    base_name = Path(filename).stem
    name = re.sub(r'[_+\-\s]+', ' ', base_name).strip()
    name = re.sub(r'(?i)\b(resume|cv|pdf|docx|doc|profile|extracted|application)\b', '', name).strip()
    if not name:
        name = "External Candidate"

    return name.title()


def parse_external_resume_details(file_path: str) -> dict:
    parsed = parse_resume(file_path)
    text = parsed.get("extracted_text", "")

    email = None
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    if email_match:
        email = email_match.group(0)

    phone = None
    phone_match = re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b', text)
    if phone_match:
        phone = phone_match.group(0)

    name = None
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key and text.strip():
        try:
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            prompt = f"""
Extract the candidate's full name, email, and phone number from the following resume text.

Resume Text:
\"\"\"
{text}
\"\"\"

Provide the output in JSON format with exactly these keys:
- "name": candidate's full name (string, null if not found)
- "email": candidate's email (string, null if not found)
- "phone": candidate's phone number (string, null if not found)

Do not include markdown tags like ```json. Return ONLY raw JSON text.
"""
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            res = requests.post(url, json=payload, timeout=20)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw = parts[0].get("text", "").strip()
                        if raw.startswith("```json"):
                            raw = raw[7:]
                        if raw.startswith("```"):
                            raw = raw[3:]
                        if raw.endswith("```"):
                            raw = raw[:-3]
                        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                        if json_match:
                            raw = json_match.group(0)
                        details_json = json.loads(raw)
                        if details_json.get("name"):
                            name = details_json["name"]
                        if details_json.get("email"):
                            email = details_json["email"]
                        if details_json.get("phone"):
                            phone = details_json["phone"]
        except Exception as ex:
            print(f"Gemini candidate details extraction failed: {ex}")

    if not name:
        name = guess_name_from_text_and_filename(text, Path(file_path).name)

    parsed["name"] = name
    parsed["email"] = email
    parsed["phone"] = phone
    return parsed
