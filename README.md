# TrendPulse

TrendPulse is a real-time social sentiment intelligence dashboard for crisis monitoring. It combines MongoDB-backed ingestion, ML sentiment inference, explainability views, alerting, and an interactive command center UI.

## Core Capabilities

- Real-time sentiment monitoring and crisis scoring
- ML inference pipeline (BERT + VADER support)
- Explainable AI panel:
  - top negative semantic drivers
  - model disagreement view (VADER vs BERT)
- Auto-alert pipeline when score crosses thresholds
- Alert notifications:
  - webhook
  - Slack webhook
  - email (SMTP)
- Platform-wise sentiment cards (Twitter/Reddit/YouTube)
- Top negative influencers panel
- Crisis replay mode
- Incident PDF export with model output badges

## Tech Stack

- Backend: Flask, PyMongo, Flask-Login, Flask-CORS
- Database: MongoDB
- ML/NLP: Transformers pipeline + VADER
- Frontend: HTML/JS dashboard (`public/`) and React frontend (`frontend/`)

## Repository Layout

- `trendpulse/` Flask app package and API routes
- `public/` dashboard UI and settings pages served by Node static app
- `frontend/` Vite/React frontend (optional alternate UI)
- `trendpulse_model/` local model files
- `live_simulator.py` synthetic live post stream generator
- `server.js` static UI server (port 3000)

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB local service

## Setup

Install Python dependencies:

```bash
pip install -r requirements.txt
pip install -r trendpulse/requirements.txt
```

Install frontend dependencies (optional React UI):

```bash
cd frontend
npm install
```

## Environment Variables

Create `.env` in repo root (or in `trendpulse/` depending on your launch path):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/trendpulse
JWT_SECRET=change-this-in-env
SECRET_KEY=trendpulse-dev-key
MODEL_DIR=./trendpulse_model

# Optional notifications
ALERT_WATCH_THRESHOLD=40
ALERT_CRISIS_THRESHOLD=70
ALERT_COOLDOWN_SECONDS=300
ALERT_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
ALERT_EMAIL_TO=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

## Run (Recommended)

Start Flask API (port 5000):

```bash
cd trendpulse
python run.py
```

Start static dashboard server (port 3000):

```bash
node server.js
```

Start live data simulator:

```bash
python live_simulator.py
```

Open dashboard:

- `http://127.0.0.1:3000/dashboard.html`

Open alert settings page:

- `http://127.0.0.1:3000/alert-settings.html`

## Key APIs

- Health: `GET /api/health`
- Stats: `GET /api/stats`
- Crisis score: `GET /api/crisis-score`
- Posts: `GET /api/posts`
- Spike simulation: `POST /api/posts/spike`
- ML dataset feed: `GET /api/ml/dataset-feed`
- Explainability summary: `GET /api/explainability/summary`
- Alert settings: `GET/POST /api/alert-settings`
- Test notification: `POST /api/alerts/notify/test`
- Recent alerts: `GET /api/alerts/recent`

## Alerting Pipeline Behavior

- Crisis score is evaluated on each `/api/crisis-score` request.
- If score crosses watch/crisis thresholds and cooldown allows, alert is auto-created.
- Notification dispatch attempts configured channels (webhook/slack/email).

## Troubleshooting

- If dashboard widgets are empty, ensure Flask is running on `5000` and dashboard is served on `3000`.
- If model endpoints are slow on first call, that is model warm-up; subsequent calls are cached.
- If email notifications fail, verify SMTP settings and network access.
- If Mongo connection fails, confirm local service and `MONGO_URI`.
