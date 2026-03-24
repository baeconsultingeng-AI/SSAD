"""
Steel Truss Member Design Module – BS 5950-1:2000

Scope:
  Checks an individual truss member (angle, hollow section or flat bar) for:
    • Tension:     Pt = py × A                     (Cl. 4.6.1)
    • Compression: Pc = A × pc  (Perry-Robertson)  (Cl. 4.7.4)

  For tension, a net-area reduction (due to bolt holes) can be supplied via
  design.Anet_cm2; otherwise Anet = A (i.e., welded or full gross-area).

  For compression the Robertson constant is selected from member_type:
    • "rhs"  → strut curve a  (hot-finished hollow section)
    • "chs"  → strut curve a
    • "angle" → strut curve c  (single angle, minimum radius governs)
    • default → strut curve b

Units:
  Section properties  : cm² / cm  (converted to mm² / mm internally)
  Lengths             : m          (converted to mm)
  Forces              : kN
  Stresses            : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "steel_truss_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

_E          = 205_000.0   # N/mm²
_PY_DEFAULT = 275.0       # N/mm²

_ROBERTSON_A: dict[str, float] = {
    "a": 2.0,
    "b": 3.5,
    "c": 5.5,
    "d": 8.0,
}

_CURVE_BY_MEMBER: dict[str, str] = {
    "rhs":   "a",
    "chs":   "a",
    "angle": "c",
}


def _pc(py: float, le_mm: float, r_mm: float, curve: str = "b") -> float:
    """Perry-Robertson compressive strength (N/mm²)."""
    lam = le_mm / r_mm
    if lam <= 0.0:
        return py
    lam_0 = 0.2 * math.pi * math.sqrt(_E / py)
    a     = _ROBERTSON_A.get(curve, 3.5)
    eta   = a * max(lam - lam_0, 0.0) / 1000.0
    pe    = math.pi**2 * _E / lam**2
    phi   = (py + (eta + 1.0) * pe) / 2.0
    disc  = max(phi**2 - pe * py, 0.0)
    return min(pe * py / (phi + math.sqrt(disc)), py)


def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    sec  = inputs["section"]
    mat  = inputs.get("materials") or {}
    geo  = inputs["geometry"]
    lds  = inputs["loads"]
    des  = inputs.get("design") or {}

    A_cm2     = float(sec["A_cm2"])           # cm²
    i_min_cm  = float(sec["i_min_cm"])        # cm  (minimum radius of gyration)
    Anet_cm2  = float(des.get("Anet_cm2", A_cm2))   # cm² (net area for tension)
    member_type = str(sec.get("member_type", "default")).lower()

    le    = float(geo["le"])                  # m  (effective length)
    F_Ed  = float(lds["F_Ed"])                # kN (design force; +tension, –compression)

    py    = float(mat.get("py", _PY_DEFAULT))  # N/mm²

    is_tension = F_Ed >= 0.0

    # Convert
    A_mm2    = A_cm2    * 100.0
    Anet_mm2 = Anet_cm2 * 100.0
    i_mm     = i_min_cm * 10.0
    le_mm    = le * 1000.0

    curve = _CURVE_BY_MEMBER.get(member_type, "b")

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Section area
    steps.append(_step("Gross area A",
                        f"A = {A_cm2} cm² = {A_mm2:.0f} mm²",
                        A_mm2, "mm²", "BS 5950-1 Cl. 4.6.1"))

    # Step 2 – Slenderness (relevant even for tension for review)
    lam = le_mm / i_mm
    steps.append(_step("Slenderness λ = le/i",
                        f"{le_mm:.0f}/{i_mm:.1f}",
                        lam, "–", "BS 5950-1 Cl. 4.7.2"))

    if is_tension:
        # Step 3 – Tension capacity
        if Anet_mm2 < A_mm2:
            steps.append(_step("Net area Anet",
                                f"Anet = {Anet_cm2} cm² = {Anet_mm2:.0f} mm²",
                                Anet_mm2, "mm²", "BS 5950-1 Cl. 4.6.1"))
        Pt_N  = py * Anet_mm2
        Pt_kN = Pt_N / 1000.0
        steps.append(_step("Tension capacity Pt",
                            f"py×Anet = {py:.0f}×{Anet_mm2:.0f}/1000",
                            Pt_kN, "kN", "BS 5950-1 Cl. 4.6.1"))
        util = F_Ed / Pt_kN if Pt_kN > 0 else 999.0
        steps.append(_step("Tension utilisation F_Ed/Pt",
                            f"{F_Ed:.1f}/{Pt_kN:.1f}",
                            util, "–", "BS 5950-1 Cl. 4.6.1"))

        checks.append(_check("tension", "Tension F_Ed ≤ Pt",
                             "pass" if F_Ed <= Pt_kN else "fail",
                             F_Ed, Pt_kN, "kN", "BS 5950-1 Cl. 4.6.1"))
        if lam > 350.0:
            warnings.append(
                f"Tension member slenderness {lam:.0f} > 350 "
                "(BS 5950-1 Cl. 4.6.3 recommends ≤ 350)."
            )
            checks.append(_check("slenderness_tension", "Slenderness ≤ 350",
                                 "warn", lam, 350.0, "–", "BS 5950-1 Cl. 4.6.3"))

    else:
        # Step 3 – Compressive strength
        F_Edc = abs(F_Ed)  # positive value for compression
        pc   = _pc(py, le_mm, i_mm, curve)
        Pc_N = A_mm2 * pc
        Pc_kN = Pc_N / 1000.0
        steps.append(_step(f"Compressive strength pc (curve {curve})",
                            f"Perry-Robertson: py={py:.0f}, λ={lam:.1f}",
                            pc, "N/mm²", "BS 5950-1 Annex C"))
        steps.append(_step("Compression capacity Pc",
                            f"A×pc = {A_mm2:.0f}×{pc:.1f}/1000",
                            Pc_kN, "kN", "BS 5950-1 Cl. 4.7.4"))
        util = F_Edc / Pc_kN if Pc_kN > 0 else 999.0
        steps.append(_step("Compression utilisation |F_Ed|/Pc",
                            f"{F_Edc:.1f}/{Pc_kN:.1f}",
                            util, "–", "BS 5950-1 Cl. 4.7.4"))

        checks.append(_check("slenderness_compression", "Slenderness ≤ 180",
                             "pass" if lam <= 180.0 else "warn",
                             lam, 180.0, "–", "BS 5950-1 Cl. 4.7.3.2"))
        checks.append(_check("compression", "Compression |F_Ed| ≤ Pc",
                             "pass" if F_Edc <= Pc_kN else "fail",
                             F_Edc, Pc_kN, "kN", "BS 5950-1 Cl. 4.7.4"))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")

    mode_label = "tension" if is_tension else "compression"
    summary = (
        f"Truss member ({mode_label}), le={le} m, A={A_cm2} cm², py={py:.0f} N/mm². "
        f"|F_Ed|={abs(F_Ed):.0f} kN. "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 5950-1:2000", "element": "Steel Truss Member"}},
            {"title": "Member Details",
             "content": {"mode": mode_label, "le_m": le, "A_cm2": A_cm2,
                         "i_min_cm": i_min_cm, "slenderness": round(lam, 1)}},
            {"title": "Capacity Check",
             "content": {"F_Ed_kN": F_Ed, "capacity_kN": round(
                 Pt_kN if is_tension else Pc_kN, 1
             ), "utilisation": round(util, 4)}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":    "steel_truss_member",
        "mode":       mode_label,
        "le_m":       le,
        "A_cm2":      A_cm2,
        "lam":        round(lam, 1),
        "F_Ed_kN":    F_Ed,
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "section":   {"A_cm2": A_cm2, "i_min_cm": i_min_cm, "member_type": member_type},
            "materials": {"py_Nmm2": py},
            "geometry":  {"le_m": le},
            "loads":     {"F_Ed_kN": F_Ed},
        },
        "results":          {"verdict": verdict, "utilization": round(util, 4), "summary": summary},
        "checks":           checks,
        "steps":            steps,
        "warnings":         warnings,
        "reportPayload":    report_payload,
        "detailingPayload": detailing_payload,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _step(label: str, expression: str, value: float, unit: str, clause: str) -> dict[str, Any]:
    return {"label": label, "expression": expression,
            "value": round(value, 4), "unit": unit, "clause": clause}


def _check(
    cid: str, label: str, status: str,
    value: float, limit: float, unit: str, clause: str,
) -> dict[str, Any]:
    return {"id": cid, "label": label, "status": status,
            "value": round(value, 4), "limit": round(limit, 4),
            "unit": unit, "clause": clause}


def _validate(inputs: dict[str, Any]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    sec = inputs.get("section")  or {}
    geo = inputs.get("geometry") or {}
    lds = inputs.get("loads")    or {}

    def require_positive(c: dict, k: str, path: str) -> None:
        v = c.get(k)
        if v is None:
            errors.append({"field": path, "issue": "required field missing"})
        else:
            try:
                if float(v) <= 0.0:
                    errors.append({"field": path, "issue": "must be greater than zero"})
            except (TypeError, ValueError):
                errors.append({"field": path, "issue": "must be a number"})

    def require_number(c: dict, k: str, path: str) -> None:
        v = c.get(k)
        if v is None:
            errors.append({"field": path, "issue": "required field missing"})
        else:
            try:
                float(v)
            except (TypeError, ValueError):
                errors.append({"field": path, "issue": "must be a number"})

    require_positive(sec, "A_cm2",     "inputs.section.A_cm2")
    require_positive(sec, "i_min_cm",  "inputs.section.i_min_cm")
    require_positive(geo, "le",        "inputs.geometry.le")
    require_number  (lds, "F_Ed",      "inputs.loads.F_Ed")

    if not errors:
        try:
            if float(lds.get("F_Ed", 0.0)) == 0.0:
                errors.append({"field": "inputs.loads.F_Ed",
                               "issue": "must be non-zero (positive tension or negative compression)"})
        except (TypeError, ValueError):
            pass

    return errors


def _error_envelope(details: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "status": "error",
        "error": {
            "code":    "VALIDATION_ERROR",
            "message": "One or more inputs are invalid",
            "details": details,
        },
    }
