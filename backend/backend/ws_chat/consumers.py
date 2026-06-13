import json
import traceback

from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from django.utils import timezone


TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
MAX_MESSAGES = 100


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        try:
            print("WS CONNECT ATTEMPT")
            print(self.scope["url_route"]["kwargs"])

            self.room_name = self.scope["url_route"]["kwargs"]["room_id"]
            self.room_group_name = f"chat_{self.room_name}"
            self.cache_key = f"chat_{self.room_name}"

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()

            existing = cache.get(self.cache_key) or []

            await self.send(
                text_data=json.dumps({
                    "type": "history",
                    "messages": existing
                })
            )

        except Exception:
            import traceback
            traceback.print_exc()
            await self.close()
        

    async def disconnect(self, code):
        try:
            if getattr(self, "room_group_name", None):
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
        except Exception:
            traceback.print_exc()

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        message_text = (data.get("message") or "").strip()
        sender = (data.get("sender") or "").strip()
        role = data.get("role", "unknown")
        user_id = data.get("userId")

        if not message_text or not sender:
            return

        entry = {
            "sender": sender,
            "role": role,
            "userId": user_id,
            "message": message_text,
            "timestamp": data.get("timestamp")
            or timezone.now().isoformat(),
        }

        existing = cache.get(self.cache_key) or []

        if not isinstance(existing, list):
            existing = []

        existing.append(entry)
        existing = existing[-MAX_MESSAGES:]

        cache.set(
            self.cache_key,
            existing,
            timeout=TTL_SECONDS
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": entry,
            },
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message",
                    "message": event["message"],
                }
            )
        )