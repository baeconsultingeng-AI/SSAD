"""
Tests for Sprint 3 persistence wiring.

Uses unittest.mock to patch the Supabase client so no live DB is needed.
Covers:
  - save_run stores correct fields and returns a UUID
  - save_run returns None when client is unconfigured
  - calc_v1 endpoint attaches runId to successful responses
  - calc_v1 endpoint still works when persistence is unavailable
  - GET /api/v1/runs/:runId returns 404 when run not found
  - GET /api/v1/projects/:projectId/runs returns list
"""

from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.api.v1.calc import create_app
from app.db import runs_repo


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def app():
    flask_app = create_app()
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture()
def client(app):
    return app.test_client()


def _rc_beam_payload(request_id: str = "test-001") -> dict[str, Any]:
    return {
        "requestId": request_id,
        "module":    "rc_beam_bs_v1",
        "code":      "BS",
        "version":   "1.0",
        "inputs": {
            "geometry":  {"span": 6.0, "b": 300.0, "h": 500.0, "cover": 30.0,
                          "support_type": "simply_supported"},
            "materials": {"fcu": 30.0, "fy": 460.0},
            "loads":     {"gk": 20.0, "qk": 15.0},
        },
    }


# ── runs_repo unit tests ─────────────────────────────────────────────────────

class TestSaveRun:
    def test_returns_uuid_when_client_present(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock()

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            run_id = runs_repo.save_run(
                request_id="req-1", module="rc_beam_bs_v1", code="BS", version="1.0",
                status="ok", normalized_inputs={}, result_payload={},
                steps=[], warnings=[], checks=[],
            )

        assert run_id is not None
        assert uuid.UUID(run_id)  # valid UUID

    def test_inserts_correct_table(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock()

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            runs_repo.save_run(
                request_id="req-2", module="rc_beam_bs_v1", code="BS", version="1.0",
                status="ok", normalized_inputs={"a": 1}, result_payload={"verdict": "pass"},
                steps=[{"label": "x", "value": 1}], warnings=["w1"], checks=[],
            )

        mock_sb.table.assert_called_with("calculation_runs")

    def test_returns_none_when_no_client(self):
        with patch("app.db.runs_repo.get_client", return_value=None):
            result = runs_repo.save_run(
                request_id="req-3", module="rc_beam_bs_v1", code="BS", version="1.0",
                status="ok", normalized_inputs={}, result_payload={},
                steps=[], warnings=[], checks=[],
            )
        assert result is None

    def test_returns_none_on_db_exception(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.insert.return_value.execute.side_effect = RuntimeError("DB down")

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            result = runs_repo.save_run(
                request_id="req-4", module="rc_beam_bs_v1", code="BS", version="1.0",
                status="ok", normalized_inputs={}, result_payload={},
                steps=[], warnings=[], checks=[],
            )
        assert result is None


class TestGetRunById:
    def test_returns_row_when_found(self):
        fake_row = {"id": "abc", "module": "rc_beam_bs_v1"}
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [fake_row]

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            result = runs_repo.get_run_by_id("abc")

        assert result == fake_row

    def test_returns_none_when_not_found(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            result = runs_repo.get_run_by_id("missing")

        assert result is None

    def test_returns_none_when_no_client(self):
        with patch("app.db.runs_repo.get_client", return_value=None):
            assert runs_repo.get_run_by_id("any") is None


class TestGetRunsByProject:
    def test_returns_list(self):
        rows = [{"id": "1"}, {"id": "2"}]
        mock_sb = MagicMock()
        (mock_sb.table.return_value.select.return_value
                .eq.return_value.order.return_value.range.return_value
                .execute.return_value.data) = rows

        with patch("app.db.runs_repo.get_client", return_value=mock_sb):
            result = runs_repo.get_runs_by_project("proj-1")

        assert result == rows

    def test_returns_empty_when_no_client(self):
        with patch("app.db.runs_repo.get_client", return_value=None):
            assert runs_repo.get_runs_by_project("proj-1") == []


# ── API integration tests ─────────────────────────────────────────────────────

class TestCalcEndpointPersistence:
    def test_run_id_attached_when_persistence_available(self, client):
        fake_run_id = str(uuid.uuid4())
        with patch("app.db.runs_repo.save_run", return_value=fake_run_id):
            resp = client.post("/api/v1/calc", json=_rc_beam_payload())
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["runId"] == fake_run_id

    def test_no_run_id_when_persistence_unavailable(self, client):
        with patch("app.db.runs_repo.save_run", return_value=None):
            resp = client.post("/api/v1/calc", json=_rc_beam_payload("req-002"))
        assert resp.status_code == 200
        data = resp.get_json()
        assert "runId" not in data

    def test_calc_still_succeeds_when_db_raises(self, client):
        with patch("app.db.runs_repo.save_run", side_effect=RuntimeError("DB fail")):
            resp = client.post("/api/v1/calc", json=_rc_beam_payload("req-003"))
        # Calculation result should still be returned
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"

    def test_nested_project_fields_are_forwarded_to_persistence(self, client):
        payload = _rc_beam_payload("req-004")
        payload["project"] = {"projectId": "proj-10", "elementId": "elem-20"}

        with patch("app.db.runs_repo.save_run", return_value=None) as mock_save:
            resp = client.post("/api/v1/calc", json=payload)

        assert resp.status_code == 200
        _, kwargs = mock_save.call_args
        assert kwargs["project_id"] == "proj-10"
        assert kwargs["element_id"] == "elem-20"


class TestRunsEndpoint:
    def test_get_run_returns_404_when_not_found(self, client):
        with patch("app.db.runs_repo.get_run_by_id", return_value=None):
            resp = client.get(f"/api/v1/runs/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_get_run_returns_row_when_found(self, client):
        fake_row = {"id": "abc123", "module": "rc_beam_bs_v1", "status": "ok"}
        with patch("app.db.runs_repo.get_run_by_id", return_value=fake_row):
            resp = client.get("/api/v1/runs/abc123")
        assert resp.status_code == 200
        assert resp.get_json()["module"] == "rc_beam_bs_v1"

    def test_project_runs_returns_list(self, client):
        rows = [{"id": "r1"}, {"id": "r2"}]
        with patch("app.db.runs_repo.get_runs_by_project", return_value=rows):
            resp = client.get("/api/v1/projects/proj-123/runs")
        assert resp.status_code == 200
        assert len(resp.get_json()) == 2

    def test_project_runs_returns_empty_without_db(self, client):
        with patch("app.db.runs_repo.get_runs_by_project", return_value=[]):
            resp = client.get("/api/v1/projects/proj-456/runs")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_project_runs_supports_limit_param(self, client):
        with patch("app.db.runs_repo.get_runs_by_project", return_value=[]) as mock_fn:
            client.get("/api/v1/projects/proj-1/runs?limit=10&offset=20")
        mock_fn.assert_called_once_with("proj-1", limit=10, offset=20)


class TestReportEndpoint:
    def test_generate_report_returns_404_when_run_missing(self, client):
        with patch("app.db.runs_repo.get_run_by_id", return_value=None):
            resp = client.post(f"/api/v1/reports/{uuid.uuid4()}/generate")

        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "NOT_FOUND"

    def test_generate_report_returns_503_when_persistence_unavailable(self, client):
        with patch("app.db.runs_repo.get_run_by_id", return_value={"id": "run-1"}):
            with patch("app.db.runs_repo.create_report_artifact", return_value=None):
                resp = client.post("/api/v1/reports/run-1/generate")

        assert resp.status_code == 503
        assert resp.get_json()["error"]["code"] == "PERSISTENCE_UNAVAILABLE"

    def test_generate_report_returns_metadata_when_saved(self, client):
        artifact = {
            "id": "art-1",
            "artifact_type": "report",
            "storage_key": "reports/run-1/20260324T120000Z.json",
        }
        with patch("app.db.runs_repo.get_run_by_id", return_value={"id": "run-1"}):
            with patch("app.db.runs_repo.create_report_artifact", return_value=artifact):
                resp = client.post("/api/v1/reports/run-1/generate")

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == "art-1"
        assert data["artifactType"] == "report"
        assert data["storageKey"].startswith("reports/run-1/")
        assert "createdAt" in data


class TestApiSmokeFlow:
    def test_calc_to_runs_to_report_generation_flow(self, client):
        fake_run_id = str(uuid.uuid4())
        run_row = {
            "id": fake_run_id,
            "request_id": "smoke-req-1",
            "module": "rc_beam_bs_v1",
            "code": "BS",
            "version": "1.0",
            "status": "ok",
            "normalized_inputs": {},
            "result_payload": {
                "verdict": "pass",
                "utilization": 0.6,
                "summary": "Smoke summary",
            },
            "steps": [],
            "warnings": [],
            "checks": [],
        }
        artifact = {
            "id": "artifact-smoke-1",
            "artifact_type": "report",
            "storage_key": f"reports/{fake_run_id}/20260324T000000Z.json",
        }

        with patch("app.db.runs_repo.save_run", return_value=fake_run_id):
            calc_resp = client.post("/api/v1/calc", json=_rc_beam_payload("smoke-req-1"))
        assert calc_resp.status_code == 200
        assert calc_resp.get_json()["runId"] == fake_run_id

        with patch("app.db.runs_repo.get_runs_by_project", return_value=[{"id": fake_run_id}]):
            runs_resp = client.get("/api/v1/projects/proj-smoke/runs")
        assert runs_resp.status_code == 200
        assert runs_resp.get_json()[0]["id"] == fake_run_id

        with patch("app.db.runs_repo.get_run_by_id", return_value=run_row):
            with patch("app.db.runs_repo.create_report_artifact", return_value=artifact):
                report_resp = client.post(f"/api/v1/reports/{fake_run_id}/generate")
        assert report_resp.status_code == 200
        report_data = report_resp.get_json()
        assert report_data["id"] == "artifact-smoke-1"
        assert report_data["artifactType"] == "report"
