"""
Tests for rc_foundation_bs_v1  (pad footing)
"""

import pytest
from app.calc_modules.rc_foundation_bs_v1 import run


def _footing(overrides: dict | None = None) -> dict:
    """2.5×2.0 m pad footing, h=500 mm, N_sls=400 kN, N_uls=560 kN, qa=150 kN/m²."""
    base = {
        "geometry":  {"L": 2.5, "B": 2.0, "h": 500.0, "cover": 75.0,
                      "col_h": 300.0, "col_b": 300.0},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"N_sls": 400.0, "N_uls": 560.0, "qa": 150.0, "M_sls": 0.0},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


class TestFootingReferenceValues:
    def setup_method(self):
        self.result = run(_footing())
        assert self.result["status"] == "ok", self.result

    def test_verdict_valid(self):
        assert self.result["results"]["verdict"] in ("pass", "warn", "fail")

    def test_uls_pressure(self):
        # p_uls = 560 / (2.5×2.0) = 112 kN/m²
        step = next(s for s in self.result["steps"] if "ULS upward" in s["label"])
        assert step["value"] == pytest.approx(112.0, rel=1e-3)

    def test_bearing_check_passes(self):
        # p_avg ≈ (400+SW)/(2.5×2) < 150 kN/m²
        check = next(c for c in self.result["checks"] if c["id"] == "bearing")
        assert check["status"] == "pass"

    def test_effective_depth(self):
        # d = 500 - 75 - 8 = 417 mm (default 16mm bar)
        step = next(s for s in self.result["steps"] if "Effective depth" in s["label"])
        assert step["value"] == pytest.approx(417.0, rel=1e-3)

    def test_required_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"bearing", "bending_k_L", "bending_k_B",
                "shear_transverse", "punching_shear", "min_steel"} == ids

    def test_all_checks_have_clause(self):
        for c in self.result["checks"]:
            assert c.get("clause"), f"Missing clause on {c['id']}"

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert fs["engine"] in ("handcalcs", "fallback")
        assert len(fs["items"]) == len(self.result["steps"])

    def test_formula_steps_raw_values_unchanged(self):
        items = {i["label"]: i for i in self.result["reportPayload"]["formula_steps"]["items"]}
        for step in self.result["steps"]:
            assert items[step["label"]]["raw_value"] == step["value"]


class TestBearingFailure:
    def test_bearing_fails_when_overloaded(self):
        # N_sls = 900 kN → p_avg ≈ 900/5 + SW > 150
        r = run(_footing({"loads": {"N_sls": 900.0, "N_uls": 1260.0,
                                    "qa": 150.0, "M_sls": 0.0}}))
        assert r["status"] == "ok"
        check = next(c for c in r["checks"] if c["id"] == "bearing")
        assert check["status"] == "fail"
        assert r["results"]["verdict"] == "fail"


class TestFoundationValidation:
    def test_missing_L_returns_error(self):
        inp = _footing()
        inp["geometry"].pop("L")
        r = run(inp)
        assert r["status"] == "error"
        assert any("geometry.L" in e["field"] for e in r["error"]["details"])

    def test_missing_qa_returns_error(self):
        inp = _footing()
        inp["loads"].pop("qa")
        r = run(inp)
        assert r["status"] == "error"
