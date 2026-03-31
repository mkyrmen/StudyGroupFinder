"""
Flask app — run from backend dir: python app.py
Or from project root: python backend/app.py
"""
import os
import sys

# Ensure backend dir is on path so "from routes.auth" / "from models" work from any cwd
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from flask import Flask, request, make_response, jsonify
from flask_cors import CORS
from extensions import db
from sqlalchemy import text
from datetime import datetime, timedelta

app = Flask(__name__)

# CORS when frontend hits :5000 directly
CORS(app, resources={r"/api/*": {"origins": "*", "supports_credentials": False}})

from dotenv import load_dotenv
load_dotenv()

# Database — override with env DATABASE_URL if needed
default_db = "postgresql://localhost/studygroupfinder"
_db_url = os.environ.get("DATABASE_URL", default_db)
# Log which DB we're connecting to (mask password for security)
try:
    _safe_url = _db_url.split("@")[-1] if "@" in _db_url else _db_url
    print(f"[App] Connecting to database host: {_safe_url}", flush=True)
except Exception:
    pass
app.config["SQLALCHEMY_DATABASE_URI"] = _db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Import models first so tables are registered, then blueprints
import models  # noqa: F401, E402

from routes.auth import auth_bp
from routes.groups import groups_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(groups_bp, url_prefix="/api/groups")


def _log(msg):
    print(f"[App] {msg}", flush=True)
    sys.stdout.flush()


@app.before_request
def preflight():
    _log(f">>> {request.method} {request.path}")
    
    # Update last_seen_at if it's an API request with a user (mocking auth updates for now)
    # in a real app, this would be in a decorator or middleware
    if request.path.startswith("/api/"):
        # For this testcase, we'll try to get user_id from headers if present
        # but since we're mostly testing admin, we'll just log
        pass

    if request.method == "OPTIONS":
        r = make_response("", 200)
        r.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin") or "*"
        r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        r.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return r


@app.after_request
def cors_headers(response):
    try:
        if request.path.startswith("/api/"):
            origin = request.headers.get("Origin") or "*"
            if "Access-Control-Allow-Origin" not in response.headers:
                response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    except Exception as e:
        _log(f"cors_headers: {e}")
    return response


@app.errorhandler(Exception)
def handle_any_error(err):
    try:
        _log(f"ERROR: {err}")
        import traceback
        traceback.print_exc()
        code = getattr(err, "code", 500)
        if code < 400:
            code = 500
        return jsonify(error="Internal server error", detail=str(err)), code
    except Exception:
        return make_response('{"error":"Internal server error","detail":"unknown"}', 500, {"Content-Type": "application/json"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(status="ok", message="Backend is running")


@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    from models import User
    try:
        users = User.query.all()
        now = datetime.utcnow()
        active_threshold = now - timedelta(minutes=5)
        
        user_list = []
        for u in users:
            is_active = False
            if u.last_seen_at:
                 # Check if last_seen_at is within 5 minutes
                 is_active = u.last_seen_at > active_threshold
            
            # Get names of joined groups
            joined_groups = [g.name for g in u.groups_joined]
                 
            user_list.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
                "is_active": is_active,
                "groups_joined": joined_groups
            })
        return jsonify({"users": user_list})
    except Exception as e:
        _log(f"admin_users error: {e}")
        return jsonify(error="Failed to load admin users", detail=str(e)), 500


def ensure_user_columns():
    alters = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP",
        "ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for sql in alters:
        try:
            db.session.execute(text(sql))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            _log(f"ensure_user_columns: {e}")


def check_db_ok():
    from models import User
    try:
        User.query.limit(1).first()
        _log("Database OK (users table ready)")
    except Exception as e:
        _log(f"Database check failed: {e}")
        _log("Ensure PostgreSQL is running and database 'studygroupfinder' exists.")


# Run on startup regardless of how the app is launched (gunicorn or python app.py)
with app.app_context():
    try:
        _log("Initializing database tables...")
        # Explicitly ensure models are known to SQLAlchemy
        import models
        db.create_all()
        _log("db.create_all() completed.")
        
        ensure_user_columns()
        _log("ensure_user_columns() completed.")
        
        # This will raise if tables are missing
        from models import User
        User.query.limit(1).all()
        _log("Database verification successful (users table exists).")
    except Exception as e:
        _log(f"!!! CRITICAL DATABASE ERROR !!!")
        _log(f"Error type: {type(e).__name__}")
        _log(f"Error message: {e}")
        import traceback
        traceback.print_exc()
        # In production, we might want to crash here so Render shows the error clearly
        # raise e 

if __name__ == "__main__":
    _log("Flask running at http://0.0.0.0:5000")
    _log("Frontend: run 'npm run dev' in frontend/, then open http://localhost:5173")
    app.run(debug=False, host="0.0.0.0", port=5000)
