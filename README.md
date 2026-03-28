# TrendPulse Backend Run Guide

This repository currently contains:

- Flask sentiment API at `flask_sentiment.py` (uses your `trendpulse_model` directory)
- Full Flask web backend app at `trendpulse/run.py` (auth, posts, dashboard APIs)
- Legacy Node files (`server.js`, `public/`) from an earlier version

## 1. Prerequisites

- Python 3.9+
- MongoDB running locally (if you want the full web backend app)

## 2. Install Python Dependencies

From repository root:

```bash
pip install -r requirements.txt
```

## 3. Configure Environment

Copy `.env.example` to `.env` and update values as needed:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/trendpulse
JWT_SECRET=replace-with-a-strong-secret
SECRET_KEY=replace-with-a-strong-secret
MODEL_DIR=./trendpulse_model
```

## 4. Run Option A: Sentiment API (Model + VADER)

From repository root:

```bash
python flask_sentiment.py
```

Health check:

- http://localhost:5000/api/health

Main endpoints:

- POST `/api/analyze`
- POST `/api/analyze/batch`
- GET `/api/model/info`

Example request:

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"I love this product\",\"engine\":\"both\"}"
```

## 5. Run Option B: Full Flask Web Backend (Auth + Posts + Stats)

From the `trendpulse` folder:

```bash
cd trendpulse
python run.py
```

This starts the app at:

- http://localhost:5000

Available API routes include:

- GET `/api/posts`
- POST `/api/posts`
- GET `/api/stats`
- GET `/api/crisis-score`
- GET `/api/alerts`

## 6. Important Port Note

Both Flask apps default to port 5000.
Run only one at a time, or set a different `PORT` in `.env` before starting the second app.

## 7. Model Path Note

`flask_sentiment.py` now resolves `MODEL_DIR` safely. If `MODEL_DIR` is not set, it defaults to this repo's `trendpulse_model` folder.

## 8. Troubleshooting

- If Mongo connection fails: ensure MongoDB is running and `MONGO_URI` is correct.
- If model load fails: verify `trendpulse_model` contains `config.json`, tokenizer files, and model weights.
- If dependencies fail: run `pip install -r requirements.txt` again in the same Python environment used to run Flask.
