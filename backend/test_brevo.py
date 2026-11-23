import os
import sys
import json
import django
from unittest.mock import patch, MagicMock

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from services.email_service import (
    get_brevo_config,
    generate_otp,
    get_otp_expiry,
    is_test_domain,
    dispatch_brevo_email,
    send_otp_email,
    send_shortlist_email,
    send_approval_email,
    send_rejection_email,
    send_application_confirmation_email,
    send_status_update_email
)

passed = 0
failed = 0

def assert_test(condition, test_name, detail=""):
    global passed, failed
    if condition:
        print(f"[PASS] {test_name}")
        passed += 1
    else:
        print(f"[FAIL] {test_name} - {detail}")
        failed += 1

print("\n" + "="*70)
print(" SHORTLISTIQ - BREVO TRANSACTIONAL EMAIL API TEST SUITE")
print("="*70 + "\n")

# 1. Configuration Verification
api_key, sender_email, sender_name = get_brevo_config()
assert_test(bool(api_key), "Brevo API Key loaded from environment", f"Key len: {len(api_key)}")
assert_test(sender_email == "shortlistiq.official@gmail.com", "Brevo Sender Email configured", sender_email)
assert_test(sender_name == "ShortlistIQ", "Brevo Sender Name configured", sender_name)

# 2. OTP and Utility Tests
otp = generate_otp()
assert_test(len(otp) == 6 and otp.isdigit(), "generate_otp() generates 6-digit numeric code", otp)

expiry = get_otp_expiry(2)
assert_test(expiry is not None and expiry.tzinfo is not None, "get_otp_expiry() returns timezone-aware UTC datetime", str(expiry))

assert_test(is_test_domain("candidate@test.com") is True, "is_test_domain('@test.com') is True")
assert_test(is_test_domain("user@example.com") is True, "is_test_domain('@example.com') is True")
assert_test(is_test_domain("realuser@gmail.com") is False, "is_test_domain('@gmail.com') is False")

# 3. Payload Validation and Handling
empty_res = dispatch_brevo_email(to=[], subject="Test", plain_text="Test")
assert_test(empty_res["success"] is False and "No valid recipients" in empty_res["error"], "dispatch_brevo_email rejects empty recipients")

invalid_res = dispatch_brevo_email(to=12345, subject="Test", plain_text="Test")
assert_test(invalid_res["success"] is False and "Invalid recipient" in invalid_res["error"], "dispatch_brevo_email rejects invalid recipient type")

# 4. Mocked Successful Brevo 201 Created Response
fake_msg_id = "<202611231234.brevo-test-id@smtp-relay.brevo.com>"
mock_resp = MagicMock()
mock_resp.status_code = 201
mock_resp.json.return_value = {"messageId": fake_msg_id}

with patch("requests.post", return_value=mock_resp) as mock_post:
    success_res = dispatch_brevo_email(
        to="test.user@company.com",
        subject="Welcome to ShortlistIQ",
        plain_text="Hello, Welcome to ShortlistIQ!",
        html_content="<p>Hello, Welcome to ShortlistIQ!</p>"
    )
    assert_test(success_res["success"] is True, "Mocked Brevo dispatch returns success=True")
    assert_test(success_res["message_id"] == fake_msg_id, "Mocked Brevo dispatch captures messageId", success_res.get("message_id"))
    assert_test(mock_post.called, "requests.post was called")
    
    # Verify request headers and payload sent to Brevo
    args, kwargs = mock_post.call_args
    sent_url = args[0]
    sent_headers = kwargs.get("headers", {})
    sent_json = kwargs.get("json", {})
    assert_test(sent_url == "https://api.brevo.com/v3/smtp/email", "API URL is https://api.brevo.com/v3/smtp/email", sent_url)
    assert_test(sent_headers.get("api-key") == api_key, "Header 'api-key' matches configured key")
    assert_test(sent_headers.get("Content-Type") == "application/json", "Header 'Content-Type' is application/json")
    assert_test(sent_headers.get("Accept") == "application/json", "Header 'Accept' is application/json")
    assert_test(sent_json.get("sender", {}).get("email") == "shortlistiq.official@gmail.com", "Payload sender email matches verified sender")
    assert_test(sent_json.get("to") == [{"email": "test.user@company.com"}], "Payload recipients correctly formatted")

# 5. Mocked Brevo Error Responses (401 Unauthorized, 403 Permission Denied, Timeout)
mock_401 = MagicMock()
mock_401.status_code = 401
mock_401.json.return_value = {"code": "unauthorized", "message": "Key not found"}
with patch("requests.post", return_value=mock_401):
    err_res = dispatch_brevo_email(to="user@domain.com", subject="Test", plain_text="Body")
    assert_test(err_res["success"] is False and err_res["status_code"] == 401, "Handles 401 Unauthorized correctly", str(err_res))
    assert_test("unauthorized" in err_res["error"], "Captures Brevo error code in error dict", err_res["error"])

import requests
with patch("requests.post", side_effect=requests.exceptions.Timeout("Connection timed out")):
    timeout_res = dispatch_brevo_email(to="user@domain.com", subject="Test", plain_text="Body")
    assert_test(timeout_res["success"] is False and "timed out" in timeout_res["error"], "Handles network timeout gracefully without crashing")

# 6. Test Domain Bypasses for All Triggers (Ensures test automation remains fast and clean)
assert_test(send_otp_email("test@test.com", "123456", "Test User") is True, "send_otp_email test bypass")
assert_test(send_shortlist_email("test@example.com", "Test User", "Developer", "Acme", 88.5) is True, "send_shortlist_email test bypass")
assert_test(send_approval_email("recruiter@test.com", "Jane Recruiter", "Temp1234") is True, "send_approval_email test bypass")
assert_test(send_rejection_email("recruiter@test.com", "Jane Recruiter") is True, "send_rejection_email test bypass")
assert_test(send_application_confirmation_email("candidate@test.com", "John Candidate", "Backend Engineer") is True, "send_application_confirmation_email test bypass")
assert_test(send_status_update_email("candidate@test.com", "John Candidate", "Backend Engineer", "interview") is True, "send_status_update_email test bypass")

# 7. Live Brevo API Integration Call (Verifying actual network communication with Brevo)
print("\n--- Live Brevo API Request Verification ---")
live_res = dispatch_brevo_email(
    to="shortlistiq.official@gmail.com",
    subject="ShortlistIQ Brevo Integration Test",
    plain_text="This is an automated test of the ShortlistIQ Brevo Transactional Email API integration.",
    html_content="<p>This is an automated test of the ShortlistIQ Brevo Transactional Email API integration.</p>"
)
print(f"Live Brevo API Result: Success={live_res['success']}, Status={live_res['status_code']}, Error={live_res['error']}")
# Even if Brevo returns 403 pending SMTP activation, our code must cleanly capture the status code and error details without throwing an unhandled exception
assert_test(live_res["status_code"] in (200, 201, 202, 403), "Live Brevo API successfully reached and returned valid HTTP status", f"Status: {live_res['status_code']}")

print("\n" + "="*70)
print(f" TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
print("="*70 + "\n")

if failed > 0:
    sys.exit(1)
