from django.contrib import admin
from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reporter",
        "district",
        "crime_type",
        "incident_datetime",
        "urgency_level",
        "created_at",
    )
    search_fields = ("district", "crime_type", "reporter_email")
    list_filter = ("urgency_level", "district")

