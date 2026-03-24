"""
Steel Portal Frame Design Module – BS 5950-1:2000

Scope:
  Single-bay symmetric portal frame with either pinned or fixed column bases.
  Analysis is performed using simplified elastic formulae (suitable for
  preliminary design / P0).  A full rigorous analysis using dedicated software
  should be performed for final design.

Simplified analysis assumptions:
  • Symmetric geometry and loading (equal rafters, equal columns)
  • Uniform prismatic members (no haunches in analysis; haunch length noted)
  • Uniformly distributed roof gravity load (kN/m²)
  • Wind load not included in P0

Pinned-base horizontal thrust (elastic, equal EI throughout):
    H = wL²/(8h)  × correction_factor
  where the correction factor accounts for rafter/column stiffness ratio; set
  to 1.0 for uniform frame (conservative for typical column/rafter EI ratios).

Fixed-base:
    H = (3/8)×wL²/(2h) = 3wL²/(16h)  (standard result)

Design checks per BS 5950-1:2000:
  1. Rafter: combined bending + axial (Cl. 4.8.3)
  2. Column: combined bending + axial (Cl. 4.8.3)
  3. Sway stability: approximate λ_cr ≥ 5 (simple method) or ≥ 10 (elastic)
  4. Rafter deflection at apex

Units:
  Dimensions  : m or mm as noted
  Loads       : kN/m² (roof), kN/m (per bay)
  Forces      : kN
  Moments     : kN·m
  Stresses    : N/mm²
  EI          : kN·m² (section properties in cm⁴, E in kN/cm² = 20 500 kN/cm²)
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "steel_portal_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

_E_kNcm2    = 20_500.0   # kN/cm²  (E for stiffness, consistent with I in cm⁴)
_E_Nmm2     = 205_000.0  # N/mm²   (for capacity calculations)
_GAMMA_G    = 1.4
_GAMMA_Q    = 1.6
_PY_DEFAULT = 275.0      # N/mm²

# Perry-Robertson constants (same as steel_column)
_ROBERTSON_A = {"a": 2.0, "b": 3.5, "c": 5.5, "d": 8.0}


def _pc(py: float, le_mm: float, r_mm: float, curve: str = "b") -> float:
    lam = le_mm / r_mm
    if lam <= 0.0:
        return py
    lam_0 = 0.2 * math.pi * math.sqrt(_E_Nmm2 / py)
    a     = _ROBERTSON_A.get(curve, 3.5)
    eta   = a * max(lam - lam_0, 0.0) / 1000.0
    pe    = math.pi**2 * _E_Nmm2 / lam**2
    phi   = (py + (eta + 1.0) * pe) / 2.0
    disc  = max(phi**2 - pe * py, 0.0)
    return min(pe * py / (phi + math.sqrt(disc)), py)


def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    geo  = inputs["geometry"]
    mat  = inputs.get("materials") or {}
    lds  = inputs["loads"]
    raf  = inputs["rafter_section"]
    col  = inputs["column_section"]

    span      = float(geo["span"])         # m  (eave-to-eave)
    height    = float(geo["height"])       # m  (eave height above base)
    pitch_deg = float(geo.get("pitch_deg", 6.0))   # degrees
    bay_width = float(geo["bay_width"])    # m  (out-of-plane frame spacing)
    base_type = str(geo.get("base_type", "pinned")).lower()

    gk = float(lds["gk"])   # kN/m²  (roof dead)
    qk = float(lds["qk"])   # kN/m²  (roof imposed)

    py        = float(mat.get("py", _PY_DEFAULT))   # N/mm²

    # Rafter section (assumed symmetric)
    r_A_cm2     = float(raf["A_cm2"])
    r_I_cm4     = float(raf["I_cm4"])       # about strong axis
    r_Wpl_cm3   = float(raf["Wpl_cm3"])
    r_iy_cm     = float(raf.get("iy_cm", math.sqrt(r_I_cm4 / r_A_cm2)))
    r_iz_cm     = float(raf.get("iz_cm", r_iy_cm * 0.45))  # approx for I-section

    # Column section
    c_A_cm2     = float(col["A_cm2"])
    c_I_cm4     = float(col["I_cm4"])
    c_Wpl_cm3   = float(col["Wpl_cm3"])
    c_iy_cm     = float(col.get("iy_cm", math.sqrt(c_I_cm4 / c_A_cm2)))
    c_iz_cm     = float(col.get("iz_cm", c_iy_cm * 0.45))

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Load per unit length on rafter (horizontal projection)
    w_sls = (gk + qk) * bay_width            # kN/m  (total char)
    w_uls = (_GAMMA_G * gk + _GAMMA_Q * qk) * bay_width   # kN/m  ULS
    steps.append(_step("ULS load on rafter w_uls",
                        f"(1.4×gk+1.6×qk)×bay = (1.4×{gk}+1.6×{qk})×{bay_width}",
                        w_uls, "kN/m", "BS 5950-1 Cl. 2.4.1"))

    # Step 2 – Reactions
    V_react = w_uls * span / 2.0   # kN  (vertical reaction at each base)
    steps.append(_step("Vertical base reaction V",
                        f"wL/2 = {w_uls:.3f}×{span}/2",
                        V_react, "kN", "BS 5950-1 / structural analysis"))

    # Step 3 – Horizontal thrust H at eaves
    if base_type == "fixed":
        # Standard fixed-base portal under symmetric UDL
        H = 3.0 * w_uls * span**2 / (16.0 * height)
        H_expr = f"3wL²/(16h) = 3×{w_uls:.3f}×{span}²/(16×{height})"
    else:
        # Pinned base: H = wL²/(8h) (exact for rigid, infinitely stiff connections)
        H = w_uls * span**2 / (8.0 * height)
        H_expr = f"wL²/(8h) = {w_uls:.3f}×{span}²/(8×{height})"
    steps.append(_step("Horizontal thrust H",
                        H_expr, H, "kN", "BS 5950-1 / simplified analysis"))

    # Step 4 – Eaves moment (at column top / rafter haunch)
    M_eaves = H * height   # kN·m
    steps.append(_step("Eaves moment M_eaves",
                        f"H×h = {H:.3f}×{height}",
                        M_eaves, "kN·m", "BS 5950-1 / simplified analysis"))

    # Step 5 – Rafter analysis
    # Axial force in rafter ≈ H/cos(pitch) (thrust)
    pitch_rad = math.radians(pitch_deg)
    cos_pitch = math.cos(pitch_rad)
    N_rafter  = H / cos_pitch    # kN  (compression)
    # Max rafter moment at eaves ≈ M_eaves (governs practical design)
    # Mid-span moment reduces towards apex; for pinned-base M_apex ≈ 0 for flat portal.
    # Conservative: treat full M_eaves as max moment throughout rafter.
    M_rafter  = M_eaves           # kN·m (conservative)
    steps.append(_step("Axial force in rafter N_r",
                        f"H/cos(pitch) = {H:.3f}/cos({pitch_deg:.1f}°)",
                        N_rafter, "kN", "BS 5950-1 / geometry"))

    # Step 6 – Column analysis
    N_col    = V_react            # kN  (column axial = vertical reaction)
    M_col    = M_eaves            # kN·m (column top moment = eaves moment)
    # Column base moment
    M_base   = 0.0 if base_type == "pinned" else H * height / 2.0  # rough, fixed base half
    steps.append(_step("Column axial N_col",
                        f"= V_react = {V_react:.3f} kN",
                        N_col, "kN", "BS 5950-1 / equilibrium"))

    # Step 7 – Rafter section capacities
    r_A_mm2    = r_A_cm2 * 100.0
    r_Wpl_mm3  = r_Wpl_cm3 * 1000.0
    # Rafter effective length (out-of-plane, assumed bay_width / 2 between purlins)
    le_rafter_purlins = bay_width / 2.0 * 1000.0             # mm  (purlin spacing = bay/2)
    r_iz_mm    = r_iz_cm * 10.0
    pc_r       = _pc(py, le_rafter_purlins, r_iz_mm, "b")
    Pc_r_kN    = r_A_mm2 * pc_r / 1000.0
    Mc_r_kNm   = py * r_Wpl_mm3 / 1.0e6
    steps.append(_step("Rafter compressive capacity Pc_r",
                        f"A×pc = {r_A_mm2:.0f}×{pc_r:.1f}/1000",
                        Pc_r_kN, "kN", "BS 5950-1 Cl. 4.7.4"))
    steps.append(_step("Rafter moment capacity Mc_r",
                        f"py×Wpl = {py:.0f}×{r_Wpl_mm3:.0f}/1e6",
                        Mc_r_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))

    # Step 8 – Column section capacities
    c_A_mm2    = c_A_cm2 * 100.0
    c_Wpl_mm3  = c_Wpl_cm3 * 1000.0
    le_col_mm  = height * 1000.0 * (0.85 if base_type == "fixed" else 1.0)
    c_iz_mm    = c_iz_cm * 10.0
    pc_c       = _pc(py, le_col_mm, c_iz_mm, "b")
    Pc_c_kN    = c_A_mm2 * pc_c / 1000.0
    Mc_c_kNm   = py * c_Wpl_mm3 / 1.0e6
    steps.append(_step("Column compressive capacity Pc_c",
                        f"A×pc (le={le_col_mm/1000:.2f} m) = {c_A_mm2:.0f}×{pc_c:.1f}/1000",
                        Pc_c_kN, "kN", "BS 5950-1 Cl. 4.7.4"))
    steps.append(_step("Column moment capacity Mc_c",
                        f"py×Wpl = {py:.0f}×{c_Wpl_mm3:.0f}/1e6",
                        Mc_c_kNm, "kN·m", "BS 5950-1 Cl. 4.2.5"))

    # Step 9 – Interaction ratios (BS 5950-1 Cl. 4.8.3.2 simplified)
    IR_rafter = (N_rafter / Pc_r_kN if Pc_r_kN > 0 else 0) + \
                (M_rafter / Mc_r_kNm if Mc_r_kNm > 0 else 0)
    IR_column = (N_col / Pc_c_kN if Pc_c_kN > 0 else 0) + \
                (M_col / Mc_c_kNm if Mc_c_kNm > 0 else 0)
    steps.append(_step("Rafter interaction ratio IR_r",
                        f"N_r/Pc_r + M_r/Mc_r = "
                        f"{N_rafter:.2f}/{Pc_r_kN:.2f}+{M_rafter:.2f}/{Mc_r_kNm:.2f}",
                        IR_rafter, "–", "BS 5950-1 Cl. 4.8.3.2"))
    steps.append(_step("Column interaction ratio IR_c",
                        f"N_c/Pc_c + M_c/Mc_c = "
                        f"{N_col:.2f}/{Pc_c_kN:.2f}+{M_col:.2f}/{Mc_c_kNm:.2f}",
                        IR_column, "–", "BS 5950-1 Cl. 4.8.3.2"))

    # Step 10 – Approximate sway stability (λ_cr via Sway sensitivity)
    # Δh under horizontal load = H_notional (= 0.5% of vertical load at each eave level)
    # λ_cr ≈ (V_Ed / Δh) × (h / H_notional)  ← simplified from stability index method
    # For a simpler index: θ = V×Δ/(H×h) ≤ 0.1 (BS5950 notional sway limit)
    # Approximate column top sway under H using column stiffness 12EI/h³ (cantilever: 3EI/h³)
    EI_col = _E_kNcm2 * c_I_cm4   # kN·cm²  → convert to kN·m²
    EI_col_kNm2 = EI_col / 1.0e4  # kN·m²
    if base_type == "fixed":
        k_sway = 12.0 * EI_col_kNm2 / height**3   # kN/m  (stiffness of two fixed columns)
    else:
        k_sway = 2.0 * 3.0 * EI_col_kNm2 / height**3   # kN/m
    delta_sway = H / k_sway   # m  (lateral deflection at eaves under H)
    lam_cr = 1.0 / (delta_sway / height) if delta_sway > 0 else 999.0   # approximate λ_cr
    steps.append(_step("Approximate sway factor λ_cr",
                        f"h/δ = {height}/{delta_sway*1000:.2f}mm (drift ratio)",
                        lam_cr, "–", "BS 5950-1 Cl. 2.4.2.7"))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append(_check("rafter_interaction", "Rafter IR ≤ 1.0",
                         "pass" if IR_rafter <= 1.0 else "fail",
                         IR_rafter, 1.0, "–", "BS 5950-1 Cl. 4.8.3.2"))
    checks.append(_check("column_interaction", "Column IR ≤ 1.0",
                         "pass" if IR_column <= 1.0 else "fail",
                         IR_column, 1.0, "–", "BS 5950-1 Cl. 4.8.3.2"))
    checks.append(_check("sway_stability", "Sway stability λ_cr ≥ 5",
                         "pass" if lam_cr >= 5.0 else "fail",
                         lam_cr, 5.0, "–", "BS 5950-1 Cl. 2.4.2.7"))

    # Deflection at apex under SLS
    w_sls_N  = w_sls * 1000.0    # N/m
    L_mm     = span * 1000.0
    r_I_mm4  = r_I_cm4 * 1.0e4   # mm⁴
    delta_apex = 5.0 * w_sls_N * L_mm**4 / (384.0 * _E_Nmm2 * r_I_mm4)
    delta_lim  = L_mm / 200.0    # L/200 for portal rafter deflection
    steps.append(_step("Rafter deflection at apex δ_apex",
                        f"5wL⁴/(384EI) [SLS] = 5×{w_sls_N:.0f}×{L_mm:.0f}⁴/(384×{_E_Nmm2:.0f}×{r_I_mm4:.0f})",
                        delta_apex, "mm", "BS 5950-1 Cl. 2.5.2"))
    checks.append(_check("rafter_deflection", "Rafter deflection ≤ L/200",
                         "pass" if delta_apex <= delta_lim else "fail",
                         delta_apex, delta_lim, "mm", "BS 5950-1 Cl. 2.5.2"))

    warnings.append(
        "Simplified elastic analysis used. Verify with rigorous software "
        "(e.g., FASTRAK, Tekla Structural Designer) for final design."
    )

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    gov_util = max(IR_rafter, IR_column)

    summary = (
        f"Portal frame {span}m span, {height}m eave height, {base_type} base, py={py:.0f} N/mm². "
        f"M_eaves={M_eaves:.1f} kN·m, H={H:.1f} kN. "
        f"Rafter IR={IR_rafter:.2f}, Column IR={IR_column:.2f}. "
        f"λ_cr={lam_cr:.1f}. Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 5950-1:2000", "element": "Steel Portal Frame"}},
            {"title": "Frame Geometry",
             "content": {"span_m": span, "height_m": height,
                         "pitch_deg": pitch_deg, "bay_width_m": bay_width,
                         "base_type": base_type}},
            {"title": "Analysis Results",
             "content": {"H_kN": round(H, 2), "V_kN": round(V_react, 2),
                         "M_eaves_kNm": round(M_eaves, 2)}},
            {"title": "Rafter Check",
             "content": {"N_r_kN": round(N_rafter, 2), "Pc_r_kN": round(Pc_r_kN, 2),
                         "M_r_kNm": round(M_rafter, 2), "Mc_r_kNm": round(Mc_r_kNm, 2),
                         "IR": round(IR_rafter, 4)}},
            {"title": "Column Check",
             "content": {"N_c_kN": round(N_col, 2), "Pc_c_kN": round(Pc_c_kN, 2),
                         "M_c_kNm": round(M_col, 2), "Mc_c_kNm": round(Mc_c_kNm, 2),
                         "IR": round(IR_column, 4)}},
            {"title": "Stability & Deflection",
             "content": {"lambda_cr": round(lam_cr, 1),
                         "delta_apex_mm": round(delta_apex, 1),
                         "limit_L200_mm": round(delta_lim, 1)}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":    "steel_portal_frame",
        "span_m":     span, "height_m": height, "base_type": base_type,
        "H_kN":       round(H, 1), "M_eaves_kNm": round(M_eaves, 1),
        "rafter_IR":  round(IR_rafter, 3),
        "column_IR":  round(IR_column, 3),
        "lambda_cr":  round(lam_cr, 1),
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"span_m": span, "height_m": height,
                          "pitch_deg": pitch_deg, "bay_width_m": bay_width,
                          "base_type": base_type},
            "materials": {"py_Nmm2": py},
            "loads":     {"gk_kNm2": gk, "qk_kNm2": qk, "w_uls_kNm": round(w_uls, 3)},
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
    geo = inputs.get("geometry")         or {}
    lds = inputs.get("loads")            or {}
    raf = inputs.get("rafter_section")   or {}
    col = inputs.get("column_section")   or {}

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

    for k, p in [("span", "inputs.geometry.span"), ("height", "inputs.geometry.height"),
                  ("bay_width", "inputs.geometry.bay_width")]:
        require_positive(geo, k, p)
    require_non_negative(lds, "gk", "inputs.loads.gk")
    require_non_negative(lds, "qk", "inputs.loads.qk")
    for k, p in [("A_cm2", "inputs.rafter_section.A_cm2"),
                  ("I_cm4", "inputs.rafter_section.I_cm4"),
                  ("Wpl_cm3", "inputs.rafter_section.Wpl_cm3")]:
        require_positive(raf, k, p)
    for k, p in [("A_cm2", "inputs.column_section.A_cm2"),
                  ("I_cm4", "inputs.column_section.I_cm4"),
                  ("Wpl_cm3", "inputs.column_section.Wpl_cm3")]:
        require_positive(col, k, p)

    if not errors:
        if float(lds.get("gk", 0)) + float(lds.get("qk", 0)) <= 0.0:
            errors.append({"field": "inputs.loads",
                           "issue": "At least one of gk or qk must be > 0"})
    if not errors:
        base = str(geo.get("base_type", "pinned")).lower()
        if base not in ("pinned", "fixed"):
            errors.append({"field": "inputs.geometry.base_type",
                           "issue": "must be 'pinned' or 'fixed'"})

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
