"""
API contract conformance tests for POST /api/v1/calc.

Tests use Flask test client — no network required.
"""

import pytest
from app import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ── Envelope validation ───────────────────────────────────────────────────────

class TestEnvelopeValidation:
    def test_missing_requestId_returns_400(self, client):
        r = client.post("/api/v1/calc", json={"module": "rc_beam_bs_v1", "code": "BS", "version": "1.0", "inputs": {}})
        assert r.status_code == 400
        data = r.get_json()
        assert data["status"] == "error"
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_missing_module_returns_400(self, client):
        r = client.post("/api/v1/calc", json={"requestId": "r1", "code": "BS", "version": "1.0", "inputs": {}})
        assert r.status_code == 400

    def test_missing_inputs_returns_400(self, client):
        r = client.post("/api/v1/calc", json={"requestId": "r1", "module": "rc_beam_bs_v1", "code": "BS", "version": "1.0"})
        assert r.status_code == 400

    def test_unknown_module_returns_400(self, client):
        r = client.post("/api/v1/calc", json={
            "requestId": "r1", "module": "nonexistent_module_v99",
            "code": "BS", "version": "1.0", "inputs": {},
        })
        assert r.status_code == 400
        data = r.get_json()
        assert data["error"]["code"] == "MODULE_NOT_FOUND"


# ── Successful rc_beam_bs_v1 round-trip ───────────────────────────────────────

_VALID_BEAM_PAYLOAD = {
    "requestId": "test-001",
    "module":    "rc_beam_bs_v1",
    "code":      "BS",
    "version":   "1.0",
    "inputs": {
        "geometry":  {"span": 5.0, "b": 250.0, "h": 450.0, "cover": 30.0, "support_type": "simply_supported"},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"gk": 10.0, "qk": 7.5},
    },
}


class TestSuccessEnvelope:
    def setup_method(self):
        pass

    def test_200_status(self, client):
        r = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD)
        assert r.status_code == 200

    def test_status_ok(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert data["status"] == "ok"

    def test_requestId_echoed(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert data["requestId"] == "test-001"

    def test_module_echoed(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert data["module"] == "rc_beam_bs_v1"

    def test_results_block_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        res = data["results"]
        assert "verdict" in res
        assert "utilization" in res
        assert "summary" in res

    def test_verdict_is_valid_value(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert data["results"]["verdict"] in ("pass", "warn", "fail")

    def test_checks_list_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert isinstance(data["checks"], list)
        assert len(data["checks"]) > 0

    def test_steps_list_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert isinstance(data["steps"], list)
        assert len(data["steps"]) > 0

    def test_warnings_list_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert isinstance(data["warnings"], list)

    def test_report_payload_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert "reportPayload" in data

    def test_report_payload_formula_steps_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert "formula_steps" in data["reportPayload"]
        assert "items" in data["reportPayload"]["formula_steps"]

    def test_detailing_payload_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert "detailingPayload" in data

    def test_normalized_inputs_present(self, client):
        data = client.post("/api/v1/calc", json=_VALID_BEAM_PAYLOAD).get_json()
        assert "normalizedInputs" in data


# ── Health endpoint ───────────────────────────────────────────────────────────

class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.get_json()["status"] == "ok"
