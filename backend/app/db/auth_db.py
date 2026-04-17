"""
app/db/auth_db.py
──────────────────
SQLite-backed user store for SSAD authentication.

Schema
──────
users
  id                TEXT PRIMARY KEY  (uuid4)
  email             TEXT UNIQUE NOT NULL
  password_hash     TEXT NOT NULL      (bcrypt)
  full_name         TEXT
  firm              TEXT
  role              TEXT
  country           TEXT
  tier              TEXT NOT NULL DEFAULT 'trial'
                    ('guest' | 'trial' | 'pro' | 'enterprise')
  trial_expires_at  TEXT               (ISO-8601 UTC)
  paystack_customer_code TEXT
  created_at        TEXT NOT NULL      (ISO-8601 UTC)
"""
from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt

# Store the database beside this file (backend/app/db/ssad_users.db)
_DB_PATH = Path(__file__).parent / "ssad_users.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the users table if it does not exist."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id                    TEXT PRIMARY KEY,
                email                 TEXT UNIQUE NOT NULL,
                password_hash         TEXT NOT NULL,
                full_name             TEXT,
                firm                  TEXT,
                role                  TEXT,
                country               TEXT,
                tier                  TEXT NOT NULL DEFAULT 'trial',
                trial_expires_at      TEXT,
                paystack_customer_code TEXT,
                created_at            TEXT NOT NULL
            )
            """
        )
        conn.commit()


def create_user(
    email: str,
    password: str,
    full_name: str = "",
    firm: str = "",
    role: str = "",
    country: str = "",
) -> dict:
    """Hash password and insert a new user. Returns the user dict."""
    init_db()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    trial_expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO users
              (id, email, password_hash, full_name, firm, role, country,
               tier, trial_expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?)
            """,
            (user_id, email.lower().strip(), password_hash,
             full_name.strip(), firm.strip(), role.strip(), country.strip(),
             trial_expires, now_iso),
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
    """Strip the password hash before sending user data to the client."""
    return {k: v for k, v in user.items() if k != "password_hash"}
