from rest_framework.permissions import IsAdminUser


# Keep a dedicated permission module for mail endpoints.
# DRF's IsAdminUser checks request.user.is_staff.
AdminOnly = IsAdminUser

