import os
import io
import sys
import zipfile
import tempfile
import unittest
from unittest.mock import patch, MagicMock

# Ensure Django settings are loaded
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from services import storage_service
from services.resume_parser_service import extract_text, parse_resume, calculate_resume_confidence


class StorageAndR2TestSuite(unittest.TestCase):
    """
    Comprehensive test suite for ShortlistIQ Cloudflare R2 Integration,
    Local Filesystem Fallback, and File Security Protections.
    """

    def setUp(self):
        self.test_files_created = []

    def tearDown(self):
        for f in self.test_files_created:
            storage_service.delete_file(f)

    def test_01_local_fallback_when_r2_credentials_absent(self):
        """Verify that system defaults to local filesystem when R2 env vars are not set."""
        with patch.dict(os.environ, {
            'AWS_ACCESS_KEY_ID': '',
            'AWS_SECRET_ACCESS_KEY': '',
            'AWS_STORAGE_BUCKET_NAME': '',
            'AWS_S3_ENDPOINT_URL': '',
            'STORAGE_BACKEND': ''
        }, clear=False):
            self.assertFalse(storage_service.is_r2_configured())

    def test_02_r2_detection_when_credentials_present(self):
        """Verify that system activates R2 mode when all required R2 variables are present."""
        with patch.dict(os.environ, {
            'AWS_ACCESS_KEY_ID': 'sample_access_key_123',
            'AWS_SECRET_ACCESS_KEY': 'sample_secret_key_456',
            'AWS_STORAGE_BUCKET_NAME': 'shortlistiq-bucket',
            'AWS_S3_ENDPOINT_URL': 'https://sample_account.r2.cloudflarestorage.com',
            'STORAGE_BACKEND': ''
        }, clear=False):
            self.assertTrue(storage_service.is_r2_configured())

    def test_03_candidate_resume_save_and_retrieve_local(self):
        """Test candidate resume saving, existence verification, and deletion on local storage."""
        sample_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Candidate Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        key = "resumes/test_candidate_sample.pdf"

        saved_path = storage_service.save_file(sample_content, key, "application/pdf")
        self.test_files_created.append(saved_path)

        self.assertTrue(storage_service.file_exists(saved_path))
        self.assertTrue(storage_service.file_exists(key))

        # Test context manager temp file
        with storage_service.open_or_download_temp(saved_path) as local_temp:
            self.assertTrue(os.path.exists(local_temp))
            with open(local_temp, 'rb') as f:
                data = f.read()
            self.assertEqual(data, sample_content)

    def test_04_profile_photo_save_and_serve(self):
        """Test candidate profile photo upload and serving headers."""
        sample_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        key = "photos/test_profile_photo.png"

        saved_path = storage_service.save_file(sample_png, key, "image/png")
        self.test_files_created.append(saved_path)

        self.assertTrue(storage_service.file_exists(saved_path))

        response = storage_service.serve_file_response(
            None, saved_path, "test_profile_photo.png", "image/png"
        )
        # In R2 mode returns 302 signed redirect, in local mode returns 200 FileResponse
        self.assertIn(response.status_code, (200, 302))
        if response.status_code == 302:
            self.assertTrue(bool(response.url or response['Location']))
        else:
            self.assertEqual(response['Content-Type'], "image/png")
            self.assertIn("inline", response['Content-Disposition'])
            response.close()

    def test_05_company_logo_save_and_serve(self):
        """Test recruiter company logo upload and serving headers."""
        sample_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
        key = "logos/test_recruiter_logo.jpg"

        saved_path = storage_service.save_file(sample_jpg, key, "image/jpeg")
        self.test_files_created.append(saved_path)

        self.assertTrue(storage_service.file_exists(saved_path))

        response = storage_service.serve_file_response(
            None, saved_path, "test_recruiter_logo.jpg", "image/jpeg"
        )
        self.assertIn(response.status_code, (200, 302))
        if response.status_code == 302:
            self.assertTrue(bool(response.url or response['Location']))
        else:
            self.assertEqual(response['Content-Type'], "image/jpeg")
            response.close()

    def test_06_secure_zip_extraction_and_zip_slip_prevention(self):
        """Verify that safe_extract_zip extracts legitimate files and blocks Zip Slip directory traversal attacks."""
        mem_zip = io.BytesIO()
        with zipfile.ZipFile(mem_zip, 'w') as zf:
            # Safe member
            zf.writestr("legitimate_resume.pdf", b"Content of legitimate resume")
            # Malicious Zip Slip member attempting to break out of directory
            zf.writestr("../../etc/malicious_escape.pdf", b"Malicious content")
            zf.writestr("..\\..\\malicious_windows.pdf", b"Malicious windows content")
            # Hidden system member
            zf.writestr("__MACOSX/.hidden.pdf", b"OS artifact")

        mem_zip.seek(0)
        with tempfile.TemporaryDirectory() as temp_target:
            extracted = storage_service.safe_extract_zip(mem_zip, temp_target, {'.pdf'})

            # Only the legitimate file should be extracted
            extracted_names = [name for name, _ in extracted]
            self.assertIn("legitimate_resume.pdf", extracted_names)
            self.assertNotIn("../../etc/malicious_escape.pdf", extracted_names)
            self.assertNotIn("malicious_windows.pdf", extracted_names)

            # Verify no files escaped outside temp_target
            parent_dir = os.path.dirname(temp_target)
            self.assertFalse(os.path.exists(os.path.join(parent_dir, "malicious_escape.pdf")))

    def test_07_pdf_and_text_extraction(self):
        """Test resume text extraction with a mock or real PDF document."""
        # Create a simple PDF using minimal valid syntax
        pdf_bytes = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            b"3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj\n"
            b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
            b"5 0 obj << /Length 44 >> stream\n"
            b"BT /F1 12 Tf 100 700 Td (John Doe Python Developer) Tj ET\n"
            b"endstream\nendobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000228 00000 n \n0000000299 00000 n \n"
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n393\n%%EOF"
        )
        saved_path = storage_service.save_file(pdf_bytes, "resumes/unit_test_cv.pdf", "application/pdf")
        self.test_files_created.append(saved_path)

        text = extract_text(saved_path)
        self.assertIsInstance(text, str)

    def test_08_r2_presigned_url_generation_simulation(self):
        """Simulate R2 S3 presigned URL generation with mocked boto3 client."""
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://shortlistiq.r2.cloudflarestorage.com/resumes/signed_sample.pdf?X-Amz-Signature=abc123xyz"

        with patch.dict(os.environ, {
            'AWS_ACCESS_KEY_ID': 'mock_key',
            'AWS_SECRET_ACCESS_KEY': 'mock_secret',
            'AWS_STORAGE_BUCKET_NAME': 'mock_bucket',
            'AWS_S3_ENDPOINT_URL': 'https://mock.r2.cloudflarestorage.com',
            'STORAGE_BACKEND': 'r2'
        }):
            with patch('services.storage_service.get_s3_client', return_value=mock_s3):
                url = storage_service.get_presigned_url(
                    "resumes/signed_sample.pdf",
                    expires_in=900,
                    response_disposition='inline; filename="resume.pdf"',
                    response_type='application/pdf'
                )

                self.assertIsNotNone(url)
                self.assertIn("shortlistiq.r2.cloudflarestorage.com", url)
                mock_s3.generate_presigned_url.assert_called_once()
                call_args = mock_s3.generate_presigned_url.call_args[1]
                self.assertEqual(call_args['ClientMethod'], 'get_object')
                self.assertEqual(call_args['Params']['Bucket'], 'mock_bucket')
                self.assertEqual(call_args['Params']['Key'], 'resumes/signed_sample.pdf')
                self.assertEqual(call_args['Params']['ResponseContentType'], 'application/pdf')

    def test_09_r2_open_or_download_temp_simulation(self):
        """Verify that open_or_download_temp downloads an R2 object to a clean temp file and deletes it on context exit."""
        fake_content = b"Remote Cloudflare R2 resume content for candidate Priya Sharma"

        mock_s3 = MagicMock()
        mock_body = io.BytesIO(fake_content)
        mock_s3.get_object.return_value = {'Body': mock_body}

        with patch.dict(os.environ, {
            'AWS_ACCESS_KEY_ID': 'mock_key',
            'AWS_SECRET_ACCESS_KEY': 'mock_secret',
            'AWS_STORAGE_BUCKET_NAME': 'mock_bucket',
            'AWS_S3_ENDPOINT_URL': 'https://mock.r2.cloudflarestorage.com',
            'STORAGE_BACKEND': 'r2'
        }):
            with patch('services.storage_service.get_s3_client', return_value=mock_s3):
                temp_path = None
                with storage_service.open_or_download_temp("resumes/remote_r2_priya.pdf") as path:
                    temp_path = path
                    self.assertTrue(os.path.exists(temp_path))
                    with open(temp_path, 'rb') as f:
                        read_data = f.read()
                    self.assertEqual(read_data, fake_content)

                # Context manager must have deleted the temporary file
                self.assertFalse(os.path.exists(temp_path))

    def test_10_file_deletion_and_cleanup(self):
        """Test that delete_file removes files from local disk and cleans up properly."""
        content = b"Content to be deleted"
        key = "resumes/to_delete.pdf"
        saved_path = storage_service.save_file(content, key)

        self.assertTrue(storage_service.file_exists(saved_path))
        self.assertTrue(storage_service.delete_file(saved_path))
        self.assertFalse(storage_service.file_exists(saved_path))


if __name__ == '__main__':
    unittest.main()
