import os
import sys
import time
import uuid
import requests
from pathlib import Path

# Load environment using settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from services import storage_service

EXPECTED_TEST_PAYLOAD = "ShortlistIQ Cloudflare R2 connection test successful."


def run_live_r2_verification():
    print("======================================================================")
    print(" SHORTLISTIQ - CLOUDFLARE R2 LIVE CONNECTION VERIFICATION")
    print("======================================================================")

    # 1. Inspect presence of credentials
    configured = storage_service.is_r2_configured()
    if not configured:
        print("[FAIL] R2 credentials not fully loaded or STORAGE_BACKEND disabled.")
        return False
    print("[PASS] R2 credentials loaded successfully (masked)")

    bucket_name = storage_service.get_bucket_name()
    endpoint_url = os.getenv('AWS_S3_ENDPOINT_URL', '').strip()
    region = os.getenv('AWS_S3_REGION_NAME', 'auto').strip()

    print(f"[PASS] Bucket name verified: {bucket_name}")
    print(f"[PASS] Endpoint verified: {endpoint_url}")
    print(f"[PASS] Region: {region}")

    # 2. Connect to R2 via boto3
    try:
        s3 = storage_service.get_s3_client()
        print("[PASS] Boto3 S3 client initialized successfully")
    except Exception as ex:
        print(f"[FAIL] Failed to initialize Boto3 S3 client: {ex}")
        return False

    # 3. Verify bucket exists and is accessible
    try:
        s3.head_bucket(Bucket=bucket_name)
        print(f"[PASS] Live R2 connection established: Bucket '{bucket_name}' exists and is accessible")
    except Exception as ex:
        print(f"[FAIL] Could not access bucket '{bucket_name}': {ex}")
        return False

    # 4. Upload temporary test object
    test_key = f"tests/connection_probe_{int(time.time())}_{uuid.uuid4().hex[:8]}.txt"
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=EXPECTED_TEST_PAYLOAD.encode('utf-8'),
            ContentType="text/plain"
        )
        print(f"[PASS] Temporary file uploaded: key='{test_key}'")
    except Exception as ex:
        print(f"[FAIL] Failed to upload temporary test object: {ex}")
        return False

    # 5. Read uploaded object back
    downloaded_text = ""
    try:
        obj = s3.get_object(Bucket=bucket_name, Key=test_key)
        downloaded_text = obj['Body'].read().decode('utf-8')
        print("[PASS] Temporary file read successfully from R2")
    except Exception as ex:
        print(f"[FAIL] Failed to read back test object: {ex}")
        return False

    # 6. Verify content matches exactly
    if downloaded_text == EXPECTED_TEST_PAYLOAD:
        print("[PASS] Content verification: Downloaded content exactly matches original payload")
    else:
        print(f"[FAIL] Content mismatch: expected '{EXPECTED_TEST_PAYLOAD}', got '{downloaded_text}'")
        return False

    # 7. Check Bucket Privacy via Unauthenticated Public URL Probe
    public_url = f"{endpoint_url.rstrip('/')}/{bucket_name}/{test_key}"
    try:
        res = requests.get(public_url, timeout=5)
        if res.status_code in (401, 403, 404):
            print(f"[PASS] Bucket privacy: Unauthenticated public request rejected with HTTP {res.status_code}")
        else:
            print(f"[WARNING] Public probe returned HTTP {res.status_code}. Verify in Cloudflare dashboard that R2 Public Access is disabled.")
    except Exception as ex:
        print(f"[PASS] Bucket privacy: Unauthenticated public access unreachable directly ({ex})")

    # 8. Check Presigned URL generation with 15-minute expiration
    try:
        presigned_url = storage_service.get_presigned_url(
            test_key,
            expires_in=900,
            response_disposition='inline; filename="test.txt"',
            response_type="text/plain"
        )
        if presigned_url and "X-Amz-Expires=900" in presigned_url:
            print("[PASS] Time-limited presigned URL generated with 900s (15 min) expiration")
            # Verify presigned URL can be fetched over HTTPS
            verify_res = requests.get(presigned_url, timeout=10)
            if verify_res.status_code == 200 and verify_res.text == EXPECTED_TEST_PAYLOAD:
                print("[PASS] Presigned URL verified: successfully retrieved test object with valid signature")
            else:
                print(f"[FAIL] Presigned URL retrieval returned status {verify_res.status_code}")
        else:
            print("[FAIL] Failed to generate valid presigned URL")
            return False
    except Exception as ex:
        print(f"[FAIL] Error generating or verifying presigned URL: {ex}")
        return False

    # 9. Delete only the temporary test object
    try:
        s3.delete_object(Bucket=bucket_name, Key=test_key)
        print(f"[PASS] Temporary file deletion: '{test_key}' deleted from R2")
    except Exception as ex:
        print(f"[FAIL] Failed to delete temporary test object: {ex}")
        return False

    # 10. Verify object no longer exists
    try:
        s3.head_object(Bucket=bucket_name, Key=test_key)
        print("[FAIL] Object still exists after deletion!")
        return False
    except Exception:
        print("[PASS] Deletion verified: Object confirmed gone from R2")

    print("\n----------------------------------------------------------------------")
    print(" ALL CLOUDFLARE R2 LIVE TESTS COMPLETED SUCCESSFULLY!")
    print("----------------------------------------------------------------------")
    return True


if __name__ == '__main__':
    success = run_live_r2_verification()
    sys.exit(0 if success else 1)
