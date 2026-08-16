# KisanMitra AI — PRD

## Original Problem Statement
Build a polished, mobile-first Progressive Web App "KisanMitra AI — Your AI Farming Companion" (Speak. Show. Understand. Act.). An accessible AI farming decision-support platform for Indian farmers with limited digital literacy, difficulty typing/reading, regional-language preference, and unreliable internet. Core journey: Type/Speak/Show a crop problem → AI assessment → Action plan → Read/Listen → Save task → Find government schemes → Find farm supplies → Farm history (offline).

## User Choices (locked)
- AI model: **Gemini 3.1 Pro** (`gemini-3.1-pro-preview`) for text + image analysis
- Voice: **OpenAI Whisper** (STT) + **OpenAI TTS** (`tts-1`, voice "nova") via Emergent LLM key
- Languages: **English, Hindi, Tamil, Telugu** (UI translated + AI responds in selected language)
- Schemes: **Curated real Indian schemes** (PM-KISAN, PMFBY, KCC, Soil Health Card, PMKSY, PM-KUSUM, e-NAM, AIF) + AI matching, official links
- Auth: **Email/password JWT** with cloud sync (MongoDB)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor), emergentintegrations (LlmChat Gemini, OpenAISpeechToText, OpenAITextToSpeech). Curated data in `schemes_data.py`.
- Auth: JWT Bearer (localStorage `km_token`), bcrypt hashing, admin seeded on startup.
- Frontend: React (CRA + craco, `@` alias), mobile-first max-w-md shell, bottom nav, sonner toasts, PWA (manifest + service worker), localStorage offline cache.
- Design: Organic/Earthy green theme, Manrope + IBM Plex Sans, oversized accessible touch targets.

## User Personas
- Small/marginal farmer, low digital literacy, prefers speaking, regional language, intermittent internet.

## Implemented (2026-06 / first MVP)
- Auth (register/login/me), protected routes, admin seed
- Home: Speak/Type/Show primary actions + shortcuts + Try Demo
- Farm Assessment (`/assess`): text/voice/image + optional details → structured dashboard (status, factors, possible factors, image observations, action plan Today/Next/If-changes, Why accordion, confidence, important note) → Read/Listen, Save as Task; saved to history + offline cache; AgentSwarm visualization
- AI Assistant chat (text/voice/image, Listen on replies)
- Today's Plan (AI daily checklist)
- Government Schemes: list, search, category filter, detail (official source, docs, Remind Me→task), AI "Find Schemes for Me" matching (High/Med/Low)
- Farm Guide (7 articles + Listen), My Farm CRUD, Tasks CRUD (priority/due/toggle), Farm History (offline), Supplies (location + maps search, honest no-fake-data labels), Settings (language, About AI, delete data, logout)
- Multilingual UI (EN/HI/TA/TE) + localized AI output
- Voice: Whisper STT (`/api/stt`), OpenAI TTS (`/api/tts`) with browser-speech fallback
- PWA: installable manifest, service worker (API never cached), offline saved content

## Testing
- iteration_1: backend 100% (16/16), frontend 100% (15/15). No critical/minor issues.
- iteration_2 (Weather, Reminders, Voice Onboarding, Photo Diary): backend 100% (13/13 new), frontend 100%. No blocking issues. Hardened diary endpoints (malformed id -> 404).

## Implemented — iteration 2 (2026-06)
- Live Weather: `/api/weather` (Open-Meteo, keyless) current + 3-day forecast; WeatherCard on Home; weather context fed into AI assessment and daily plan.
- Push Reminders: browser Notification permission toggle in Settings; local reminders fire for due/overdue tasks when app is open (`lib/notifications.js`).
- Voice-First Onboarding: `/api/farm/extract` (Gemini) turns spoken description into a structured farm profile; mic "Speak to set up" in My Farm add-farm sheet prefills fields.
- Crop Photo Diary: `/api/diary` upload to Emergent Object Storage, dated timeline at `/diary`, images served as auth'd blobs; soft-delete.

## Backlog (not built)
- P1: Live weather API context; browser push notifications for reminders
- P2: Multiple farm profiles surfacing recent assessments/schemes per farm; scheme deadline reminders (only if verified deadlines added)
- P3: Premium features (advanced image analysis, extended history), supplier business profiles
- Non-blocking code review: split server.py into routers; add Pydantic input models for farms/tasks; validate STT content-type/size; tighten CORS for prod.
