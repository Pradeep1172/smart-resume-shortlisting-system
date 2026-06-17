import os
import requests
import json


def auto_compute_weights(experience_required):
    """
    Automatically determines ATS scoring weights based on the job's
    experience requirement. This ensures fair evaluation:

    - Fresher roles (0 years):  Experience gets 0% weight
    - Mid-level (1-4 years):    Balanced distribution
    - Senior roles (5+ years):  Experience dominates

    Returns a dict with keys: skills, experience, projects, resume_quality
    All values sum to 100.
    """
    try:
        exp = float(experience_required or 0)
    except (ValueError, TypeError):
        exp = 0.0

    if exp == 0:
        # Fresher / Campus / Internship hiring
        return {
            'skills': 50,
            'experience': 0,
            'projects': 35,
            'resume_quality': 15
        }
    elif exp <= 2:
        # Junior-level hiring
        return {
            'skills': 45,
            'experience': 15,
            'projects': 25,
            'resume_quality': 15
        }
    elif exp <= 4:
        # Mid-level hiring
        return {
            'skills': 35,
            'experience': 40,
            'projects': 15,
            'resume_quality': 10
        }
    else:
        # Senior / Lead hiring (5+ years)
        return {
            'skills': 30,
            'experience': 50,
            'projects': 10,
            'resume_quality': 10
        }


def get_gemini_api_key():
    try:
        from app.models.setting import SystemSetting
        setting = SystemSetting.query.filter_by(key='GEMINI_API_KEY').first()
        if setting and setting.value:
            return setting.value.strip()
    except Exception as e:
        print(f"Error fetching GEMINI_API_KEY from database: {e}")
    return os.environ.get('GEMINI_API_KEY')

def sanitize_string_list(lst):
    """
    Ensures a list of strings is always returned as a list of non-empty strings.
    """
    if not lst:
        return []
    if isinstance(lst, list):
        return [str(item).strip() for item in lst if item and str(item).strip()]
    if isinstance(lst, str):
        try:
            parsed = json.loads(lst)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if item and str(item).strip()]
        except Exception:
            pass
        if ',' in lst:
            return [s.strip() for s in lst.split(',') if s.strip()]
        return [lst.strip()] if lst.strip() else []
    return []

def calculate_ai_match(resume_text, job_title, job_description, skills_required):
    """
    Sends the resume text and job description to the Gemini API.
    Returns the AI evaluation results (score, analysis description).
    """
    api_key = get_gemini_api_key()
    if not api_key:
        print("GEMINI_API_KEY is not configured in database or environment. Falling back to keyword/weighted mock score.")
        return {'error': True, 'message': 'GEMINI_API_KEY not configured.'}
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
You are an expert technical recruiter. Analyze the following candidate resume text against the target job description.

Target Job Title: {job_title}
Target Job Description: {job_description}
Required Skills: {", ".join(skills_required)}

Candidate Resume Text:
\"\"\"
{resume_text}
\"\"\"

Provide your evaluation in JSON format. The JSON response must have exactly these keys:
- "ai_score": an integer between 0 and 100 indicating the candidate's alignment with the role.
- "contextual_resume_analysis": a detailed paragraph (around 100-150 words) summarizing the candidate's suitability and alignment with the role.
- "project_relevance_analysis": a detailed paragraph (around 100-150 words) analyzing how the candidate's projects align with the role requirements and technology stack.
- "ai_recommendation": a short recommendation string (one of "Highly Recommended", "Recommended", "Consider", "Not Recommended").
- "strengths": a list of 2-3 short strings highlighting the candidate's main qualifications (e.g., beginning with a checkmark "✓ ").
- "weaknesses": a list of 1-2 short strings highlighting missing qualifications or gaps (e.g., beginning with a cross "✗ ").
- "missing_skills": a list of technical skills from the required list that are missing or weak in the resume.
- "improvement_suggestions": a list of 2-3 short strings suggesting how the candidate can bridge these gaps (e.g., beginning with "✓ ").

Do not include any markdown format tags like ```json or ``` around the response. Return ONLY raw JSON text.
"""
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        res_data = response.json()
        
        # Extract text response from Gemini
        text_response = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
        
        # Clean any accidental markdown code fences
        if text_response.startswith("```json"):
            text_response = text_response.split("```json", 1)[1]
        if text_response.startswith("```"):
            text_response = text_response.split("```", 1)[1]
        if text_response.endswith("```"):
            text_response = text_response.rsplit("```", 1)[0]
            
        import re
        match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if match:
            json_str = match.group(0)
        else:
            json_str = text_response
            
        eval_result = json.loads(json_str.strip())
        
        return {
            'ai_score': float(eval_result.get('ai_score', 0)),
            'ai_analysis': eval_result.get('contextual_resume_analysis', eval_result.get('ai_analysis', 'No details provided.')),
            'contextual_resume_analysis': eval_result.get('contextual_resume_analysis', 'No details provided.'),
            'project_relevance_analysis': eval_result.get('project_relevance_analysis', 'No details provided.'),
            'ai_recommendation': eval_result.get('ai_recommendation', 'Consider'),
            'strengths': sanitize_string_list(eval_result.get('strengths', [])),
            'weaknesses': sanitize_string_list(eval_result.get('weaknesses', [])),
            'missing_skills': sanitize_string_list(eval_result.get('missing_skills', [])),
            'improvement_suggestions': sanitize_string_list(eval_result.get('improvement_suggestions', []))
        }
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        return {'error': True, 'message': str(e)}


def calculate_keyword_match(resume_skills, job_skills):
    """
    Compares resume skills with job skills.
    Returns match percentage and list of matched and missing skills.
    """
    r_skills = sanitize_string_list(resume_skills)
    j_skills = sanitize_string_list(job_skills)

    if not j_skills:
        return 100.0, [], []
        
    if not r_skills:
        return 0.0, [], [skill.title() for skill in j_skills]

    # Convert to lowercase set for comparison
    resume_skills_set = {str(s).lower().strip() for s in r_skills if s}
    job_skills_set = {str(s).lower().strip() for s in j_skills if s}
    
    matched_skills_set = resume_skills_set.intersection(job_skills_set)
    missing_skills_set = job_skills_set.difference(resume_skills_set)
    
    # Calculate percentage
    match_percentage = (len(matched_skills_set) / len(job_skills_set)) * 100.0
    
    # Map back to display names from job_skills if possible
    job_skills_map = {str(s).lower().strip(): str(s) for s in j_skills if s}
    
    matched_skills = [job_skills_map[s] for s in matched_skills_set if s in job_skills_map]
    missing_skills = [job_skills_map[s] for s in missing_skills_set if s in job_skills_map]
    
    return round(match_percentage, 1), matched_skills, missing_skills


def calculate_resume_quality_score(resume):
    """
    Calculates a resume quality score (0-100) based on structural indicators:
    - Length of extracted text (information density)
    - Presence of skills, projects, experience data
    """
    score = 0.0
    
    extracted_text = resume.extracted_text or ''
    text_length = len(extracted_text.strip())
    
    # Text length scoring (0-30 points): good resumes have 500-3000+ chars
    if text_length >= 2000:
        score += 30
    elif text_length >= 1000:
        score += 25
    elif text_length >= 500:
        score += 18
    elif text_length >= 200:
        score += 10
    else:
        score += 3
    
    # Skills presence (0-25 points)
    skills_list = resume.skills or []
    if isinstance(skills_list, str):
        try:
            skills_list = json.loads(skills_list)
        except Exception:
            skills_list = []
    skill_count = len(skills_list) if isinstance(skills_list, list) else 0
    if skill_count >= 8:
        score += 25
    elif skill_count >= 5:
        score += 20
    elif skill_count >= 3:
        score += 15
    elif skill_count >= 1:
        score += 8
    
    # Projects presence (0-25 points)
    projects_list = resume.projects or []
    if isinstance(projects_list, str):
        try:
            projects_list = json.loads(projects_list)
        except Exception:
            projects_list = [projects_list] if projects_list.strip() else []
    if not isinstance(projects_list, list):
        projects_list = [projects_list] if projects_list else []
    proj_count = len(projects_list)
    if proj_count >= 3:
        score += 25
    elif proj_count >= 2:
        score += 18
    elif proj_count >= 1:
        score += 10
    
    # Experience data presence (0-20 points)
    exp_years = float(resume.experience_years or 0)
    if exp_years > 0:
        score += 20
    elif text_length > 300:
        # If no structured experience but has content, partial credit
        score += 5
    
    return min(round(score, 1), 100.0)


def calculate_ats_score(resume, job, weights=None):
    """
    Calculates the ATS Score using 4 objective dimensions:
    - Skills Match (keyword overlap)
    - Experience Match (years alignment)
    - Projects Evaluation (portfolio depth)
    - Resume Quality (structure and completeness)
    
    Weights are auto-computed from job.experience_required unless overridden.
    """
    if weights is None:
        weights = auto_compute_weights(job.experience_required)
    
    # Backward compatibility: if old 3-key weights received, add resume_quality
    if 'resume_quality' not in weights:
        weights['resume_quality'] = 0
        
    # Ensure weights sum to 100 or normalize them
    total_weight = sum(weights.values())
    if total_weight == 0:
        weights = auto_compute_weights(job.experience_required)
        total_weight = 100
        
    # 1. Skills Score (0 - 100)
    resume_skills = resume.skills or []
    if isinstance(resume_skills, str):
        try:
            resume_skills = json.loads(resume_skills)
        except Exception:
            resume_skills = []
            
    job_skills = job.skills_required or []
    if isinstance(job_skills, str):
        try:
            job_skills = json.loads(job_skills)
        except Exception:
            job_skills = []
            
    skills_pct, matched_skills, missing_skills = calculate_keyword_match(resume_skills, job_skills)
    
    # 2. Experience Score (0 - 100)
    try:
        exp_required = float(job.experience_required or 0.0)
    except (ValueError, TypeError):
        exp_required = 0.0
        
    try:
        exp_candidate = float(resume.experience_years or 0.0)
    except (ValueError, TypeError):
        exp_candidate = 0.0
        
    if exp_required == 0:
        exp_score = 100.0
    else:
        # Candidate gets full score if they meet or exceed requirements, else proportional
        exp_score = min((exp_candidate / exp_required) * 100.0, 100.0)
        
    # 3. Projects Score (0 - 100)
    projects_list = resume.projects or []
    if isinstance(projects_list, str):
        try:
            projects_list = json.loads(projects_list)
        except Exception:
            projects_list = [projects_list] if projects_list.strip() else []
            
    if not isinstance(projects_list, list):
        projects_list = [projects_list] if projects_list else []
        
    # Scale: 3 or more projects = 100%, 2 = 66%, 1 = 33%, 0 = 0%
    proj_count = len(projects_list)
    proj_score = min((proj_count / 3.0) * 100.0, 100.0)
    
    # 4. Resume Quality Score (0 - 100)
    resume_quality_score = calculate_resume_quality_score(resume)
    
    # Final ATS score (weighted sum)
    ats_score = (
        (skills_pct * weights.get('skills', 50)) +
        (exp_score * weights.get('experience', 20)) +
        (proj_score * weights.get('projects', 20)) +
        (resume_quality_score * weights.get('resume_quality', 10))
    ) / total_weight
    
    return {
        'ats_score': round(ats_score, 1),
        'skills_score': round(skills_pct, 1),
        'experience_score': round(exp_score, 1),
        'projects_score': round(proj_score, 1),
        'resume_quality_score': round(resume_quality_score, 1),
        'matched_skills': matched_skills,
        'missing_skills': missing_skills,
        'weights_applied': weights
    }


def calculate_match_score(resume, job, eval_type='keyword', weights=None, template=None):
    """
    Unified evaluation engine. Always calculates all three layers:
      1. Keyword Matching  — exact skill name overlap
      2. ATS Score          — weighted recruiter match (auto-adapts to job requirements)
      3. Gemini AI Score    — contextual intelligence, strengths, weaknesses, suggestions

    Final Match Score = 20% Keyword + 60% ATS + 20% AI

    The weights for the ATS Score are automatically computed from the
    job's experience_required field so that freshers are not penalized
    for having 0 years of experience when the job itself expects 0.
    """
    # Use provided weights if valid, otherwise auto-compute from job requirements
    resolved_weights = weights if (weights and isinstance(weights, dict) and sum(weights.values()) > 0) else auto_compute_weights(job.experience_required)
    
    # 1. Keyword Matching Score
    keyword_pct, matched_skills, missing_skills = calculate_keyword_match(
        resume.skills or [], job.skills_required or []
    )
    
    # 2. ATS Score (recruiter-weighted structured match)
    ats_result = calculate_ats_score(resume, job, resolved_weights)
    ats_score = ats_result['ats_score']
    
    # 3. Gemini AI Evaluation
    ai_res = calculate_ai_match(
        resume_text=resume.extracted_text,
        job_title=job.title,
        job_description=job.description,
        skills_required=job.skills_required
    )
    
    if ai_res and not ai_res.get('error'):
        ai_score = ai_res['ai_score']
        ai_analysis = ai_res['ai_analysis']
        contextual_analysis = ai_res.get('contextual_resume_analysis', ai_analysis)
        project_relevance = ai_res.get('project_relevance_analysis', 'No details provided.')
        ai_rec = ai_res.get('ai_recommendation', 'Consider')
        strengths = ai_res.get('strengths', [])
        weaknesses = ai_res.get('weaknesses', [])
        missing_skills_ai = ai_res.get('missing_skills', [])
        improvement_suggestions = ai_res.get('improvement_suggestions', [])
    else:
        # Fallback if Gemini key is not configured or fails
        ai_score = ats_score
        error_msg = ai_res.get('message') if ai_res else "GEMINI_API_KEY is not configured."
        ai_analysis = f"AI Evaluation fallback: {error_msg}. Displaying local fallback weighted metrics."
        contextual_analysis = f"AI Evaluation fallback: {error_msg}. Displaying local fallback weighted metrics."
        project_relevance = "Project relevance fallback analysis: Candidate projects demonstrate practical application of developer principles, but deep semantic review requires an active Gemini API key configuration."
        
        # Determine recommendation based on ATS score
        if ats_score >= 90:
            ai_rec = "Highly Recommended"
        elif ats_score >= 80:
            ai_rec = "Recommended"
        elif ats_score >= 65:
            ai_rec = "Consider"
        else:
            ai_rec = "Not Recommended"
            
        # Synthesize fallback strengths, weaknesses, suggestions
        strengths = []
        if matched_skills:
            strengths.append(f"✓ Possesses core skills: {', '.join(matched_skills[:3])}")
        if float(resume.experience_years or 0) >= float(job.experience_required or 0):
            strengths.append(f"✓ Meets or exceeds experience requirement ({resume.experience_years} years)")
        else:
            strengths.append("✓ Demonstrates foundational experience")
            
        weaknesses = []
        if missing_skills:
            weaknesses.append(f"✗ Missing some target skills: {', '.join(missing_skills[:3])}")
        if float(resume.experience_years or 0) < float(job.experience_required or 0):
            weaknesses.append(f"✗ Experience ({resume.experience_years} yrs) is less than required ({job.experience_required} yrs)")
            
        missing_skills_ai = missing_skills[:3] if missing_skills else []
            
        improvement_suggestions = []
        if missing_skills:
            improvement_suggestions.append(f"✓ Acquire proficiency in: {', '.join(missing_skills[:3])}")
        improvement_suggestions.append("✓ Tailor project descriptions to highlight matching technology stack")

    # Final Match Score: 20% Keyword + 60% ATS + 20% AI
    final_score = round((keyword_pct * 0.2) + (ats_score * 0.6) + (ai_score * 0.2), 1)

    return {
        'match_percentage': keyword_pct,
        'ai_score': ai_score,
        'final_score': final_score,
        'evaluation_type': 'ai',
        'details': {
            'keyword_score': keyword_pct,
            'ats_score': ats_score,
            'recruiter_score': ats_score,  # backward-compatible alias
            'ai_score': ai_score,
            'final_score': final_score,
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'experience_years': float(resume.experience_years or 0.0),
            'experience_required': float(job.experience_required or 0),
            'ai_analysis': ai_analysis,
            'contextual_resume_analysis': contextual_analysis,
            'project_relevance_analysis': project_relevance,
            'ai_recommendation': ai_rec,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'missing_skills_ai': missing_skills_ai,
            'improvement_suggestions': improvement_suggestions,
            'skills_score': ats_result.get('skills_score', keyword_pct),
            'experience_score': ats_result.get('experience_score', 0.0),
            'projects_score': ats_result.get('projects_score', 0.0),
            'resume_quality_score': ats_result.get('resume_quality_score', 0.0),
            'weights_applied': resolved_weights
        }
    }

def generate_pool_ai_analysis(job, applications, scores, matched_skills_all, missing_skills_all):
    import os
    import requests
    total_apps = len(applications)
    if total_apps == 0:
        return {
            'total_applications': 0,
            'average_score': 0,
            'highest_score': 0,
            'lowest_score': 0,
            'recommended_threshold': 70,
            'top_skills_found': [],
            'most_missing_skills': [],
            'recommended_count': 0,
            'ai_summary': "No applications available to analyze."
        }
    
    avg_score = round(sum(scores) / total_apps, 1)
    highest_score = max(scores)
    lowest_score = min(scores)
    
    # Recommended threshold: average + 10, clamped between 65 and 85
    rec_threshold = max(65, min(85, int(avg_score + 10)))
    
    # Count skills frequency
    skills_count = {}
    for s in matched_skills_all:
        skills_count[s] = skills_count.get(s, 0) + 1
    
    missing_count = {}
    for s in missing_skills_all:
        missing_count[s] = missing_count.get(s, 0) + 1
        
    top_skills_found = sorted(skills_count, key=skills_count.get, reverse=True)[:3]
    most_missing_skills = sorted(missing_count, key=missing_count.get, reverse=True)[:3]
    
    recommended_count = sum(1 for s in scores if s >= rec_threshold)
    
    # Check if Gemini key is available
    api_key = get_gemini_api_key()
    ai_summary = ""
    
    if api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        prompt = f"""
You are an expert recruitment operations analyst. Generate a professional executive summary analysis of the candidate pool for the target job:

Job Title: {job.title}
Job Description: {job.description}
Skills Required: {", ".join(job.skills_required)}

Pool Stats:
- Total Applicants: {total_apps}
- Average Match Score: {avg_score}%
- Highest Match Score: {highest_score}%
- Lowest Match Score: {lowest_score}%
- Recommended Shortlist Threshold: {rec_threshold}%
- Top Skills Found: {", ".join(top_skills_found)}
- Most Missing Skills: {", ".join(most_missing_skills)}

Provide a concise, professional assessment (approx. 100-150 words) detailing candidate quality, common strengths, major skill gaps, and strategic advice on whether to adjust the shortlist threshold. Write in natural paragraphs. Do not return JSON or markdown headers.
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        try:
            response = requests.post(url, json=payload, timeout=15)
            response.raise_for_status()
            res_data = response.json()
            ai_summary = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as e:
            print(f"Gemini pool analysis call failed: {e}")
            ai_summary = ""

    if not ai_summary:
        ai_summary = f"The candidate pool of {total_apps} applicants for the '{job.title}' position exhibits an average alignment of {avg_score}%. "
        if top_skills_found:
            ai_summary += f"The most prevalent competencies identified include {', '.join(top_skills_found)}. "
        if most_missing_skills:
            ai_summary += f"However, significant skill gaps were detected in {', '.join(most_missing_skills)}. "
        ai_summary += f"Based on the distribution of scores (ranging from {lowest_score}% to {highest_score}%), we recommend a target shortlist threshold of {rec_threshold}%, which qualifies {recommended_count} candidate(s)."

    return {
        'total_applications': total_apps,
        'average_score': avg_score,
        'highest_score': highest_score,
        'lowest_score': lowest_score,
        'recommended_threshold': rec_threshold,
        'top_skills_found': top_skills_found,
        'most_missing_skills': most_missing_skills,
        'recommended_count': recommended_count,
        'ai_summary': ai_summary
    }
