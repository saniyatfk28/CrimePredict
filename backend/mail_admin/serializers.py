from rest_framework import serializers

from .models import AdminEmail


class SendEmailRequestSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    message = serializers.CharField()
    recipients = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False,
    )


class AdminEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminEmail
        fields = [
            "id",
            "sender",
            "recipient",
            "subject",
            "message",
            "is_read",
            "created_at",
        ]


class MarkReadRequestSerializer(serializers.Serializer):
    # no fields required, but keeps POST body flexible/explicit
    dummy = serializers.CharField(required=False, allow_blank=True)


class UnreadCountResponseSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()

