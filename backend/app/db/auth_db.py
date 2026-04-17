"""
app/db/auth_db.py
──────────────────
SQLite-backed user store for SSAD authentication.

Schema
──────
users
  id                     TEXT PRIMARY KEY  (uuid4)
  email                  TEXT UNIQUE NOT NULL
  password_hash          TEXT NOT NULL      (bcrypt)
  full_name              TEXT
  firm                   TEXT
  role                   TEXT
  country                TEXT
  tier                   TEXT NOT NULL DEFAULT 'trial'
                         ('guest' | 'trial' | 'pro' | 'enterprise')
  trial_expires_at       TEXT               (ISO-8601 UTC)
  paystack_customer_code TEXT
  created_at             TEXT NOT NULL      (ISO-8601 UTC)
  email_verified         INTEGER NOT NULL DEFAULT 0
  verify_token           TEXT
  verify_token_expires_at TEXT
"""
from __future__ import annotations

import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt

# Store the database beside this file (backend/app/db/ssad_users.db)
_DB_PATH = Path(__file__).parent / "ssad_users.db"

_VERIFY_TOKEN_EXPIRY_HOURS = 24


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the users table and apply any pending column migrations."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id                       TEXT PRIMARY KEY,
                email                    TEXT UNIQUE NOT NULL,
                password_hash            TEXT NOT NULL,
                full_name                TEXT,
                firm                     TEXT,
                role                     TEXT,
                country                  TEXT,
                tier                     TEXT NOT NULL DEFAULT 'trial',
                trial_expires_at         TEXT,
                paystack_customer_code   TEXT,
                created_at               TEXT NOT NULL,
                email_verified           INTEGER NOT NULL DEFAULT 0,
                verify_token             TEXT,
                verify_token_expires_at  TEXT
            )
            """
        )
        conn.commit()

    # Migrate older databases that lack the new columns
    _migrate_db()


def _migrate_db() -> None:
    """Safely add new columns to existing databases (idempotent)."""
    migrations = [
        ("email_verified",          "INTEGER NOT NULL DEFAULT 0"),
        ("verify_token",             "TEXT"),
        ("verify_token_expires_at",  "TEXT"),
    ]
    with _connect() as conn:
        for col, defn in migrations:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {defn}")
                conn.commit()
            except sqlite3.OperationalError:
                pass  # column already exists


def create_user(
    email: str,
    password: str,
    full_name: str = "",
    firm: str = "",
    role: str = "",
    country: str = "",
) -> dict:
    """Hash password, insert a new unverified user, and return (user, token)."""
    init_db()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id  = str(uuid.uuid4())
    now_iso  = datetime.now(timezone.utc).isoformat()
    trial_expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    verify_token  = secrets.token_urlsafe(32)
    token_expires = (
        datetime.now(timezone.utc) + timedelta(hours=_VERIFY_TOKEN_EXPIRY_HOURS)
    ).isoformat()

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO users
              (id, email, password_hash, full_name, firm, role, country,
               tier, trial_expires_at, created_at,
               email_verified, verify_token, verify_token_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?, 0, ?, ?)
            """,
            (user_id, email.lower().strip(), password_hash,
             full_name.strip(), firm.strip(), role.strip(), country.strip(),
             trial_expires, now_iso, verify_token, token_expires),
        )
        conn.commit()

    return get_user_by_id(user_id)  # type: ignore[return-value]


def get_user_by_email(email: str) -> Optional[dict]:
    """Return user dict or None."""
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Return user dict or None."""
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_verify_token(token: str) -> Optional[dict]:
    """Return user dict matching this verify token, or None."""
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE verify_token = ?", (token,)
        ).fetchone()
    return dict(row) if row else None


def mark_email_verified(user_id: str) -> None:
    """Set email_verified = 1 and clear the verify token."""
    init_db()
    with _connect() as conn:
        conn.execute(
            """
            UPDATE users
               SET email_verified = 1,
                   verify_token = NULL,
                   verify_token_expires_at = NULL
             WHERE id = ?
            """,
            (user_id,),
        )
        conn.commit()


def refresh_verify_token(user_id: str) -> str:
    """Generate and store a fresh verification token. Returns the new token."""
    init_db()
    token = secrets.token_urlsafe(32)
    expires = (
        datetime.now(timezone.utc) + timedelta(hours=_VERIFY_TOKEN_EXPIRY_HOURS)
    ).isoformat()
    with _connect() as conn:
        conn.execute(
            "UPDATE users SET verify_token = ?, verify_token_expires_at = ? WHERE id = ?",
            (token, expires, user_id),
        )
        conn.commit()
    return token


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain password matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def update_tier(user_id: str, tier: str, paystack_customer_code: str = "") -> None:
    """Upgrade or downgrade a user's subscription tier."""
    init_db()
    with _connect() as conn:
        if paystack_customer_code:
            conn.execute(
                "UPDATE users SET tier = ?, paystack_customer_code = ? WHERE id = ?",
                (tier, paystack_customer_code, user_id),
            )
        else:
            conn.execute(
                "UPDATE users SET tier = ? WHERE id = ?",
                (tier, user_id),
            )
        conn.commit()


def _safe_user(user: dict) -> dict:
    """Strip sensitive fields before sending user data to the client."""
    return {
        k: v for k, v in user.items()
        if k not in ("password_hash", "verify_token", "verify_token_expires_at")
    }
