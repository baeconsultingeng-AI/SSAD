"""
app/api/v1/payment.py
──────────────────────
Paystack payment blueprint.

Endpoints
─────────
POST /api/v1/payment/initialize   Initialize a Paystack transaction
GET  /api/v1/payment/verify/<ref> Verify transaction & upgrade tier
POST /api/v1/payment/webhook      Paystack webhook (charge.success)

Environment vars needed
───────────────────────
PAYSTACK_SECRET_KEY=sk_live_...   (or sk_test_... for testing)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os

import requests
from flask import Blueprint, jsonify, request

from app.db.auth_db import _safe_user, get_user_by_id, update_tier

payment_bp = Blueprint("payment", __name__, url_prefix="/api/v1/payment")

_PAYSTACK_SECRET = os.getenv("PAYSTACK_SECRET_KEY", "")
_PAYSTACK_BASE   = "https://api.paystack.co"

# Pricing plans (amounts in kobo — Paystack uses smallest currency unit)
# £1 = 100 pence; ₦1 = 100 kobo
# We price in NGN; adjust PLAN_CURRENCY / amounts as needed.
PLANS = {
    "pro_monthly": {
        "name": "SSAD Pro — Monthly",
        "amount": 2900_00,       # ₦29,000 / month  (adjust as needed)
        "currency": "NGN",
        "tier": "pro",
    },
    "pro_annual": {
        "name": "SSAD Pro — Annual",
        "amount": 29000_00,      # ₦290,000 / year (~17% saving)
        "currency": "NGN",
        "tier": "pro",
    },
}


def _paystack_headers() -> dict:
    return {
        "Authorization": f"Bearer {_PAYSTACK_SECRET}",
        "Content-Type": "application/json",
    }


# ── POST /api/v1/payment/initialize ──────────────────────────────────────────

@payment_bp.post("/initialize")
def initialize():
    if not _PAYSTACK_SECRET:
        return jsonify({"error": "Payment is not configured on this server."}), 503

    body: dict = request.get_json(silent=True) or {}
    user_id  = body.get("user_id", "")
    email    = body.get("email", "")
    plan_key = body.get("plan", "pro_monthly")

    if not email or not user_id:
        return jsonify({"error": "user_id and email are required."}), 400

    plan = PLANS.get(plan_key)
    if not plan:
        return jsonify({"error": f"Unknown plan '{plan_key}'."}), 400

    resp = requests.post(
        f"{_PAYSTACK_BASE}/transaction/initialize",
        headers=_paystack_headers(),
        json={
            "email": email,
            "amount": plan["amount"],
            "currency": plan["currency"],
            "metadata": {
                "user_id": user_id,
                "plan": plan_key,
                "custom_fields": [
                    {"display_name": "Plan", "variable_name": "plan", "value": plan["name"]},
                ],
            },
        },
        timeout=15,
    )

    if not resp.ok:
        return jsonify({"error": "Payment provider error. Please try again."}), 502

    data = resp.json()
    return jsonify({
        "authorization_url": data["data"]["authorization_url"],
        "reference":         data["data"]["reference"],
        "access_code":       data["data"]["access_code"],
    }), 200


# ── GET /api/v1/payment/verify/<reference> ───────────────────────────────────

@payment_bp.get("/verify/<reference>")
def verify(reference: str):
    if not _PAYSTACK_SECRET:
        return jsonify({"error": "Payment is not configured on this server."}), 503

    resp = requests.get(
        f"{_PAYSTACK_BASE}/transaction/verify/{reference}",
        headers=_paystack_headers(),
        timeout=15,
    )
    if not resp.ok:
        return jsonify({"error": "Could not verify payment."}), 502

    data = resp.json().get("data", {})
    if data.get("status") != "success":
        return jsonify({"error": "Payment not successful.", "status": data.get("status")}), 400

    # Upgrade the user's tier
    metadata = data.get("metadata", {})
    user_id  = metadata.get("user_id", "")
    plan_key = metadata.get("plan", "pro_monthly")
    plan     = PLANS.get(plan_key, {})
    tier     = plan.get("tier", "pro")
    customer_code = data.get("customer", {}).get("customer_code", "")

    if user_id:
        update_tier(user_id, tier, customer_code)
        user = get_user_by_id(user_id)
        return jsonify({"status": "success", "tier": tier, "user": _safe_user(user) if user else None}), 200

    return jsonify({"status": "success", "tier": tier}), 200


# ── POST /api/v1/payment/webhook ─────────────────────────────────────────────

@payment_bp.post("/webhook")
def webhook():
    """Paystack sends a POST with HMAC-SHA512 signature for verified events."""
    if not _PAYSTACK_SECRET:
        return "", 200  # silently ignore if not configured

    # Verify Paystack signature
    signature = request.headers.get("X-Paystack-Signature", "")
    body_bytes = request.get_data()
    expected = hmac.new(
        _PAYSTACK_SECRET.encode(),
        body_bytes,
        hashlib.sha512,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return jsonify({"error": "Invalid signature."}), 400

    event = json.loads(body_bytes)
    if event.get("event") == "charge.success":
        data     = event.get("data", {})
        metadata = data.get("metadata", {})
        user_id  = metadata.get("user_id", "")
        plan_key = metadata.get("plan", "pro_monthly")
        plan     = PLANS.get(plan_key, {})
        tier     = plan.get("tier", "pro")
        customer_code = data.get("customer", {}).get("customer_code", "")
        if user_id:
            update_tier(user_id, tier, customer_code)

    return "", 200
