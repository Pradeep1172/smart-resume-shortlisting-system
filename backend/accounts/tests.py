from django.test import SimpleTestCase
from accounts.models import User
from accounts.auth import generate_token, decode_token
from services.email_service import generate_otp, get_otp_expiry
from services.match_service import auto_compute_weights
from services.resume_parser_service import calculate_resume_confidence, parse_skills


class AuthAndServicesTestCase(SimpleTestCase):
    def test_user_password_hashing(self):
        user = User(email="test@candidate.com", name="Test User", role="candidate")
        user.set_password("SecurePassword123!")
        self.assertIsNotNone(user.password_hash)
        self.assertTrue(user.check_password("SecurePassword123!"))
        self.assertFalse(user.check_password("WrongPassword"))

    def test_jwt_token_creation_and_decoding(self):
        user = User(id=99, email="test@recruiter.com", name="Jane Recruiter", role="recruiter", company="TechCorp")
        token = generate_token(user)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 20)

        claims = decode_token(token)
        self.assertIsNotNone(claims)
        self.assertEqual(claims.get("user_id"), "99")
        self.assertEqual(claims.get("email"), "test@recruiter.com")
        self.assertEqual(claims.get("role"), "recruiter")

    def test_otp_generation(self):
        otp = generate_otp()
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        expiry = get_otp_expiry(5)
        self.assertIsNotNone(expiry)

    def test_auto_compute_weights(self):
        # Entry level (<= 2 years)
        weights_entry = auto_compute_weights(1.0)
        total = weights_entry["skills"] + weights_entry["projects"] + weights_entry["experience"] + weights_entry["resume_quality"]
        self.assertEqual(total, 100)
        self.assertEqual(weights_entry["skills"], 45)
        self.assertEqual(weights_entry["experience"], 15)

        # Mid level (3-4 years)
        weights_mid = auto_compute_weights(3.0)
        total_mid = weights_mid["skills"] + weights_mid["projects"] + weights_mid["experience"] + weights_mid["resume_quality"]
        self.assertEqual(total_mid, 100)
        self.assertEqual(weights_mid["experience"], 40)

        # Senior level (> 4 years)
        weights_senior = auto_compute_weights(7.0)
        total_senior = weights_senior["skills"] + weights_senior["projects"] + weights_senior["experience"] + weights_senior["resume_quality"]
        self.assertEqual(total_senior, 100)
        self.assertEqual(weights_senior["experience"], 50)

    def test_resume_confidence_scoring(self):
        fake_text = "This is a random text with no professional content."
        low_confidence = calculate_resume_confidence(fake_text)
        self.assertTrue(low_confidence < 35)

        resume_text = """
        John Doe
        Education: Bachelor of Science in Computer Science
        Experience: 5 years software engineer at Tech Corp
        Skills: Python, Django, React, MySQL, Docker, REST API
        Projects: Developed AI-powered recruitment web application
        Contact: john@example.com, Phone: 1234567890
        """
        high_confidence = calculate_resume_confidence(resume_text)
        self.assertTrue(high_confidence >= 60)

    def test_skills_parsing(self):
        sample_text = "Proficient in Python, Django, React, and MySQL database management."
        skills = parse_skills(sample_text)
        self.assertIn("Python", skills)
        self.assertIn("Django", skills)
        self.assertIn("React", skills)
        self.assertTrue(any(s.lower() == "mysql" for s in skills))
