from datetime import datetime, timedelta
from collections import Counter
import re
from backend import mongo


class Post:
    """Social media post model stored in MongoDB."""

    COLLECTION = "posts"

    @staticmethod
    def insert(content, username, hashtags, sentiment, sentiment_score):
        doc = {
            "content": content,
            "username": username,
            "hashtags": hashtags,           # list of strings e.g. ["#AI", "#Tech"]
            "sentiment": sentiment,          # "positive" | "neutral" | "negative"
            "sentiment_score": sentiment_score,
            "created_at": datetime.utcnow(),
        }
        result = mongo.db.posts.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    @staticmethod
    def get_recent(limit=50):
        docs = mongo.db.posts.find().sort("created_at", -1).limit(limit)
        posts = []
        for d in docs:
            d["_id"] = str(d["_id"])
            d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            posts.append(d)
        return posts

    @staticmethod
    def get_paginated(page=1, limit=20, hashtag=None):
        page = max(int(page), 1)
        limit = max(min(int(limit), 100), 1)
        query = {}
        if hashtag:
            normalized = hashtag if hashtag.startswith("#") else f"#{hashtag}"
            query = {"hashtags": normalized}

        total = mongo.db.posts.count_documents(query)
        skip = (page - 1) * limit
        docs = mongo.db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)

        posts = []
        for d in docs:
            d["_id"] = str(d["_id"])
            d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            posts.append(d)

        return {
            "posts": posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit,
            },
        }

    @staticmethod
    def get_by_hashtag(tag, limit=50):
        docs = mongo.db.posts.find({"hashtags": tag}).sort("created_at", -1).limit(limit)
        posts = []
        for d in docs:
            d["_id"] = str(d["_id"])
            d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            posts.append(d)
        return posts

    @staticmethod
    def sentiment_counts():
        """Return counts per sentiment label."""
        pipeline = [
            {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
        ]
        result = list(mongo.db.posts.aggregate(pipeline))
        counts = {"positive": 0, "neutral": 0, "negative": 0}
        for r in result:
            if r["_id"] in counts:
                counts[r["_id"]] = r["count"]
        return counts

    @staticmethod
    def top_hashtags(limit=10):
        pipeline = [
            {"$unwind": "$hashtags"},
            {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return list(mongo.db.posts.aggregate(pipeline))

    @staticmethod
    def hourly_breakdown(hours=24):
        since = datetime.utcnow() - timedelta(hours=hours)
        pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {
                "$project": {
                    "hour": {
                        "$dateToString": {
                            "format": "%Y-%m-%d %H:00",
                            "date": "$created_at",
                        }
                    },
                    "sentiment": 1,
                }
            },
            {
                "$group": {
                    "_id": {"hour": "$hour", "sentiment": "$sentiment"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.hour": 1}},
        ]
        rows = list(mongo.db.posts.aggregate(pipeline))

        grouped = {}
        for row in rows:
            hour = row["_id"]["hour"]
            sentiment = row["_id"]["sentiment"]
            if hour not in grouped:
                grouped[hour] = {"positive": 0, "neutral": 0, "negative": 0}
            if sentiment in grouped[hour]:
                grouped[hour][sentiment] = row["count"]

        return [{"hour": h, **grouped[h]} for h in sorted(grouped.keys())]

    @staticmethod
    def word_frequencies(limit=80):
        docs = mongo.db.posts.find({}, {"content": 1}).limit(1000)
        text = " ".join([d.get("content", "") for d in docs])
        words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_]{2,}\b", text.lower())

        stopwords = {
            "the", "and", "for", "this", "that", "with", "you", "your", "from",
            "have", "just", "about", "today", "very", "really", "they", "them",
            "our", "are", "was", "were", "not", "but", "its", "out", "all",
            "new", "now", "how", "why", "what", "when", "who", "his", "her",
            "she", "him", "has", "had", "too", "into", "their", "than", "can",
        }
        filtered = [w for w in words if w not in stopwords and not w.startswith("http")]
        counts = Counter(filtered).most_common(limit)
        return [{"word": word, "count": count} for word, count in counts]

    @staticmethod
    def crisis_score():
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        prev_hour = now - timedelta(hours=2)

        total = mongo.db.posts.count_documents({})
        if total == 0:
            return {
                "score": 0,
                "status": "Safe",
                "recommended_action": "Monitor normal activity.",
                "metrics": {
                    "negative_ratio": 0,
                    "spike_velocity": 0,
                    "volume_growth": 0,
                },
            }

        negative = mongo.db.posts.count_documents({"sentiment": "negative"})
        negative_ratio = negative / total

        recent_neg = mongo.db.posts.count_documents(
            {"sentiment": "negative", "created_at": {"$gte": last_hour}}
        )
        prev_neg = mongo.db.posts.count_documents(
            {
                "sentiment": "negative",
                "created_at": {"$gte": prev_hour, "$lt": last_hour},
            }
        )
        spike_velocity = max((recent_neg - prev_neg), 0)

        recent_volume = mongo.db.posts.count_documents({"created_at": {"$gte": last_hour}})
        prev_volume = mongo.db.posts.count_documents(
            {"created_at": {"$gte": prev_hour, "$lt": last_hour}}
        )
        volume_growth = max((recent_volume - prev_volume), 0)

        ratio_component = min(negative_ratio * 100, 100) * 0.55
        spike_component = min(spike_velocity * 4, 100) * 0.25
        volume_component = min(volume_growth * 2, 100) * 0.20
        score = int(min(max(ratio_component + spike_component + volume_component, 0), 100))

        if score >= 70:
            status = "Crisis"
            action = "Escalate to PR team and issue a public response."
        elif score >= 40:
            status = "Watch"
            action = "Monitor key hashtags and prepare a response draft."
        else:
            status = "Safe"
            action = "Monitor normal activity."

        return {
            "score": score,
            "status": status,
            "recommended_action": action,
            "metrics": {
                "negative_ratio": round(negative_ratio, 4),
                "spike_velocity": spike_velocity,
                "volume_growth": volume_growth,
            },
        }

    @staticmethod
    def create_alert(alert_type, message, crisis_score):
        doc = {
            "type": alert_type,
            "message": message,
            "crisis_score": crisis_score,
            "created_at": datetime.utcnow(),
        }
        result = mongo.db.alerts.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        doc["created_at"] = doc["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        return doc

    @staticmethod
    def get_alerts(limit=20):
        docs = mongo.db.alerts.find().sort("created_at", -1).limit(limit)
        items = []
        for d in docs:
            d["_id"] = str(d["_id"])
            d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            items.append(d)
        return items

    @staticmethod
    def seed_sample_data():
        """Insert 20 sample posts if the collection is empty."""
        if mongo.db.posts.count_documents({}) > 0:
            return

        import random
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

        analyzer = SentimentIntensityAnalyzer()

        samples = [
            ("Loving the new #AI features in #Tech products today! 🚀", "alice", ["#AI", "#Tech"]),
            ("Terrible customer service from this brand. #Disappointed #CustomerService", "bob", ["#Disappointed", "#CustomerService"]),
            ("Just read an interesting article about #MachineLearning trends.", "carol", ["#MachineLearning"]),
            ("#AI is changing the world! Exciting times ahead 🌟", "dave", ["#AI"]),
            ("Not happy with the recent #Tech updates. Very buggy.", "eve", ["#Tech"]),
            ("Great workshop on #DataScience today! Learned so much.", "frank", ["#DataScience"]),
            ("The new #SocialMedia algorithm is ruining my feed.", "grace", ["#SocialMedia"]),
            ("Absolutely amazing results with #AI tools for my business! 💼", "henry", ["#AI"]),
            ("Neutral thoughts on the #Tech expo — nothing groundbreaking.", "irene", ["#Tech"]),
            ("Excited about the future of #MachineLearning and #AI!", "john", ["#MachineLearning", "#AI"]),
            ("Worst product launch ever. #Fail #CustomerService", "kate", ["#Fail", "#CustomerService"]),
            ("Really impressed by the new #DataScience platforms. #Tech", "leo", ["#DataScience", "#Tech"]),
            ("Just a regular day exploring #SocialMedia trends. 📱", "mia", ["#SocialMedia"]),
            ("Brilliant performance at #Tech summit today! #Proud", "noah", ["#Tech"]),
            ("Frustrated with constant #AI hype — show me real results.", "olivia", ["#AI"]),
            ("Wonderful collaboration in the #OpenSource community. 💻", "peter", ["#OpenSource"]),
            ("The #DataScience community keeps surprising me positively!", "quinn", ["#DataScience"]),
            ("Overwhelmed by the amount of #SocialMedia notifications.", "rose", ["#SocialMedia"]),
            ("Can't believe how fast #AI is advancing this year! 🤖", "sam", ["#AI"]),
            ("Average experience at the #Tech conference. Expected more.", "tina", ["#Tech"]),
        ]

        for content, username, hashtags in samples:
            scores = analyzer.polarity_scores(content)
            compound = scores["compound"]
            if compound >= 0.05:
                sentiment = "positive"
            elif compound <= -0.05:
                sentiment = "negative"
            else:
                sentiment = "neutral"

            Post.insert(content, username, hashtags, sentiment, round(compound, 4))
