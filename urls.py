from django.urls import path
from . import views
from .views import test_email

urlpatterns = [
    path('', views.landing_page, name='landing'),

    # Auth APIs
    path('api/auth/login/', views.login_api, name='login_api'),
    path('api/auth/register-public/', views.register_public, name='register_public'),
    path('logout/', views.logout_view, name='logout'),

    # Dashboards
    path('dashboard/admin/', views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/law/', views.law_dashboard, name='law_dashboard'),
    path('dashboard/public/', views.public_dashboard, name='public_dashboard'),

    # Prevention APIs
    path('api/prevention/summary', views.prevention_dataset_summary),
    path('api/prevention/tips', views.prevention_tips),
    path('api/prevention/tips/add', views.add_prevention_tip),

    # Crime photo APIs
    path('api/upload-crime-photo/', views.upload_crime_photo),
    path('api/crime-photos/', views.list_crime_photos),

    # Live Location Sharing
    path('update-live-location', views.update_live_location, name='update_live_location'),

    # Emergency SOS
    path('trigger-sos', views.trigger_sos, name='trigger_sos'),

    # Chat With Authorities
    path('send-chat-message', views.send_chat_message, name='send_chat_message'),
    path('api/chat-messages/', views.get_chat_messages, name='get_chat_messages'),

    # EMAIL TEST

    path("test-email/", test_email),

]

