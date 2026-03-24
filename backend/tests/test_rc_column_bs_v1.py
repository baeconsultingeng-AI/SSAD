"""
Tests for rc_column_bs_v1
"""

import pytest
from app.calc_modules.rc_column_bs_v1 import run


def _col(overrides: dict | None = None) -> dict:
    """300×300 mm short braced column, le=3.0 m, fcu=30, fy=460, N_Ed=500 kN."""
    base = {
        "geometry":  {"b": 300.0, "h": 300.0, "cover": 30.0, "le_x": 3.0, "le_y": 3.0},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"N_Ed": 500.0, "Mx": 20.0, "My": 0.0},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


class TestColumnReferenceValues:
    def setup_method(self):
        self.result = run(_col())
        assert self.result["status"] == "ok", self.result

    def test_verdict_valid(self):
        assert self.result["results"]["verdict"] in ("pass", "warn", "fail")

    def test_gross_area(self):
        step = next(s for s in self.result["steps"] if "Gross section" in s["label"])
        assert step["value"] == pytest.approx(90_000.0, rel=1e-4)

    def test_lex_h(self):
        # 3000 / 300 = 10.0
        step = next(s for s in self.result["steps"] if "lex/h" in s["label"])
        assert step["value"] == pytest.approx(10.0, rel=1e-4)

    def test_short_column_slenderness_pass(self):
        check = next(c for c in self.result["checks"] if c["id"] == "slenderness")
        assert check["status"] == "pass"

    def test_axial_capacity_positive(self):
        step = next(s for s in self.result["steps"] if "Axial capacity" in s["label"])
        assert step["value"] > 0.0

    def test_required_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"slenderness", "axial_capacity", "moment_capacity",
                "min_steel", "max_steel"} == ids

    def test_Ag_500kN_within_capacity(self):
        # Column should comfortably carry 500 kN
        check = next(c for c in self.result["checks"] if c["id"] == "axial_capacity")
        assert check["status"] == "pass"

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert fs["engine"] in ("handcalcs", "fallback")
        assert len(fs["items"]) == len(self.result["steps"])

    def test_formula_steps_raw_values_unchanged(self):
        items = {i["label"]: i for i in self.result["reportPayload"]["formula_steps"]["items"]}
        for step in self.result["steps"]:
            assert items[step["label"]]["raw_value"] == step["value"]


class TestSlenderColumn:
    def test_slender_column_warns(self):
        # le_x = 8 m, h = 300 → lex/h = 26.67 > 15
        r = run(_col({"geometry": {"b": 300.0, "h": 300.0, "cover": 30.0,
                                   "le_x": 8.0, "le_y": 3.0}}))
        assert r["status"] == "ok"
        check = next(c for c in r["checks"] if c["id"] == "slenderness")
        assert check["status"] == "warn"
        assert any("slender" in w.lower() for w in r["warnings"])


class TestColumnValidation:
    def test_missing_N_Ed(self):
        inp = _col()
        inp["loads"].pop("N_Ed")
        r = run(inp)
        assert r["status"] == "error"
        assert any("N_Ed" in e["field"] for e in r["error"]["details"])

    def test_zero_b_returns_error(self):
        inp = _col({"geometry": {"b": 0.0, "h": 300.0, "cover": 30.0,
                                  "le_x": 3.0, "le_y": 3.0}})
        r = run(inp)
        assert r["status"] == "error"

    def test_all_steps_have_clause(self):
        r = run(_col())
        for s in r["steps"]:
            assert s.get("clause"), f"Missing clause on {s['label']}"
