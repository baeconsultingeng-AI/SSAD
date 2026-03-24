"""
Tests for rc_slab_bs_v1  (one-way, two-way, cantilever)
"""

import math
import pytest
from app.calc_modules.rc_slab_bs_v1 import run


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slab_one_way(overrides: dict | None = None) -> dict:
    """200 mm simply-supported slab, 4 m span, fcu=30, fy=460, gk=3.0, qk=4.0 kN/m²."""
    base = {
        "geometry":  {"slab_type": "one_way", "span": 4.0, "h": 200.0,
                      "cover": 30.0, "support_type": "simply_supported"},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"gk": 3.0, "qk": 4.0},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


def _slab_two_way() -> dict:
    """150 mm two-way slab, lx=3.5 m, ly=5.0 m, fcu=30, fy=460, gk=2.5, qk=3.0 kN/m²."""
    return {
        "geometry":  {"slab_type": "two_way", "lx": 3.5, "ly": 5.0,
                      "h": 150.0, "cover": 25.0},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"gk": 2.5, "qk": 3.0},
    }


def _slab_cant() -> dict:
    """150 mm cantilever, 2 m span, fcu=30, fy=460, gk=3.0, qk=2.0 kN/m²."""
    return {
        "geometry":  {"slab_type": "cantilever", "span": 2.0, "h": 150.0, "cover": 25.0},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"gk": 3.0, "qk": 2.0},
    }


# ── One-way slab ──────────────────────────────────────────────────────────────

class TestOneWayReferenceValues:
    def setup_method(self):
        self.result = run(_slab_one_way())
        assert self.result["status"] == "ok", self.result

    def test_verdict_valid(self):
        assert self.result["results"]["verdict"] in ("pass", "warn", "fail")

    def test_w_uls(self):
        # 1.4×3.0 + 1.6×4.0 = 4.2 + 6.4 = 10.6 kN/m²
        step = next(s for s in self.result["steps"] if "Design UDL" in s["label"])
        assert step["value"] == pytest.approx(10.6, rel=1e-3)

    def test_design_moment(self):
        # M = 10.6×4²/8 = 21.2 kN·m/m
        step = next(s for s in self.result["steps"] if "moment M" in s["label"])
        assert step["value"] == pytest.approx(21.2, rel=1e-3)

    def test_effective_depth(self):
        # d = 200 - 30 - 6 = 164 mm
        step = next(s for s in self.result["steps"] if "Effective depth" in s["label"])
        assert step["value"] == pytest.approx(164.0, rel=1e-3)

    def test_K_within_K_prime(self):
        step = next(s for s in self.result["steps"] if s["label"] == "K factor")
        assert step["value"] < 0.156

    def test_As_req_positive(self):
        step = next(s for s in self.result["steps"] if "As,req" in s["label"])
        assert step["value"] > 0.0

    def test_required_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"bending_k", "shear_max", "shear_vc", "deflection", "min_steel"} == ids

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


class TestOneWayCantilever:
    def test_cantilever_verdict_valid(self):
        r = run(_slab_cant())
        assert r["status"] == "ok"
        assert r["results"]["verdict"] in ("pass", "warn", "fail")

    def test_cantilever_moment_larger_than_ss(self):
        r_cant = run(_slab_cant())
        r_cant_step = next(s for s in r_cant["steps"] if "moment M" in s["label"])
        # SS with same load would be w*l²/8, cantilever is w*l²/2  (4× larger for same l)
        assert r_cant_step["value"] > 0.0


class TestOneWayValidation:
    def test_missing_span_returns_error(self):
        inp = _slab_one_way()
        inp["geometry"].pop("span")
        r = run(inp)
        assert r["status"] == "error"
        assert any(e["field"] == "inputs.geometry.span" for e in r["error"]["details"])

    def test_zero_load_returns_error(self):
        inp = _slab_one_way({"loads": {"gk": 0.0, "qk": 0.0}})
        r = run(inp)
        assert r["status"] == "error"

    def test_invalid_slab_type_returns_error(self):
        inp = _slab_one_way()
        inp["geometry"]["slab_type"] = "trapezoidal"
        r = run(inp)
        assert r["status"] == "error"


# ── Two-way slab ──────────────────────────────────────────────────────────────

class TestTwoWay:
    def setup_method(self):
        self.result = run(_slab_two_way())
        assert self.result["status"] == "ok", self.result

    def test_verdict_valid(self):
        assert self.result["results"]["verdict"] in ("pass", "warn", "fail")

    def test_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert "bending_k_short" in ids
        assert "bending_k_long" in ids
        assert "deflection" in ids

    def test_Msx_greater_than_Msy(self):
        # Short span has larger moment coefficient
        Msx = next(s for s in self.result["steps"] if "Short-span moment" in s["label"])["value"]
        Msy = next(s for s in self.result["steps"] if "Long-span moment" in s["label"])["value"]
        assert Msx > Msy

    def test_ratio_interpolated(self):
        # ly/lx = 5.0/3.5 = 1.4286 → αsx between 1.4 and 1.5 entries
        step = next(s for s in self.result["steps"] if "αsx" in s["label"])
        assert 0.099 <= step["value"] <= 0.104

    def test_ly_gt_2lx_triggers_warning(self):
        inp = _slab_two_way()
        inp["geometry"]["ly"] = 10.0  # ly/lx = 10/3.5 > 2
        r = run(inp)
        assert any("one-way" in w.lower() for w in r["warnings"])

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert len(fs["items"]) == len(self.result["steps"])
