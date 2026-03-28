import os
import time
import random
from datetime import datetime, timedelta
from pathlib import Path

import jwt
from flask import Blueprint, request, jsonify
from flask_login import login_required
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from backend import bcrypt, mongo
from backend.models.post import Post
from backend.models.user import User

api_bp = Blueprint("api", __name__)
analyzer = SentimentIntensityAnalyzer()

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-in-env")
ALLOWED_ENGINES = {"vader", "bert", "both"}
LABEL_NORMALIZE = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "positive": "positive",
    "NEGATIVE": "negative",
    "POSITIVE": "positive",
}

ROOT_DIR = Path(__file__).resolve().parents[3]
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(ROOT_DIR / "trendpulse_model"))).resolve()

_pipeline = None
_mock_users = []
_rate_limiters = {}


def _mongo_is_ready():
    try:
        mongo.cx.admin.command("ping")
        return True
    except Exception:
        return False


def _serialize_doc(doc):
    out = {}
    for key, value in doc.items():
        if key == "_id":
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        else:
            out[key] = value
    return out


def _parse_bearer_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"message": "Authorization token missing."}), 401)

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload, None
    except Exception:
        return None, (jsonify({"message": "Invalid or expired token."}), 401)


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        if MODEL_DIR.exists():
            _pipeline = pipeline("text-classification", model=str(MODEL_DIR), tokenizer=str(MODEL_DIR))
        else:
            _pipeline = pipeline(
                "text-classification",
                model="distilbert-base-uncased-finetuned-sst-2-english",
            )
    return _pipeline


def _vader_analyze(text):
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    confidence = round(abs(compound), 4) if compound != 0 else 0.5
    return {
        "label": label,
        "confidence": confidence,
        "scores": scores,
        "engine": "vader",
    }


def _bert_analyze(text):
    try:
        clf = _get_pipeline()
        result = clf(text[:512])[0]
        label = LABEL_NORMALIZE.get(result["label"], "neutral")
        return {
            "label": label,
            "confidence": round(result["score"], 4),
            "engine": "distilbert",
        }
    except Exception:
        return _vader_analyze(text)


def _analyze_text(text, engine="both"):
    start = time.time()
    vader_result = _vader_analyze(text)

    if engine == "vader":
        result = vader_result
    elif engine == "bert":
        result = _bert_analyze(text)
    else:
        bert_result = _bert_analyze(text)
        if vader_result["label"] == bert_result["label"]:
            blended = round((vader_result["confidence"] + bert_result["confidence"]) / 2, 4)
        else:
            blended = bert_result["confidence"]
        result = {
            "label": bert_result["label"],
            "confidence": blended,
            "vader": vader_result,
            "bert": bert_result,
            "engine": "hybrid",
        }

    result["text"] = text
    result["processing_ms"] = round((time.time() - start) * 1000, 2)
    return result


def _check_rate_limit(key, max_requests=10, window_ms=60000):
    now_ms = int(time.time() * 1000)
    if key not in _rate_limiters:
        _rate_limiters[key] = []

    _rate_limiters[key] = [t for t in _rate_limiters[key] if now_ms - t < window_ms]
    if len(_rate_limiters[key]) >= max_requests:
        retry_after = (window_ms - (now_ms - _rate_limiters[key][0])) // 1000
        return False, max(int(retry_after), 1)

    _rate_limiters[key].append(now_ms)
    return True, 0


def _build_reddit_real_data():
    data = []
    for post in reddit_mock_posts:
        enriched = dict(post)
        enriched["reddit_id"] = f"t3_{random.randint(100000, 999999)}"
        enriched["permalink"] = f"/r/{post['subreddit'].replace('r/', '')}/comments/{random.randint(100000, 999999)}/"
        enriched["score"] = post["upvotes"]
        enriched["created_utc"] = int(post["timestamp"] / 1000)
        data.append(enriched)
    return data


def _build_youtube_real_data():
    data = []
    for comment in youtube_mock_comments:
        enriched = dict(comment)
        enriched["comment_id"] = f"comment_{random.randint(100000, 999999)}"
        enriched["reply_count"] = random.randint(0, 50)
        enriched["published_at"] = datetime.utcfromtimestamp(comment["timestamp"] / 1000).isoformat() + "Z"
        data.append(enriched)
    return data


def _build_twitter_real_data():
    data = []
    for post in twitter_mock_posts:
        enriched = dict(post)
        tweet_id = str(random.randint(1000000000000000, 9999999999999999))
        enriched["tweet_id"] = tweet_id
        enriched["url"] = f"https://x.com/{post['handle']}/status/{tweet_id}"
        enriched["created_at"] = datetime.utcfromtimestamp(post["timestamp"] / 1000).isoformat() + "Z"
        enriched["source"] = "Twitter Web App"
        enriched["is_quote"] = random.random() > 0.8
        enriched["quote_count"] = random.randint(0, 10)
        data.append(enriched)
    return data


reddit_mock_posts = [
    {"id": "r1", "author": "TechGuru92", "platform": "reddit", "subreddit": "r/technology", "title": "AI advancement breakthroughs this month", "content": "Just read about the latest AI developments. Absolutely mind-blowing what we're achieving in machine learning!", "upvotes": 2847, "timestamp": int(time.time() * 1000) - 3600000, "source": "reddit"},
    {"id": "r2", "author": "DataDiver", "platform": "reddit", "subreddit": "r/datascience", "title": "Sentiment Analysis Tools Comparison", "content": "Anyone else using VADER + transformers for sentiment analysis? Works great for real-time monitoring!", "upvotes": 1203, "timestamp": int(time.time() * 1000) - 7200000, "source": "reddit"},
    {"id": "r3", "author": "CryptoWatcher", "platform": "reddit", "subreddit": "r/cryptocurrency", "title": "Market Sentiment Turning Bullish Again", "content": "Social sentiment indicators showing positive shift. Could be a good buying opportunity for long-term investors.", "upvotes": 3421, "timestamp": int(time.time() * 1000) - 1800000, "source": "reddit"},
    {"id": "r4", "author": "SkepticalDev", "platform": "reddit", "subreddit": "r/programming", "title": "Why sentiment analysis is hard", "content": "Tried implementing sentiment analysis for our startup. Realized sarcasm detection is way harder than expected.", "upvotes": 892, "timestamp": int(time.time() * 1000) - 5400000, "source": "reddit"},
    {"id": "r5", "author": "NewsJunkie", "platform": "reddit", "subreddit": "r/news", "title": "Tech companies facing backlash", "content": "Latest poll shows declining public sentiment toward big tech. Regulatory scrutiny continues to increase.", "upvotes": 5634, "timestamp": int(time.time() * 1000) - 900000, "source": "reddit"},
]

youtube_mock_comments = [
    {"id": "yt1", "author": "Alex Chen", "platform": "youtube", "videoId": "dQw4w9WgXcQ", "videoTitle": "AI in 2024: Game Changer or Hype?", "content": "This video is incredibly insightful! The future of AI is definitely going to change everything.", "likes": 542, "timestamp": int(time.time() * 1000) - 2700000, "source": "youtube"},
    {"id": "yt2", "author": "Morgan Dev", "platform": "youtube", "videoId": "jNQXAC9IVRw", "videoTitle": "Python for Data Science", "content": "I've been using Python for sentiment analysis and it's amazing how simple yet powerful it is!", "likes": 1203, "timestamp": int(time.time() * 1000) - 10800000, "source": "youtube"},
    {"id": "yt3", "author": "Sarah Markets", "platform": "youtube", "videoId": "OPf0YbXqDm0", "videoTitle": "Trading Strategy Review", "content": "The sentiment analysis they mentioned is exactly what I've been looking for to improve my strategy.", "likes": 298, "timestamp": int(time.time() * 1000) - 3600000, "source": "youtube"},
    {"id": "yt4", "author": "Tech News Daily", "platform": "youtube", "videoId": "Xf_MvS3wBP4", "videoTitle": "Market Watch Daily Episode 45", "content": "Disappointed by this episode. Expected more in-depth analysis of current sentiment trends in tech stocks.", "likes": 45, "timestamp": int(time.time() * 1000) - 7200000, "source": "youtube"},
    {"id": "yt5", "author": "Kumar Learning", "platform": "youtube", "videoId": "kJQDXZ5M0Ww", "videoTitle": "Building ML Models Fast", "content": "This is exactly what I needed! Super helpful and well explained. Would love more videos on NLP!", "likes": 876, "timestamp": int(time.time() * 1000) - 1200000, "source": "youtube"},
]

twitter_mock_posts = [
    {"id": "tw1", "author": "@TechTrends2024", "platform": "twitter", "handle": "TechTrends2024", "content": "Breaking: New AI model outperforms competitors by 40%. This could be a game-changer for our industry! #AI #ML", "retweets": 3421, "likes": 8934, "timestamp": int(time.time() * 1000) - 900000, "source": "twitter"},
    {"id": "tw2", "author": "@DataVizWizard", "platform": "twitter", "handle": "DataVizWizard", "content": "Just deployed sentiment analysis on our platform. Real-time monitoring is transforming how we respond to feedback. #DataScience", "retweets": 234, "likes": 1203, "timestamp": int(time.time() * 1000) - 3600000, "source": "twitter"},
    {"id": "tw3", "author": "@MarketPulse_AI", "platform": "twitter", "handle": "MarketPulse_AI", "content": "Market sentiment shifted dramatically this week. Analysis shows increased volatility indicators across tech sector.", "retweets": 892, "likes": 2147, "timestamp": int(time.time() * 1000) - 5400000, "source": "twitter"},
    {"id": "tw4", "author": "@CriticalThink", "platform": "twitter", "handle": "CriticalThink", "content": "Unpopular opinion: Most AI hype is overblown. We're nowhere near AGI yet. Let's be realistic about timelines.", "retweets": 1203, "likes": 4321, "timestamp": int(time.time() * 1000) - 7200000, "source": "twitter"},
    {"id": "tw5", "author": "@VC_Investor", "platform": "twitter", "handle": "VC_Investor", "content": "Seeing unprecedented sentiment momentum in AI startups. Investors are flooding into this space. Could be a bubble?", "retweets": 567, "likes": 1876, "timestamp": int(time.time() * 1000) - 2700000, "source": "twitter"},
]


@api_bp.route("/auth/signup", methods=["POST"])
def api_signup():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required."}), 400

    if _mongo_is_ready():
        if User.find_by_email(email):
            return jsonify({"message": "Email already registered."}), 409

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        inserted_id = mongo.db.users.insert_one(
            {
                "username": name,
                "name": name,
                "email": email,
                "password": hashed_password,
                "created_at": datetime.utcnow(),
            }
        ).inserted_id
        return jsonify({"message": "Signup successful.", "userId": str(inserted_id)}), 201

    if any(user["email"] == email for user in _mock_users):
        return jsonify({"message": "Email already registered."}), 409

    user_id = str(int(time.time() * 1000))
    _mock_users.append({"_id": user_id, "name": name, "email": email, "password": password})
    return jsonify({"message": "Signup successful.", "userId": user_id}), 201


@api_bp.route("/auth/login", methods=["POST"])
def api_login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    if _mongo_is_ready():
        user_doc = mongo.db.users.find_one({"email": email})
        if not user_doc or not bcrypt.check_password_hash(user_doc.get("password", ""), password):
            return jsonify({"message": "Invalid credentials."}), 401
        user_id = str(user_doc["_id"])
        user_name = user_doc.get("name") or user_doc.get("username") or "User"
    else:
        user_doc = next((u for u in _mock_users if u["email"] == email and u["password"] == password), None)
        if not user_doc:
            user_doc = {"_id": "fake-id", "name": "Demo User", "email": email}
        user_id = user_doc["_id"]
        user_name = user_doc["name"]

    token = jwt.encode(
        {
            "userId": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(days=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify(
        {
            "message": "Login successful.",
            "token": token,
            "user": {"id": user_id, "name": user_name, "email": email},
        }
    )


@api_bp.route("/auth/me", methods=["GET"])
def api_me():
    user_payload, error_response = _parse_bearer_user()
    if error_response:
        return error_response

    if not _mongo_is_ready():
        return jsonify({"user": {"name": "Demo User", "email": user_payload.get("email")}})

    user = User.find_by_id(user_payload.get("userId"))
    if not user:
        return jsonify({"message": "User not found."}), 404

    return jsonify(
        {
            "user": {
                "id": user._id,
                "name": user.username,
                "email": user.email,
            }
        }
    )


@api_bp.route("/health", methods=["GET"])
def api_health():
    return jsonify(
        {
            "status": "ok",
            "service": "TrendPulse Flask API",
            "mongo_connected": _mongo_is_ready(),
        }
    )


@api_bp.route("/analyze", methods=["POST"])
def analyze_single():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    engine = data.get("engine", "both")

    if not text:
        return jsonify({"error": "Request body must contain non-empty 'text' field"}), 400
    if engine not in ALLOWED_ENGINES:
        return jsonify({"error": "Invalid engine. Use one of: vader, bert, both"}), 400

    return jsonify(_analyze_text(text, engine))


@api_bp.route("/analyze/batch", methods=["POST"])
def analyze_batch():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts")
    engine = data.get("engine", "vader")

    if not isinstance(texts, list) or not texts:
        return jsonify({"error": "Request body must contain non-empty 'texts' array"}), 400
    if engine not in ALLOWED_ENGINES:
        return jsonify({"error": "Invalid engine. Use one of: vader, bert, both"}), 400

    normalized = [str(t).strip() for t in texts if str(t).strip()]
    if not normalized:
        return jsonify({"error": "All texts are empty after normalization"}), 400

    results = [_analyze_text(t, engine) for t in normalized]
    summary = {"positive": 0, "neutral": 0, "negative": 0, "total": len(results)}
    for result in results:
        summary[result["label"]] += 1

    return jsonify({"results": results, "summary": summary})


@api_bp.route("/model/info", methods=["GET"])
def model_info():
    return jsonify(
        {
            "model_dir": str(MODEL_DIR),
            "using_trained_model": MODEL_DIR.exists(),
            "engines_available": ["vader", "bert", "both"],
        }
    )


@api_bp.route("/social/all/posts", methods=["GET"])
def social_all_posts():
    all_posts = [
        *reddit_mock_posts,
        *youtube_mock_comments,
        *twitter_mock_posts,
    ]
    all_posts.sort(key=lambda post: post.get("timestamp", 0), reverse=True)
    return jsonify({"total": len(all_posts), "platforms": ["reddit", "youtube", "twitter"], "posts": all_posts})


@api_bp.route("/social/sentiment/summary", methods=["GET"])
def social_sentiment_summary():
    return jsonify(
        {
            "platforms": {
                "reddit": {"total": len(reddit_mock_posts), "avg_engagement": 2739, "trend": "positive"},
                "youtube": {"total": len(youtube_mock_comments), "avg_engagement": 593, "trend": "positive"},
                "twitter": {"total": len(twitter_mock_posts), "avg_engagement": 3515, "trend": "mixed"},
            },
            "overall_sentiment": "neutral",
            "crisis_detected": False,
        }
    )


@api_bp.route("/posts/save", methods=["POST"])
def save_post():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text is required"}), 400

    if not _mongo_is_ready():
        return jsonify({"message": "Post saved (mock)", "id": payload.get("id") or str(int(time.time() * 1000))})

    ts = payload.get("ts")
    if isinstance(ts, (int, float)):
        ts_date = datetime.utcfromtimestamp(ts / 1000.0)
    else:
        ts_date = datetime.utcnow()

    document = {
        "id": payload.get("id") or f"post-{int(time.time() * 1000)}",
        "text": text,
        "author": payload.get("author", "anonymous"),
        "platform": payload.get("platform", "monitor"),
        "sentiment": {
            "label": payload.get("sent", "neu"),
            "confidence": payload.get("confidence", 0.5),
            "engine": payload.get("engine", "unknown"),
        },
        "engagement": {
            "likes": payload.get("engagement", 0),
            "total": payload.get("engagement", 0),
        },
        "tags": [],
        "source": "dashboard",
        "timestamp": ts_date,
        "analyzedAt": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }
    inserted = mongo.db.posts.insert_one(document)
    return jsonify({"message": "Post saved", "postId": str(inserted.inserted_id)})


@api_bp.route("/posts/history", methods=["GET"])
def posts_history():
    limit = int(request.args.get("limit", 50))
    hours = int(request.args.get("hours", 24))
    platform = request.args.get("platform")

    if not _mongo_is_ready():
        return jsonify({"count": 0, "posts": [], "summary": {"positive": 0, "neutral": 0, "negative": 0}})

    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = {"timestamp": {"$gte": cutoff}}
    if platform:
        query["platform"] = platform

    docs = list(mongo.db.posts.find(query).sort("timestamp", -1).limit(limit))
    summary = {"positive": 0, "neutral": 0, "negative": 0}
    for doc in docs:
        label = ((doc.get("sentiment") or {}).get("label") or "neu").lower()
        if label == "pos":
            summary["positive"] += 1
        elif label == "neg":
            summary["negative"] += 1
        else:
            summary["neutral"] += 1

    return jsonify(
        {
            "count": len(docs),
            "posts": [_serialize_doc(d) for d in docs],
            "summary": summary,
            "timeRange": {"from": cutoff.isoformat(), "to": datetime.utcnow().isoformat()},
        }
    )


@api_bp.route("/posts/sentiment/<label>", methods=["GET"])
def posts_by_sentiment(label):
    limit = int(request.args.get("limit", 20))

    if not _mongo_is_ready():
        return jsonify({"count": 0, "posts": []})

    docs = list(mongo.db.posts.find({"sentiment.label": label}).sort("timestamp", -1).limit(limit))
    return jsonify({"count": len(docs), "posts": [_serialize_doc(d) for d in docs]})


@api_bp.route("/posts/crisis", methods=["GET"])
def posts_crisis():
    threshold = int(request.args.get("threshold", 5))
    hours = int(request.args.get("hours", 24))

    if not _mongo_is_ready():
        return jsonify({"crisisEvents": [], "totalNegative": 0})

    cutoff = datetime.utcnow() - timedelta(hours=hours)
    docs = list(
        mongo.db.posts.find({"sentiment.label": "neg", "timestamp": {"$gte": cutoff}})
        .sort("timestamp", -1)
    )

    crisis_events = []
    window_ms = 30 * 60 * 1000
    for i in range(0, len(docs), threshold):
        bucket = docs[i:i + threshold]
        if len(bucket) < threshold:
            continue

        first = bucket[0].get("timestamp")
        last = bucket[-1].get("timestamp")
        if not isinstance(first, datetime) or not isinstance(last, datetime):
            continue

        span = abs((first - last).total_seconds() * 1000)
        if span < window_ms:
            avg_conf = sum(((p.get("sentiment") or {}).get("confidence") or 0) for p in bucket) / len(bucket)
            crisis_events.append(
                {
                    "timestamp": first.isoformat(),
                    "count": len(bucket),
                    "averageConfidence": f"{avg_conf:.2f}",
                    "posts": [_serialize_doc(p) for p in bucket],
                }
            )

    return jsonify(
        {
            "crisisEvents": crisis_events[:10],
            "totalNegative": len(docs),
            "threshold": threshold,
            "hoursAnalyzed": hours,
        }
    )


@api_bp.route("/social/raw/store", methods=["POST"])
def social_raw_store():
    payload = request.get_json(silent=True) or {}

    if not _mongo_is_ready():
        return jsonify({"message": "Stored (mock)", "id": payload.get("externalId")})

    document = {
        "platform": payload.get("platform", "mock"),
        "externalId": payload.get("externalId") or f"{payload.get('platform', 'mock')}-{int(time.time() * 1000)}",
        "title": payload.get("title"),
        "content": payload.get("content", ""),
        "author": payload.get("author"),
        "link": payload.get("link"),
        "engagement": payload.get("engagement") or {},
        "metadata": payload.get("metadata") or {},
        "source": payload.get("source", "api"),
        "fetchedAt": datetime.utcnow(),
        "analyzed": False,
        "created_at": datetime.utcnow(),
    }
    inserted = mongo.db.social_feeds.insert_one(document)
    return jsonify({"message": "Feed stored", "id": str(inserted.inserted_id)})


@api_bp.route("/social/reddit/real", methods=["GET"])
def social_reddit_real():
    allowed, retry_after = _check_rate_limit("reddit", max_requests=3, window_ms=60000)
    if not allowed:
        return jsonify({"error": "Rate limit exceeded", "retryAfter": retry_after}), 429

    data = _build_reddit_real_data()

    return jsonify(
        {
            "source": "reddit",
            "count": len(data),
            "posts": data,
            "note": "Use Reddit API credentials to replace mock fetch with real data.",
        }
    )


@api_bp.route("/social/youtube/real", methods=["GET"])
def social_youtube_real():
    allowed, retry_after = _check_rate_limit("youtube", max_requests=5, window_ms=60000)
    if not allowed:
        return jsonify({"error": "Rate limit exceeded", "retryAfter": retry_after}), 429

    data = _build_youtube_real_data()

    return jsonify(
        {
            "source": "youtube",
            "count": len(data),
            "comments": data,
            "note": "Use YouTube Data API v3 key to replace mock fetch with real data.",
        }
    )


@api_bp.route("/social/twitter/real", methods=["GET"])
def social_twitter_real():
    allowed, retry_after = _check_rate_limit("twitter", max_requests=15, window_ms=900000)
    if not allowed:
        return jsonify({"error": "Rate limit exceeded", "retryAfter": retry_after}), 429

    data = _build_twitter_real_data()

    return jsonify(
        {
            "source": "twitter",
            "count": len(data),
            "posts": data,
            "note": "Use X API bearer token to replace mock fetch with real data.",
        }
    )


@api_bp.route("/social/all/real", methods=["GET"])
def social_all_real():
    allowed, retry_after = _check_rate_limit("all_social", max_requests=5, window_ms=60000)
    if not allowed:
        return jsonify({"error": "Rate limit exceeded", "retryAfter": retry_after}), 429

    combined = [
        *_build_reddit_real_data(),
        *_build_youtube_real_data(),
        *_build_twitter_real_data(),
    ]
    combined.sort(key=lambda post: post.get("timestamp", 0), reverse=True)

    return jsonify(
        {
            "total": len(combined),
            "posts": combined,
            "platforms": ["reddit", "youtube", "twitter"],
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Mix of mock and real format. Replace sources with external API calls.",
        }
    )


@api_bp.route("/social/<platform>", methods=["GET"])
def social_platform(platform):
    platform = platform.lower()
    if platform == "reddit":
        return jsonify({"platform": "reddit", "posts": reddit_mock_posts, "count": len(reddit_mock_posts)})
    if platform == "youtube":
        return jsonify({"platform": "youtube", "posts": youtube_mock_comments, "count": len(youtube_mock_comments)})
    if platform in ("twitter", "x"):
        return jsonify({"platform": "twitter", "posts": twitter_mock_posts, "count": len(twitter_mock_posts)})
    return jsonify({"error": "Platform not supported. Use: reddit, youtube, twitter"}), 400


@api_bp.route("/posts", methods=["GET"])
def get_posts():
    if not _mongo_is_ready():
        return jsonify({"posts": [], "pagination": {"page": 1, "limit": 20, "total": 0, "pages": 0}})

    tag = request.args.get("tag") or request.args.get("hashtag")
    page = request.args.get("page", 1)
    limit = request.args.get("limit", 20)
    data = Post.get_paginated(page=page, limit=limit, hashtag=tag)
    return jsonify(data)


@api_bp.route("/posts", methods=["POST"])
def create_post():
    if not _mongo_is_ready():
        return jsonify({"error": "MongoDB is not connected"}), 503

    data = request.get_json()
    content = data.get("content", "").strip()
    username = data.get("username", "anonymous")
    hashtags = [w for w in content.split() if w.startswith("#")]

    if not content:
        return jsonify({"error": "Content is required"}), 400

    scores = analyzer.polarity_scores(content)
    compound = scores["compound"]
    if compound >= 0.05:
        sentiment = "positive"
    elif compound <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    post = Post.insert(content, username, hashtags, sentiment, round(compound, 4))
    return jsonify({"post": post, "message": "Post created"}), 201


@api_bp.route("/posts/spike", methods=["POST"])
def create_spike_posts():
    if not _mongo_is_ready():
        return jsonify({"error": "MongoDB is not connected"}), 503

    payload = request.get_json(silent=True) or {}
    count = int(payload.get("count", 20))
    username = payload.get("username", "crisis-bot")

    negative_templates = [
        "Service outage is getting worse every minute #Crisis",
        "Users are angry and reporting failures #Incident",
        "Major trust issue after this release #Breaking",
        "This is a disaster for customer experience #Alert",
    ]

    inserted = []
    for _ in range(max(1, count)):
        text = random.choice(negative_templates)
        hashtags = [word for word in text.split() if word.startswith("#")]
        inserted.append(Post.insert(text, username, hashtags, "negative", -0.9))

    return jsonify({"message": "Spike injected", "count": len(inserted)}), 201


@api_bp.route("/sentiment/counts", methods=["GET"])
def sentiment_counts():
    if not _mongo_is_ready():
        return jsonify({"positive": 0, "neutral": 0, "negative": 0})

    counts = Post.sentiment_counts()
    return jsonify(counts)


@api_bp.route("/hashtags/top", methods=["GET"])
def top_hashtags():
    if not _mongo_is_ready():
        return jsonify({"hashtags": []})

    limit = int(request.args.get("limit", 10))
    tags = Post.top_hashtags(limit=limit)
    return jsonify({"hashtags": tags})


@api_bp.route("/stats", methods=["GET"])
def stats():
    if not _mongo_is_ready():
        return jsonify({"positive": 0, "neutral": 0, "negative": 0, "hourly": []})

    counts = Post.sentiment_counts()
    hourly = Post.hourly_breakdown(hours=int(request.args.get("hours", 24)))
    trending = Post.top_hashtags(limit=int(request.args.get("limit", 10)))
    return jsonify({
        "positive": counts.get("positive", 0),
        "neutral": counts.get("neutral", 0),
        "negative": counts.get("negative", 0),
        "hourly": hourly,
        "trending_hashtags": trending,
    })


@api_bp.route("/crisis-score", methods=["GET"])
def crisis_score():
    if not _mongo_is_ready():
        return jsonify({
            "score": 0,
            "status": "Safe",
            "recommended_action": "Monitor normal activity.",
            "metrics": {"negative_ratio": 0, "spike_velocity": 0, "volume_growth": 0},
        })

    data = Post.crisis_score()
    return jsonify(data)


@api_bp.route("/wordcloud", methods=["GET"])
def wordcloud():
    if not _mongo_is_ready():
        return jsonify({"words": []})

    limit = int(request.args.get("limit", 80))
    words = Post.word_frequencies(limit=limit)
    return jsonify({"words": words})


@api_bp.route("/alerts", methods=["GET", "POST"])
@login_required
def alerts():
    if request.method == "GET":
        limit = int(request.args.get("limit", 20))
        return jsonify({"alerts": Post.get_alerts(limit=limit)})

    payload = request.get_json(silent=True) or {}
    alert_type = payload.get("type", "crisis")
    message = payload.get("message", "Crisis threshold breached")
    crisis = payload.get("crisis_score")
    if crisis is None:
        crisis = Post.crisis_score().get("score", 0)

    created = Post.create_alert(alert_type=alert_type, message=message, crisis_score=int(crisis))
    return jsonify({"alert": created, "message": "Alert created"}), 201
