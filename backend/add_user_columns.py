"""
One-time script: add role and timestamp columns to the users table
if they are missing (e.g. table was created before we added these fields).
Run from the backend folder: python add_user_columns.py
"""
import os
import sys

# Run from backend directory so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from sqlalchemy import text

SQL = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;",
]

if __name__ == "__main__":
    with app.app_context():
        for s in SQL:
            try:
                db.session.execute(text(s))
                db.session.commit()
                print("OK:", s.split("ADD COLUMN")[1].split(" ")[1] if "ADD COLUMN" in s else s[:50])
            except Exception as e:
                print("Skip or error:", e)
        print("Done. Restart the Flask app and try login again.")
