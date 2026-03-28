# TrendPulse - Flask Backend Integration (Commit 4d744e4)

## Summary
Pulled GitHub commit `4d744e4` and integrated the updated public UI files (HTML/CSS/JS) with the Flask backend API on port 5000. The public HTML files now connect directly to Flask APIs instead of using mock data.

## System Architecture

### Backend Stack
- **Flask** (Python) - Main API server on `http://localhost:5000`
- **MongoDB** - Database for posts, users, and analytics
- **Live Simulator** - `live_simulator.py` generates continuous social media posts
- **Port**: 5000

### Frontend Options (Both Supported)

#### Option 1: React Frontend (Recommended for Development)
- **Framework**: React + Vite
- **Port**: 5173 (dev) / production build
- **Location**: `frontend/`
- **Flow**: Direct API calls to Flask on 5000
- **Features**: Real-time polling, live dashboard, admin console

#### Option 2: Public HTML Frontend (Updated from Commit 4d744e4)
- **Framework**: HTML/CSS/JavaScript
- **Port**: Needs Node Express server to be served
- **Location**: `public/`
- **Connection**: Updated to use Flask APIs at `http://localhost:5000`
- **Files Updated**:
  - `public/dashboard.js` - Changed from simulation to Flask polling
  - `public/login.js` - Updated API endpoint base URL
  - `public/signup.js` - Updated API endpoint base URL

## Configuration Changes Made

### 1. dashboard.js (Public HTML)
```javascript
// Before: Used /api/auth/me (relative path)
// After: https://localhost:5000/api/auth/me (Flask backend URL)

const API_BASE = 'http://localhost:5000';
```

**Key Changes:**
- Replaced simulation functions with `pollFlaskBackend()` that fetches real data from Flask APIs
- Replaced `/api/stats?hours=24` polling with live backend data
- `triggerSpikeBtn` now calls Flask spike endpoint instead of generating posts locally
- Crisis score, charts, and word cloud now display real MongoDB data

### 2. login.js (Public HTML)
```javascript
// Before: fetch('/api/auth/login', ...)
// After: fetch('http://localhost:5000/api/auth/login', ...)

const API_BASE = 'http://localhost:5000';
```

### 3. signup.js (Public HTML)
```javascript
// Similar update to login.js
const API_BASE = 'http://localhost:5000';
```

## Running the System

### 1. Start MongoDB
```powershell
# Verify service is running
Get-Service MongoDB  # Should show "Running"
```

### 2. Start Live Simulator (Live Post Generation)
```powershell
cd c:\Dinesh\trendpulse
python live_simulator.py
```
This continuously generates realistic social media posts with automated crisis events.

### 3. Start Flask Backend API Server
```powershell
cd c:\Dinesh\trendpulse\trendpulse
python run.py
# Server starts on http://localhost:5000
```

### 4. Option A: Start React Frontend (Recommended)
```powershell
cd c:\Dinesh\trendpulse\frontend
npm run dev
# Dashboard available at http://localhost:5173/
```

### 4. Option B: Start Express Server for Public HTML
```powershell
cd c:\Dinesh\trendpulse
node server.js
# Public files available at http://localhost:3000/
```
(Note: Would need to update server.js port to 3000 to avoid conflict with Flask)

## Flask API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/login` | POST | User login, returns JWT |
| `/api/auth/me` | GET | Get profile (requires auth) |
| `/api/stats` | GET | Sentiment counts, hourly breakdown |
| `/api/crisis-score` | GET | Crisis scoring algorithm output |
| `/api/posts` | GET | Latest posts with pagination |
| `/api/wordcloud` | GET | Word frequency data |
| `/api/posts/spike` | POST | Inject negative posts (demo) |

## Frontend Polling Flow (Updated from Commit 4d744e4)

```
Public HTML Dashboard (public/dashboard.js)
    ↓
Every 2 seconds: pollFlaskBackend()
    ↓
Fetch from Flask APIs
    - GET /api/stats? 
    - GET /api/crisis-score
    - GET /api/posts
    - GET /api/wordcloud
    ↓
MongoDB (returns real data)
    ↓
Update UI Charts, Crisis Score, Word Cloud, Post Feed
```

## Data Flow

1. **Live Simulator** → Creates posts in MongoDB every 1-3 seconds
2. **Flask Backend** → Queries MongoDB, calculates metrics
3. **Frontend (Public HTML or React)** → Polls Flask APIs every 2 seconds
4. **Dashboard** → Displays real-time sentiment trends

## Testing The Integration

### Test 1: Verify Flask is Running
```powershell
$base = 'http://localhost:5000'
Invoke-WebRequest "$base/api/health" | FL
# Expected: mongo_connected: true, service: "TrendPulse Flask API"
```

### Test 2: Access Public Dashboard
```
http://localhost:3000/dashboard.html  # If Express server running
or
http://localhost:5173/                # If React dev server running
```

### Test 3: Test Spike Injection
```powershell
$base = 'http://localhost:5000'
Invoke-WebRequest "$base/api/posts/spike" -Method Post `
  -ContentType 'application/json' `
  -Body '{"count":20}'
```

Then check dashboard - crisis score should increase within 2 seconds.

## File Structure

```
trendpulse/
├── public/                    # HTML/CSS/JS UI (updated from commit 4d744e4)
│   ├── dashboard.html         # Main dashboard
│   ├── dashboard.js           # ✅ Updated to use Flask APIs
│   ├── login.html
│   ├── login.js               # ✅ Updated to use Flask APIs
│   ├── signup.html
│   ├── signup.js              # ✅ Updated to use Flask APIs
│   └── *.jpeg, *.jpg          # Assets from commit 4d744e4
├── trendpulse/
│   ├── run.py                 # Flask app entry point
│   ├── backend/
│   │   ├── __init__.py        # Flask app factory, MongoDB connection
│   │   ├── routes/
│   │   │   └── api.py         # All API endpoints
│   │   └── models/
│   │       ├── post.py        # Post model, MongoDB queries
│   │       └── user.py        # User model, auth logic
│   └── requirements.txt
├── frontend/                  # React Vite app (alternative UI)
│   ├── src/
│   │   └── pages/
│   │       └── DashboardPage.jsx  # Real-time polling dashboard
│   └── package.json
├── live_simulator.py          # ✅ Generates live social media posts
└── .env                       # Flask config (MONGO_URI, JWT_SECRET, etc)
```

## Commit Details

**Commit**: `4d744e4`
**Author**: ManasTawde45
**Message**: Updated Changes
**Date**: Sat Mar 28 13:43:35 2026 +0530

**Files Modified**:
- `buildPdfEngine.js` - Simplified
- `injectBigLogos.js` - New utility
- `public/admin-login.html` - UI updates
- `public/admin.html` - UI updates
- `public/dashboard.html` - UI updates ✅
- `public/dashboard.js` - UI updates (WE INTEGRATED WITH FLASK)
- `public/login.html`, `signup.html` - UI updates ✅
- New logo assets: `dark.jpeg`, `light.jpeg`, `sprite-logo.jpg`

## Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| MongoDB Connection | ✅ Running | Service online, DB connected |
| Flask Backend | ✅ Running | Listening on 5000 |
| Live Simulator | ✅ Running | Generating posts continuously |
| React Frontend | ✅ Working | Polls Flask, real-time updates |
| Public HTML UI | ✅ Updated | Now connects to Flask APIs |
| Admin Console | ✅ Available | React-based admin panel |
| Crisis Detection | ✅ Functional | Auto-triggers every ~20 posts |

## Next Steps

1. **Option A (Recommended)**: Use React frontend
   - Already configured and optimized
   - Better TypeScript support and error handling
   - Built-in admin console

2. **Option B**: Serve public HTML files
   - Update `server.js` to run on port 3000 instead of 5000
   - Configure Express to proxy API calls to Flask
   - Or serve static files and let browser fetch from Flask directly

3. **Deploy**: Docker containerize the Flask app with MongoDB

## Demo Script

```
1. Start MongoDB service
2. Start live_simulator.py
3. Start Flask backend (trendpulse/run.py)
4. Open frontend (React or public HTML)
5. Watch dashboard update in real-time
6. Click "Simulate Crisis Spike" to inject 20 negative posts
7. Observe crisis score jump within 2 seconds
8. Crisis events auto-trigger every ~20 natural posts
```

## Notes

- **CORS**: Enabled in Flask to allow cross-origin requests from frontend
- **Authentication**: JWT tokens stored in localStorage, passed in Authorization header
- **Database**: MongoDB with PyMongo driver for async operations
- **Real-time**: 2-second polling interval provides near-real-time updates
- **Crisis Events**: Simulator auto-triggers high-negativity periods for realistic testing

---
**Last Updated**: March 28, 2026 (After GitHub Commit 4d744e4 Integration)
