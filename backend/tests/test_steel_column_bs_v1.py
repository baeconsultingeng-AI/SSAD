"""
Tests for steel_column_bs_v1  (BS 5950-1:2000 H/I section column)

Reference section: UC 203×203×60 approx
  A = 76.4 cm², iy = 8.96 cm, iz = 5.21 cm
  Wpl_y = 652 cm³, Wpl_z = 305 cm³, tf = 14.2 mm
"""

import math
import pytest
from app.calc_modules.steel_column_bs_v1 import run


def _col(overrides: dict | None = None) -> dict:
    base = {
        "section": {
            "A_cm2": 76.4, "iy_cm": 8.96, "iz_cm": 5.21,
            "Wpl_y_cm3": 652.0, "Wpl_z_cm3": 305.0, "tf_mm": 14.2,
        },
        "geometry":  {"le_y": 3.5, "le_z": 3.5},
        "materials": {"py": 275.0},
        "loads":     {"N_Ed": 500.0, "Mx": 30.0, "My": 0.0},
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

    def test_slenderness_major_positive(self):
        step = next(s for s in self.result["steps"] if "Slenderness" in s["label"]
                    and "major" in s["label"])
        assert step["value"] == pytest.approx(3500 / 89.6, rel=1e-3)

    def test_slenderness_minor_positive(self):
        step = next(s for s in self.result["steps"] if "Slenderness" in s["label"]
                    and "minor" in s["label"])
        assert step["value"] == pytest.approx(3500 / 52.1, rel=1e-3)

    def test_compression_capacity_gt_axial(self):
        step = next(s for s in self.result["steps"] if "Compression capacity" in s["label"])
        assert step["value"] > 500.0

    def test_checks_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert {"slenderness_y", "slenderness_z", "compression", "interaction"} == ids

    def test_all_checks_have_clause(self):
        for c in self.result["checks"]:
            assert c.get("clause"), f"Missing clause on {c['id']}"

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert fs["engine"] in ("handcalcs", "fallback")
        assert len(fs["items"]) == len(self.result["steps"])


class TestHighlyLoadedColumn:
    def test_fail_when_overloaded(self):
        # Very high axial load should fail interaction
        r = run(_col({"loads": {"N_Ed": 3000.0, "Mx": 0.0, "My": 0.0}}))
        assert r["status"] == "ok"
        inter = next(c for c in r["checks"] if c["id"] == "interaction")
        # value is the interaction ratio; should exceed 1.0
        assert inter["status"] == "fail" or inter["value"] > 1.0

    def test_slenderness_warning_when_long(self):
        # le_z = 10 m → λ = 10000/52.1 ≈ 192 > 180 → warning
        r = run(_col({"geometry": {"le_y": 10.0, "le_z": 10.0}}))
        assert r["status"] == "ok"
        sz = next(c for c in r["checks"] if c["id"] == "slenderness_z")
        assert sz["status"] in ("warn", "fail")


class TestColumnValidation:
    def test_missing_section_property_returns_error(self):
        inp = _col()
        inp["section"].pop("A_cm2")
        r = run(inp)
        assert r["status"] == "error"

    def test_zero_effective_length_returns_error(self):
        r = run(_col({"geometry": {"le_y": 0.0, "le_z": 3.5}}))
        assert r["status"] == "error"
