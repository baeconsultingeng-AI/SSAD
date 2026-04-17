"""
app/api/v1/auth.py
───────────────────
Authentication blueprint — register, login, me.

Endpoints
─────────
POST /api/v1/auth/register   { email, password, full_name, firm, role, country }
POST /api/v1/auth/login      { email, password }
GET  /api/v1/auth/me         Authorization: Bearer <token>

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
    verify_password,
)

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


# ── POST /api/v1/auth/register ────────────────────────────────────────────────

@auth_bp.post("/register")
def register():
    body: dict = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    full_name = (body.get("full_name") or "").strip()
    firm     = (body.get("firm") or "").strip()
    role     = (body.get("role") or "").strip()
    country  = (body.get("country") or "").strip()

    # Validation
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if not full_name:
        return jsonify({"error": "Full name is required."}), 400

    # Duplicate check
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
    token = _make_token(user["id"])
    return jsonify({"token": token, "user": _safe_user(user)}), 201


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
