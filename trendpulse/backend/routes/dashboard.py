from flask import Blueprint, render_template
from flask_login import login_required, current_user
from backend.models.post import Post

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard")
@login_required
def home():
    # Seed sample data on first visit
    Post.seed_sample_data()

    posts = Post.get_recent(limit=20)
    counts = Post.sentiment_counts()
    top_tags = Post.top_hashtags(limit=8)

    return render_template(
        "dashboard/home.html",
        posts=posts,
        counts=counts,
        top_tags=top_tags,
        user=current_user,
    )
