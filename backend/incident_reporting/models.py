from django.conf import settings
from django.db import models


class Incident(models.Model):

    class UrgencyLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    # Reporter Name (user)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incidents_reported",
    )

    # Email (user email)
    # Stored on the incident for historical accuracy.
    reporter_email = models.EmailField()

    # Location / District (dropdown selection)
    district = models.CharField(max_length=100)

    # Crime Type (e.g., Theft, Assault, etc.)
    crime_type = models.CharField(max_length=50)

    # Date & Time (timestamp of incident)
    incident_datetime = models.DateTimeField()

    # Urgency Level (Low / Medium / High)
    urgency_level = models.CharField(
        max_length=10,
        choices=UrgencyLevel.choices,
        default=UrgencyLevel.LOW,
    )

    # Description of Incident (text field)
    description = models.TextField()

    # Photo Evidence (optional image upload)
    photo_evidence = models.ImageField(
        upload_to="incident_photos/",
        blank=True,
        null=True,
    )

    # created/updated timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-incident_datetime"]

    def __str__(self):
        return f"{self.crime_type} in {self.district} ({self.urgency_level})"


class ChatMessage(models.Model):
    """Stores chat messages between public users and authorities."""

    sender_name = models.CharField(max_length=150, blank=True, default="")
    recipient_role = models.CharField(max_length=30, blank=True, default="ADMIN")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"ChatMessage({self.sender_name or 'anon'} -> {self.recipient_role})"
        )


