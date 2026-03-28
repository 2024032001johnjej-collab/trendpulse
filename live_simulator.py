"""
Background task to simulate live social media posts for TrendPulse demo.
Run this alongside the Flask app to have dynamic data for the dashboard.
"""
import time
import random
import threading
from datetime import datetime, timezone
import pymongo

MONGO_URI = "mongodb://127.0.0.1:27017/trendpulse"
DB_NAME = "trendpulse"

# Sample realistic social media posts
POSITIVE_POSTS = [
    "Love this new feature! #Happy #Impressed",
    "Best experience ever! Company is outdoing themselves #Amazing #Grateful",
    "Highly recommend this service! #Satisfied #Recommended",
    "Great job team! This is excellent work #Excellent #TeamWork",
    "Outstanding customer support! #Happy #CustomerFirst",
]

NEUTRAL_POSTS = [
    "Just trying out this new service #Exploring #Curious",
    "Checking this out... #Interested #NewThing",
    "This is the latest update #NewRelease #Update",
    "Using it for the first time #Trying #FirstTime",
    "Standard feature set here #Normal #Standard",
]

NEGATIVE_POSTS = [
    "Service is down again! #Problem #Disappointed",
    "Way too buggy for production #Issues #Frustrated",
    "Customer support is terrible #BadService #Unhappy",
    "This keeps crashing! #System Failure #Angry",
    "Not worth the money #Poor Quality #Regret",
    "Major problems today! #Crisis #Emergency",
    "Complete disaster! Switching to competitor #Angry #Leaving",
]


def get_db():
    """Connect to MongoDB."""
    client = pymongo.MongoClient(MONGO_URI)
    return client[DB_NAME]


def simulate_posts():
    """Continuously simulate social media posts."""
    db = get_db()
    print("[SIMULATOR] Starting live post simulation...")
    
    # Sentiment distribution for realistic simulation
    # 60% positive, 20% neutral, 20% negative normally, but varies with "crisis events"
    distribution = {"positive": 0.6, "neutral": 0.2, "negative": 0.2}
    crisis_mode = False
    crisis_counter = 0
    
    while True:
        try:
            # Every 20 posts, trigger a brief crisis period
            if crisis_counter >= 20:
                crisis_mode = True
                crisis_duration = random.randint(15, 30)  # 15-30 posts of high negativity
                print(f"[SIMULATOR] Crisis event triggered! Duration: {crisis_duration} posts")
            
            if crisis_mode:
                distribution = {"positive": 0.1, "neutral": 0.1, "negative": 0.8}
                crisis_counter = 0
                crisis_duration -= 1
                if crisis_duration <= 0:
                    crisis_mode = False
                    distribution = {"positive": 0.6, "neutral": 0.2, "negative": 0.2}
                    print("[SIMULATOR] Crisis event resolved, returning to normal")
            
            # Randomly decide sentiment
            rand = random.random()
            if rand < distribution["positive"]:
                sentiment = "positive"
                posts_list = POSITIVE_POSTS
            elif rand < distribution["positive"] + distribution["neutral"]:
                sentiment = "neutral"
                posts_list = NEUTRAL_POSTS
            else:
                sentiment = "negative"
                posts_list = NEGATIVE_POSTS
            
            # Create post
            content = random.choice(posts_list)
            hashtags = [word for word in content.split() if word.startswith("#")]
            
            # Sentiment score based on sentiment
            sentiment_scores = {
                "positive": random.uniform(0.7, 1.0),
                "neutral": random.uniform(0.0, 0.1),
                "negative": random.uniform(-1.0, -0.7),
            }
            
            post_doc = {
                "content": content,
                "username": random.choice([
                    "user_" + str(random.randint(1000, 9999)),
                    "john_dev",
                    "sarah_tech",
                    "mike_customer",
                    "emma_feedback",
                    "social_voice",
                    "concern_voter",
                    "happy_user",
                ]),
                "hashtags": hashtags,
                "sentiment": sentiment,
                "sentiment_score": sentiment_scores[sentiment],
                "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
                "source": "simulated",
            }
            
            result = db.posts.insert_one(post_doc)
            crisis_counter += 1
            
            # Log every 10 posts
            if crisis_counter % 10 == 0:
                counts_list = list(db.posts.aggregate([
                    {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
                ]))
                counts_by_sentiment = {item["_id"]: item["count"] for item in counts_list}
                total = sum(counts_by_sentiment.values())
                neg_count = counts_by_sentiment.get("negative", 0)
                pos_count = counts_by_sentiment.get("positive", 0)
                neu_count = counts_by_sentiment.get("neutral", 0)
                print(f"[SIMULATOR] Posts created: {total} (Neg:{neg_count}, Pos:{pos_count}, Neutral:{neu_count})")
            
            # Wait before next post (1-3 seconds)
            time.sleep(random.uniform(1, 3))
            
        except Exception as e:
            print(f"[SIMULATOR] Error while creating post: {e}")
            time.sleep(5)


def start_simulator():
    """Start the simulator in a background thread."""
    thread = threading.Thread(target=simulate_posts, daemon=True)
    thread.start()
    print("[SIMULATOR] Background simulator thread started")
    return thread


if __name__ == "__main__":
    print("Running TrendPulse Live Post Simulator")
    print("MongoDB URI:", MONGO_URI)
    print("Press Ctrl+C to stop\n")
    
    start_simulator()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[SIMULATOR] Shutting down...")
