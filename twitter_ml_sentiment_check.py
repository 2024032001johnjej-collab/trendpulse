"""
Fetch tweets from X (Twitter) API v2 and classify each tweet using TrendPulse ML API.

Requirements:
- X Bearer token (env var: TWITTER_BEARER_TOKEN)
- TrendPulse Flask API running (default: http://localhost:5000)

Usage:
  python twitter_ml_sentiment_check.py --query "AI OR #AI" --max-results 20 --engine bert

Environment variables:
  TWITTER_BEARER_TOKEN   X API bearer token
  TRENDPULSE_API_BASE    Optional, default http://localhost:5000
"""

from __future__ import annotations

import argparse
import os
from typing import Any, Dict, List, Tuple

import requests

TWITTER_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"
DEFAULT_API_BASE = os.getenv("TRENDPULSE_API_BASE", "http://localhost:5000")


def fetch_tweets(bearer_token: str, query: str, max_results: int) -> List[Dict[str, Any]]:
    headers = {
        "Authorization": f"Bearer {bearer_token}",
    }
    params = {
        "query": query,
        "max_results": max_results,
        "tweet.fields": "created_at,lang,author_id",
    }

    response = requests.get(TWITTER_SEARCH_URL, headers=headers, params=params, timeout=20)
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", [])


def classify_text(api_base: str, text: str, engine: str) -> Dict[str, Any]:
    url = f"{api_base.rstrip('/')}/api/analyze"
    payload = {"text": text, "engine": engine}
    response = requests.post(url, json=payload, timeout=20)
    response.raise_for_status()
    return response.json()


def to_project_label(model_label: str, confidence: float) -> str:
    label = (model_label or "").lower()

    if label in ("negative", "label_0", "neg"):
        return "Critical" if confidence >= 0.60 else "Negative"
    if label in ("neutral", "label_1", "neu"):
        return "Neutral"
    if label in ("positive", "label_2", "pos"):
        return "Positive"

    return "Neutral"


def analyze_tweets(
    tweets: List[Dict[str, Any]],
    api_base: str,
    engine: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    results: List[Dict[str, Any]] = []
    summary = {"Critical": 0, "Neutral": 0, "Positive": 0, "Negative": 0}

    for tweet in tweets:
        text = (tweet.get("text") or "").strip()
        if not text:
            continue

        ml = classify_text(api_base=api_base, text=text, engine=engine)
        model_label = str(ml.get("label", "neutral"))
        confidence = float(ml.get("confidence", 0.0) or 0.0)
        project_label = to_project_label(model_label, confidence)

        summary[project_label] = summary.get(project_label, 0) + 1
        results.append(
            {
                "tweet_id": tweet.get("id"),
                "created_at": tweet.get("created_at", "-"),
                "text": text,
                "model_label": model_label,
                "confidence": confidence,
                "final_label": project_label,
            }
        )

    return results, summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classify tweets with TrendPulse sentiment model")
    parser.add_argument("--query", default="AI OR #AI", help="X recent-search query")
    parser.add_argument("--max-results", type=int, default=10, help="1-100")
    parser.add_argument("--engine", choices=["vader", "bert", "both"], default="bert")
    parser.add_argument("--api-base", default=DEFAULT_API_BASE, help="TrendPulse API base URL")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    bearer_token = os.getenv("TWITTER_BEARER_TOKEN", "").strip()
    if not bearer_token:
        raise SystemExit("Missing TWITTER_BEARER_TOKEN environment variable.")

    if not (1 <= args.max_results <= 100):
        raise SystemExit("--max-results must be between 1 and 100.")

    try:
        tweets = fetch_tweets(
            bearer_token=bearer_token,
            query=args.query,
            max_results=args.max_results,
        )
    except requests.HTTPError as exc:
        body = exc.response.text if exc.response is not None else ""
        raise SystemExit(f"X API request failed: {exc}\n{body}") from exc
    except requests.RequestException as exc:
        raise SystemExit(f"X API request failed: {exc}") from exc

    if not tweets:
        print("No tweets returned for this query.")
        return

    try:
        analyzed, summary = analyze_tweets(tweets=tweets, api_base=args.api_base, engine=args.engine)
    except requests.HTTPError as exc:
        body = exc.response.text if exc.response is not None else ""
        raise SystemExit(f"TrendPulse ML API failed: {exc}\n{body}") from exc
    except requests.RequestException as exc:
        raise SystemExit(f"TrendPulse ML API failed: {exc}") from exc

    print("\n=== Sentiment Classification Results ===")
    for idx, row in enumerate(analyzed, start=1):
        print(f"\n[{idx}] Tweet ID: {row['tweet_id']}")
        print(f"Created : {row['created_at']}")
        print(f"Text    : {row['text']}")
        print(f"Model   : {row['model_label']} ({row['confidence']:.3f})")
        print(f"Final   : {row['final_label']}")

    print("\n=== Summary ===")
    print(f"Critical: {summary.get('Critical', 0)}")
    print(f"Neutral : {summary.get('Neutral', 0)}")
    print(f"Positive: {summary.get('Positive', 0)}")
    print(f"Negative: {summary.get('Negative', 0)}")


if __name__ == "__main__":
    main()
