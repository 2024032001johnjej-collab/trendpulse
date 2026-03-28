from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models.post import Post
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

api_bp = Blueprint("api", __name__)
analyzer = SentimentIntensityAnalyzer()


@api_bp.route("/posts", methods=["GET"])
@login_required
def get_posts():
    tag = request.args.get("tag") or request.args.get("hashtag")
    page = request.args.get("page", 1)
    limit = request.args.get("limit", 20)
    data = Post.get_paginated(page=page, limit=limit, hashtag=tag)
    return jsonify(data)


@api_bp.route("/posts", methods=["POST"])
@login_required
def create_post():
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


@api_bp.route("/sentiment/counts", methods=["GET"])
@login_required
def sentiment_counts():
    counts = Post.sentiment_counts()
    return jsonify(counts)


@api_bp.route("/hashtags/top", methods=["GET"])
@login_required
def top_hashtags():
    limit = int(request.args.get("limit", 10))
    tags = Post.top_hashtags(limit=limit)
    return jsonify({"hashtags": tags})


@api_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    counts = Post.sentiment_counts()
    hourly = Post.hourly_breakdown(hours=int(request.args.get("hours", 24)))
    trending = Post.top_hashtags(limit=int(request.args.get("limit", 10)))
    return jsonify({
        "sentiment": counts,
        "hourly": hourly,
        "trending_hashtags": trending,
    })


@api_bp.route("/crisis-score", methods=["GET"])
@login_required
def crisis_score():
    data = Post.crisis_score()
    return jsonify(data)


@api_bp.route("/wordcloud", methods=["GET"])
@login_required
def wordcloud():
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
