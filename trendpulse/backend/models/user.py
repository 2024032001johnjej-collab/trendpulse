from flask_login import UserMixin
from bson import ObjectId
from backend import mongo, login_manager


class User(UserMixin):
    """User model backed by MongoDB."""

    def __init__(self, user_doc):
        self._id = str(user_doc["_id"])
        self.username = user_doc["username"]
        self.email = user_doc["email"]
        self.password_hash = user_doc["password"]

    def get_id(self):
        return self._id

    # ── Static helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def find_by_email(email):
        doc = mongo.db.users.find_one({"email": email.lower()})
        return User(doc) if doc else None

    @staticmethod
    def find_by_username(username):
        doc = mongo.db.users.find_one({"username": username})
        return User(doc) if doc else None

    @staticmethod
    def find_by_id(user_id):
        try:
            doc = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            return User(doc) if doc else None
        except Exception:
            return None

    @staticmethod
    def create(username, email, password_hash):
        """Insert a new user document and return the inserted id."""
        result = mongo.db.users.insert_one(
            {
                "username": username,
                "email": email.lower(),
                "password": password_hash,
            }
        )
        return str(result.inserted_id)


@login_manager.user_loader
def load_user(user_id):
    return User.find_by_id(user_id)
