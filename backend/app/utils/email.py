"""
app/utils/email.py
───────────────────
Thin wrapper for sending transactional emails via the Resend API.

Configuration (backend/.env)
─────────────────────────────
RESEND_API_KEY  — Bearer token from https://resend.com/api-keys
                  When absent, the verification link is printed to stdout
                  so the developer can follow it without a real inbox.
EMAIL_FROM      — "SSAD <noreply@yourdomain.com>"
FRONTEND_URL    — "http://localhost:3000" (or production URL)
"""
from __future__ import annotations

import os
from typing import Optional

import requests

_RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
_EMAIL_FROM: str     = os.getenv("EMAIL_FROM", "SSAD <noreply@ssad.app>")
_FRONTEND_URL: str   = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

_RESEND_SEND_URL = "https://api.resend.com/emails"


def send_verification_email(
    to_email: str,
    full_name: str,
    verify_token: str,
) -> None:
    """
    Send an email-verification message.

    In development (no RESEND_API_KEY), the link is printed to the console
    so the developer can click it directly without needing a real inbox.
    """
    link = f"{_FRONTEND_URL}/verify-email?token={verify_token}"
    first_name = (full_name.split()[0] if full_name.strip() else "there")

    if not _RESEND_API_KEY:
        _dev_log(to_email, link)
        return

    html = _build_html(first_name, link)

    payload = {
        "from":    _EMAIL_FROM,
        "to":      [to_email],
        "subject": "Verify your SSAD account",
        "html":    html,
    }
    headers = {
        "Authorization": f"Bearer {_RESEND_API_KEY}",
        "Content-Type":  "application/json",
    }
    try:
        resp = requests.post(_RESEND_SEND_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        # Log the failure and print the actual link so local testing is
        # unblocked even when the API key is misconfigured.
        print(f"[EMAIL ERROR] Failed to send verification email to {to_email}: {exc}")
        _dev_log(to_email, link)


def _dev_log(to_email: str, link: str) -> None:
    """Print verification link to Flask stdout (development only)."""
    sep = "─" * 60
    print(sep)
    print("[DEV] Email verification — no RESEND_API_KEY configured.")
    print(f"      To: {to_email}")
    print(f"      Link: {link}")
    print(sep)


def _build_html(first_name: str, link: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your SSAD account</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                         letter-spacing:-.3px;">SSAD</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">
                Structural & Serviceability Analysis &amp; Design
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;">
                Hi {first_name},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Thanks for signing up. Please verify your email address to activate
                your account and start your free trial.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="{link}"
                       style="display:inline-block;padding:14px 32px;
                              color:#ffffff;font-size:15px;font-weight:600;
                              text-decoration:none;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                This link expires in 24 hours.
                If you didn't create an SSAD account you can safely ignore this email.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                Or paste this URL in your browser:<br/>
                <a href="{link}" style="color:#3b82f6;">{link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © 2025 SSAD · Structural Analysis &amp; Design
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
