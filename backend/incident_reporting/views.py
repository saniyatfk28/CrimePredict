from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import ChatMessage

import json


def test_email(request):
    """Simple health/test endpoint.

    Returns JSON so it works in browser and Postman.
    """
    return JsonResponse({"status": "ok", "message": "test-email endpoint is reachable"})


@csrf_exempt
def send_chat_message(request):
    """Endpoint for public users to send chat messages to authorities."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    text = (data.get("message", "") or "").strip()
    recipient_role = (data.get("recipient_role", "ADMIN") or "ADMIN").strip()
    sender_name = (data.get("sender_name", "") or "").strip()

    if not text:
        return JsonResponse({"error": "message is required"}, status=400)

    # If auth is available, you can replace sender_name with request.user data later.
    msg = ChatMessage.objects.create(
        sender_name=sender_name or "Anonymous",
        recipient_role=str(recipient_role).upper(),
        message=text,
    )

    return JsonResponse(
        {
            "success": True,
            "id": msg.id,
            "created_at": msg.created_at.isoformat(),
        }
    )


@csrf_exempt
def get_chat_messages(request):
    """Return recent chat messages."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    msgs = ChatMessage.objects.all().values(
        "id", "sender_name", "recipient_role", "message", "created_at"
    )[:500]
    return JsonResponse(list(msgs), safe=False)

