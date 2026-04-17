"""
app/api/v1/auth.py
───────────────────
Authentication blueprint.

Endpoints
─────────
POST /api/v1/auth/register              { email, password, full_name, firm, role, country }
POST /api/v1/auth/login                 { email, password }
GET  /api/v1/auth/me                    Authorization: Bearer <token>
GET  /api/v1/auth/verify-email          ?token=<verify_token>
POST /api/v1/auth/resend-verification   { email }

Tokens
──────
HS256 JWT signed with JWT_SECRET from .env.
Payload: { sub: user_id, exp: +7d }
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, jsonify, request

from app.db.auth_db import (
    _safe_user,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_verify_token,
    mark_email_verified,
    refresh_verify_token,
    verify_password,
)
from app.utils.email import send_verification_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

_JWT_SECRET = os.getenv("JWT_SECRET", "ssad-dev-secret-change-in-production")
_JWT_ALGORITHM = "HS256"
_TOKEN_EXPIRY_DAYS = 7


def _make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=_TOKEN_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def _decode_token(token: str) -> str | None:
    """Return user_id or None if token is invalid/expired."""
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        return str(payload["sub"])
    except jwt.PyJWTError:
        return None


def _bearer_token() -> str | None:
    """Extract Bearer token from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _token_is_expired(user: dict) -> bool:
    expires = user.get("verify_token_expires_at")
    if not expires:
        return True
    try:
        expiry_dt = datetime.fromisoformat(expires)
        if expiry_dt.tzinfo is None:
            expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
        return expiry_dt < datetime.now(timezone.utc)
    except ValueError:
        return True


# ── POST /api/v1/auth/register ────────────────────────────────────────────────

@auth_bp.post("/register")
def register():
    body: dict = request.get_json(silent=True) or {}
    email     = (body.get("email") or "").strip().lower()
    password  = (body.get("password") or "").strip()
    full_name = (body.get("full_name") or "").strip()
    firm      = (body.get("firm") or "").strip()
    role      = (body.get("role") or "").strip()
    country   = (body.get("country") or "").strip()

    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if not full_name:
        return jsonify({"error": "Full name is required."}), 400

    if get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    user = create_user(
        email=email,
        password=password,
        full_name=full_name,
        firm=firm,
        role=role,
        country=country,
    )

    # Send verification email (non-blocking: failure is logged, not raised)
    send_verification_email(email, user.get("full_name", ""), user["verify_token"])

    return jsonify({
        "message": "Account created. Please check your inbox to verify your email.",
        "email": email,
    }), 201


# ── POST /api/v1/auth/login ───────────────────────────────────────────────────

@auth_bp.post("/login")
def login():
    body: dict = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.get("email_verified"):
        return jsonify({
            "error": "Email not verified. Please check your inbox for the verification link.",
            "code":  "EMAIL_NOT_VERIFIED",
        }), 403

    token = _make_token(user["id"])
    return jsonify({"token": token, "user": _safe_user(user)}), 200


# ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

@auth_bp.get("/me")
def me():
    token = _bearer_token()
    if not token:
        return jsonify({"error": "Authentication required."}), 401

    user_id = _decode_token(token)
    if not user_id:
        return jsonify({"error": "Token invalid or expired."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify({"user": _safe_user(user)}), 200


# ── GET /api/v1/auth/verify-email ────────────────────────────────────────────

@auth_bp.get("/verify-email")
def verify_email():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Verification token is required."}), 400

    user = get_user_by_verify_token(token)
    if not user:
        return jsonify({
            "error": "Verification link is invalid.",
            "code":  "INVALID_TOKEN",
        }), 400

    if _token_is_expired(user):
        return jsonify({
            "error": "Verification link has expired. Please request a new one.",
            "code":  "TOKEN_EXPIRED",
            "email": user["email"],
        }), 400

    mark_email_verified(user["id"])
    return jsonify({"success": True, "message": "Email verified successfully."}), 200


# ── POST /api/v1/auth/resend-verification ─────────────────────────────────────

@auth_bp.post("/resend-verification")
def resend_verification():
    body: dict = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = get_user_by_email(email)
    # Always return 200 to avoid email enumeration — don't reveal whether
    # the account exists.
    if not user or user.get("email_verified"):
        return jsonify({"message": "If that address is registered and unverified, a new link has been sent."}), 200

    new_token = refresh_verify_token(user["id"])
    send_verification_email(email, user.get("full_name", ""), new_token)

    return jsonify({"message": "Verification email resent. Please check your inbox."}), 200
