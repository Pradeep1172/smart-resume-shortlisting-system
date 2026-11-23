from django.http import JsonResponse
from rest_framework.decorators import api_view
from accounts.auth import auth_required
from notifications.models import Notification


@api_view(['GET'])
@auth_required()
def get_notifications(request):
    user = request.current_user
    notifs = Notification.objects.filter(user_id=user.id).order_by('-created_at')
    return JsonResponse([n.to_dict() for n in notifs], safe=False, status=200)


@api_view(['PUT'])
@auth_required()
def read_notification(request, notif_id):
    user = request.current_user
    notif = Notification.objects.filter(id=notif_id).first()
    if not notif:
        return JsonResponse({"message": "Notification not found"}, status=404)

    if not notif.user_id != user.id:
        return JsonResponse({"message": "Access forbidden: unauthorized"}, status=403)

    try:
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return JsonResponse(notif.to_dict(), status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to mark read: {ex}"}, status=500)


@api_view(['PUT'])
@auth_required()
def read_all_notifications(request):
    user = request.current_user
    try:
        Notification.objects.filter(user_id=user.id, is_read__in=[False, None]).update(is_read=True)
        return JsonResponse({"message": "All notifications marked as read!"}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to update notifications: {ex}"}, status=500)
