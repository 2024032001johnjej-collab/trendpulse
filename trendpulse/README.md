# 📡 TrendPulse — Social Media Trend & Sentiment Dashboard

> Hackathon 2026 · Cyber Techies · Xavier's Institute of Engineering

---

## ⚡ Quick Start

### 1. Prerequisites

- Python 3.9+
- MongoDB running locally on port 27017

Install MongoDB: https://www.mongodb.com/try/download/community

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Edit `.env` if your MongoDB URI is different:

```
MONGO_URI=mongodb://localhost:27017/trendpulse
SECRET_KEY=trendpulse-secret-key-2026
```

### 4. Run the App

```bash
python run.py
```

Visit: http://localhost:5000

---

## 🗂️ Project Structure

```
trendpulse/
├── run.py                   # App entry point
├── requirements.txt
├── .env                     # Environment config
├── backend/
│   ├── __init__.py          # App factory (Flask + MongoDB init)
│   ├── models/
│   │   ├── user.py          # User model (MongoDB)
│   │   └── post.py          # Post model (MongoDB + VADER sentiment)
│   └── routes/
│       ├── auth.py          # Login / Register / Logout
│       ├── dashboard.py     # Dashboard page
│       └── api.py           # REST API endpoints
└── frontend/
    ├── templates/
    │   ├── base.html
    │   ├── auth/
    │   │   ├── login.html
    │   │   └── register.html
    │   └── dashboard/
    │       └── home.html
    └── static/
```

---

## 🗄️ MongoDB Collections

### `users`
| Field     | Type   | Description              |
|-----------|--------|--------------------------|
| _id       | ObjectId | Auto-generated         |
| username  | String | Unique username          |
| email     | String | Lowercase email          |
| password  | String | Bcrypt-hashed password   |

### `posts`
| Field           | Type     | Description                     |
|-----------------|----------|---------------------------------|
| _id             | ObjectId | Auto-generated                  |
| content         | String   | Post text                       |
| username        | String   | Author                          |
| hashtags        | Array    | Extracted hashtags              |
| sentiment       | String   | positive / neutral / negative   |
| sentiment_score | Float    | VADER compound score (-1 to 1)  |
| created_at      | DateTime | UTC timestamp                   |

---

## 🔌 API Endpoints

| Method | Endpoint              | Description                |
|--------|-----------------------|----------------------------|
| GET    | `/api/posts`          | Fetch recent posts         |
| GET    | `/api/posts?tag=#AI`  | Filter by hashtag          |
| POST   | `/api/posts`          | Create a new post          |
| GET    | `/api/sentiment/counts` | Sentiment counts         |
| GET    | `/api/hashtags/top`   | Top trending hashtags      |

### POST /api/posts — Request Body
```json
{
  "content": "Loving the new #AI tools! 🚀",
  "username": "alice"
}
```

---

## 🚀 Features

- **Login / Register** with bcrypt-hashed passwords stored in MongoDB
- **Live Post Feed** — latest posts with sentiment badges
- **VADER Sentiment Analysis** — classifies every post in real-time
- **Doughnut Chart** — sentiment distribution visualization
- **Bar Chart** — top trending hashtags
- **Add Post** — analyze and save a post via the dashboard
- **REST API** — all data accessible via JSON endpoints
- **Sample Data** — 20 posts auto-seeded on first dashboard visit

---

## 🛠️ Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Frontend   | HTML5, Tailwind CSS, Chart.js |
| Backend    | Python, Flask               |
| Database   | MongoDB (via PyMongo)       |
| Auth       | Flask-Login + Flask-Bcrypt  |
| AI / NLP   | VADER Sentiment             |
