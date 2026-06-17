import os
import sys
import requests
import json
from dotenv import load_dotenv

# Ensure we can import from app
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.setting import SystemSetting
from app.services.match_service import calculate_ai_match, generate_pool_ai_analysis
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application

load_dotenv()

def test_connection():
    app = create_app()
    with app.app_context():
        # 1. Fetch key from db or environment
        db_key_setting = SystemSetting.query.filter_by(key='GEMINI_API_KEY').first()
        db_key = db_key_setting.value.strip() if db_key_setting and db_key_setting.value else None
        env_key = os.environ.get('GEMINI_API_KEY')
        
        print("=== Gemini API Key Configuration ===")
        print(f"Database setting key: {db_key[:10] + '...' if db_key else 'Not set'}")
        print(f"Environment .env key: {env_key[:10] + '...' if env_key else 'Not set'}")
        
        active_key = db_key or env_key
        if not active_key:
            print("\n[x] Error: No Gemini API key found in either the database or .env file.")
            print("Please configure a key in the Recruiter Dashboard Settings tab or update backend/.env.")
            return False
            
        if not (active_key.startswith("AIzaSy") or active_key.startswith("AQ.")):
            print(f"\n[!] Warning: The configured key starts with '{active_key[:8]}...', which does not look like a standard Google AI Studio Gemini API key (should start with 'AIzaSy' or 'AQ.').")
        
        # 2. Test direct API connectivity
        print("\n=== Testing API Connection to gemini-2.5-flash ===")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={active_key}"
        payload = {
            "contents": [{"parts": [{"text": "Hello, respond with only the word 'OK' if you receive this."}]}]
        }
        
        try:
            print(f"Sending POST request to: {url.split('?')[0]}")
            response = requests.post(url, json=payload, timeout=10)
            print(f"Response status code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[x] API Connection Failed! Status code {response.status_code}: {response.text}")
                return False
                
            res_data = response.json()
            text_response = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
            print(f"[+] Success! Gemini response: '{text_response}'")
            
        except Exception as e:
            print(f"[x] Connection error: {e}")
            return False
            
        # 3. Test calculate_ai_match evaluation structure
        print("\n=== Testing Candidate AI Match Evaluation Parsing ===")
        resume_text = "Skills: Python, Flask, SQL, React. Experience: 3 years. Lead Engineer at TechCorp."
        job_title = "Python Software Engineer"
        job_description = "Looking for a Python Backend Engineer who can build Flask web applications and interface with SQL databases."
        skills_required = ["Python", "Flask", "SQL"]
        
        ai_res = calculate_ai_match(resume_text, job_title, job_description, skills_required)
        print(f"AI Match Service Result: {json.dumps(ai_res, indent=2)}")
        
        if ai_res.get('error'):
            print("[x] AI Match calculation failed.")
            return False
        elif 'ai_recommendation' not in ai_res:
            print("[x] AI Match calculation did not return 'ai_recommendation' field.")
            return False
        else:
            print("[+] AI Match evaluation parsed successfully!")
            
        return True

if __name__ == '__main__':
    success = test_connection()
    sys.exit(0 if success else 1)
