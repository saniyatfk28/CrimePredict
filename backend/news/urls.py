from django.urls import path

from .views import CrimeNewsView

app_name = "news"

urlpatterns = [
    path("crime/", CrimeNewsView.as_view(), name="crime-news"),
]

