from django.urls import path

from .views import (
    AdminInboxView,
    MarkEmailReadView,
    SendAdminEmailView,
    UnreadCountView,
)

app_name = "mail_admin"

urlpatterns = [
    path("send-email/", SendAdminEmailView.as_view(), name="send-email"),
    path("inbox/", AdminInboxView.as_view(), name="inbox"),
    path("email/<int:id>/read/", MarkEmailReadView.as_view(), name="email-read"),
    path(
        "email/unread-count/",
        UnreadCountView.as_view(),
        name="unread-count",
    ),
]

