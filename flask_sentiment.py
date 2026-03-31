"""
TrendPulse — Flask Sentiment API
==================================
This is the backend that your dashboard calls.
It loads your trained model from ./trendpulse_model and serves predictions.

Endpoints:
    POST /api/analyze          → analyze a single text
    POST /api/analyze/batch    → analyze multiple texts at once
    GET  /api/model/info       → model metadata

Usage:
    python flask_sentiment.py
    # Then POST to http://localhost:5000/api/analyze
"""

import json
import time
import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ── Lazy import so Flask starts fast ────────────────────────
_pipeline = None
_vader    = None

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR_ENV = os.getenv("MODEL_DIR")
MODEL_DIR = str((BASE_DIR / "trendpulse_model").resolve()) if not MODEL_DIR_ENV else str(Path(MODEL_DIR_ENV).resolve())

def has_model_weights(model_dir: str) -> bool:
    p = Path(model_dir)
    if not p.exists() or not p.is_dir():
        return False
    # Hugging Face checkpoints are usually stored with one of these files.
    return any((p / name).exists() for name in ("model.safetensors", "pytorch_model.bin"))

USE_TRAINED_MODEL = has_model_weights(MODEL_DIR)
ALLOWED_ENGINES = {"vader", "bert", "both"}

app = Flask(__name__)
CORS(app)  # allow cross-origin from your dashboard frontend


# ─────────────────────────────────────────────────────────────
# MODEL LOADERS
# ─────────────────────────────────────────────────────────────
def get_vader():
    """Load VADER — instant, always available as fallback."""
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader = SentimentIntensityAnalyzer()
        print("✅ VADER loaded")
    return _vader


def get_pipeline():
    """Load your fine-tuned DistilBERT (or pretrained if you haven't trained yet)."""
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        if USE_TRAINED_MODEL:
            print(f"✅ Loading YOUR trained model from: {MODEL_DIR}")
            _pipeline = pipeline("text-classification", model=MODEL_DIR, tokenizer=MODEL_DIR)
        else:
            print("⚠️  Trained model not found. Using pretrained distilbert-sst-2 instead.")
            print("   Run train_sentiment.py first to use your own model.")
            _pipeline = pipeline(
                "text-classification",
                model="distilbert-base-uncased-finetuned-sst-2-english"
            )
    return _pipeline


# ─────────────────────────────────────────────────────────────
# CORE ANALYSIS LOGIC
# ─────────────────────────────────────────────────────────────
LABEL_NORMALIZE = {
    # from your trained model
    "LABEL_0": "negative", "LABEL_1": "neutral", "LABEL_2": "positive",
    "negative": "negative", "neutral": "neutral", "positive": "positive",
    # from pretrained SST-2 (only pos/neg)
    "NEGATIVE": "negative", "POSITIVE": "positive",
}

def vader_analyze(text: str) -> dict:
    """Fast VADER analysis — used for real-time feed."""
    vader = get_vader()
    scores = vader.polarity_scores(text)
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
        "confidence_pct": round(confidence * 100, 1),
        "scores": scores,
        "engine": "vader",
    }


def bert_analyze(text: str) -> dict:
    """DistilBERT analysis — used for deeper accuracy."""
    try:
        clf = get_pipeline()
        result = clf(text[:512])[0]  # truncate long text
        label = LABEL_NORMALIZE.get(result["label"], "neutral")
        return {
            "label": label,
            "confidence": round(result["score"], 4),
            "confidence_pct": round(float(result["score"]) * 100, 1),
            "engine": "distilbert",
        }
    except Exception as e:
        # Fallback to VADER if model fails
        print(f"⚠️  DistilBERT error: {e}. Falling back to VADER.")
        return vader_analyze(text)


def analyze_text(text: str, engine: str = "both") -> dict:
    """
    Full analysis pipeline.
    engine = "vader" | "bert" | "both"
    """
    start = time.time()

    vader_result = vader_analyze(text)

    if engine == "vader":
        result = vader_result
    elif engine == "bert":
        result = bert_analyze(text)
    else:
        # "both" — use VADER for speed, DistilBERT for accuracy
        bert_result = bert_analyze(text)
        # If both agree, high confidence. If disagree, use BERT (more accurate).
        final_label = bert_result["label"]
        # Compute blended confidence
        if vader_result["label"] == bert_result["label"]:
            blended_conf = round((vader_result["confidence"] + bert_result["confidence"]) / 2, 4)
        else:
            blended_conf = bert_result["confidence"]  # trust BERT more
        result = {
            "label": final_label,
            "confidence": blended_conf,
            "confidence_pct": round(blended_conf * 100, 1),
            "vader": vader_result,
            "bert": bert_result,
            "engine": "hybrid",
        }

    if "confidence_pct" not in result:
        result["confidence_pct"] = round(float(result.get("confidence", 0.0)) * 100, 1)

    result["text"] = text
    result["processing_ms"] = round((time.time() - start) * 1000, 2)
    return result


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────
@app.route("/api/analyze", methods=["POST"])
def analyze_single():
    """
    Analyze a single text.
    
    Request body:
        { "text": "I love this product!", "engine": "both" }
    
    Response:
        {
            "label": "positive",
            "confidence": 0.97,
            "engine": "hybrid",
            "processing_ms": 45.2,
            "text": "I love this product!"
        }
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "error": "Invalid or empty JSON body",
            "hint": "Send raw JSON like: {\"text\":\"I love this\",\"engine\":\"bert\"}",
        }), 400
    if "text" not in data:
        return jsonify({"error": "Request body must contain 'text' field"}), 400

    text   = data["text"].strip()
    engine = data.get("engine", "both")  # vader | bert | both

    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    if engine not in ALLOWED_ENGINES:
        return jsonify({"error": "Invalid engine. Use one of: vader, bert, both"}), 400

    result = analyze_text(text, engine)
    return jsonify(result), 200


@app.route("/api/analyze/batch", methods=["POST"])
def analyze_batch():
    """
    Analyze multiple texts at once.
    
    Request body:
        {
            "texts": ["text1", "text2", ...],
            "engine": "vader"
        }
    
    Response:
        {
            "results": [...],
            "summary": { "positive": 3, "neutral": 1, "negative": 2 }
        }
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "error": "Invalid or empty JSON body",
            "hint": "Send raw JSON like: {\"texts\":[\"a\",\"b\"],\"engine\":\"bert\"}",
        }), 400
    if "texts" not in data:
        return jsonify({"error": "Request body must contain 'texts' array"}), 400

    texts  = data["texts"]
    engine = data.get("engine", "vader")  # default to VADER for batch speed

    if not isinstance(texts, list) or len(texts) == 0:
        return jsonify({"error": "'texts' must be a non-empty array"}), 400

    if len(texts) > 500:
        return jsonify({"error": "Max 500 texts per batch"}), 400
    if engine not in ALLOWED_ENGINES:
        return jsonify({"error": "Invalid engine. Use one of: vader, bert, both"}), 400

    # Accept mixed input and normalize to strings.
    normalized_texts = [str(t).strip() for t in texts if str(t).strip()]
    if not normalized_texts:
        return jsonify({"error": "All texts are empty after normalization"}), 400

    results = [analyze_text(t, engine) for t in normalized_texts]

    # Summary counts
    from collections import Counter
    counts = Counter(r["label"] for r in results)
    total  = len(results)

    summary = {
        "positive": counts.get("positive", 0),
        "neutral":  counts.get("neutral", 0),
        "negative": counts.get("negative", 0),
        "total":    total,
        "positive_pct": round(counts.get("positive", 0) / total * 100, 1),
        "neutral_pct":  round(counts.get("neutral", 0)  / total * 100, 1),
        "negative_pct": round(counts.get("negative", 0) / total * 100, 1),
    }

    return jsonify({"results": results, "summary": summary}), 200


@app.route("/api/model/info", methods=["GET"])
def model_info():
    """Return info about which model is loaded."""
    return jsonify({
        "model_dir": MODEL_DIR,
        "using_trained_model": USE_TRAINED_MODEL,
        "model_type": "fine-tuned DistilBERT (TrendPulse)" if USE_TRAINED_MODEL else "pretrained distilbert-sst-2",
        "engines_available": ["vader", "bert", "both"],
    }), 200


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "TrendPulse Sentiment API"}), 200


@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": "TrendPulse Sentiment API",
        "health": "/api/health",
        "analyze": "/api/analyze",
        "analyze_batch": "/api/analyze/batch",
        "model_info": "/api/model/info",
        "demo_ui": "/demo",
    }), 200


@app.route("/demo", methods=["GET"])
def demo_ui():
    """Serve a minimal frontend to test sentiment predictions quickly."""
    return send_from_directory(str(BASE_DIR), "sentiment_tester.html")


# ─────────────────────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    print("=" * 55)
    print("  TrendPulse Sentiment API starting...")
    if USE_TRAINED_MODEL:
        print(f"  ✅ Will load YOUR trained model: {MODEL_DIR}/")
    else:
        print("  ⚠️  Trained model not found — using pretrained DistilBERT.")
        print("  Run train_sentiment.py first to use your fine-tuned model.")
    print(f"  API will be at: http://localhost:{port}")
    print("=" * 55)
    # Pre-load VADER at startup (instant)
    get_vader()
    app.run(debug=debug, host="0.0.0.0", port=port)
