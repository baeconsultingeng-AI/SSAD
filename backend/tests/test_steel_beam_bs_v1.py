"""
Tests for steel_beam_bs_v1  (BS 5950-1:2000 I-section beam)

Reference section: 457×191×67 UB approx properties
  A = 85.5 cm², Iy = 29 400 cm⁴, Wpl_y = 1470 cm³, Wel_y = 1300 cm³
  hw = 407.6 mm, tw = 8.5 mm, tf = 12.7 mm, bf = 189.9 mm
"""

import math
import pytest
from app.calc_modules.steel_beam_bs_v1 import run


def _beam(overrides: dict | None = None) -> dict:
    base = {
        "section": {
            "A_cm2": 85.5, "Iy_cm4": 29400.0, "Wpl_cm3": 1470.0, "Wel_cm3": 1300.0,
            "hw_mm": 407.6, "tw_mm": 8.5, "tf_mm": 12.7, "bf_mm": 189.9,
        },
        "geometry":  {"span": 8.0, "support_type": "simply_supported",
                      "lateral_restraint": "full"},
        "materials": {"py": 275.0},
        "loads":     {"gk": 10.0, "qk": 8.0},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


class TestBeamReferenceValues:
    def setup_method(self):
        self.result = run(_beam())
        assert self.result["status"] == "ok", self.result

    def test_verdict_valid(self):
        assert self.result["results"]["verdict"] in ("pass", "warn", "fail")

    def test_w_uls(self):
        # 1.4×10 + 1.6×8 = 14+12.8 = 26.8 kN/m
        step = next(s for s in self.result["steps"] if "Design UDL" in s["label"])
        assert step["value"] == pytest.approx(26.8, rel=1e-3)

    def test_design_moment(self):
        # M = 26.8×8²/8 = 214.4 kN·m
        step = next(s for s in self.result["steps"] if "Design moment" in s["label"])
        assert step["value"] == pytest.approx(214.4, rel=1e-2)

    def test_moment_capacity_positive(self):
        step = next(s for s in self.result["steps"] if "Moment capacity" in s["label"])
        assert step["value"] > 100.0

    def test_shear_capacity_positive(self):
        step = next(s for s in self.result["steps"] if "Shear capacity" in s["label"])
        assert step["value"] > 0.0

    def test_deflection_positive(self):
        step = next(s for s in self.result["steps"] if "deflection" in s["label"].lower()
                    and "limit" not in s["label"].lower())
        assert step["value"] > 0.0

    def test_required_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"section_class", "shear", "bending", "deflection"} == ids

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


class TestSectionClassification:
    def test_class1_for_standard_UB(self):
        r = run(_beam())
        check = next(c for c in r["checks"] if c["id"] == "section_class")
        assert check["value"] <= 2  # plastic or compact

    def test_class4_triggers_warning(self):
        # Very slender web: hw=600 mm, tw=3 mm → d/t = 200
        r = run(_beam({"section": {"A_cm2": 85.5, "Iy_cm4": 29400.0, "Wpl_cm3": 1470.0,
                                   "hw_mm": 600.0, "tw_mm": 3.0, "tf_mm": 12.7,
                                   "bf_mm": 189.9}}))
        assert any("class 4" in w.lower() for w in r["warnings"])


class TestBeamValidation:
    def test_missing_Iy_returns_error(self):
        inp = _beam()
        inp["section"].pop("Iy_cm4")
        r = run(inp)
        assert r["status"] == "error"

    def test_zero_loads_returns_error(self):
        inp = _beam({"loads": {"gk": 0.0, "qk": 0.0}})
        r = run(inp)
        assert r["status"] == "error"

    def test_invalid_support_returns_error(self):
        inp = _beam()
        inp["geometry"]["support_type"] = "propped_cantilever"
        r = run(inp)
        assert r["status"] == "error"
