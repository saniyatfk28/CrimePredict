"""Django settings for crimepredict project.

This project repository stores Django modules (models.py, views.py, urls.py)
at the repo root, so this settings.py is also expected at the root.
"""

from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

# SECURITY WARNING: keep the secret key used in production secret!
# In dev, we allow override via env.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-secret-key")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in {"1", "true", "yes"}

ALLOWED_HOSTS = [
    os.environ.get("DJANGO_ALLOWED_HOST", "*")
]


# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    'channels'
    # Local app is stored at repo root, so module name is just the current root.
    # Django will still resolve models via AUTH_USER_MODEL below.
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [str(BASE_DIR / "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "wsgi.application"


# Database
# Default to SQLite for simplicity.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "postgres",
        "USER": "postgres",
        "PASSWORD": "CrimePredict123@",
        "HOST": "db.sxgnbikdzovotorlewxv.supabase.co",
        "PORT": "5432",
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True
CORS_ALLOW_ALL_ORIGINS = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = str(BASE_DIR / "static")


# Media uploads (used by CrimePhotoReport.image)
MEDIA_URL = "/media/"
MEDIA_ROOT = str(BASE_DIR / "media")


# Custom user model
# models.py defines `class User(AbstractUser)` at repo root, so the label is `models.User`.
AUTH_USER_MODEL = "models.User"


# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Dataset path used by views.py
# views.py resolves:
#   getattr(settings, 'PREVENTION_DATASET_PATH', None) or env PREVENTION_DATASET_PATH
# If not provided, it falls back to data/incidents.json under BASE_DIR.
PREVENTION_DATASET_PATH = os.environ.get(
    "PREVENTION_DATASET_PATH",
    str(BASE_DIR / "data" / "incidents.json"),
)

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache"
    }
}