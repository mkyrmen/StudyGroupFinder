from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
import sys

auth_bp = Blueprint("auth", __name__)


def _log(msg):
    print(f"[Auth] {msg}", flush=True)
    sys.stdout.flush()


_SCHEMA_ERROR_MSG = (
    "Database schema is out of date. Run the backend once so it can add missing columns, "
    "or drop the users table and restart."
)


def _safe_register():
    try:
        data = request.get_json(silent=True) or {}
    except Exception:
        data = {}
    _log(f"register: email={data.get('email')!r} role={data.get('role')!r}")

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    role = data.get("role", "user")

    if not name or not email or not password:
        _log("register 400: missing fields")
        return jsonify({"error": "All fields are required"}), 400

    normalized_role = "admin" if role == "admin" else "user"

    try:
        if normalized_role == "admin":
            existing_admin = User.query.filter_by(role="admin").first()
            if existing_admin:
                return jsonify({"error": "Admin user already exists"}), 400
        existing_user = User.query.filter_by(email=email).first()
    except SQLAlchemyError as e:
        _log(f"register 503: query error: {e}")
        return jsonify({"error": _SCHEMA_ERROR_MSG, "detail": str(e)}), 503

    if existing_user:
        _log(f"register 400: email exists {email!r}")
        return jsonify({"error": "Email already exists"}), 400

    try:
        hashed = generate_password_hash(password)
        new_user = User(name=name, email=email, password=hashed, role=normalized_role)
        db.session.add(new_user)
        db.session.commit()
    except SQLAlchemyError as e:
        db.session.rollback()
        _log(f"register 503: commit error: {e}")
        return jsonify({"error": _SCHEMA_ERROR_MSG, "detail": str(e)}), 503

    _log(f"register 201: id={new_user.id} email={new_user.email!r}")
    role_val = getattr(new_user, "role", "user")
    return (
        jsonify({
            "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email, "role": role_val},
            "message": "User registered successfully.",
        }),
        201,
    )


def _safe_login():
    try:
        data = request.get_json(silent=True) or {}
    except Exception:
        data = {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    role = data.get("role")
    _log(f"login: email={email!r}")

    if not email or not password:
        _log("login 400: missing email or password")
        return jsonify({"error": "Email and password are required"}), 400

    try:
        user = User.query.filter_by(email=email).first()
    except SQLAlchemyError as e:
        _log(f"login 503: query error: {e}")
        return jsonify({"error": _SCHEMA_ERROR_MSG, "detail": str(e)}), 503

    if not user or not check_password_hash(user.password, password):
        _log("login 401: invalid credentials")
        return jsonify({"error": "Invalid email or password"}), 401

    user_role = getattr(user, "role", "user")
    if role and role != user_role:
        return jsonify({"error": "Incorrect role for this account."}), 403

    token = f"mock_token_for_{user.id}_{user_role}"
    return (
        jsonify({
            "message": "Login successful",
            "token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email, "role": user_role},
        }),
        200,
    )


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        return _safe_register()
    except Exception as e:
        _log(f"register 500: {e}")
        import traceback
        traceback.print_exc()
        detail = str(e)
        if "role" in detail.lower() or "column" in detail.lower():
            detail = f"{detail} — Run: python app.py once to add missing columns, or drop table users and restart."
        return jsonify(error="Registration failed", detail=detail), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        return _safe_login()
    except Exception as e:
        _log(f"login 500: {e}")
        import traceback
        traceback.print_exc()
        detail = str(e)
        if "role" in detail.lower() or "column" in detail.lower():
            detail = f"{detail} — Run: python app.py once to add missing columns, or drop table users and restart."
        return jsonify(error="Login failed", detail=detail), 500


@auth_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    try:
        user = User.query.get_or_404(user_id)
        created_groups = [
            {"id": g.id, "name": g.name, "subject": g.subject, "members_count": g.members_count}
            for g in user.groups_created
        ]
        joined_groups = [
            {"id": g.id, "name": g.name, "subject": g.subject, "members_count": g.members_count}
            for g in user.groups_joined
        ]
        return jsonify({
            "user": {"id": user.id, "name": user.name, "email": user.email},
            "created_groups": created_groups,
            "joined_groups": joined_groups,
        }), 200
    except Exception as e:
        _log(f"profile 500: {e}")
        return jsonify(error="Profile failed", detail=str(e)), 500
