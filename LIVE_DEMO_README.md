# TrendPulse Live Demo Runbook

This README is the exact 3-4 hour execution plan converted into concrete steps.

## Goal

Show a live "Monday morning crisis" story:

1. Normal sentiment stream
2. Spike injection (20 negative posts)
3. Crisis score jumps into CRISIS
4. Red alert banner appears
5. Charts and word cloud update live

## Prerequisites

- MongoDB Community Server installed and running
- Python dependencies installed in `trendpulse/`
- Frontend dependencies installed in `frontend/`

## Hour 1 - Unblock connection

1. Start MongoDB service.
2. Start Flask backend:

```powershell
cd C:\Dinesh\trendpulse\trendpulse
pip install -r requirements.txt
python run.py
```

3. Start frontend:

```powershell
cd C:\Dinesh\trendpulse\frontend
npm install
npm run dev
```

4. Open dashboard in browser and open DevTools Console (F12).
5. Verify no red CORS/fetch errors.

Quick API checks in browser:

- http://localhost:5000/api/posts
- http://localhost:5000/api/stats
- http://localhost:5000/api/crisis-score
- http://localhost:5000/api/wordcloud

## Hour 2 - Real charts + crisis score

Dashboard polls every 2 seconds and reads:

- `/api/stats` -> `{ positive, neutral, negative, hourly }`
- `/api/crisis-score` -> badge state
- `/api/posts` -> live feed

You should see donut + trend line moving from backend data.

## Hour 3 - Alert banner + word cloud + spike

1. Click `Simulate Crisis Spike` on dashboard.
2. Frontend calls:

- `POST /api/posts/spike` with count `20`

3. Backend inserts 20 negative posts.
4. Polling picks up spike and when `crisis_score >= 70` the red alert banner appears.
5. Word cloud updates from `/api/wordcloud`.

## Final 30-60 min - Freeze and rehearse

Stop coding and run this exact flow:

1. Register
2. Login
3. Open dashboard
4. Explain baseline charts
5. Trigger spike button
6. Show crisis score jump
7. Show red alert banner
8. Show word cloud + trend reaction

Narration line:

"This is the Monday morning crisis scenario. We ingest social signals, detect a negative velocity spike, and raise a real-time crisis alert with explainable metrics."

## Troubleshooting

### 1. `MongoDB is not connected`
- Start Mongo service and restart Flask.

### 2. `Failed to fetch` in console
- Ensure Flask is running on `http://localhost:5000`.
- Ensure frontend is running on `http://localhost:5173`.

### 3. No data in charts
- Run one spike injection, then refresh dashboard.
- Verify `/api/stats` returns non-zero counts.

### 4. No alert banner
- Crisis banner appears only when score >= 70.
- Inject spike again if score remains low.
