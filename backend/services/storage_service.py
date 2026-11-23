import os
import io
import time
import shutil
import zipfile
import tempfile
import logging
from pathlib import Path
from contextlib import contextmanager
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect, StreamingHttpResponse, FileResponse, Http404

logger = logging.getLogger("shortlistiq.storage")

# Maximum allowed zip extraction limits to prevent decompression bomb attacks
MAX_ZIP_FILES = 150
MAX_ZIP_TOTAL_BYTES = 100 * 1024 * 1024  # 100 MB
MAX_ZIP_SINGLE_FILE_BYTES = 25 * 1024 * 1024  # 25 MB


def is_r2_configured() -> bool:
    """
    Checks if Cloudflare R2 / S3 storage credentials are fully configured in the environment.
    If any required variable is missing, the application automatically falls back to local storage.
    """
    forced_backend = os.getenv('STORAGE_BACKEND', '').lower()
    if forced_backend == 'local':
        return False
    if forced_backend == 'r2':
        return True

    return bool(
        os.getenv('AWS_ACCESS_KEY_ID', '').strip()
        and os.getenv('AWS_SECRET_ACCESS_KEY', '').strip()
        and os.getenv('AWS_STORAGE_BUCKET_NAME', '').strip()
        and os.getenv('AWS_S3_ENDPOINT_URL', '').strip()
    )


def get_s3_client():
    """
    Creates and returns a boto3 S3 client configured for Cloudflare R2.
    """
    import boto3
    import botocore.config

    endpoint_url = os.getenv('AWS_S3_ENDPOINT_URL', '').strip()
    access_key = os.getenv('AWS_ACCESS_KEY_ID', '').strip()
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY', '').strip()
    region_name = os.getenv('AWS_S3_REGION_NAME', 'auto').strip()
    sig_version = os.getenv('AWS_S3_SIGNATURE_VERSION', 's3v4').strip()

    client_config = botocore.config.Config(
        signature_version=sig_version,
        s3={'addressing_style': 'path'},
        retries={'max_attempts': 3, 'mode': 'standard'}
    )

    return boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name,
        config=client_config
    )


def get_bucket_name() -> str:
    """Returns the configured S3 / R2 bucket name."""
    return os.getenv('AWS_STORAGE_BUCKET_NAME', '').strip()


def get_local_uploads_dir() -> str:
    """Returns the base directory for local filesystem storage."""
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


def normalize_storage_key(path_or_key: str) -> str:
    """
    Normalizes a file path or R2 key into a clean relative S3 key without leading slashes.
    Example: 'C:\\Users\\...\\uploads\\resumes\\file.pdf' -> 'resumes/file.pdf'
             '/var/data/uploads/photos/photo.png' -> 'photos/photo.png'
             'resumes/file.pdf' -> 'resumes/file.pdf'
    """
    if not path_or_key:
        return ""
    
    clean = str(path_or_key).replace('\\', '/').strip()
    
    # Check if path contains 'uploads/' segment
    if '/uploads/' in clean:
        clean = clean.split('/uploads/', 1)[-1]
    elif clean.startswith('uploads/'):
        clean = clean[len('uploads/'):]
        
    return clean.lstrip('/')


def save_file(file_obj_or_bytes, relative_key: str, content_type: str | None = None) -> str:
    """
    Saves a file to either Cloudflare R2 or local disk depending on configuration.
    
    Args:
        file_obj_or_bytes: Django UploadedFile, file-like object, or bytes.
        relative_key: Relative storage path/key (e.g., 'resumes/user_1_1700_test.pdf').
        content_type: Optional MIME content type.
        
    Returns:
        str: Stored path or relative key to save in the database.
    """
    relative_key = normalize_storage_key(relative_key)
    
    if is_r2_configured():
        try:
            s3 = get_s3_client()
            bucket = get_bucket_name()
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            if isinstance(file_obj_or_bytes, bytes):
                body = file_obj_or_bytes
            elif hasattr(file_obj_or_bytes, 'read'):
                file_obj_or_bytes.seek(0)
                body = file_obj_or_bytes.read()
            else:
                body = bytes(file_obj_or_bytes)

            s3.put_object(
                Bucket=bucket,
                Key=relative_key,
                Body=body,
                **extra_args
            )
            logger.info(f"Successfully uploaded to R2: {relative_key}")
            return relative_key
        except Exception as ex:
            logger.error(f"R2 upload failed for {relative_key}: {ex}. Falling back to local storage if available.")
            # If R2 upload fails unexpectedly, write to local as fallback
            pass

    # Local filesystem storage
    base_dir = get_local_uploads_dir()
    full_local_path = os.path.abspath(os.path.join(base_dir, relative_key))
    os.makedirs(os.path.dirname(full_local_path), exist_ok=True)

    if isinstance(file_obj_or_bytes, bytes):
        with open(full_local_path, 'wb') as dest:
            dest.write(file_obj_or_bytes)
    elif hasattr(file_obj_or_bytes, 'chunks'):
        with open(full_local_path, 'wb') as dest:
            for chunk in file_obj_or_bytes.chunks():
                dest.write(chunk)
    elif hasattr(file_obj_or_bytes, 'read'):
        file_obj_or_bytes.seek(0)
        with open(full_local_path, 'wb') as dest:
            dest.write(file_obj_or_bytes.read())
            
    logger.info(f"Saved to local disk: {full_local_path}")
    return full_local_path


def delete_file(file_path_or_key: str) -> bool:
    """
    Safely deletes a file from local disk and/or Cloudflare R2.
    """
    if not file_path_or_key:
        return False

    success = False

    # 1. Check and delete from local filesystem
    if os.path.exists(file_path_or_key):
        try:
            os.remove(file_path_or_key)
            success = True
        except Exception as ex:
            logger.warning(f"Failed to delete local file {file_path_or_key}: {ex}")

    # Also check relative to local uploads dir
    key = normalize_storage_key(file_path_or_key)
    local_candidate = os.path.join(get_local_uploads_dir(), key)
    if os.path.exists(local_candidate) and local_candidate != file_path_or_key:
        try:
            os.remove(local_candidate)
            success = True
        except Exception as ex:
            logger.warning(f"Failed to delete candidate local file {local_candidate}: {ex}")

    # 2. Check and delete from Cloudflare R2
    if is_r2_configured():
        try:
            s3 = get_s3_client()
            bucket = get_bucket_name()
            s3.delete_object(Bucket=bucket, Key=key)
            success = True
            logger.info(f"Deleted object from R2: {key}")
        except Exception as ex:
            logger.warning(f"Failed to delete R2 object {key}: {ex}")

    return success


def file_exists(file_path_or_key: str) -> bool:
    """
    Checks if a file exists either on local disk or in Cloudflare R2.
    """
    if not file_path_or_key:
        return False

    # Check direct local path
    if os.path.exists(file_path_or_key):
        return True

    key = normalize_storage_key(file_path_or_key)
    local_candidate = os.path.join(get_local_uploads_dir(), key)
    if os.path.exists(local_candidate):
        return True

    # Check R2
    if is_r2_configured():
        try:
            s3 = get_s3_client()
            bucket = get_bucket_name()
            s3.head_object(Bucket=bucket, Key=key)
            return True
        except Exception:
            return False

    return False


def get_presigned_url(
    file_path_or_key: str,
    expires_in: int = 900,
    response_disposition: str | None = None,
    response_type: str | None = None
) -> str | None:
    """
    Generates a secure, time-limited presigned URL for private Cloudflare R2 access.
    
    Args:
        file_path_or_key: File key or path.
        expires_in: Expiration time in seconds (default: 900 = 15 minutes).
        response_disposition: Optional Content-Disposition (e.g. 'inline; filename="resume.pdf"').
        response_type: Optional Content-Type (e.g. 'application/pdf').
        
    Returns:
        str: Presigned URL or None if R2 is not configured or generation fails.
    """
    if not is_r2_configured():
        return None

    try:
        s3 = get_s3_client()
        bucket = get_bucket_name()
        key = normalize_storage_key(file_path_or_key)

        params = {'Bucket': bucket, 'Key': key}
        if response_disposition:
            params['ResponseContentDisposition'] = response_disposition
        if response_type:
            params['ResponseContentType'] = response_type

        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params=params,
            ExpiresIn=expires_in
        )
        return url
    except Exception as ex:
        logger.error(f"Failed to generate presigned URL for {file_path_or_key}: {ex}")
        return None


@contextmanager
def open_or_download_temp(file_path_or_key: str):
    """
    Context manager that yields a local filesystem path for the given file.
    - If the file is already on local disk, yields its local path directly without copying.
    - If the file is in Cloudflare R2, downloads it to a secure temporary file,
      yields the temp file path, and guarantees deletion when the context exits.
      
    Usage:
        with open_or_download_temp(resume.file_path) as temp_local_path:
            text = extract_text(temp_local_path)
    """
    # 1. Check if it already exists as an absolute local path
    if file_path_or_key and os.path.exists(file_path_or_key):
        yield os.path.abspath(file_path_or_key)
        return

    # 2. Check if it exists in local uploads directory
    key = normalize_storage_key(file_path_or_key)
    local_path = os.path.join(get_local_uploads_dir(), key)
    if os.path.exists(local_path):
        yield os.path.abspath(local_path)
        return

    # Check fallback subfolders inside local uploads
    file_basename = os.path.basename(file_path_or_key)
    for sub in ['', 'photos', 'logos', 'external_resumes']:
        cand = os.path.join(get_local_uploads_dir(), sub, file_basename)
        if os.path.exists(cand):
            yield os.path.abspath(cand)
            return

    # 3. If R2 is configured, download from R2 to temporary file
    if is_r2_configured():
        temp_file = None
        try:
            s3 = get_s3_client()
            bucket = get_bucket_name()
            obj = s3.get_object(Bucket=bucket, Key=key)

            suffix = Path(file_path_or_key).suffix or '.tmp'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            
            # Stream bytes into temp file in chunks
            body = obj['Body']
            while chunk := body.read(64 * 1024):
                temp_file.write(chunk)
            temp_file.flush()
            temp_file.close()

            yield temp_file.name
        finally:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.remove(temp_file.name)
                except Exception:
                    pass
        return

    # If neither local nor R2 has the file, raise FileNotFoundError
    raise FileNotFoundError(f"File not found on local disk or R2: {file_path_or_key}")


def serve_file_response(
    request,
    file_path_or_key: str,
    original_filename: str,
    content_type: str = 'application/octet-stream',
    as_attachment: bool = False
) -> HttpResponse:
    """
    Serves a stored file to the client.
    - If Cloudflare R2 is configured: generates a secure signed URL with 15-minute validity
      and returns an HTTP 302 redirect directly to Cloudflare's edge network.
    - If local: serves via Django's FileResponse.
    """
    disposition_type = 'attachment' if as_attachment else 'inline'
    safe_name = os.path.basename(original_filename).replace('"', '')
    disposition = f'{disposition_type}; filename="{safe_name}"'

    # If R2 is configured, prefer fast signed redirect
    if is_r2_configured():
        signed_url = get_presigned_url(
            file_path_or_key,
            expires_in=900,  # 15 minutes
            response_disposition=disposition,
            response_type=content_type
        )
        if signed_url:
            return HttpResponseRedirect(signed_url)

    # Local fallback
    local_resolved = None
    if file_path_or_key and os.path.exists(file_path_or_key):
        local_resolved = os.path.abspath(file_path_or_key)
    else:
        key = normalize_storage_key(file_path_or_key)
        candidates = [
            os.path.join(get_local_uploads_dir(), key),
            os.path.join(get_local_uploads_dir(), os.path.basename(file_path_or_key)),
            os.path.join(get_local_uploads_dir(), 'photos', os.path.basename(file_path_or_key)),
            os.path.join(get_local_uploads_dir(), 'logos', os.path.basename(file_path_or_key)),
            os.path.join(get_local_uploads_dir(), 'external_resumes', os.path.basename(file_path_or_key)),
        ]
        for c in candidates:
            if os.path.exists(c):
                local_resolved = c
                break

    if local_resolved and os.path.exists(local_resolved):
        response = FileResponse(open(local_resolved, 'rb'), content_type=content_type)
        response['Content-Disposition'] = disposition
        return response

    return HttpResponse(
        '{"message": "File not found"}',
        status=404,
        content_type='application/json'
    )


def safe_extract_zip(zip_file_obj, target_dir: str, allowed_extensions: set[str]) -> list[tuple[str, str]]:
    """
    Extracts a zip archive safely, protecting against:
    1. Zip Slip (path traversal / directory escape vulnerabilities)
    2. Decompression Bomb / Zip Bomb DOS attacks (excessive size / file count)
    3. Hidden / malicious system files (__MACOSX, .DS_Store, symlinks)
    
    Returns:
        list of tuples: [(original_clean_filename, extracted_absolute_path), ...]
    """
    os.makedirs(target_dir, exist_ok=True)
    target_abs = os.path.abspath(target_dir)

    extracted_files = []
    total_extracted_bytes = 0

    with zipfile.ZipFile(zip_file_obj, 'r') as zf:
        infolist = zf.infolist()
        if len(infolist) > MAX_ZIP_FILES:
            raise ValueError(f"ZIP archive contains too many files ({len(infolist)} > {MAX_ZIP_FILES}).")

        for member in infolist:
            # Skip directories
            if member.is_dir():
                continue

            # Security check: Prevent Zip Slip path traversal
            resolved_dest = os.path.abspath(os.path.join(target_abs, member.filename))
            if not resolved_dest.startswith(target_abs + os.sep) and resolved_dest != target_abs:
                logger.warning(f"Blocked Zip Slip path traversal attempt: {member.filename}")
                continue

            # Skip macOS and OS metadata
            b_name = os.path.basename(member.filename)
            if (
                b_name.startswith('.')
                or b_name.startswith('__MACOSX')
                or '/__MACOSX/' in member.filename
                or b_name.lower().endswith('.zip')
            ):
                continue

            # Check allowed extension
            _, ext = os.path.splitext(b_name)
            if ext.lower() not in allowed_extensions:
                continue

            # Security check: Single file size limit
            if member.file_size > MAX_ZIP_SINGLE_FILE_BYTES:
                logger.warning(f"Skipping oversized file in zip ({member.file_size} bytes): {b_name}")
                continue

            # Security check: Total decompressed bytes limit
            total_extracted_bytes += member.file_size
            if total_extracted_bytes > MAX_ZIP_TOTAL_BYTES:
                raise ValueError("ZIP archive exceeded maximum allowed uncompressed size (decompression bomb protection).")

            # Extract file securely
            os.makedirs(os.path.dirname(resolved_dest), exist_ok=True)
            with zf.open(member) as source, open(resolved_dest, 'wb') as target:
                shutil.copyfileobj(source, target)

            extracted_files.append((b_name, resolved_dest))

    return extracted_files
