from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .models import CrimeIncident, User, UserLiveLocation, SOSAlert, ChatMessage

from django.db.models import Count
from functools import wraps
from django.http import HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from django.conf import settings
import logging
from django.core.mail import send_mail
from rest_framework.decorators import api_view
from rest_framework.response import Response


def role_required(allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('landing')
            if request.user.role not in allowed_roles:
                return HttpResponseForbidden("Unauthorized Access")
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

# Landing Page
def landing_page(request):
    return render(request, 'landing.html')

# Registration Logic for Public Users
@csrf_exempt
def register_public(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Check for duplicate username or email
            if User.objects.filter(username=data['username']).exists():
                return JsonResponse({'error': 'Username already taken'}, status=400)
            if User.objects.filter(email=data['email']).exists():
                return JsonResponse({'error': 'Email already registered'}, status=400)

            # Create the user
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['fullName']
            )
            user.role = User.Role.PUBLIC
            user.save()

            # Log the user in immediately
            login(request, user)
            return JsonResponse({'success': True, 'username': user.username})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)

# Unified Login API (Works for Admin, Law, and Public)
@csrf_exempt
def login_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        required_role = data.get('role')  # e.g., 'PUBLIC', 'ADMIN'

        user = authenticate(request, username=username, password=password)

        if user is not None:
            if user.role == required_role:
                login(request, user)
                return JsonResponse({
                    'success': True,
                    'user': {
                        'username': user.username,
                        'role': user.role,
                        'fullName': user.first_name
                    }
                })
            else:
                return JsonResponse({'error': f'This account does not have {required_role} access.'}, status=403)
        else:
            return JsonResponse({'error': 'Invalid username or password.'}, status=401)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def logout_view(request):
    logout(request)
    return redirect('landing')

# Dashboard views (existing logic)
@login_required
@role_required(['ADMIN'])
def admin_dashboard(request):
    crime_stats = CrimeIncident.objects.values('crime_type').annotate(count=Count('id'))
    return render(request, 'admin_dashboard.html', {'crime_stats': crime_stats, 'total_incidents': CrimeIncident.objects.count()})


@login_required
@role_required(['LAW'])
def law_dashboard(request):
    return render(request, 'law_dashboard.html', {'incidents': CrimeIncident.objects.all()[:10]})


@login_required
@role_required(['PUBLIC'])
def public_dashboard(request):
    return render(request, 'public_dashboard.html', {'safety_data': []})


# ----------------- Prevention APIs -----------------
from django.views.decorators.http import require_GET, require_http_methods
from collections import Counter, defaultdict
from .models import PreventionTip
from .models import CrimePhotoReport


@require_GET
def prevention_dataset_summary(request):
    """
    Returns dataset summary: districts, crimes, counts by district, total incidents.

    Data source resolution order:
      1) JSON file at path provided by settings.PREVENTION_DATASET_PATH or env PREVENTION_DATASET_PATH
      2) 'data/incidents.json' under project root
      3) fallback to CrimeIncident DB model

    The JSON file should be an array of objects; keys for district/crime_type are auto-detected.
    """
    logger = logging.getLogger(__name__)

    # Helper pick function to try likely keys
    def pick_field(obj, keys):
        for k in keys:
            if isinstance(obj, dict) and k in obj:
                v = obj.get(k)
                if v is not None and str(v).strip() != "":
                    return str(v).strip()
        return ""

    def normalize_district(v):
        return str(v).strip() if v else ""

    def normalize_crime_type(v):
        return str(v).strip().lower() if v else "unknown"

    # 1) Try configured dataset file
    dataset_path = getattr(settings, 'PREVENTION_DATASET_PATH', None) or os.environ.get('PREVENTION_DATASET_PATH')
    if not dataset_path:
        project_root = getattr(settings, 'BASE_DIR', os.path.abspath(os.curdir))
        dataset_path = os.path.join(project_root, 'data', 'incidents.json')

    incidents = []
    source = 'none'

    try:
        if dataset_path and os.path.exists(dataset_path):
            with open(dataset_path, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
            if isinstance(data, list):
                for row in data:
                    district = pick_field(row, ['incident_district', 'district', 'District', 'DISTRICT', 'location', 'thana'])
                    crime_type = pick_field(row, ['crime_type', 'type', 'Crime Type', 'crime', 'Crime'])
                    district_n = normalize_district(district)
                    crime_n = normalize_crime_type(crime_type)
                    if district_n:
                        incidents.append({'district': district_n, 'crime_type': crime_n})
            source = 'file'
            logger.info(f"Loaded {len(incidents)} incidents from file: {dataset_path}")
        else:
            logger.info(f"Dataset file not found at {dataset_path}, falling back to DB.")
    except Exception:
        logger.exception("Failed to read dataset file; falling back to DB.")

    # 2) Fallback to DB if file provides no incidents
    if not incidents:
        qs = CrimeIncident.objects.all()
        for r in qs:
            d = normalize_district(getattr(r, 'incident_district', '') or '')
            c = normalize_crime_type(getattr(r, 'crime_type', '') or '')
            if d:
                incidents.append({'district': d, 'crime_type': c})
        if incidents:
            source = 'db'
            logger.info(f"Loaded {len(incidents)} incidents from DB (CrimeIncident table)")

    # Build summary
    by_district = defaultdict(list)
    for row in incidents:
        d = row.get('district') or ''
        c = row.get('crime_type') or 'unknown'
        if d:
            by_district[d].append(c)

    districts = sorted(by_district.keys())
    crimes = sorted(list({c for d in by_district for c in by_district[d]}))

    counts = {}
    for d in districts:
        ctr = Counter(by_district[d])
        counts[d] = dict(ctr)

    total_incidents = sum(sum(counts[d].values()) for d in counts)

    resp = {
        'districts': districts,
        'crimes': crimes,
        'counts': counts,
        'total_incidents': total_incidents,
        'source': source,
    }

    if not incidents:
        resp['note'] = 'No incidents found from file or DB. Ensure dataset file exists or DB has rows.'

    return JsonResponse(resp)


@require_GET
def prevention_tips(request):
    crime_type = (request.GET.get('crime_type') or '').strip().lower()
    qs = PreventionTip.objects.filter(is_approved=True)
    if crime_type:
        qs = qs.filter(crime_type=crime_type)

    tips = [{
        'id': t.id,
        'crime_type': t.crime_type,
        'text': t.text,
        'created_by_role': t.created_by_role,
        'created_by_name': t.created_by_name,
        'created_at': t.created_at.isoformat(),
    } for t in qs.order_by('-created_at')[:200]]

    return JsonResponse({'tips': tips})


@csrf_exempt
@require_http_methods(['POST'])
def add_prevention_tip(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    crime_type = (payload.get('crime_type') or '').strip().lower()
    text = (payload.get('text') or '').strip()
    role = (payload.get('role') or 'public').strip().lower()
    name = (payload.get('name') or '').strip()

    if not crime_type or not text:
        return JsonResponse({'error': 'crime_type and text required'}, status=400)

    if len(text) > 500:
        return JsonResponse({'error': 'Tip too long (max 500 chars)'}, status=400)

    tip = PreventionTip.objects.create(
        crime_type=crime_type,
        text=text,
        created_by_role=role,
        created_by_name=name,
        is_approved=True
    )

    return JsonResponse({'ok': True, 'id': tip.id})


# ----------------- Crime Photo Report APIs -----------------
@csrf_exempt
@require_http_methods(['POST'])
def upload_crime_photo(request):
    # Expect multipart/form-data with 'image' file and fields: district, crime_type, description
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)

    image = request.FILES.get('image')
    district = request.POST.get('district', '').strip()
    crime_type = request.POST.get('crime_type', '').strip().lower()
    description = request.POST.get('description', '').strip()

    if not image or not district or not crime_type:
        return JsonResponse({'error': 'image, district and crime_type are required'}, status=400)

    if len(district) > 200 or len(crime_type) > 50:
        return JsonResponse({'error': 'invalid fields'}, status=400)

    try:
        report = CrimePhotoReport.objects.create(
            image=image,
            district=district,
            crime_type=crime_type,
            description=description
        )
        return JsonResponse({'ok': True, 'id': report.id})
    except Exception as e:
        logging.exception('Failed to save CrimePhotoReport')
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def list_crime_photos(request):
    qs = CrimePhotoReport.objects.all().order_by('-created_at')
    data = []
    for p in qs:
        img_path = p.image.url if hasattr(p.image, 'url') else str(p.image)
        data.append({
            'id': p.id,
            'district': p.district,
            'crime_type': p.crime_type,
            'description': p.description,
            'image': img_path,
            'created_at': p.created_at.isoformat(),
        })
    return JsonResponse(data, safe=False)


# ----------------- Live Location Sharing -----------------
@csrf_exempt
@require_http_methods(['POST'])
def update_live_location(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    latitude = payload.get('latitude')
    longitude = payload.get('longitude')
    location_link = payload.get('locationLink')
    email = payload.get('email')

    if latitude is None or longitude is None or not location_link:
        return JsonResponse({'error': 'latitude, longitude, locationLink required'}, status=400)

    if not isinstance(location_link, str) or len(location_link) > 512:
        return JsonResponse({'error': 'Invalid locationLink'}, status=400)

    user = None
    if request.user.is_authenticated:
        user = request.user
    elif email:
        user = User.objects.filter(email=email).first()

    if not user:
        return JsonResponse({'error': 'User not found'}, status=404)

    try:
        UserLiveLocation.objects.update_or_create(
            user=user,
            defaults={
                'latitude': float(latitude),
                'longitude': float(longitude),
                'location_link': location_link,
            },
        )
    except Exception:
        logging.exception('Failed to update live location')
        return JsonResponse({'error': 'Failed to update live location'}, status=500)

    return JsonResponse({'ok': True})


# ----------------- Emergency SOS -----------------
@csrf_exempt
@require_http_methods(['POST'])
def trigger_sos(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    phone = (payload.get('phone') or '').strip()
    latitude = payload.get('latitude')
    longitude = payload.get('longitude')
    location_link = payload.get('locationLink')

    if not location_link:
        return JsonResponse({'error': 'locationLink required'}, status=400)

    user_obj = request.user if request.user.is_authenticated else None

    try:
        SOSAlert.objects.create(
            user=user_obj,
            phone=phone,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None,
            location_link=str(location_link),
            status='Emergency Active'
        )
    except Exception as e:
        logging.exception('Failed to create SOSAlert')
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'success': True})


# ----------------- Chat With Authorities -----------------
@csrf_exempt
def send_chat_message(request):
    """Endpoint for public users to send chat messages to authorities."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    text = (data.get('message', '') or '').strip()
    recipient_role = (data.get('recipient_role', 'ADMIN') or 'ADMIN').strip()
    sender_name = (data.get('sender_name', '') or '').strip()

    if not text:
        return JsonResponse({'error': 'message is required'}, status=400)

    try:
        sender = request.user if request.user.is_authenticated else None
        name = (
            (sender.first_name if sender and sender.first_name else None)
            or (sender.username if sender else None)
            or sender_name
            or 'Anonymous'
        )

        msg = ChatMessage.objects.create(
            sender=sender,
            sender_name=name,
            recipient_role=str(recipient_role).upper(),
            message=text,
        )
        return JsonResponse({'success': True, 'id': msg.id, 'created_at': msg.created_at.isoformat()})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def get_chat_messages(request):
    """Return recent chat messages (usable by public users, law, or admins)."""
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    msgs = ChatMessage.objects.all().values(
        'id', 'sender_name', 'recipient_role', 'message', 'created_at'
    )[:500]
    return JsonResponse(list(msgs), safe=False)


@api_view(["GET"])
def test_email(request):
    send_mail(
        subject="AlertHub Test",
        message="SMTP is working successfully!",
        from_email="alerthub.project@gmail.com",
        recipient_list=["YOUR_PERSONAL_EMAIL@gmail.com"],
        fail_silently=False,
    )

    return Response({"message": "Email sent"})

