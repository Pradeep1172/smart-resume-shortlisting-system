import os
import time
from datetime import datetime, timezone
from django.conf import settings
from django.http import JsonResponse, FileResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from accounts.models import User
from accounts.auth import auth_required
from candidates.models import CandidateProfile
from services.storage_service import (
    save_file, delete_file, serve_file_response, file_exists, get_local_uploads_dir
)

ALLOWED_PHOTO_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def _get_uploads_dir():
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


@api_view(['GET', 'POST'])
@auth_required('candidate', 'admin')
def profile_handler(request):
    user = request.current_user
    if request.method == 'GET':
        profile = CandidateProfile.objects.filter(user_id=user.id).first()
        if not profile:
            return JsonResponse({}, status=200)
        return JsonResponse(profile.to_dict(), status=200)

    # POST
    profile = CandidateProfile.objects.filter(user_id=user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)

    data = request.data
    for field in ['phone', 'headline', 'bio', 'education', 'certifications',
                  'github_url', 'linkedin_url', 'leetcode_url', 'portfolio_url']:
        if field in data and data[field] is not None:
            setattr(profile, field, data[field])

    profile.updated_at = datetime.now(timezone.utc)
    profile.save()

    return JsonResponse({
        "message": "Profile saved successfully!",
        "profile": profile.to_dict()
    }, status=200)


@api_view(['POST', 'DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@auth_required('candidate', 'admin')
def photo_handler(request):
    user = request.current_user
    if request.method == 'DELETE':
        profile = CandidateProfile.objects.filter(user_id=user.id).first()
        if profile and profile.photo_path:
            delete_file(profile.photo_path)
            profile.photo_path = None
            profile.updated_at = datetime.now(timezone.utc)
            profile.save()
            return JsonResponse({"message": "Photo removed successfully!"}, status=200)
        return JsonResponse({"message": "No photo to remove"}, status=200)

    # POST
    photo = request.FILES.get('photo')
    if not photo or photo.size == 0:
        return JsonResponse({"message": "No photo file selected"}, status=400)

    _, ext = os.path.splitext(photo.name)
    ext = ext.lower()
    if ext not in ALLOWED_PHOTO_EXTS:
        return JsonResponse({"message": "Invalid file type. Allowed: jpg, jpeg, png, webp, gif"}, status=400)

    timestamp = int(time.time())
    file_name = f"candidate_{user.id}_{timestamp}{ext}"
    storage_key = f"photos/{file_name}"

    content_type = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    }.get(ext, 'application/octet-stream')

    profile = CandidateProfile.objects.filter(user_id=user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=user.id)

    if profile.photo_path:
        delete_file(profile.photo_path)

    saved_path = save_file(photo, storage_key, content_type)
    profile.photo_path = saved_path
    profile.updated_at = datetime.now(timezone.utc)
    profile.save()

    return JsonResponse({
        "message": "Photo uploaded successfully!",
        "photo_url": f"/api/profile/photo/{user.id}"
    }, status=200)


@api_view(['GET'])
def get_photo(request, user_id):
    profile = CandidateProfile.objects.filter(user_id=user_id).first()
    if not profile or not profile.photo_path or not file_exists(profile.photo_path):
        return JsonResponse({"message": "No photo found"}, status=404)

    _, ext = os.path.splitext(profile.photo_path)
    ext = ext.lower()
    content_type = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    }.get(ext, 'application/octet-stream')

    return serve_file_response(request, profile.photo_path, os.path.basename(profile.photo_path), content_type)
