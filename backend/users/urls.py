from django.urls import path
from .views import login_user

urlpatterns = [
    path('auth/login/', login_user),
]