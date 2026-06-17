from flask import Blueprint, jsonify, g
from app.models import db
from app.models.notification import Notification
from app.middleware.auth_middleware import token_required

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications():
    notifs = Notification.query.filter_by(user_id=g.user.id).order_by(Notification.created_at.desc()).all()
    return jsonify([notif.to_dict() for notif in notifs]), 200

@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
@token_required
def read_notification(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    if notif.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: unauthorized'}), 403
        
    try:
        notif.is_read = True
        db.session.commit()
        return jsonify(notif.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to mark read: {str(e)}'}), 500

@notifications_bp.route('/read-all', methods=['PUT'])
@token_required
def read_all_notifications():
    try:
        Notification.query.filter_by(user_id=g.user.id, is_read=False).update({'is_read': True})
        db.session.commit()
        return jsonify({'message': 'All notifications marked as read!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update notifications: {str(e)}'}), 500
