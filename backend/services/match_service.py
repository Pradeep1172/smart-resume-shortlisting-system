import os
import re
import json
import requests


def auto_compute_weights(experience_required: float) -> dict[str, int]:
    if experience_required == 0:
        return {
            "skills": 50,
            "experience": 0,
            "projects": 35,
            "resume_quality": 15
        }
    if experience_required <= 2:
        return {
            "skills": 45,
            "experience": 15,
            "projects": 25,
            "resume_quality": 15
        }
    if experience_required <= 4:
        return {
            "skills": 35,
            "experience": 40,
            "projects": 15,
            "resume_quality": 10
        }
    return {
        "skills": 30,
        "experience": 50,
        "projects": 10,
        "resume_quality": 10
    }


def calculate_keyword_match(resume_skills: list[str], job_skills: list[str]) -> tuple[float, list[str], list[str]]:
    r_list = [s.strip() for s in (resume_skills or []) if s and s.strip()]
    j_list = [s.strip() for s in (job_skills or []) if s and s.strip()]

    if not j_list:
        return 100.0, [], []
    if not r_list:
        return 0.0, [], j_list

    r_set = {s.lower() for s in r_list}
    j_map = {s.lower(): s for s in j_list}

    matched = []
    missing = []

    for k, original_name in j_map.items():
        if k in r_set:
            matched.append(original_name)
        else:
            missing.append(original_name)

    pct = round((len(matched) / len(j_list)) * 100.0, 1)
    return pct, matched, missing


def calculate_resume_quality_score(extracted_text: str, skills: list[str], projects: list[str], exp_years: float) -> float:
    score = 0.0
    text = extracted_text or ""
    text_length = len(text.strip())

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

    skill_count = len(skills or [])
    if skill_count >= 8:
        score += 25
    elif skill_count >= 5:
        score += 20
    elif skill_count >= 3:
        score += 15
    elif skill_count >= 1:
        score += 8

    proj_count = len(projects or [])
    if proj_count >= 3:
        score += 25
    elif proj_count >= 2:
        score += 18
    elif proj_count >= 1:
        score += 10

    if exp_years > 0:
        score += 20
    elif text_length > 300:
        score += 5

    return min(round(score, 1), 100.0)


def calculate_ats_score(extracted_text: str, resume_skills: list[str], projects: list[str], experience_years: float, job, weights: dict[str, int] = None) -> dict:
    exp_required = job.experience_required or 0
    resolved_weights = weights if weights else auto_compute_weights(exp_required)

    if "resume_quality" not in resolved_weights:
        resolved_weights["resume_quality"] = 0

    total_weight = sum(resolved_weights.values())
    if total_weight == 0:
        resolved_weights = auto_compute_weights(exp_required)
        total_weight = 100

    job_skills = job.get_skills_list()
    skills_pct, matched_skills, missing_skills = calculate_keyword_match(resume_skills, job_skills)

    if exp_required == 0:
        exp_score = 100.0
    else:
        exp_score = min((experience_years / exp_required) * 100.0, 100.0)

    proj_count = len(projects or [])
    proj_score = min((proj_count / 3.0) * 100.0, 100.0)

    resume_quality_score = calculate_resume_quality_score(extracted_text, resume_skills, projects, experience_years)

    ats_score = (
        (skills_pct * resolved_weights.get("skills", 50)) +
        (exp_score * resolved_weights.get("experience", 20)) +
        (proj_score * resolved_weights.get("projects", 20)) +
        (resume_quality_score * resolved_weights.get("resume_quality", 10))
    ) / float(total_weight)

    return {
        "ats_score": round(ats_score, 1),
        "skills_score": round(skills_pct, 1),
        "experience_score": round(exp_score, 1),
        "projects_score": round(proj_score, 1),
        "resume_quality_score": round(resume_quality_score, 1),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "weights_applied": resolved_weights
    }


def calculate_quick_score(extracted_text: str, resume_skills: list[str], experience_years: float, job) -> dict:
    job_skills = job.get_skills_list()
    keyword_pct, matched_skills, missing_skills = calculate_keyword_match(resume_skills, job_skills)

    return {
        "match_percentage": keyword_pct,
        "ai_score": None,
        "final_score": keyword_pct,
        "evaluation_type": "quick",
        "details": {
            "keyword_score": keyword_pct,
            "quick_match_pct": keyword_pct,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "total_required_skills": len(job_skills),
            "total_matched_skills": len(matched_skills),
            "experience_years": experience_years,
            "experience_required": job.experience_required or 0,
            "evaluation_strategy": "quick"
        }
    }


def calculate_ai_match(resume_text: str, job_title: str, job_description: str, skills_required: list[str]) -> dict:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return {"error": True, "message": "GEMINI_API_KEY not configured."}

    model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    prompt = f"""
You are an expert technical recruiter. Analyze the following candidate resume text against the target job description.

Target Job Title: {job_title}
Target Job Description: {job_description}
Required Skills: {', '.join(skills_required)}

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
        res = requests.post(url, json=payload, timeout=25)
        res.raise_for_status()
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

                parsed = json.loads(raw)
                ai_score = float(parsed.get("ai_score", 0))
                analysis = parsed.get("contextual_resume_analysis", "")
                proj_rel = parsed.get("project_relevance_analysis", "")
                rec = parsed.get("ai_recommendation", "Consider")

                def read_list(key):
                    val = parsed.get(key, [])
                    if isinstance(val, list):
                        return [str(x) for x in val if str(x).strip()]
                    return []

                return {
                    "ai_score": ai_score,
                    "ai_analysis": analysis,
                    "contextual_resume_analysis": analysis,
                    "project_relevance_analysis": proj_rel,
                    "ai_recommendation": rec,
                    "strengths": read_list("strengths"),
                    "weaknesses": read_list("weaknesses"),
                    "missing_skills": read_list("missing_skills"),
                    "improvement_suggestions": read_list("improvement_suggestions")
                }
    except Exception as ex:
        print(f"Gemini API call failed: {ex}")
        return {"error": True, "message": str(ex)}

    return {"error": True, "message": "No response from Gemini."}


def calculate_match_score(extracted_text: str, resume_skills: list[str], projects: list[str], experience_years: float, job, eval_type: str = "ai", weights: dict[str, int] = None) -> dict:
    resolved_weights = weights if weights else auto_compute_weights(job.experience_required or 0)
    job_skills = job.get_skills_list()

    # 1. Keyword match
    keyword_pct, matched_skills, missing_skills = calculate_keyword_match(resume_skills, job_skills)

    # 2. ATS score
    ats_result = calculate_ats_score(extracted_text, resume_skills, projects, experience_years, job, resolved_weights)
    ats_score = float(ats_result["ats_score"])

    # 3. Gemini AI match
    ai_res = calculate_ai_match(extracted_text, job.title, job.description, job_skills)

    if ai_res and not ai_res.get("error"):
        ai_score = float(ai_res["ai_score"])
        ai_analysis = ai_res.get("ai_analysis", "No details provided.")
        contextual_analysis = ai_res.get("contextual_resume_analysis", ai_analysis)
        project_relevance = ai_res.get("project_relevance_analysis", "No details provided.")
        ai_rec = ai_res.get("ai_recommendation", "Consider")
        strengths = ai_res.get("strengths", [])
        weaknesses = ai_res.get("weaknesses", [])
        missing_skills_ai = ai_res.get("missing_skills", [])
        improvement_suggestions = ai_res.get("improvement_suggestions", [])
    else:
        # Fallback
        ai_score = ats_score
        err_msg = ai_res.get("message", "GEMINI_API_KEY is not configured.") if ai_res else "GEMINI_API_KEY is not configured."
        ai_analysis = f"AI Evaluation fallback: {err_msg}. Displaying local fallback weighted metrics."
        contextual_analysis = ai_analysis
        project_relevance = "Project relevance fallback analysis: Candidate projects demonstrate practical application of developer principles, but deep semantic review requires an active Gemini API key configuration."

        if ats_score >= 90:
            ai_rec = "Highly Recommended"
        elif ats_score >= 80:
            ai_rec = "Recommended"
        elif ats_score >= 65:
            ai_rec = "Consider"
        else:
            ai_rec = "Not Recommended"

        strengths = []
        if matched_skills:
            strengths.append(f"✓ Possesses core skills: {', '.join(matched_skills[:3])}")
        if experience_years >= (job.experience_required or 0):
            strengths.append(f"✓ Meets or exceeds experience requirement ({experience_years} years)")
        else:
            strengths.append("✓ Demonstrates foundational experience")

        weaknesses = []
        if missing_skills:
            weaknesses.append(f"✗ Missing some target skills: {', '.join(missing_skills[:3])}")
        if experience_years < (job.experience_required or 0):
            weaknesses.append(f"✗ Experience ({experience_years} yrs) is less than required ({job.experience_required} yrs)")

        missing_skills_ai = missing_skills[:3]
        improvement_suggestions = []
        if missing_skills:
            improvement_suggestions.append(f"✓ Acquire proficiency in: {', '.join(missing_skills[:3])}")
        improvement_suggestions.append("✓ Tailor project descriptions to highlight matching technology stack")

    # Final score: 20% Keyword + 60% ATS + 20% AI
    final_score = round((keyword_pct * 0.2) + (ats_score * 0.6) + (ai_score * 0.2), 1)

    return {
        "match_percentage": keyword_pct,
        "ai_score": ai_score,
        "final_score": final_score,
        "evaluation_type": "ai",
        "details": {
            "keyword_score": keyword_pct,
            "ats_score": ats_score,
            "recruiter_score": ats_score,
            "ai_score": ai_score,
            "final_score": final_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "experience_years": experience_years,
            "experience_required": job.experience_required or 0,
            "ai_analysis": ai_analysis,
            "contextual_resume_analysis": contextualAnalysis if 'contextualAnalysis' in locals() else contextual_analysis,
            "project_relevance_analysis": project_relevance,
            "ai_recommendation": ai_rec,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "missing_skills_ai": missing_skills_ai,
            "improvement_suggestions": improvement_suggestions,
            "skills_score": ats_result["skills_score"],
            "experience_score": ats_result["experience_score"],
            "projects_score": ats_result["projects_score"],
            "resume_quality_score": ats_result["resume_quality_score"],
            "weights_applied": resolved_weights
        }
    }


def generate_pool_quick_analysis(job, total_apps: int, scores: list[float], matched_skills_all: list[str], missing_skills_all: list[str]) -> dict:
    if total_apps == 0:
        return {
            "total_applications": 0,
            "average_score": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "recommended_threshold": 70,
            "top_skills_found": [],
            "most_missing_skills": [],
            "recommended_count": 0,
            "ai_summary": "No applications available to analyze.",
            "evaluation_strategy": "quick"
        }

    avg_score = round(sum(scores) / total_apps, 1)
    highest_score = max(scores)
    lowest_score = min(scores)

    rec_threshold = max(50, min(85, int(avg_score + 10)))

    skills_count = {}
    for s in matched_skills_all:
        skills_count[s] = skills_count.get(s, 0) + 1

    missing_count = {}
    for s in missing_skills_all:
        missing_count[s] = missing_count.get(s, 0) + 1

    top_skills_found = [k for k, _ in sorted(skills_count.items(), key=lambda x: x[1], reverse=True)[:5]]
    most_missing_skills = [k for k, _ in sorted(missing_count.items(), key=lambda x: x[1], reverse=True)[:5]]

    recommended_count = sum(1 for s in scores if s >= rec_threshold)

    summary = f"Quick Evaluation Summary for '{job.title}': {total_apps} candidate(s) screened using keyword matching. Average skill match: {avg_score}% (range: {lowest_score}% – {highest_score}%). "
    if top_skills_found:
        summary += f"Most common matched skills: {', '.join(top_skills_found)}. "
    if most_missing_skills:
        summary += f"Most frequently missing skills: {', '.join(most_missing_skills)}. "
    summary += f"Recommended shortlist threshold: {rec_threshold}% ({recommended_count} candidate(s) qualify)."

    return {
        "total_applications": total_apps,
        "average_score": avg_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "recommended_threshold": rec_threshold,
        "top_skills_found": top_skills_found,
        "most_missing_skills": most_missing_skills,
        "recommended_count": recommended_count,
        "ai_summary": summary,
        "evaluation_strategy": "quick"
    }


def generate_pool_ai_analysis(job, total_apps: int, scores: list[float], matched_skills_all: list[str], missing_skills_all: list[str]) -> dict:
    if total_apps == 0:
        return {
            "total_applications": 0,
            "average_score": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "recommended_threshold": 70,
            "top_skills_found": [],
            "most_missing_skills": [],
            "recommended_count": 0,
            "ai_summary": "No applications available to analyze."
        }

    avg_score = round(sum(scores) / total_apps, 1)
    highest_score = max(scores)
    lowest_score = min(scores)
    rec_threshold = max(65, min(85, int(avg_score + 10)))

    skills_count = {}
    for s in matched_skills_all:
        skills_count[s] = skills_count.get(s, 0) + 1

    missing_count = {}
    for s in missing_skills_all:
        missing_count[s] = missing_count.get(s, 0) + 1

    top_skills_found = [k for k, _ in sorted(skills_count.items(), key=lambda x: x[1], reverse=True)[:3]]
    most_missing_skills = [k for k, _ in sorted(missing_count.items(), key=lambda x: x[1], reverse=True)[:3]]

    recommended_count = sum(1 for s in scores if s >= rec_threshold)

    ai_summary = ""
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        try:
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            prompt = f"""
You are an expert recruitment operations analyst. Generate a professional executive summary analysis of the candidate pool for the target job:

Job Title: {job.title}
Job Description: {job.description}
Skills Required: {job.skills_required}

Pool Stats:
- Total Applicants: {total_apps}
- Average Match Score: {avg_score}%
- Highest Match Score: {highest_score}%
- Lowest Match Score: {lowest_score}%
- Recommended Shortlist Threshold: {rec_threshold}%
- Top Skills Found: {', '.join(top_skills_found)}
- Most Missing Skills: {', '.join(most_missing_skills)}

Provide a concise, professional assessment (approx. 100-150 words) detailing candidate quality, common strengths, major skill gaps, and strategic advice on whether to adjust the shortlist threshold. Write in natural paragraphs. Do not return JSON or markdown headers.
"""
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            res = requests.post(url, json=payload, timeout=20)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        ai_summary = parts[0].get("text", "").strip()
        except Exception as ex:
            print(f"Gemini pool analysis failed: {ex}")

    if not ai_summary:
        ai_summary = f"The candidate pool of {total_apps} applicants for the '{job.title}' position exhibits an average alignment of {avg_score}%. "
        if top_skills_found:
            ai_summary += f"The most prevalent competencies identified include {', '.join(top_skills_found)}. "
        if most_missing_skills:
            ai_summary += f"However, significant skill gaps were detected in {', '.join(most_missing_skills)}. "
        ai_summary += f"Based on the distribution of scores (ranging from {lowest_score}% to {highest_score}%), we recommend a target shortlist threshold of {rec_threshold}%, which qualifies {recommended_count} candidate(s)."

    return {
        "total_applications": total_apps,
        "average_score": avg_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "recommended_threshold": rec_threshold,
        "top_skills_found": top_skills_found,
        "most_missing_skills": most_missing_skills,
        "recommended_count": recommended_count,
        "ai_summary": ai_summary
    }
