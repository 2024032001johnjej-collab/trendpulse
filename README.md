# TrendPulse

TrendPulse is a social sentiment intelligence project with a Node-served dashboard UI, optional Flask sentiment services, and MongoDB-backed persistence.

Current implementation supports both:
- demo visualization mode (default in dashboard pages)
- live X + Flask sentiment pipeline (backend endpoints)

## New Dashboard Features

The dashboard now includes the following live/demo capabilities:

- Crisis Early Warning Score (0-100)
  - Formula: `(negativeCount / totalPosts) * 100`
  - Animated semi-circle gauge (Chart.js doughnut)
  - Dynamic status badge: `SAFE` (0-39), `WATCH` (40-69), `CRISIS` (70-100)

- Recommended Action Panel
  - `< 40`: Continue monitoring. No action required.
  - `40-69`: Escalate to PR team. Prepare holding statement.
  - `>= 70`: Issue public statement immediately. Alert leadership.

- Demo Spike Trigger
  - Sidebar button: `Inject Spike`
  - Injects 20 negative posts instantly for live demo impact
  - Designed to push Crisis Score above 70 and show crisis alert banner

- Sentiment Confidence in Feed
  - Each post now shows confidence badge, e.g. `Negative - 94% confident`
  - Color coded by sentiment (green/yellow/red)

- Download Report
  - `Download Report` button triggers `window.generatePDFReport()`
  - Exports `TrendPulse_Intel_Report_YYYY-MM-DD.pdf` with intelligence summary, KPIs, charts, and recommendations

- Comparative Hashtag View
  - Two hashtag inputs (e.g. `#AI` vs `#Tech`)
  - Side-by-side mini sentiment bar charts from current post dataset

## Current Status (Important)

- Main dashboard UI in `public/dashboard.html` is running demo visualization mode by default via `DEMO_MODE` in `public/dashboard.js`.
- Twitter analysis UI in `public/twitter-analysis.html` is running local realistic demo generation (no API dependency for rendering).
- Node backend still exposes live endpoints such as `/api/x/analyze` and `/api/x/config`.
- Auth flow and logout are enabled in dashboard pages.
- Dashboard includes crisis gauge, recommended action panel, spike trigger, confidence badges, download/print flow, and comparative hashtag charts.

## Project Structure

- `server.js`: Node server for auth endpoints, static pages, and X analysis endpoints
- `public/`: primary dashboard pages and scripts
  - `dashboard.html` + `dashboard.js`
  - `twitter-analysis.html`
  - `login.html`, `signup.html`
- `flask_sentiment.py`: standalone Flask sentiment API (`/api/analyze`, `/api/analyze/batch`, `/api/model/info`)
- `trendpulse/`: additional Flask app package and routes
- `frontend/`: optional React/Vite UI
- `models/`, `middleware/`: Node models and auth middleware

## Tech Stack

- Node.js + Express (main app server)
- MongoDB + Mongoose (persistence)
- Flask + Transformers + VADER (sentiment APIs)
- HTML/CSS/JS dashboards and optional React frontend

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (optional for demo UI, required for full persistence)

## Environment Configuration

Create/update `.env` in repo root:

```env
PORT=5001
# Node runs on 5001, Flask runs on 5000 - do not conflict
MONGO_URI=mongodb://127.0.0.1:27017/trendpulse
JWT_SECRET=your-random-32-char-secret
SECRET_KEY=replace-with-a-strong-secret
MODEL_DIR=./trendpulse_model

# Live pipeline controls
SAMPLE_DATA_MODE=true
FLASK_API=http://localhost:5000

# X settings (for backend live endpoints)
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_BEARER_TOKEN=
X_AUTO_INGEST_ENABLED=true
X_SEARCH_QUERY="AI OR #AI -is:retweet lang:en"
X_SEARCH_MAX_RESULTS=30
X_INGEST_COOLDOWN_SECONDS=8
```

Notes:
- Dashboard pages currently render demo visualizations even if live credentials fail.
- Backend live endpoint `/api/x/analyze` still requires valid X bearer and Flask reachability.
- Keep Node on port `5001` and Flask on `5000`.

## Install

Python dependencies:

```bash
pip install -r requirements.txt
pip install -r trendpulse/requirements.txt
```

Node dependencies:

```bash
npm install
```

Optional React frontend:

```bash
cd frontend
npm install
```

## Run

Start Node server (serves dashboard + auth):

```bash
node server.js
```

Start Flask sentiment API (recommended):

```bash
python flask_sentiment.py
```

Alternative npm command:

```bash
npm start
```

Open dashboards:

- http://localhost:5001/dashboard.html
- http://localhost:5001/twitter-analysis.html

Demo tip:
- In dashboard sidebar click `Inject Spike` for the crisis escalation demo moment.

## Auth

- Login/signup is enabled through Node auth endpoints.
- Dashboard has logout wired for both desktop and mobile controls.

## Key Node Endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/x/analyze` (live X + Flask sentiment pipeline)
- `GET /api/x/config`

## Key Flask Sentiment Endpoints (`flask_sentiment.py`)

- `POST /api/analyze`
- `POST /api/analyze/batch`
- `GET /api/model/info`
- `GET /api/health`

## Demo Mode Behavior

`public/dashboard.js`
- `DEMO_MODE=true` currently generates realistic local posts, sentiment counts, hourly trends, word cloud terms, and crisis score.
- Comparative hashtag charts read from the same in-memory feed data.

`public/twitter-analysis.html`
- Uses local realistic generator for feed, KPI cards, keywords, and themes.
- Live toggle refreshes demo data every 15 seconds.

## Troubleshooting

- If `/api/x/analyze` returns `401 Unauthorized`, X developer credentials or access tier are not accepted by X.
- If Flask and Node share the same port accidentally, ensure Node stays on `5001` and Flask on `5000`.
- If dashboard appears empty, hard refresh browser (Ctrl+F5) to clear stale JS cache.
