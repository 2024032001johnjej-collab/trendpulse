"""
TrendPulse — Model Inference & Export Utilities
================================================
Use this file to:
  1. Load your trained model and run predictions
  2. Export model to ONNX (faster inference)
  3. Run VADER-only (no GPU needed, instant)
  4. Test the model before deploying

Usage examples:
    python inference.py --text "I love this!"
    python inference.py --mode vader --text "Great product!"
    python inference.py --export-onnx
    python inference.py --batch-file my_posts.csv
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

MODEL_DIR = "./trendpulse_model"
LABEL_MAP = {0: "negative", 1: "neutral", 2: "positive"}


# ─────────────────────────────────────────────────────────────
# 1. VADER — instant, no GPU, works always
# ─────────────────────────────────────────────────────────────
class VaderPredictor:
    def __init__(self):
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        self.analyzer = SentimentIntensityAnalyzer()
        print("✅ VADER loaded")

    def predict(self, text: str) -> dict:
        scores = self.analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound >= 0.05:
            label, idx = "positive", 2
        elif compound <= -0.05:
            label, idx = "negative", 0
        else:
            label, idx = "neutral", 1
        return {
            "label": label,
            "label_id": idx,
            "confidence": round(abs(compound) if compound != 0 else 0.5, 4),
            "compound_score": compound,
            "engine": "vader",
        }

    def predict_batch(self, texts: list) -> list:
        return [self.predict(t) for t in texts]


# ─────────────────────────────────────────────────────────────
# 2. DistilBERT — use YOUR trained model
# ─────────────────────────────────────────────────────────────
class BertPredictor:
    def __init__(self, model_dir: str = MODEL_DIR):
        from transformers import pipeline, DistilBertTokenizerFast, DistilBertForSequenceClassification
        import torch

        if not Path(model_dir).exists():
            print(f"⚠️  Model dir '{model_dir}' not found.")
            print("   Using pretrained distilbert-sst-2 instead.")
            model_dir = "distilbert-base-uncased-finetuned-sst-2-english"

        print(f"✅ Loading model from: {model_dir}")
        self.clf = pipeline("text-classification", model=model_dir, tokenizer=model_dir)
        self.model_dir = model_dir

        # Load label config if available
        cfg_path = Path(model_dir) / "label_config.json"
        if cfg_path.exists():
            with open(cfg_path) as f:
                cfg = json.load(f)
            self.id2label = {int(k): v for k, v in cfg["id2label"].items()}
        else:
            self.id2label = {0: "negative", 1: "neutral", 2: "positive",
                             "NEGATIVE": "negative", "POSITIVE": "positive"}

    def predict(self, text: str) -> dict:
        result = self.clf(text[:512])[0]
        label_raw = result["label"]
        label = self.id2label.get(label_raw, label_raw).lower()
        label = self.id2label.get(label, label)
        return {
            "label": label,
            "confidence": round(result["score"], 4),
            "raw_label": label_raw,
            "engine": "distilbert",
        }

    def predict_batch(self, texts: list) -> list:
        results = self.clf([t[:512] for t in texts], batch_size=32)
        out = []
        for r in results:
            label = self.id2label.get(r["label"], r["label"]).lower()
            out.append({"label": label, "confidence": round(r["score"], 4), "engine": "distilbert"})
        return out


# ─────────────────────────────────────────────────────────────
# 3. HYBRID — best of both worlds (used in production)
# ─────────────────────────────────────────────────────────────
class HybridPredictor:
    """
    Use VADER for real-time speed + DistilBERT for accuracy.
    Returns BERT result but includes VADER scores for comparison.
    """
    def __init__(self, model_dir: str = MODEL_DIR):
        self.vader = VaderPredictor()
        self.bert  = BertPredictor(model_dir)

    def predict(self, text: str) -> dict:
        v = self.vader.predict(text)
        b = self.bert.predict(text)
        agree = v["label"] == b["label"]
        return {
            "label": b["label"],                   # BERT is primary
            "confidence": b["confidence"],
            "vader_label": v["label"],
            "vader_confidence": v["confidence"],
            "models_agree": agree,
            "engine": "hybrid",
        }

    def predict_batch(self, texts: list) -> list:
        bert_results = self.bert.predict_batch(texts)
        vader_results = self.vader.predict_batch(texts)
        out = []
        for b, v in zip(bert_results, vader_results):
            out.append({
                "label": b["label"],
                "confidence": b["confidence"],
                "vader_label": v["label"],
                "models_agree": b["label"] == v["label"],
                "engine": "hybrid",
            })
        return out


# ─────────────────────────────────────────────────────────────
# 4. EXPORT TO ONNX — faster inference, no PyTorch needed
# ─────────────────────────────────────────────────────────────
def export_to_onnx(model_dir: str = MODEL_DIR, output_path: str = "./trendpulse_model.onnx"):
    """
    Export the trained PyTorch model to ONNX format.
    ONNX models are 2-3x faster for inference and can run without PyTorch.
    
    Requirements: pip install optimum onnx onnxruntime
    """
    print(f"📦 Exporting model to ONNX: {output_path}")
    try:
        from optimum.onnxruntime import ORTModelForSequenceClassification
        from transformers import DistilBertTokenizerFast

        tokenizer = DistilBertTokenizerFast.from_pretrained(model_dir)
        model     = ORTModelForSequenceClassification.from_pretrained(
            model_dir, export=True
        )
        model.save_pretrained("./trendpulse_onnx")
        tokenizer.save_pretrained("./trendpulse_onnx")
        print("✅ ONNX model saved to ./trendpulse_onnx/")
        print("   To use it, just change MODEL_DIR to './trendpulse_onnx' in flask_sentiment.py")
        return True
    except ImportError:
        print("❌ Install required: pip install optimum onnxruntime")
        return False


# ─────────────────────────────────────────────────────────────
# 5. CHECKPOINT LOADING — resume from a training checkpoint
# ─────────────────────────────────────────────────────────────
def load_from_checkpoint(checkpoint_dir: str = "./checkpoints") -> str:
    """
    Find the best checkpoint and copy it to trendpulse_model/.
    Call this if training was interrupted midway.
    
    Returns the path of the best checkpoint found.
    """
    import shutil
    from pathlib import Path

    checkpoints = list(Path(checkpoint_dir).glob("checkpoint-*"))
    if not checkpoints:
        print(f"❌ No checkpoints found in {checkpoint_dir}/")
        return None

    # Trainer saves trainer_state.json with best_model_checkpoint
    trainer_state_files = list(Path(checkpoint_dir).glob("*/trainer_state.json"))
    if trainer_state_files:
        best_acc = -1
        best_ckpt = None
        for f in trainer_state_files:
            with open(f) as fp:
                state = json.load(fp)
            # Find checkpoint with best eval_accuracy
            for entry in state.get("log_history", []):
                acc = entry.get("eval_accuracy", -1)
                if acc > best_acc:
                    best_acc = acc
                    best_ckpt = f.parent
        if best_ckpt:
            print(f"✅ Best checkpoint: {best_ckpt} (accuracy={best_acc:.4f})")
            shutil.copytree(str(best_ckpt), MODEL_DIR, dirs_exist_ok=True)
            print(f"   Copied to {MODEL_DIR}/")
            return str(best_ckpt)

    # Fallback: use most recent checkpoint
    latest = max(checkpoints, key=os.path.getmtime)
    print(f"✅ Using most recent checkpoint: {latest}")
    shutil.copytree(str(latest), MODEL_DIR, dirs_exist_ok=True)
    return str(latest)


# ─────────────────────────────────────────────────────────────
# 6. BATCH FILE ANALYSIS — analyze a CSV of posts
# ─────────────────────────────────────────────────────────────
def analyze_csv(csv_path: str, text_column: str = "text", engine: str = "hybrid"):
    """
    Read a CSV, run sentiment on each row, save results.
    
    Usage:
        python inference.py --batch-file my_posts.csv --col text
    """
    import pandas as pd

    print(f"📄 Reading: {csv_path}")
    df = pd.read_csv(csv_path)
    if text_column not in df.columns:
        print(f"❌ Column '{text_column}' not found. Available: {list(df.columns)}")
        return

    if engine == "vader":
        predictor = VaderPredictor()
    elif engine == "bert":
        predictor = BertPredictor()
    else:
        predictor = HybridPredictor()

    print(f"🔍 Analyzing {len(df)} rows with {engine.upper()}...")
    start = time.time()
    results = predictor.predict_batch(df[text_column].tolist())
    elapsed = time.time() - start

    df["sentiment"]   = [r["label"] for r in results]
    df["confidence"]  = [r["confidence"] for r in results]

    out_path = csv_path.replace(".csv", "_with_sentiment.csv")
    df.to_csv(out_path, index=False)
    print(f"✅ Done in {elapsed:.1f}s. Results saved to: {out_path}")
    print(f"   Distribution: {df['sentiment'].value_counts().to_dict()}")


# ─────────────────────────────────────────────────────────────
# QUICK DEMO — shows what all modes produce
# ─────────────────────────────────────────────────────────────
def run_demo():
    test_texts = [
        "This product is absolutely amazing! Best purchase ever!",
        "It's okay, does what it says, nothing more.",
        "Complete disaster. Never buying this again. Waste of money.",
        "New update released for the app.",
        "I'm really impressed with the customer service team!",
    ]

    print("\n" + "─" * 60)
    print("  VADER Demo (instant, no model needed)")
    print("─" * 60)
    vader = VaderPredictor()
    for t in test_texts:
        r = vader.predict(t)
        icon = {"positive": "😊", "neutral": "😐", "negative": "😠"}[r["label"]]
        print(f"  {icon} {r['label'].upper():9s} ({r['confidence']:.2f}) | {t[:55]}")

    print("\n" + "─" * 60)
    print("  DistilBERT Demo (loads trained model)")
    print("─" * 60)
    try:
        bert = BertPredictor()
        for t in test_texts:
            r = bert.predict(t)
            icon = {"positive": "😊", "neutral": "😐", "negative": "😠"}[r["label"]]
            print(f"  {icon} {r['label'].upper():9s} ({r['confidence']:.2f}) | {t[:55]}")
    except Exception as e:
        print(f"  ⚠️  DistilBERT error: {e}")
        print("     Make sure you ran train_sentiment.py first!")


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TrendPulse Inference Utility")
    parser.add_argument("--text",          type=str, help="Analyze a single text")
    parser.add_argument("--mode",          type=str, default="hybrid",
                        choices=["vader", "bert", "hybrid"], help="Which engine to use")
    parser.add_argument("--batch-file",    type=str, help="CSV file to batch-analyze")
    parser.add_argument("--col",           type=str, default="text", help="CSV column name")
    parser.add_argument("--export-onnx",   action="store_true", help="Export model to ONNX")
    parser.add_argument("--load-checkpoint", action="store_true", help="Load best checkpoint")
    parser.add_argument("--demo",          action="store_true", help="Run a demo")
    args = parser.parse_args()

    if args.export_onnx:
        export_to_onnx()
    elif args.load_checkpoint:
        load_from_checkpoint()
    elif args.batch_file:
        analyze_csv(args.batch_file, args.col, args.mode)
    elif args.text:
        if args.mode == "vader":
            p = VaderPredictor()
        elif args.mode == "bert":
            p = BertPredictor()
        else:
            p = HybridPredictor()
        result = p.predict(args.text)
        print(json.dumps(result, indent=2))
    else:
        run_demo()
