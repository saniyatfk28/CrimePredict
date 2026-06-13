from django.urls import re_path

from .ws_chat.consumers import ChatConsumer

websocket_urlpatterns = [
    # ws://<host>/ws/chat/<room_id>/
    re_path(r"^ws/chat/(?P<room_id>[^/]+)/$", ChatConsumer.as_asgi()),
]



