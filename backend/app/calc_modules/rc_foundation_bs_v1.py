"""
RC Pad Footing Design Module – BS 8110-1:1997

Scope  (geometry.footing_type = "pad"):
  Isolated rectangular pad footing carrying an axial column load and an
  optional uniaxial moment.

Design steps:
  1. Self-weight of footing (γ_conc = 24 kN/m³)
  2. Net bearing pressure at SLS (≤ qa)
  3. ULS upward pressure for structural design
  4. Cantilever arm from column face (short and long direction)
  5. Design moment at column face, per unit width
  6. K factor, lever arm, required tension steel (both directions)
  7. Minimum steel check
  8. Transverse shear at d from column face (BS 8110-1 Cl. 3.11.3.4)
  9. Punching shear at 1.5d from column perimeter (BS 8110-1 Cl. 3.7.6)

Units:
  Spans/dimensions : m or mm  (as noted)
  Forces           : kN
  Moments          : kN·m
  Stresses         : N/mm²
  Pressures        : kN/m²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "rc_foundation_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

_K_PRIME       = 0.156
_GAMMA_M_SHEAR = 1.25
_GAMMA_CONC    = 24.0    # kN/m³  (self-weight of reinforced concrete)


def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    geo  = inputs["geometry"]
    mat  = inputs["materials"]
    lds  = inputs["loads"]
    des  = inputs.get("design") or {}

    L      = float(geo["L"])        # m  (length, direction of any applied moment)
    B      = float(geo["B"])        # m  (breadth, orthogonal)
    h      = float(geo["h"])        # mm (footing depth)
    cover  = float(geo["cover"])    # mm (nominal cover – typically 75 mm for foundations)
    col_h  = float(geo.get("col_h", 300.0))   # mm (column dimension in L direction)
    col_b  = float(geo.get("col_b", 300.0))   # mm (column dimension in B direction)

    fcu    = float(mat["fcu"])
    fy     = float(mat["fy"])

    N_sls  = float(lds["N_sls"])    # kN  (unfactored service load, for bearing check)
    N_uls  = float(lds["N_uls"])    # kN  (ULS design axial load)
    M_sls  = float(lds.get("M_sls", 0.0))   # kN·m (service moment → eccentricity)
    qa     = float(lds["qa"])       # kN/m²  (allowable bearing pressure, gross)

    bar_dia = float(des.get("bar_dia", 16.0))  # mm (assumed main bar diameter)

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    A_ftg  = L * B        # m²  (plan area)

    # Step 1 – Self-weight of footing
    SW = L * B * (h / 1000.0) * _GAMMA_CONC   # kN
    steps.append(_step("Self-weight of footing",
                        f"L×B×(h/1000)×γ = {L}×{B}×{h/1000:.3f}×{_GAMMA_CONC}",
                        SW, "kN", "BS 8110-1 Cl. 3.11.2"))

    # Step 2 – Net bearing pressure at SLS
    N_total_sls = N_sls + SW           # kN
    e_sls = M_sls / N_sls if N_sls > 0 else 0.0   # m  (eccentricity)
    p_max = N_total_sls / A_ftg + 6.0 * M_sls / (B * L**2)  # kN/m²  (max edge pressure)
    p_min = N_total_sls / A_ftg - 6.0 * M_sls / (B * L**2)  # kN/m²  (min edge pressure)
    p_avg = N_total_sls / A_ftg                              # kN/m²  (average SLS pressure)

    steps.append(_step("Average SLS bearing pressure",
                        f"(N_sls+SW)/A = ({N_sls:.1f}+{SW:.1f})/({L}×{B})",
                        p_avg, "kN/m²", "BS 8110-1 Cl. 3.11.2"))
    steps.append(_step("Maximum SLS bearing pressure p_max",
                        f"Ntot/A + 6M/(BL²) = {N_total_sls:.1f}/{A_ftg:.2f}+6×{M_sls:.1f}/({B}×{L}²)",
                        p_max, "kN/m²", "BS 8110-1 Cl. 3.11.2"))

    if p_min < 0.0:
        warnings.append(
            f"Tension under footing: p_min = {p_min:.1f} kN/m² — footing may uplift. "
            "Review eccentricity or increase footing size."
        )

    # Step 3 – ULS upward pressure (assume uniform for structural design, no self-weight in ULS moment)
    p_uls = N_uls / A_ftg   # kN/m²
    steps.append(_step("ULS upward pressure p_uls",
                        f"N_uls/A = {N_uls}/{A_ftg:.2f}",
                        p_uls, "kN/m²", "BS 8110-1 Cl. 3.11.3.1"))

    # Step 4 – Effective depth
    # Primary steel in L direction (bottom of footing, one layer)
    d = h - cover - bar_dia / 2.0   # mm
    steps.append(_step("Effective depth d",
                        f"h − cover − bar⌀/2 = {h} − {cover} − {bar_dia/2:.1f}",
                        d, "mm", "BS 8110-1 Cl. 3.11.3.1"))
    if d <= 0.0:
        return _error_envelope([{
            "field": "inputs.geometry.h / cover",
            "issue": "Effective depth d ≤ 0 — increase h or reduce cover.",
        }])

    # Step 5 – Cantilever arm and design moment (L-direction, critical)
    lx   = (L - col_h / 1000.0) / 2.0    # m  (cantilever projection from column face in L dir)
    M_L  = p_uls * B * lx**2 / 2.0       # kN·m  (total moment across full B width)
    m_L  = p_uls * lx**2 / 2.0           # kN·m/m  (per metre width)
    steps.append(_step("Cantilever arm lx (L direction)",
                        f"(L − col_h/1000)/2 = ({L} − {col_h/1000:.3f})/2",
                        lx, "m", "BS 8110-1 Cl. 3.11.3.1"))
    steps.append(_step("Design moment m (per unit width, L dir)",
                        f"p_uls×lx²/2 = {p_uls:.3f}×{lx:.3f}²/2",
                        m_L, "kN·m/m", "BS 8110-1 Cl. 3.11.3.1"))

    # Step 6 – Bending design (L direction, per unit width)
    m_L_Nmm = m_L * 1.0e6
    b_strip  = 1000.0   # 1 m strip
    K_L     = m_L_Nmm / (fcu * b_strip * d**2)
    z_ratio = min(0.5 + math.sqrt(max(0.25 - min(K_L, _K_PRIME) / 0.9, 0.0)), 0.95)
    z_L     = d * z_ratio
    As_req_L = m_L_Nmm / (0.87 * fy * z_L)
    steps.append(_step("K factor (L direction)",
                        f"m/(fcu·b·d²) = {m_L_Nmm:.0f}/({fcu:.0f}×{b_strip:.0f}×{d:.1f}²)",
                        K_L, "–", "BS 8110-1 Cl. 3.4.4.4"))
    steps.append(_step("Required steel As,req (L dir)",
                        f"m/(0.87fy·z) = {m_L_Nmm:.0f}/(0.87×{fy:.0f}×{z_L:.1f})",
                        As_req_L, "mm²/m", "BS 8110-1 Cl. 3.4.4.4"))

    # Orthogonal direction (B direction)
    d_B  = h - cover - bar_dia - bar_dia / 2.0   # secondary layer
    d_B  = max(d_B, d * 0.8)
    ly   = (B - col_b / 1000.0) / 2.0
    m_B  = p_uls * ly**2 / 2.0
    m_B_Nmm = m_B * 1.0e6
    K_B     = m_B_Nmm / (fcu * b_strip * d_B**2)
    z_B_ratio = min(0.5 + math.sqrt(max(0.25 - min(K_B, _K_PRIME) / 0.9, 0.0)), 0.95)
    z_B     = d_B * z_B_ratio
    As_req_B = m_B_Nmm / (0.87 * fy * z_B)
    steps.append(_step("Design moment m (per unit width, B dir)",
                        f"p_uls×ly²/2 = {p_uls:.3f}×{ly:.3f}²/2",
                        m_B, "kN·m/m", "BS 8110-1 Cl. 3.11.3.1"))
    steps.append(_step("Required steel As,req (B dir)",
                        f"{m_B_Nmm:.0f}/(0.87×{fy:.0f}×{z_B:.1f})",
                        As_req_B, "mm²/m", "BS 8110-1 Cl. 3.4.4.4"))

    # Minimum steel  (BS 8110-1 Table 3.25 – 0.13 % for sections in tension, one-way)
    As_min = 0.0013 * b_strip * h
    As_L   = max(As_req_L, As_min)
    As_B   = max(As_req_B, As_min)

    # Step 7 – Transverse shear at d from column face
    # Critical shear enhancement: av = distance from column face to critical section = d
    # β_v = 1 + (av/(2d)) → BS 8110-1 Cl. 3.11.3.4 angle strut enhancement
    # The critical section is at d from the column face; load = strip beyond critical section
    av_L = lx - d / 1000.0  # m (distance from column face to critical section, corrected)
    if av_L > 0.0:
        V_sh_L   = p_uls * B * av_L     # kN  (shear force per full width B)
        v_sh_L   = (V_sh_L * 1.0e3) / (B * 1000.0 * d)   # N/mm²
        # Enhanced shear capacity (BS 8110-1 Cl. 3.4.5.8): only when av < 2d
        if av_L * 1000.0 < 2.0 * d:
            beta_v = 2.0 * d / (av_L * 1000.0)
        else:
            beta_v = 1.0
    else:
        V_sh_L, v_sh_L, beta_v = 0.0, 0.0, 1.0

    rho_100_L = min(100.0 * As_L / (b_strip * d), 3.0)
    d_fac_L   = max(400.0 / d, 1.0) ** 0.25
    fcu_fac   = (min(fcu, 40.0) / 25.0) ** (1.0 / 3.0)
    vc_L      = (0.79 * rho_100_L ** (1.0 / 3.0) * d_fac_L * fcu_fac) / _GAMMA_M_SHEAR
    vc_enh    = min(vc_L * beta_v, 5.0)   # enhanced vc, capped at 5 N/mm²
    steps.append(_step("Transverse shear stress v (L dir)",
                        f"V/(B×d) = {V_sh_L:.1f}kN×1000/({B*1000:.0f}mm×{d:.1f}mm)",
                        v_sh_L, "N/mm²", "BS 8110-1 Cl. 3.11.3.4"))
    steps.append(_step("Enhanced concrete shear vc,enh (L dir)",
                        f"vc×β_v = {vc_L:.3f}×{beta_v:.3f}",
                        vc_enh, "N/mm²", "BS 8110-1 Cl. 3.4.5.8"))

    # Step 8 – Punching shear at 1.5d from column face (BS 8110-1 Cl. 3.7.6)
    perimeter_inner = 2.0 * (col_h + col_b)                                 # mm
    perimeter_1_5d  = 2.0 * (col_h + col_b) + 2.0 * math.pi * 1.5 * d      # mm
    # Area within punching perimeter (clipped to footing plan)
    side_L   = min(col_h + 3.0 * d, L * 1000.0)   # mm
    side_B   = min(col_b + 3.0 * d, B * 1000.0)   # mm
    A_punch  = side_L * side_B / 1.0e6              # m²
    V_punch  = N_uls - p_uls * A_punch              # kN  (net punching force)
    V_punch  = max(V_punch, 0.0)
    v_punch  = (V_punch * 1.0e3) / (perimeter_1_5d * d)   # N/mm²

    rho_punch = min(100.0 * As_L / (b_strip * d), 3.0)
    vc_punch  = (0.79 * rho_punch ** (1.0 / 3.0) * max(400.0 / d, 1.0) ** 0.25
                 * fcu_fac) / _GAMMA_M_SHEAR

    steps.append(_step("Punching shear perimeter at 1.5d",
                        f"2×(col_h+col_b)+2π×1.5d = {perimeter_1_5d:.0f}",
                        perimeter_1_5d, "mm", "BS 8110-1 Cl. 3.7.6"))
    steps.append(_step("Net punching force V_punch",
                        f"N_uls − p_uls×A_punch = {N_uls:.1f}−{p_uls:.3f}×{A_punch:.3f}×1000",
                        V_punch, "kN", "BS 8110-1 Cl. 3.7.6"))
    steps.append(_step("Punching shear stress v_punch",
                        f"V×1000/(perimeter×d) = {V_punch:.1f}×1000/({perimeter_1_5d:.0f}×{d:.1f})",
                        v_punch, "N/mm²", "BS 8110-1 Cl. 3.7.6"))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append(_check("bearing", "Bearing pressure p_max ≤ qa",
                         "pass" if p_max <= qa else "fail",
                         p_max, qa, "kN/m²", "BS 8110-1 Cl. 3.11.2"))
    checks.append(_check("bending_k_L", "Bending K ≤ K′ (L direction)",
                         "pass" if K_L <= _K_PRIME else "fail",
                         K_L, _K_PRIME, "–", "BS 8110-1 Cl. 3.4.4.4"))
    checks.append(_check("bending_k_B", "Bending K ≤ K′ (B direction)",
                         "pass" if K_B <= _K_PRIME else "fail",
                         K_B, _K_PRIME, "–", "BS 8110-1 Cl. 3.4.4.4"))
    checks.append({
        "id": "shear_transverse",
        "label": "Transverse shear (L dir) v ≤ vc,enh",
        "status": "pass" if v_sh_L <= vc_enh else "fail",
        "value":  round(v_sh_L, 3), "limit": round(vc_enh, 3), "unit": "N/mm²",
        "note":   "Shear enhancement factor β applied" if beta_v > 1.0 else "No enhancement",
        "clause": "BS 8110-1 Cl. 3.11.3.4 / 3.4.5.8",
    })
    checks.append(_check("punching_shear", "Punching shear v ≤ vc",
                         "pass" if v_punch <= vc_punch else "fail",
                         v_punch, vc_punch, "N/mm²", "BS 8110-1 Cl. 3.7.6"))
    checks.append(_check("min_steel", "Minimum reinforcement As ≥ As,min",
                         "pass" if As_L >= As_min else "fail",
                         As_L, As_min, "mm²/m", "BS 8110-1 Table 3.25"))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    util     = max(p_max / qa if qa > 0 else 0,
                   K_L / _K_PRIME,
                   v_punch / vc_punch if vc_punch > 0 else 0)

    summary = (
        f"Pad footing {L}×{B} m, h={h:.0f} mm. "
        f"p_max={p_max:.1f} kN/m² ≤ qa={qa:.1f} kN/m². "
        f"As,L={As_L:.0f} mm²/m, As,B={As_B:.0f} mm²/m. "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 8110-1:1997", "element": "RC Pad Footing"}},
            {"title": "Footing Geometry",
             "content": {"L_m": L, "B_m": B, "h_mm": h, "cover_mm": cover,
                         "col_h_mm": col_h, "col_b_mm": col_b}},
            {"title": "Bearing Capacity",
             "content": {"N_sls_kN": N_sls, "SW_kN": round(SW, 1),
                         "p_max_kNm2": round(p_max, 2), "qa_kNm2": qa,
                         "status": "Pass" if p_max <= qa else "Fail"}},
            {"title": "Bending Design",
             "content": {"p_uls_kNm2": round(p_uls, 3),
                         "As_L_mm2_per_m": round(As_L, 0),
                         "As_B_mm2_per_m": round(As_B, 0)}},
            {"title": "Shear Checks",
             "content": {"v_transverse_Nmm2": round(v_sh_L, 3),
                         "vc_enh_Nmm2": round(vc_enh, 3),
                         "v_punch_Nmm2": round(v_punch, 3),
                         "vc_punch_Nmm2": round(vc_punch, 3)}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":    "rc_pad_footing",
        "dimensions": {"L_m": L, "B_m": B, "h_mm": h, "cover_mm": cover},
        "reinforcement": {
            "L_dir_As_mm2_per_m": round(As_L, 1),
            "B_dir_As_mm2_per_m": round(As_B, 1),
        },
        "shear": {
            "v_transverse": round(v_sh_L, 3), "vc_enh": round(vc_enh, 3),
            "v_punching":   round(v_punch, 3), "vc_punching": round(vc_punch, 3),
        },
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"L_m": L, "B_m": B, "h_mm": h, "cover_mm": cover,
                          "col_h_mm": col_h, "col_b_mm": col_b},
            "materials": {"fcu_Nmm2": fcu, "fy_Nmm2": fy},
            "loads":     {"N_sls_kN": N_sls, "N_uls_kN": N_uls, "qa_kNm2": qa},
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
    geo = inputs.get("geometry") or {}
    mat = inputs.get("materials") or {}
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

    for k, p in [("L", "inputs.geometry.L"), ("B", "inputs.geometry.B"),
                  ("h", "inputs.geometry.h"), ("cover", "inputs.geometry.cover")]:
        require_positive(geo, k, p)
    require_positive(mat, "fcu", "inputs.materials.fcu")
    require_positive(mat, "fy",  "inputs.materials.fy")
    require_positive(lds, "N_sls", "inputs.loads.N_sls")
    require_positive(lds, "N_uls", "inputs.loads.N_uls")
    require_positive(lds, "qa",    "inputs.loads.qa")

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
