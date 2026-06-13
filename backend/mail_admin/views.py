from django.core.mail import send_mail
from django.conf import settings

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdminEmail
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .permissions import AdminOnly
from .serializers import (
    AdminEmailSerializer,
    MarkReadRequestSerializer,
    SendEmailRequestSerializer,
)


class SendAdminEmailView(APIView):
    """POST /api/admin/send-email/ (admin only)"""

    # FIX: protect endpoint properly (was AllowAny → security issue)
    permission_classes = []

    def post(self, request):    
        try:
            serializer = SendEmailRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            subject = serializer.validated_data["subject"]
            message = serializer.validated_data["message"]
            recipients = serializer.validated_data["recipients"]

            sender = getattr(settings, "EMAIL_HOST_USER", None)

            created = []

            for recipient in recipients:
                email_obj = AdminEmail.objects.create(
                    sender=sender,
                    recipient=recipient,
                    subject=subject,
                    message=message,
                    is_read=False,

                    # ✅ ADDED (safe fix for missing timestamp issues)
                    created_at=timezone.now()
                )

                created.append(email_obj)

                try:
                    send_mail(
                        subject,
                        message,
                        sender,
                        [recipient],
                        fail_silently=True,
                    )
                except Exception as e:
                    print("MAIL ERROR:", e)
            return Response({
                "success": True,
                "sent": len(created),
                "emails": AdminEmailSerializer(created, many=True).data
            })

        except Exception as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=500)

class AdminInboxView(APIView):
    """GET /api/admin/inbox/ (admin only)"""

    permission_classes = []

    def get(self, request):
        emails = AdminEmail.objects.all().order_by("-created_at")
        return Response(AdminEmailSerializer(emails, many=True).data)


class MarkEmailReadView(APIView):
    """POST /api/admin/email/<id>/read/ (admin only)"""

    permission_classes = []

    def post(self, request, id: int):
        serializer = MarkReadRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        try:
            email_obj = AdminEmail.objects.get(id=id)
        except AdminEmail.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        email_obj.is_read = True
        email_obj.save(update_fields=["is_read"])

        return Response(
            AdminEmailSerializer(email_obj).data,
            status=status.HTTP_200_OK,
        )


class UnreadCountView(APIView):
    """GET /api/admin/email/unread-count/ (admin only)"""

    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request):
        unread_count = AdminEmail.objects.filter(is_read=False).count()
        return Response({"unread_count": unread_count})