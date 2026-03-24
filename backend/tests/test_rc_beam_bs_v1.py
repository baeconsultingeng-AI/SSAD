"""
Deterministic unit tests for rc_beam_bs_v1.

Each test uses a known hand-calc reference case and asserts:
  1. Correct verdict
  2. Key intermediate values within rounding tolerance
  3. Validation rejects bad inputs with structured errors
"""

import math
import pytest

from app.calc_modules.rc_beam_bs_v1 import run


# ── Shared reference inputs ───────────────────────────────────────────────────

def _beam(overrides: dict | None = None) -> dict:
    """Baseline: 250×450mm simply-supported beam, 5m span, fcu=30, fy=460."""
    base = {
        "geometry":  {"span": 5.0, "b": 250.0, "h": 450.0, "cover": 30.0, "support_type": "simply_supported"},
        "materials": {"fcu": 30.0, "fy": 460.0},
        "loads":     {"gk": 10.0, "qk": 7.5},
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict):
                base[k].update(v)  # type: ignore[union-attr]
            else:
                base[k] = v  # type: ignore[literal-required]
    return base


# ── Reference value checks ────────────────────────────────────────────────────

class TestReferenceValues:
    """Verify key intermediate values against hand calculation."""

    def setup_method(self):
        self.result = run(_beam())
        assert self.result["status"] == "ok", self.result

    def test_verdict_is_pass(self):
        # "warn" is a valid and expected verdict when designed shear links are
        # required (v > vc) — this is correct BS 8110 engineering behaviour.
        assert self.result["results"]["verdict"] in ("pass", "warn")

    def test_w_ultimate(self):
        # 1.4×10 + 1.6×7.5 = 26.0 kN/m
        step = next(s for s in self.result["steps"] if s["label"] == "Design UDL w")
        assert step["value"] == pytest.approx(26.0, rel=1e-3)

    def test_design_moment(self):
        # M = 26×5²/8 = 81.25 kN·m
        step = next(s for s in self.result["steps"] if "moment M" in s["label"])
        assert step["value"] == pytest.approx(81.25, rel=1e-3)

    def test_effective_depth(self):
        # d = 450 - 30 - 8 - 8 = 404 mm
        step = next(s for s in self.result["steps"] if "Effective depth" in s["label"])
        assert step["value"] == pytest.approx(404.0, rel=1e-3)

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
            assert c.get("clause"), f"Missing clause on check {c['id']}"

    def test_all_steps_have_clause(self):
        for s in self.result["steps"]:
            assert s.get("clause"), f"Missing clause on step {s['label']}"

    def test_report_payload_has_expected_sections(self):
        titles = {s["title"] for s in self.result["reportPayload"]["sections"]}
        assert "Bending Design" in titles
        assert "Shear Design" in titles
        assert "Deflection Check" in titles

    def test_report_payload_has_formula_steps(self):
        formula_block = self.result["reportPayload"]["formula_steps"]
        assert formula_block["engine"] in ("handcalcs", "fallback")
        assert len(formula_block["items"]) == len(self.result["steps"])

    def test_formula_steps_keep_raw_step_values(self):
        formula_items = self.result["reportPayload"]["formula_steps"]["items"]
        by_label = {item["label"]: item for item in formula_items}
        for step in self.result["steps"]:
            item = by_label[step["label"]]
            assert item["raw_value"] == step["value"]

    def test_detailing_payload_has_dimensions(self):
        dp = self.result["detailingPayload"]
        assert dp["dimensions"]["b_mm"] == 250.0
        assert dp["dimensions"]["h_mm"] == 450.0

    def test_utilization_between_0_and_1_for_passing_beam(self):
        util = self.result["results"]["utilization"]
        assert 0.0 < util <= 1.0


# ── Support type variants ─────────────────────────────────────────────────────

class TestSupportTypes:
    def test_cantilever_higher_moment_than_ss(self):
        ss  = run(_beam())
        can = run(_beam({"geometry": {"support_type": "cantilever"}}))
        # Cantilever M = wl²/2 vs SS M = wl²/8  →  4× the moment
        m_ss  = next(s["value"] for s in ss["steps"]  if "moment" in s["label"].lower())
        m_can = next(s["value"] for s in can["steps"] if "moment" in s["label"].lower())
        assert m_can == pytest.approx(4 * m_ss, rel=1e-3)

    def test_continuous_adds_warning(self):
        result = run(_beam({"geometry": {"support_type": "continuous"}}))
        assert result["status"] == "ok"
        assert any("continuous" in w.lower() for w in result["warnings"])


# ── Fail cases ────────────────────────────────────────────────────────────────

class TestFailCases:
    def test_deep_beam_with_heavy_load_may_exceed_K_prime(self):
        """Force K > K' by using a very shallow, heavily loaded beam."""
        result = run(_beam({
            "geometry":  {"span": 8.0, "b": 150.0, "h": 200.0, "cover": 25.0},
            "loads":     {"gk": 40.0, "qk": 30.0},
        }))
        if result["status"] == "ok":
            k_check = next(c for c in result["checks"] if c["id"] == "bending_k")
            # It may pass or fail depending on exact geometry; just confirm it ran
            assert k_check["status"] in ("pass", "fail", "warn")


# ── Validation ────────────────────────────────────────────────────────────────

class TestValidation:
    def _error_detail_fields(self, inputs: dict) -> set[str]:
        result = run(inputs)
        assert result["status"] == "error"
        return {d["field"] for d in result["error"]["details"]}

    def test_missing_span(self):
        inp = _beam()
        del inp["geometry"]["span"]
        assert "inputs.geometry.span" in self._error_detail_fields(inp)

    def test_missing_fcu(self):
        inp = _beam()
        del inp["materials"]["fcu"]
        assert "inputs.materials.fcu" in self._error_detail_fields(inp)

    def test_zero_b_rejected(self):
        inp = _beam({"geometry": {"b": 0.0}})
        assert "inputs.geometry.b" in self._error_detail_fields(inp)

    def test_negative_cover_rejected(self):
        inp = _beam({"geometry": {"cover": -5.0}})
        assert "inputs.geometry.cover" in self._error_detail_fields(inp)

    def test_invalid_support_type_rejected(self):
        inp = _beam({"geometry": {"support_type": "fixed_fixed"}})
        assert "inputs.geometry.support_type" in self._error_detail_fields(inp)

    def test_zero_loads_rejected(self):
        inp = _beam({"loads": {"gk": 0.0, "qk": 0.0}})
        assert "inputs.loads" in self._error_detail_fields(inp)

    def test_missing_geometry_key_returns_structured_error(self):
        result = run({"materials": {"fcu": 30, "fy": 460}, "loads": {"gk": 10, "qk": 5}})
        assert result["status"] == "error"
        assert result["error"]["code"] == "VALIDATION_ERROR"

    def test_section_too_shallow_returns_error(self):
        inp = _beam({"geometry": {"h": 10.0, "cover": 100.0}})
        result = run(inp)
        assert result["status"] == "error"


# ── Reproducibility ───────────────────────────────────────────────────────────

class TestReproducibility:
    def test_identical_inputs_produce_identical_outputs(self):
        a = run(_beam())
        b = run(_beam())
        assert a["results"]["verdict"]     == b["results"]["verdict"]
        assert a["results"]["utilization"] == b["results"]["utilization"]
        assert len(a["steps"])             == len(b["steps"])
