"""
app/db/client.py
────────────────
Supabase client singleton.

Returns a real connected client when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
are present in the environment (loaded from backend/.env via python-dotenv).
Returns None otherwise — all callers treat None as "persistence unavailable"
and fall through to a graceful no-op, so the calculation API keeps working
without a live database.

Usage:
    from app.db.client import get_client
    sb = get_client()
    if sb:
        sb.table("calculation_runs").insert(row).execute()
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import TYPE_CHECKING

# Load .env file from the project root (backend/.env)
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv not installed; rely on OS env vars

if TYPE_CHECKING:
    from supabase import Client

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_client() -> "Client | None":
    """Return a cached Supabase client, or None if credentials are absent."""
    url  = os.getenv("SUPABASE_URL", "").strip()
    key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key or url.startswith("your-"):
        log.info("Supabase credentials not configured — persistence disabled.")
        return None

    try:
        from supabase import create_client
        client = create_client(url, key)
        log.info("Supabase client initialised for %s", url)
        return client
    except Exception as exc:  # pragma: no cover
        log.error("Failed to initialise Supabase client: %s", exc)
        return None
