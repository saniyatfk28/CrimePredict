
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        PUBLIC = 'PUBLIC', 'Public User'
        LAW_ENFORCEMENT = 'LAW', 'Law Enforcement'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.PUBLIC
    )

class CrimeIncident(models.Model):
    incident_month = models.IntegerField()
    incident_weekday = models.CharField(max_length=20)
    part_of_the_day = models.CharField(max_length=20)
    latitude = models.FloatField()
    longitude = models.FloatField()
    incident_place = models.CharField(max_length=100)
    incident_district = models.CharField(max_length=100)
    avg_temp = models.IntegerField()
    season = models.CharField(max_length=20)
    total_population = models.IntegerField()
    literacy_rate = models.FloatField()
    crime_type = models.CharField(max_length=50) 

    class Meta:
        ordering = ['-incident_month']

    def __str__(self):
        return f"{self.crime_type} at {self.incident_place}"

class CitizenTip(models.Model):
    location = models.CharField(max_length=255)
    crime_type = models.CharField(max_length=100)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']


class PreventionTip(models.Model):
    crime_type = models.CharField(max_length=64, db_index=True)
    text = models.TextField()
    created_by_role = models.CharField(max_length=16, default="public")  # public|law|admin
    created_by_name = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional: allow future moderation
    is_approved = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.crime_type}: {self.text[:30]}"


class SOSAlert(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='sos_alerts')
    phone = models.CharField(max_length=32, blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_link = models.CharField(max_length=512, blank=True, default='')
    status = models.CharField(max_length=64, default='Emergency Active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        user_part = self.user.username if self.user else 'anonymous'
        return f"SOSAlert({user_part} - {self.location_link})"


class UserLiveLocation(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='live_location')
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_link = models.CharField(max_length=512)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LiveLocation({self.user.username})"


class CrimePhotoReport(models.Model):
    CRIME_TYPES = [
        ('theft', 'Theft'),
        ('assault', 'Assault'),
        ('robbery', 'Robbery'),
        ('rape', 'Rape'),
        ('murder', 'Murder'),
        ('other', 'Other'),
    ]


    district = models.CharField(max_length=100)
    crime_type = models.CharField(max_length=20, choices=CRIME_TYPES)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='crime_photos/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.crime_type} - {self.district}"


class ChatMessage(models.Model):
    """Stores simple chat messages sent by public users to authorities (or vice-versa)."""
    sender = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    sender_name = models.CharField(max_length=150, blank=True, default='')
    recipient_role = models.CharField(max_length=30, blank=True, default='ADMIN')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ChatMessage({self.sender_name or (self.sender.username if self.sender else 'anon')} -> {self.recipient_role})"

