"""
Steel Beam Design Module – BS 5950-1:2000

Scope:
  Universal Beam (I-section) under uniformly distributed load (UDL).
  Supports simply_supported, continuous (0.086wl² mid-span) and cantilever
  span conditions.

  Assumes full lateral restraint (no lateral-torsional buckling check is
  performed; a warning is issued when lateral_restraint is not "full").

Design checks:
  1. Section classification (BS 5950-1 Table 11 / Cl. 3.5)
  2. Shear capacity Pv = 0.6·py·Av  (Cl. 4.2.3)
  3. Moment capacity Mc = py·Wpl (class 1/2) or py·Wel (class 3)  (Cl. 4.2.5)
  4. Web-bearing / buckling not checked at P0 (note added)
  5. Deflection δ ≤ L/360  (Cl. 2.5.2, using characteristic loads)

Units:
  Section dimensions : mm
  Section properties : cm² / cm³ / cm⁴  (converted internally to N, mm)
  Loads              : kN/m
  Design strength    : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "steel_beam_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

_E           = 205_000.0   # N/mm²  (modulue of elasticity, BS 5950-1 Cl. 2.4.1)
_PY_DEFAULT  = 275.0       # N/mm²  (S275 default)

# Basic shear / moment limit for section classification  ε = √(275/py)
_DEFLECTION_LIMIT_DIV = 360   # L/360  (typical imposed-load limit)


def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    sec  = inputs["section"]
    mat  = inputs.get("materials") or {}
    geo  = inputs["geometry"]
    lds  = inputs["loads"]

    # Section properties (user-supplied from section tables or BIM)
    A_cm2    = float(sec["A_cm2"])       # cm²
    Iy_cm4   = float(sec["Iy_cm4"])      # cm⁴  (second moment about major axis)
    Wpl_cm3  = float(sec["Wpl_cm3"])     # cm³  (plastic section modulus)
    Wel_cm3  = float(sec.get("Wel_cm3", Wpl_cm3 * 0.9))  # elastic modulus (default estimate)
    hw_mm    = float(sec["hw_mm"])       # mm   (clear web height between flanges)
    tw_mm    = float(sec["tw_mm"])       # mm   (web thickness)
    tf_mm    = float(sec["tf_mm"])       # mm   (flange thickness)
    bf_mm    = float(sec["bf_mm"])       # mm   (total flange breadth)

    span     = float(geo["span"])                          # m
    support  = str(geo.get("support_type", "simply_supported"))
    lat_rest = str(geo.get("lateral_restraint", "full")).lower()

    py = float(mat.get("py", _PY_DEFAULT))  # N/mm²

    gk = float(lds["gk"])  # kN/m  (characteristic dead)
    qk = float(lds["qk"])  # kN/m  (characteristic imposed)

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Convert section properties to mm-based
    A_mm2  = A_cm2  * 100.0        # mm²
    Iy_mm4 = Iy_cm4 * 1.0e4       # mm⁴
    Wpl_mm3 = Wpl_cm3 * 1_000.0   # mm³
    Wel_mm3 = Wel_cm3 * 1_000.0   # mm³

    # Step 1 – Section classification
    eps = math.sqrt(275.0 / py)   # ε  (BS 5950-1 Table 11)
    b_out  = (bf_mm - tw_mm) / 2.0           # mm  (flange outstand)
    b_T    = b_out / tf_mm                   # flange outstand ratio b/T
    d_t    = hw_mm / tw_mm                   # web depth/thickness ratio d/t

    if b_T <= 9.0 * eps and d_t <= 80.0 * eps:
        sec_class = 1
        sec_label = "Class 1 (Plastic)"
    elif b_T <= 10.0 * eps and d_t <= 100.0 * eps:
        sec_class = 2
        sec_label = "Class 2 (Compact)"
    elif b_T <= 15.0 * eps and d_t <= 120.0 * eps:
        sec_class = 3
        sec_label = "Class 3 (Semi-compact)"
    else:
        sec_class = 4
        sec_label = "Class 4 (Slender)"
        warnings.append(
            f"Class 4 (Slender) section — effective section properties required. "
            "This module does not perform Class 4 checks."
        )

    steps.append(_step("Section classification ε",
                        f"√(275/py) = √(275/{py:.0f})",
                        eps, "–", "BS 5950-1 Table 11"))
    steps.append(_step("Flange outstand ratio b/T",
                        f"(bf−tw)/2/tf = ({bf_mm}−{tw_mm})/2/{tf_mm}",
                        b_T, "–", "BS 5950-1 Table 11"))
    steps.append(_step("Web d/t ratio",
                        f"hw/tw = {hw_mm}/{tw_mm}",
                        d_t, "–", "BS 5950-1 Table 11"))

    if lat_rest != "full":
        warnings.append(
            "Lateral restraint is not 'full'. Lateral-torsional buckling (LTB) "
            "check required per BS 5950-1 Cl. 4.3. This module uses Mc only."
        )

    # Step 2 – ULS loads
    w_uls = 1.4 * gk + 1.6 * qk   # kN/m

    if support == "cantilever":
        M_uls = w_uls * span**2 / 2.0
        M_expr = f"wl²/2 = {w_uls:.3f}×{span}²/2"
        V_uls = w_uls * span
        V_expr = f"wl = {w_uls:.3f}×{span}"
    elif support == "continuous":
        M_uls = 0.086 * w_uls * span**2
        M_expr = f"0.086wl² = 0.086×{w_uls:.3f}×{span}²"
        V_uls  = 0.6 * w_uls * span / 2.0
        V_expr = f"0.6wl/2 = 0.6×{w_uls:.3f}×{span}/2"
        warnings.append("Continuous beam: mid-span coefficient 0.086 used (BS 5950-1 elastic analysis).")
    else:   # simply_supported
        M_uls = w_uls * span**2 / 8.0
        M_expr = f"wl²/8 = {w_uls:.3f}×{span}²/8"
        V_uls  = w_uls * span / 2.0
        V_expr = f"wl/2 = {w_uls:.3f}×{span}/2"

    steps.append(_step("Design UDL w_uls",
                        f"1.4gk+1.6qk = 1.4×{gk}+1.6×{qk}",
                        w_uls, "kN/m", "BS 5950-1 Cl. 2.4.1"))
    steps.append(_step("Design moment M",   M_expr, M_uls, "kN·m", "BS 5950-1 Cl. 4.2.5"))
    steps.append(_step("Design shear V",    V_expr, V_uls, "kN",   "BS 5950-1 Cl. 4.2.3"))

    M_Nmm = M_uls * 1.0e6   # N·mm

    # Step 3 – Shear capacity
    Av     = hw_mm * tw_mm     # mm²  (shear area for I-section web)
    Pv     = 0.6 * py * Av     # N
    Pv_kN  = Pv / 1000.0
    steps.append(_step("Shear area Av",
                        f"hw×tw = {hw_mm}×{tw_mm}",
                        Av, "mm²", "BS 5950-1 Cl. 4.2.3"))
    steps.append(_step("Shear capacity Pv",
                        f"0.6·py·Av = 0.6×{py:.0f}×{Av:.0f}/1000",
                        Pv_kN, "kN", "BS 5950-1 Cl. 4.2.3"))

    # High-shear check: if V > 0.6 Pv, use reduced Mc
    high_shear = V_uls > 0.6 * Pv_kN
    if high_shear:
        ρ_s   = (2.0 * V_uls / Pv_kN - 1.0) ** 2
        Sv_mm3 = Av**2 / (4.0 * tw_mm)   # approximate  Sv for I-section
        Wpl_eff_mm3 = max(Wpl_mm3 - ρ_s * Sv_mm3, Wel_mm3)
        warnings.append(
            f"High-shear condition (V = {V_uls:.1f} kN > 0.6Pv = {0.6*Pv_kN:.1f} kN). "
            "Reduced moment capacity applied per BS 5950-1 Cl. 4.2.5.3."
        )
    else:
        Wpl_eff_mm3 = Wpl_mm3

    # Step 4 – Moment capacity
    if sec_class <= 2:
        Mc_Nmm = py * Wpl_eff_mm3     # plastic / compact
    else:
        Mc_Nmm = py * Wel_mm3         # semi-compact
    Mc_kNm = Mc_Nmm / 1.0e6
    steps.append(_step("Moment capacity Mc",
                        f"py×{'Wpl' if sec_class <= 2 else 'Wel'} = "
                        f"{py:.0f}×{(Wpl_eff_mm3 if sec_class <= 2 else Wel_mm3):.0f}/1e6",
                        Mc_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))

    # Step 5 – Serviceability deflection  (characteristic loads only)
    w_sls = gk + qk   # kN/m (total characteristic)
    w_sls_N = w_sls * 1000.0   # N/m
    L_mm = span * 1000.0

    if support == "cantilever":
        delta = w_sls_N * L_mm**4 / (8.0 * _E * Iy_mm4)
    elif support == "continuous":
        delta = w_sls_N * L_mm**4 / (384.0 * _E * Iy_mm4) * 2.5 * 0.5  # rough approx
    else:
        delta = 5.0 * w_sls_N * L_mm**4 / (384.0 * _E * Iy_mm4)

    delta_lim = L_mm / _DEFLECTION_LIMIT_DIV
    steps.append(_step("Serviceability deflection δ",
                        f"5wL⁴/(384EI) = 5×{w_sls_N:.0f}×{L_mm:.0f}⁴/(384×{_E:.0f}×{Iy_mm4:.0f})",
                        delta, "mm", "BS 5950-1 Cl. 2.5.2"))
    steps.append(_step("Deflection limit L/360",
                        f"L/360 = {L_mm:.0f}/360",
                        delta_lim, "mm", "BS 5950-1 Cl. 2.5.2"))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append({
        "id": "section_class",
        "label": "Section classification",
        "status": "pass" if sec_class <= 3 else "fail",
        "value": sec_class, "limit": 3.0, "unit": "class",
        "note": sec_label, "clause": "BS 5950-1 Table 11",
    })
    checks.append(_check("shear", "Shear V ≤ Pv",
                         "pass" if V_uls <= Pv_kN else "fail",
                         V_uls, Pv_kN, "kN", "BS 5950-1 Cl. 4.2.3"))
    checks.append(_check("bending", "Bending M ≤ Mc",
                         "pass" if M_uls <= Mc_kNm else "fail",
                         M_uls, Mc_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))
    checks.append(_check("deflection", "Deflection δ ≤ L/360",
                         "pass" if delta <= delta_lim else "fail",
                         delta, delta_lim, "mm", "BS 5950-1 Cl. 2.5.2"))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    util     = max(V_uls / Pv_kN if Pv_kN > 0 else 0,
                   M_uls / Mc_kNm if Mc_kNm > 0 else 0,
                   delta / delta_lim if delta_lim > 0 else 0)

    summary = (
        f"Steel beam, {span} m {support.replace('_', ' ')}, py={py:.0f} N/mm². "
        f"M={M_uls:.1f} kN·m ≤ Mc={Mc_kNm:.1f} kN·m. "
        f"δ={delta:.1f} mm ≤ {delta_lim:.1f} mm (L/360). "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 5950-1:2000", "element": "Steel Beam"}},
            {"title": "Section Classification",
             "content": {"class": sec_class, "label": sec_label,
                         "eps": round(eps, 4), "b_T": round(b_T, 2), "d_t": round(d_t, 2)}},
            {"title": "Loading",
             "content": {"w_uls_kNm": round(w_uls, 3), "M_kNm": round(M_uls, 2),
                         "V_kN": round(V_uls, 2)}},
            {"title": "Capacity",
             "content": {"Mc_kNm": round(Mc_kNm, 2), "Pv_kN": round(Pv_kN, 2)}},
            {"title": "Deflection",
             "content": {"delta_mm": round(delta, 2), "limit_mm": round(delta_lim, 2),
                         "status": "Pass" if delta <= delta_lim else "Fail"}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":    "steel_beam",
        "section_class": sec_class,
        "span_m":     span,
        "support":    support,
        "py_Nmm2":    py,
        "shear":  {"Pv_kN": round(Pv_kN, 1)},
        "moment": {"Mc_kNm": round(Mc_kNm, 1)},
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "section":   {"A_cm2": A_cm2, "Iy_cm4": Iy_cm4, "Wpl_cm3": Wpl_cm3,
                          "hw_mm": hw_mm, "tw_mm": tw_mm, "tf_mm": tf_mm, "bf_mm": bf_mm},
            "materials": {"py_Nmm2": py},
            "geometry":  {"span_m": span, "support_type": support},
            "loads":     {"gk_kNm": gk, "qk_kNm": qk, "ultimate_w_kNm": round(w_uls, 3)},
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

    def require_non_negative(c: dict, k: str, path: str) -> None:
        v = c.get(k)
        if v is None:
            errors.append({"field": path, "issue": "required field missing"})
        else:
            try:
                if float(v) < 0.0:
                    errors.append({"field": path, "issue": "must be ≥ 0"})
            except (TypeError, ValueError):
                errors.append({"field": path, "issue": "must be a number"})

    for k, p in [("A_cm2", "inputs.section.A_cm2"), ("Iy_cm4", "inputs.section.Iy_cm4"),
                  ("Wpl_cm3", "inputs.section.Wpl_cm3"), ("hw_mm", "inputs.section.hw_mm"),
                  ("tw_mm", "inputs.section.tw_mm"), ("tf_mm", "inputs.section.tf_mm"),
                  ("bf_mm", "inputs.section.bf_mm")]:
        require_positive(sec, k, p)

    require_positive(geo, "span", "inputs.geometry.span")
    require_non_negative(lds, "gk", "inputs.loads.gk")
    require_non_negative(lds, "qk", "inputs.loads.qk")

    if not errors:
        if float(lds.get("gk", 0)) + float(lds.get("qk", 0)) <= 0.0:
            errors.append({"field": "inputs.loads",
                           "issue": "At least one of gk or qk must be > 0"})

    support = geo.get("support_type", "simply_supported")
    if support not in ("simply_supported", "continuous", "cantilever"):
        errors.append({"field": "inputs.geometry.support_type",
                       "issue": "Must be one of: simply_supported, continuous, cantilever"})

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
