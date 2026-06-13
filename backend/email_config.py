from django.conf import settings


def get_email_from():
    # Use project-level setting if provided; otherwise fall back to an env var.
    return (
        getattr(settings, "EMAIL_FROM", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
        or "alerthub.project@gmail.com"
    )


def get_notification_recipient_list():
    # ADMIN-side mail typically goes to a fixed recipient list.
    # Configure via EMAIL_NOTIFICATION_RECIPIENTS (comma-separated) or fall back to a default.
    recipients = getattr(settings, "EMAIL_NOTIFICATION_RECIPIENTS", None)
    if recipients:
        return recipients

    env = getattr(settings, "EMAIL_NOTIFICATION_RECIPIENTS_ENV", None)
    if env:
        return [r.strip() for r in str(env).split(",") if r.strip()]

    # Safe default; in console mode nothing leaves the machine.
    return ["receiver@gmail.com"]

