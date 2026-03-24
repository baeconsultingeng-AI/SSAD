"""
Tests for steel_portal_bs_v1  (BS 5950-1:2000 symmetric single-bay portal)

Reference frame:
  span=20m, height=5m, bay_width=6m, pitch_deg=6°, base="pinned", py=275
  rafter:  A=60cm², I=20000cm⁴, Wpl=900cm³, iy=8cm, iz=2cm
  column:  A=76cm², I=6000cm⁴,  Wpl=650cm³, iy=8cm, iz=3cm
  loads:   gk=0.5kN/m², qk=0.6kN/m²
"""

import math
import pytest
from app.calc_modules.steel_portal_bs_v1 import run


def _portal(overrides: dict | None = None) -> dict:
    base = {
        "geometry": {
            "span": 20.0, "height": 5.0, "bay_width": 6.0,
            "pitch_deg": 6.0, "base_type": "pinned",
        },
        "rafter_section": {
            "A_cm2": 60.0, "I_cm4": 20000.0, "Wpl_cm3": 900.0,
            "iy_cm": 8.0, "iz_cm": 2.0,
        },
        "column_section": {
            "A_cm2": 76.0, "I_cm4": 6000.0, "Wpl_cm3": 650.0,
            "iy_cm": 8.0, "iz_cm": 3.0,
        },
        "materials": {"py": 275.0},
        "loads":     {"gk": 0.5, "qk": 0.6},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


class TestPortalReferenceValues:
    def setup_method(self):
        self.result = run(_portal())
        assert self.result["status"] == "ok", self.result

    def test_design_udl(self):
        # w_uls = (1.4×0.5 + 1.6×0.6) × 6 = (0.7+0.96)×6 = 9.96 kN/m
        step = next(s for s in self.result["steps"] if "w_uls" in s["label"])
        assert step["value"] == pytest.approx(9.96, rel=1e-3)

    def test_horizontal_thrust(self):
        # H = w×L²/(8×h) = 9.96×400/40 = 99.6 kN  (pinned)
        step = next(s for s in self.result["steps"] if "Horizontal thrust" in s["label"])
        assert step["value"] == pytest.approx(99.6, rel=1e-3)

    def test_eaves_moment(self):
        # M_eaves = H×h = 99.6×5 = 498 kN·m
        step = next(s for s in self.result["steps"] if "Eaves moment" in s["label"])
        assert step["value"] == pytest.approx(498.0, rel=1e-2)

    def test_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"rafter_interaction", "column_interaction",
                "sway_stability", "rafter_deflection"} == ids

    def test_all_checks_have_clause(self):
        for c in self.result["checks"]:
            assert c.get("clause"), f"Missing clause on {c['id']}"

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert fs["engine"] in ("handcalcs", "fallback")
        assert len(fs["items"]) == len(self.result["steps"])

    def test_simplified_analysis_warning(self):
        assert any("simplified" in w.lower() for w in self.result["warnings"])


class TestFixedBasePortal:
    def test_horizontal_thrust_greater_than_pinned(self):
        # With the simplified formulas used in this module:
        # H_pinned = wL²/(8h), H_fixed = 3wL²/(16h), so H_fixed > H_pinned.
        pinned = run(_portal())
        fixed  = run(_portal({"geometry": {"span": 20.0, "height": 5.0, "bay_width": 6.0,
                                            "pitch_deg": 6.0, "base_type": "fixed"}}))
        H_pinned = next(s for s in pinned["steps"] if "Horizontal thrust" in s["label"])["value"]
        H_fixed  = next(s for s in fixed["steps"]  if "Horizontal thrust" in s["label"])["value"]
        assert H_fixed > H_pinned


class TestPortalValidation:
    def test_missing_geometry_key_returns_error(self):
        inp = _portal()
        inp["geometry"].pop("span")
        r = run(inp)
        assert r["status"] == "error"

    def test_invalid_base_type_returns_error(self):
        r = run(_portal({"geometry": {"span": 20.0, "height": 5.0, "bay_width": 6.0,
                                       "pitch_deg": 6.0, "base_type": "spring"}}))
        assert r["status"] == "error"

    def test_zero_height_returns_error(self):
        r = run(_portal({"geometry": {"span": 20.0, "height": 0.0, "bay_width": 6.0,
                                       "pitch_deg": 6.0, "base_type": "pinned"}}))
        assert r["status"] == "error"
