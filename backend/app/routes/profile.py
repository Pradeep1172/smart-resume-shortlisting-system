from flask import Blueprint, request, jsonify, g, send_file
from werkzeug.utils import secure_filename
import os
import time
from app.models import db
from app.models.candidate_profile import CandidateProfile
from app.middleware.auth_middleware import token_required, roles_allowed
from app.config import Config

profile_bp = Blueprint('profile', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@profile_bp.route('', methods=['GET'])
@token_required
@roles_allowed('candidate', 'admin')
def get_profile():
    profile = CandidateProfile.query.filter_by(user_id=g.user.id).first()
    if not profile:
        return jsonify({}), 200
    return jsonify(profile.to_dict()), 200


@profile_bp.route('', methods=['POST'])
@token_required
@roles_allowed('candidate', 'admin')
def save_profile():
    data = request.get_json() or {}
    profile = CandidateProfile.query.filter_by(user_id=g.user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=g.user.id)
        db.session.add(profile)

    profile.phone = data.get('phone', profile.phone)
    profile.headline = data.get('headline', profile.headline)
    profile.bio = data.get('bio', profile.bio)
    profile.education = data.get('education', profile.education)
    profile.certifications = data.get('certifications', profile.certifications)
    profile.github_url = data.get('github_url', profile.github_url)
    profile.linkedin_url = data.get('linkedin_url', profile.linkedin_url)
    profile.leetcode_url = data.get('leetcode_url', profile.leetcode_url)
    profile.portfolio_url = data.get('portfolio_url', profile.portfolio_url)

    db.session.commit()
    return jsonify({'message': 'Profile saved successfully!', 'profile': profile.to_dict()}), 200


@profile_bp.route('/photo', methods=['POST'])
@token_required
@roles_allowed('candidate', 'admin')
def upload_photo():
    if 'photo' not in request.files:
        return jsonify({'message': 'No photo file in request'}), 400
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    if not allowed_image(file.filename):
        return jsonify({'message': 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    timestamp = int(time.time())
    filename = f"candidate_{g.user.id}_{timestamp}.{ext}"
    photos_dir = os.path.join(Config.UPLOAD_FOLDER, 'photos')
    os.makedirs(photos_dir, exist_ok=True)
    file_path = os.path.join(photos_dir, filename)
    abs_file_path = os.path.abspath(file_path)
    file.save(abs_file_path)

    profile = CandidateProfile.query.filter_by(user_id=g.user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=g.user.id)
        db.session.add(profile)

    # Remove old photo if exists
    if profile.photo_path and os.path.exists(profile.photo_path):
        try:
            os.remove(profile.photo_path)
        except Exception:
            pass

    profile.photo_path = abs_file_path
    db.session.commit()
    return jsonify({'message': 'Photo uploaded successfully!', 'photo_url': f'/api/profile/photo/{g.user.id}'}), 200


@profile_bp.route('/photo/<int:user_id>', methods=['GET'])
def get_photo(user_id):
    profile = CandidateProfile.query.filter_by(user_id=user_id).first()
    if not profile or not profile.photo_path or not os.path.exists(profile.photo_path):
        return jsonify({'message': 'No photo found'}), 404
    return send_file(profile.photo_path)


@profile_bp.route('/photo', methods=['DELETE'])
@token_required
@roles_allowed('candidate', 'admin')
def delete_photo():
    profile = CandidateProfile.query.filter_by(user_id=g.user.id).first()
    if profile and profile.photo_path:
        if os.path.exists(profile.photo_path):
            try:
                os.remove(profile.photo_path)
            except Exception:
                pass
        profile.photo_path = None
        db.session.commit()
        return jsonify({'message': 'Photo removed successfully!'}), 200
    return jsonify({'message': 'No photo to remove'}), 200
