"""
Tests for optional API key guard on /api/v1/* routes.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app import create_app


_VALID_BEAM_PAYLOAD = {
    "requestId": "auth-001",
    "module": "rc_beam_bs_v1",
    "code": "BS",
    "version": "1.0",
    "inputs": {
        "geometry": {
            "span": 5.0,
            "b": 250.0,
            "h": 450.0,
            "cover": 30.0,
            "support_type": "simply_supported",
        },
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads": {"gk": 10.0, "qk": 7.5},
    },
}


def _client_with_api_key(monkeypatch: pytest.MonkeyPatch, key: str | None):
    if key is None:
        monkeypatch.delenv("API_AUTH_KEY", raising=False)
    else:
        monkeypatch.setenv("API_AUTH_KEY", key)
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


class TestApiAuthGuard:
    def test_disabled_by_default(self, monkeypatch: pytest.MonkeyPatch):
        client = _client_with_api_key(monkeypatch, None)
        with patch("app.db.runs_repo.save_run", return_value=None):
            resp = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD)
        assert resp.status_code == 200

    def test_enabled_missing_key_returns_401(self, monkeypatch: pytest.MonkeyPatch):
        client = _client_with_api_key(monkeypatch, "secret-123")
        resp = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD)
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["error"]["code"] == "UNAUTHORIZED"

    def test_enabled_wrong_key_returns_401(self, monkeypatch: pytest.MonkeyPatch):
        client = _client_with_api_key(monkeypatch, "secret-123")
        resp = client.post(
            "/api/v1/calc",
            headers={"X-API-Key": "wrong-key"},
            json=_VALID_BEAM_PAYLOAD,
        )
        assert resp.status_code == 401

    def test_enabled_correct_key_allows_api(self, monkeypatch: pytest.MonkeyPatch):
        client = _client_with_api_key(monkeypatch, "secret-123")
        with patch("app.db.runs_repo.save_run", return_value=None):
            resp = client.post(
                "/api/v1/calc",
                headers={"X-API-Key": "secret-123"},
                json=_VALID_BEAM_PAYLOAD,
            )
        assert resp.status_code == 200

    def test_health_not_protected(self, monkeypatch: pytest.MonkeyPatch):
        client = _client_with_api_key(monkeypatch, "secret-123")
        resp = client.get("/health")
        assert resp.status_code == 200
