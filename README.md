# CrimePredict (Crime Prediction + Reporting + Authority Chat)

## Overview
This project is a web application that enables:
- Public users to report incidents (with urgency, district, crime type, description, and optional photo evidence)
- Real-time chat between users and authorities/admin using WebSockets
- Admin/authority workflows (mail/inbox components exist in the codebase)
- News integration (via a dedicated `news` Django app)

## Tech Stack
### Frontend
- **React** (v19)
- **Vite** build tooling
- **react-router-dom** for routing
- TypeScript

### Backend
- **Django 6**
- **Django REST Framework (DRF)**
- **Django Channels** + **Daphne** for WebSockets
- **Redis-ready** (Channels layer and Django cache can use `REDIS_URL`; defaults to in-memory cache/channel layer for dev)
- **Email** via Django email backend (SMTP or console fallback)

### Real-time / WebSockets
- WebSocket endpoint:
  - `ws/chat/<room_id>/`
- Implemented by `backend/backend/ws_chat/consumers.py`
- Maintains **per-room chat history in Django cache** (last **100** messages, TTL **30 days**)

### Data model (core)
- `incident_reporting.Incident`
  - reporter (`users.User`)
  - `reporter_email`
  - `district`, `crime_type`
  - `incident_datetime`
  - `urgency_level` (low/medium/high)
  - `description`
  - optional `photo_evidence`
- `incident_reporting.ChatMessage`
  - chat messages between public users and authorities/admin

## Key Features
- **Incident Reporting**
  - District + crime type categorization
  - Urgency level tagging (low/medium/high)
  - Timestamped incident records
  - Optional photo evidence upload

- **Public ↔ Authority Real-time Chat**
  - WebSocket-based chat rooms (`room_id`)
  - Sends/receives JSON messages containing sender, role, message, timestamp, and userId
  - Automatic chat history replay on connect

- **Admin/Authority Inbox & Mail (app modules present)**
  - `mail_admin` and `users` apps are included
  - Frontend components for Admin dashboard/inbox/mail exist

- **News Integration (app module present)**
  - `news` Django app is included

## Setup & Run
### 1) Frontend
```bash
npm install
```

```
Run the Vite dev server:
```bash
npm run dev
```

### 2) Backend (Django)
Backend dependencies are in:
- `backend/requirements.txt`

Common dev flow:
1. Create/activate a virtual environment (optional but recommended)
2. Install backend requirements
3. Run Django migrations
4. Start Django/ASGI so WebSockets work (Channels)

> Notes:
> - Default database is SQLite (`db.sqlite3`).
> - To enable Redis-backed behavior (cache + Channels layer), set `REDIS_URL`.
> - Email defaults to SMTP unless `EMAIL_MODE` is changed in `backend/backend/settings.py`.

## Environment Variables
- **REDIS_URL** (optional): enables Redis for cache/channel layers
- **EMAIL_MODE** (in `backend/backend/settings.py`): `smtp` or `console`

## Repository Structure (high level)
- `backend/`
  - Django project + apps (`users`, `news`, `mail_admin`, `incident_reporting`, etc.)
  - WebSocket consumer: `backend/backend/ws_chat/consumers.py`
- `src/`
  - React UI components (public chat, authority inbox, dashboards)

## Notes
- Chat history is stored in cache (not a long-term DB table for chat history). The Django `ChatMessage` model exists, but the WebSocket consumer uses Django cache to replay recent history per room.

