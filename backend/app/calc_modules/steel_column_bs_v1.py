"""
Steel Column Design Module – BS 5950-1:2000

Scope:
  H/I-section steel column under combined axial compression and biaxial
  bending (or axial only).

  Compressive strength pc is evaluated using the Perry-Robertson formula
  (BS 5950-1 Annex C), with Robertson constant a determined by the
  appropriate strut curve for the axis of buckling.

  The combined check follows BS 5950-1 Cl. 4.8.3 (simplified):
    F/(Ag·pc) + Mx/Mcx + My/Mcy ≤ 1.0

Units:
  Dimensions                 : mm  (le_y, le_z in m, converted)
  Section properties         : cm² / cm⁴ / cm³  (converted internally)
  Forces / moments           : kN / kN·m
  Stresses / design strength : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "steel_column_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

_E          = 205_000.0   # N/mm²  (BS 5950-1 Cl. 2.4.1)
_PY_DEFAULT = 275.0       # N/mm²  (S275)

# Robertson constant a for strut curves (BS 5950-1 Annex C Table C.1)
_ROBERTSON_A = {
    "a": 2.0,    # hot-finished CHS; H major axis (tf ≤ 40 mm)
    "b": 3.5,    # H minor axis (tf ≤ 40 mm); welded sections
    "c": 5.5,    # heavy H sections, angles, channels
    "d": 8.0,    # cold-formed hollow sections
}


def _perry_robertson(py: float, le: float, r: float, curve: str = "b") -> float:
    """Return compressive strength pc (N/mm²) via Perry-Robertson (BS 5950-1 Annex C)."""
    lam = le / r                   # slenderness  (both in mm)
    if lam <= 0.0:
        return py
    lam_0 = 0.2 * math.pi * math.sqrt(_E / py)   # limiting slenderness
    a = _ROBERTSON_A.get(curve, 3.5)
    eta = a * max(lam - lam_0, 0.0) / 1000.0      # imperfection factor
    pe = math.pi**2 * _E / lam**2                  # Euler stress (N/mm²)
    phi = (py + (eta + 1.0) * pe) / 2.0
    disc = phi**2 - pe * py
    if disc < 0.0:
        disc = 0.0
    pc = pe * py / (phi + math.sqrt(disc))
    return min(pc, py)


def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    sec  = inputs["section"]
    mat  = inputs.get("materials") or {}
    geo  = inputs["geometry"]
    lds  = inputs["loads"]

    # Section properties
    A_cm2    = float(sec["A_cm2"])       # cm²
    iy_cm    = float(sec["iy_cm"])       # cm  (radius of gyration, major axis)
    iz_cm    = float(sec["iz_cm"])       # cm  (radius of gyration, minor axis)
    Wpl_y_cm3 = float(sec["Wpl_y_cm3"]) # cm³ (plastic modulus about major axis)
    Wpl_z_cm3 = float(sec.get("Wpl_z_cm3", Wpl_y_cm3 * 0.5))  # minor axis estimate
    tf_mm    = float(sec.get("tf_mm", 15.0))  # mm  (flange thickness, for curve selection)

    # Effective lengths
    le_y = float(geo["le_y"]) * 1000.0  # m → mm
    le_z = float(geo["le_z"]) * 1000.0  # m → mm

    py   = float(mat.get("py", _PY_DEFAULT))  # N/mm²

    N_Ed = float(lds["N_Ed"])                 # kN
    Mx   = float(lds.get("Mx", 0.0))          # kN·m
    My   = float(lds.get("My", 0.0))          # kN·m

    # Strut curve selection (BS 5950-1 Table 23/24)
    # H-section tf ≤ 40 mm: major-axis = curve a, minor-axis = curve b
    curve_y = "a" if tf_mm <= 40.0 else "b"
    curve_z = "b" if tf_mm <= 40.0 else "c"

    # Convert to mm
    A_mm2      = A_cm2 * 100.0
    iy_mm      = iy_cm * 10.0
    iz_mm      = iz_cm * 10.0
    Wpl_y_mm3  = Wpl_y_cm3 * 1000.0
    Wpl_z_mm3  = Wpl_z_cm3 * 1000.0

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Slenderness ratios
    lam_y = le_y / iy_mm    # slenderness about major axis
    lam_z = le_z / iz_mm    # slenderness about minor axis (usually governs)
    steps.append(_step("Slenderness λy (major axis)",
                        f"le_y/iy = {le_y:.0f}/{iy_mm:.1f}",
                        lam_y, "–", "BS 5950-1 Cl. 4.7.2"))
    steps.append(_step("Slenderness λz (minor axis)",
                        f"le_z/iz = {le_z:.0f}/{iz_mm:.1f}",
                        lam_z, "–", "BS 5950-1 Cl. 4.7.2"))

    if max(lam_y, lam_z) > 180.0:
        warnings.append(
            f"Slenderness {max(lam_y, lam_z):.1f} exceeds 180 — "
            "column is very slender. Review effective length assumptions."
        )

    # Step 2 – Compressive strength by Perry-Robertson
    pc_y = _perry_robertson(py, le_y, iy_mm, curve_y)
    pc_z = _perry_robertson(py, le_z, iz_mm, curve_z)
    pc   = min(pc_y, pc_z)   # governing (minor axis usually governs)
    steps.append(_step("Compressive strength pcy (major axis)",
                        f"Perry-Robertson (curve {curve_y}), λy={lam_y:.1f}",
                        pc_y, "N/mm²", "BS 5950-1 Annex C"))
    steps.append(_step("Compressive strength pcz (minor axis)",
                        f"Perry-Robertson (curve {curve_z}), λz={lam_z:.1f}",
                        pc_z, "N/mm²", "BS 5950-1 Annex C"))

    # Step 3 – Compression capacity
    Pc_N  = A_mm2 * pc        # N
    Pc_kN = Pc_N / 1000.0
    steps.append(_step("Compression capacity Pc",
                        f"Ag×pc = {A_mm2:.0f}×{pc:.1f}/1000",
                        Pc_kN, "kN", "BS 5950-1 Cl. 4.7.4"))

    # Step 4 – Moment capacities (fully restrained, BS 5950-1 Cl. 4.2.5)
    Mcx_Nmm = py * Wpl_y_mm3
    Mcy_Nmm = py * Wpl_z_mm3
    Mcx_kNm = Mcx_Nmm / 1.0e6
    Mcy_kNm = Mcy_Nmm / 1.0e6
    steps.append(_step("Moment capacity Mcx (major)",
                        f"py×Wpl_y = {py:.0f}×{Wpl_y_mm3:.0f}/1e6",
                        Mcx_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))
    steps.append(_step("Moment capacity Mcy (minor)",
                        f"py×Wpl_z = {py:.0f}×{Wpl_z_mm3:.0f}/1e6",
                        Mcy_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))

    # Step 5 – Combined interaction (BS 5950-1 Cl. 4.8.3.2 simplified)
    util_axial = N_Ed / Pc_kN if Pc_kN > 0 else 999.0
    util_Mx    = abs(Mx) / Mcx_kNm if Mcx_kNm > 0 else 0.0
    util_My    = abs(My) / Mcy_kNm if Mcy_kNm > 0 else 0.0
    interaction = util_axial + util_Mx + util_My
    steps.append(_step("Axial utilisation F/Pc",
                        f"N_Ed/Pc = {N_Ed:.1f}/{Pc_kN:.1f}",
                        util_axial, "–", "BS 5950-1 Cl. 4.8.3.2"))
    steps.append(_step("Combined interaction ratio",
                        f"F/Pc + Mx/Mcx + My/Mcy = {util_axial:.3f}+{util_Mx:.3f}+{util_My:.3f}",
                        interaction, "–", "BS 5950-1 Cl. 4.8.3.2"))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append(_check("slenderness_y", "Slenderness λy ≤ 180",
                         "pass" if lam_y <= 180.0 else "warn",
                         lam_y, 180.0, "–", "BS 5950-1 Cl. 4.7.2"))
    checks.append(_check("slenderness_z", "Slenderness λz ≤ 180",
                         "pass" if lam_z <= 180.0 else "warn",
                         lam_z, 180.0, "–", "BS 5950-1 Cl. 4.7.2"))
    checks.append(_check("compression", "Axial F ≤ Pc",
                         "pass" if N_Ed <= Pc_kN else "fail",
                         N_Ed, Pc_kN, "kN", "BS 5950-1 Cl. 4.7.4"))
    checks.append(_check("interaction", "Combined interaction ≤ 1.0",
                         "pass" if interaction <= 1.0 else "fail",
                         interaction, 1.0, "–", "BS 5950-1 Cl. 4.8.3.2"))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    gov_util = max(util_axial, interaction)

    summary = (
        f"Steel column, le_z={geo['le_z']} m, py={py:.0f} N/mm². "
        f"N_Ed={N_Ed:.0f} kN ≤ Pc={Pc_kN:.0f} kN (pc={pc:.0f} N/mm²). "
        f"Combined IR={interaction:.3f}. "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 5950-1:2000", "element": "Steel Column"}},
            {"title": "Slenderness",
             "content": {"lam_y": round(lam_y, 1), "lam_z": round(lam_z, 1),
                         "pc_y_Nmm2": round(pc_y, 1), "pc_z_Nmm2": round(pc_z, 1),
                         "governing_pc_Nmm2": round(pc, 1)}},
            {"title": "Capacity",
             "content": {"Pc_kN": round(Pc_kN, 1), "Mcx_kNm": round(Mcx_kNm, 1),
                         "Mcy_kNm": round(Mcy_kNm, 1)}},
            {"title": "Combined Check",
             "content": {"N_Ed_kN": N_Ed, "Mx_kNm": Mx, "My_kNm": My,
                         "interaction": round(interaction, 4),
                         "status": "Pass" if interaction <= 1.0 else "Fail"}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":  "steel_column",
        "le_y_m":   geo["le_y"], "le_z_m": geo["le_z"],
        "py_Nmm2":  py,
        "pc_Nmm2":  round(pc, 1),
        "Pc_kN":    round(Pc_kN, 1),
        "Mcx_kNm":  round(Mcx_kNm, 1),
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "section":   {"A_cm2": A_cm2, "iy_cm": iy_cm, "iz_cm": iz_cm,
                          "Wpl_y_cm3": Wpl_y_cm3, "Wpl_z_cm3": Wpl_z_cm3},
            "materials": {"py_Nmm2": py},
            "geometry":  {"le_y_m": geo["le_y"], "le_z_m": geo["le_z"]},
            "loads":     {"N_Ed_kN": N_Ed, "Mx_kNm": Mx, "My_kNm": My},
        },
        "results":          {"verdict": verdict, "utilization": round(gov_util, 4), "summary": summary},
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
    sec = inputs.get("section") or {}
    geo = inputs.get("geometry") or {}
    lds = inputs.get("loads")   or {}

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

    for k, p in [("A_cm2", "inputs.section.A_cm2"),
                  ("iy_cm", "inputs.section.iy_cm"),
                  ("iz_cm", "inputs.section.iz_cm"),
                  ("Wpl_y_cm3", "inputs.section.Wpl_y_cm3")]:
        require_positive(sec, k, p)

    require_positive(geo, "le_y", "inputs.geometry.le_y")
    require_positive(geo, "le_z", "inputs.geometry.le_z")
    require_positive(lds, "N_Ed", "inputs.loads.N_Ed")

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
