from django.contrib.auth.models import AbstractUser
from django.db import models
# from django.utils import auto_now_add

from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = 'ADMIN'
        LAW_ENFORCEMENT = 'LAW_ENFORCEMENT'
        PUBLIC = 'PUBLIC'

    role = models.CharField(
        max_length=20,
        choices=Role.choices
    )

    # ONLY PUBLIC USERS will use these fields → make nullable
 
    district = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)