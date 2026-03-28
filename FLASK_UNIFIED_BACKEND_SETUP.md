# Flask-Only Backend Setup (Node Removed)

This guide runs everything from Flask so your frontend no longer depends on the Node server.

## What was migrated

- JSON auth APIs: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- Sentiment APIs: `/api/analyze`, `/api/analyze/batch`, `/api/model/info`
- Social APIs:
  - `/api/social/all/posts`
  - `/api/social/reddit`
  - `/api/social/youtube`
  - `/api/social/twitter`
  - `/api/social/reddit/real`
  - `/api/social/youtube/real`
  - `/api/social/twitter/real`
  - `/api/social/all/real`
- Persistence APIs:
  - `/api/posts/save`
  - `/api/posts/history`
  - `/api/posts/sentiment/<label>`
  - `/api/posts/crisis`
  - `/api/social/raw/store`

## Files changed

- `trendpulse/backend/routes/api.py`
- `frontend/src/pages/DashboardPage.jsx`
- `trendpulse/run.py`
- `trendpulse/requirements.txt`

## Run steps (Windows PowerShell)

1. Install Python packages for Flask backend:

```powershell
cd C:\Dinesh\trendpulse\trendpulse
pip install -r requirements.txt
```

2. Ensure MongoDB is running:

```powershell
# If installed as Windows service, start MongoDB from Services panel.
# Or run manually:
mongod --dbpath C:\data\db
```

3. Start unified Flask backend:

```powershell
cd C:\Dinesh\trendpulse\trendpulse
$env:PORT="5000"
python run.py
```

4. Start frontend:

```powershell
cd C:\Dinesh\trendpulse\frontend
npm install
npm run dev
```

5. Open app:

- http://localhost:5173

## Quick API smoke tests

```powershell
Invoke-RestMethod "http://localhost:5000/api/health"
Invoke-RestMethod "http://localhost:5000/api/social/all/posts"

$body = @{ text = "This product is amazing"; engine = "both" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/analyze" -Method Post -ContentType "application/json" -Body $body
```

## Real social media API integration: where to get keys

### Reddit

1. Go to https://www.reddit.com/prefs/apps
2. Create an app (`script` type).
3. Save:
   - client ID
   - client secret
   - user agent string

### YouTube

1. Go to https://console.cloud.google.com/
2. Create/select project.
3. Enable `YouTube Data API v3`.
4. Create API key.

### X (Twitter)

1. Go to https://developer.x.com/
2. Create a project and app.
3. Generate Bearer Token (and API key/secret if needed).

## How to wire real APIs into Flask

Implement external calls in `trendpulse/backend/routes/api.py` inside these handlers:

- `social_reddit_real`
- `social_youtube_real`
- `social_twitter_real`

Current code returns rate-limited enriched mock data and keeps response shape stable for frontend.

Recommended approach:

1. Read credentials from environment variables.
2. If credentials are missing, return current mock output.
3. If credentials exist, fetch real data from provider API.
4. Normalize fields to existing response format (`content`, `author`, `timestamp`, `platform`, engagement counts).
5. Optionally store raw payload via `/api/social/raw/store`.

## Suggested environment variables

Set these in your shell or `.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/trendpulse
JWT_SECRET=replace-with-a-strong-secret
MODEL_DIR=../trendpulse_model

REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=

YOUTUBE_API_KEY=

X_BEARER_TOKEN=
```

## Optional package suggestions for real ingestion

- Reddit: `praw`
- YouTube: `google-api-python-client`
- X: `requests` (or `tweepy`)

Install examples:

```powershell
pip install praw google-api-python-client tweepy requests
```

## Notes

- You no longer need to run `node server.js` for the frontend JSON APIs.
- The dashboard sentiment call now uses `/api/analyze` directly.
- If Mongo is unavailable, API endpoints return safe mock/fallback responses for demo continuity.
