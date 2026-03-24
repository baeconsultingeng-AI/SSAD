"""
Tests for steel_truss_bs_v1  (BS 5950-1:2000 individual truss member)

Reference section: CHS 101.6×3.2
  A = 9.97 cm², i_min = 3.47 cm, member_type = "chs", py = 355 N/mm²
"""

import math
import pytest
from app.calc_modules.steel_truss_bs_v1 import run


def _tension(overrides: dict | None = None) -> dict:
    base = {
        "section":  {"A_cm2": 9.97, "i_min_cm": 3.47, "member_type": "chs"},
        "geometry": {"le": 2.0},
        "materials": {"py": 355.0},
        "loads":    {"F_Ed": 100.0},          # positive = tension
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)
            else:
                base[k] = v
    return base


def _compression(overrides: dict | None = None) -> dict:
    base = _tension(overrides)
    base["loads"]["F_Ed"] = -50.0             # negative = compression
    if overrides and "loads" in overrides:
        base["loads"].update(overrides["loads"])
    return base


class TestTensionMember:
    def setup_method(self):
        self.result = run(_tension())
        assert self.result["status"] == "ok", self.result

    def test_tension_capacity(self):
        # Pt = 355 × 997 / 1000 = 353.9 kN
        step = next(s for s in self.result["steps"] if "Tension capacity" in s["label"])
        assert step["value"] == pytest.approx(355 * 9.97 * 100 / 1000, rel=1e-3)

    def test_tension_check_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert "tension" in ids

    def test_pass_under_capacity(self):
        chk = next(c for c in self.result["checks"] if c["id"] == "tension")
        assert chk["status"] == "pass"

    def test_formula_steps_present(self):
        fs = self.result["reportPayload"]["formula_steps"]
        assert fs["engine"] in ("handcalcs", "fallback")

    def test_slenderness_tension_warning_at_high_lambda(self):
        # le = 15 m → λ = 15000/34.7 ≈ 432 > 350 → warning expected
        r = run(_tension({"geometry": {"le": 15.0}}))
        assert any("slenderness" in w.lower() or "350" in w for w in r["warnings"])


class TestCompressionMember:
    def setup_method(self):
        self.result = run(_compression())
        assert self.result["status"] == "ok", self.result

    def test_compression_check_present(self):
        ids = {c["id"] for c in self.result["checks"]}
        assert "compression" in ids

    def test_slenderness_step_present(self):
        ids = [s["label"] for s in self.result["steps"]]
        assert any("Slenderness" in lbl for lbl in ids)

    def test_pc_less_than_py(self):
        step = next(s for s in self.result["steps"]
                    if "Compressive strength" in s["label"] or "Design strength" in s["label"]
                    or "pc" in s["label"].lower())
        assert step["value"] < 355.0

    def test_compression_check_has_clause(self):
        chk = next(c for c in self.result["checks"] if c["id"] == "compression")
        assert chk.get("clause")


class TestTrussValidation:
    def test_zero_area_returns_error(self):
        r = run(_tension({"section": {"A_cm2": 0.0, "i_min_cm": 3.47, "member_type": "chs"}}))
        assert r["status"] == "error"

    def test_zero_force_returns_error(self):
        r = run(_tension({"loads": {"F_Ed": 0.0}}))
        assert r["status"] == "error"

    def test_missing_le_returns_error(self):
        inp = _tension()
        inp["geometry"].pop("le")
        r = run(inp)
        assert r["status"] == "error"
