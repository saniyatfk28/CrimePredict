from django.urls import path

from .views import test_email, send_chat_message, get_chat_messages

app_name = "incident_reporting"

urlpatterns = [
    path("test-email/", test_email, name="test-email"),

    # Chat With Authorities
    path('send-chat-message', send_chat_message, name='send_chat_message'),
    path('api/chat-messages/', get_chat_messages, name='get_chat_messages'),
]





