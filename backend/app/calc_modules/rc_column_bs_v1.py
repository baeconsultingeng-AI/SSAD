"""
RC Column Design Module – BS 8110-1:1997

Covered:
  Rectangular braced column (short or slender) under axial load and uniaxial
  or biaxial bending.  Short column criterion: lex/h ≤ 15 and ley/b ≤ 15
  (BS 8110-1 Cl. 3.8.1.3).  Slender columns: additional nominal moment per
  BS 8110-1 Cl. 3.8.3.

  Moment capacity at a given axial load is evaluated analytically using the
  rectangular stress-block approach (symmetric reinforcement assumed).

Units:
  Linear dimensions : mm  (effective lengths in m, converted internally)
  Forces            : kN  (design axial load)
  Moments           : kN·m
  Stresses          : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "rc_column_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

# BS 8110-1:1997 column limits
_RHO_MIN = 0.004   # 0.4 % – BS 8110-1 Table 3.25 (columns)
_RHO_MAX = 0.06    # 6.0 % – BS 8110-1 Cl. 3.12.6.2


# ── Public entry point ────────────────────────────────────────────────────────

def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    geo  = inputs["geometry"]
    mat  = inputs["materials"]
    lds  = inputs["loads"]
    des  = inputs.get("design") or {}

    b       = float(geo["b"])       # mm  (width, dimension in y direction)
    h       = float(geo["h"])       # mm  (depth in direction of bending about x)
    cover   = float(geo["cover"])   # mm  (nominal cover)
    le_x    = float(geo["le_x"])    # m   (effective length about x-axis)
    le_y    = float(geo["le_y"])    # m   (effective length about y-axis)

    fcu  = float(mat["fcu"])        # N/mm²
    fy   = float(mat["fy"])         # N/mm²

    N_Ed = float(lds["N_Ed"])       # kN  (design axial load)
    Mx   = float(lds.get("Mx", 0.0))  # kN·m (applied major-axis moment)
    My   = float(lds.get("My", 0.0))  # kN·m (applied minor-axis moment)

    as_prov = float(des.get("as_prov", 0.0))  # total Asc provided, mm²

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Gross area
    Ag = b * h
    steps.append(_step("Gross section area Ag",
                        f"b×h = {b:.0f}×{h:.0f}", Ag, "mm²",
                        "BS 8110-1 Cl. 3.8.4.3"))

    # Step 2 – Slenderness ratios
    lex_h   = (le_x * 1000.0) / h
    ley_b   = (le_y * 1000.0) / b
    lam_max = max(lex_h, ley_b)
    steps.append(_step("Slenderness lex/h",
                        f"lex/h = {le_x*1000:.0f}/{h:.0f}", lex_h, "–",
                        "BS 8110-1 Cl. 3.8.1.3"))
    steps.append(_step("Slenderness ley/b",
                        f"ley/b = {le_y*1000:.0f}/{b:.0f}", ley_b, "–",
                        "BS 8110-1 Cl. 3.8.1.3"))

    is_short = lex_h <= 15.0 and ley_b <= 15.0
    if not is_short:
        warnings.append(
            f"Slender column (lex/h={lex_h:.1f}, ley/b={ley_b:.1f} > 15). "
            "Nominal additional moment applied per BS 8110-1 Cl. 3.8.3."
        )

    # Step 3 – Minimum eccentricity check (BS 8110-1 Cl. 3.8.2.4)
    e_min_mm  = max(h / 20.0, 20.0)          # mm
    M_emin    = N_Ed * e_min_mm / 1000.0      # kN·m  (N_Ed kN × e mm / 1000)
    Mx_des    = max(abs(Mx), M_emin)
    steps.append(_step("Minimum eccentricity e_min",
                        f"max(h/20, 20) = max({h/20:.1f}, 20)",
                        e_min_mm, "mm", "BS 8110-1 Cl. 3.8.2.4"))
    steps.append(_step("Design moment Mx,des",
                        f"max(|Mx|, N·e_min) = max({abs(Mx):.3f}, {N_Ed:.1f}×{e_min_mm/1000:.4f})",
                        Mx_des, "kN·m", "BS 8110-1 Cl. 3.8.2.4"))

    # Step 4 – Additional moment for slender column (x-axis)
    if not is_short:
        le_x_mm = le_x * 1000.0
        Kx      = 1.0                              # conservative (= 1 unless refined)
        au_x    = le_x_mm**2 / (2000.0 * h)       # BS 8110-1 Cl. 3.8.3.1 (β = 1/2000)
        M_add_x = N_Ed * au_x / 1000.0            # kN·m
        Mx_des  = max(Mx_des, M_add_x)
        steps.append(_step("Additional moment (slender, x-axis)",
                            f"N×lex²/(2000h)/1000 = {N_Ed:.0f}×{le_x_mm:.0f}²/"
                            f"(2000×{h:.0f}×1000)",
                            M_add_x, "kN·m", "BS 8110-1 Cl. 3.8.3.1"))

    # Step 5 – Design Asc required (pure axial, as upper-bound guess)
    # N = 0.4·fcu·(Ag−Asc) + 0.75·fy·Asc  →  Asc = (N−0.4·fcu·Ag) / (0.75·fy−0.4·fcu)
    N_N       = N_Ed * 1.0e3          # kN → N
    denom     = 0.75 * fy - 0.4 * fcu
    Asc_req   = max((N_N - 0.4 * fcu * Ag) / denom, 0.0) if denom > 0 else 0.0
    steps.append(_step("Required steel Asc,req (axial only)",
                        f"(N−0.4fcu·Ag)/(0.75fy−0.4fcu) = "
                        f"({N_N:.0f}−{0.4*fcu*Ag:.0f})/({denom:.1f})",
                        Asc_req, "mm²", "BS 8110-1 Cl. 3.8.4.3"))

    Asc_min   = _RHO_MIN * Ag
    Asc_max   = _RHO_MAX * Ag
    Asc_design = max(Asc_req, Asc_min)
    as_eff    = as_prov if as_prov > 0.0 else Asc_design

    # Step 6 – Axial capacity
    N_cap_N  = 0.4 * fcu * (Ag - as_eff) + 0.75 * fy * as_eff   # N
    N_cap_kN = N_cap_N / 1000.0
    steps.append(_step("Axial capacity N_cap",
                        f"0.4fcu·(Ag−Asc)+0.75fy·Asc = "
                        f"0.4×{fcu:.0f}×{Ag-as_eff:.0f}+0.75×{fy:.0f}×{as_eff:.0f}",
                        N_cap_kN, "kN", "BS 8110-1 Cl. 3.8.4.3"))

    # Step 7 – Moment capacity at N_Ed (rectangular stress-block, symmetric steel)
    # Neutral axis depth from equilibrium: N = 0.4·fcu·b·x + symmetric steel cancels
    # → x = N_N / (0.4·fcu·b),  capped to h
    # Moment about centroid:
    #   Mc = 0.4·fcu·b·x·(h/2 − 0.45x) + 0.87·fy·(Asc/2)·(h − 2·d′)
    # where d′ = cover + link⌀ + bar⌀/2 (distance from face to steel centroid)
    link_dia = 8.0
    bar_dia  = 16.0
    d_prime  = cover + link_dia + bar_dia / 2.0   # mm
    lever_s  = h - 2.0 * d_prime                  # lever arm between steel layers

    x = min(N_N / (0.4 * fcu * b), h)             # neutral axis depth, capped
    x = max(x, 0.0)
    Mc_conc   = 0.4 * fcu * b * x * (h / 2.0 - 0.45 * x)     # N·mm
    Mc_steel  = 0.87 * fy * (as_eff / 2.0) * lever_s           # N·mm  (both layers)
    Mc_Nmm    = Mc_conc + Mc_steel
    M_cap_kNm = max(Mc_Nmm / 1.0e6, 0.0)
    steps.append(_step("Moment capacity Mc at N_Ed",
                        f"0.4fcu·b·x·(h/2−0.45x)+0.87fy·(Asc/2)·(h−2d′) "
                        f"[x={x:.1f} mm, lever_s={lever_s:.1f} mm]",
                        M_cap_kNm, "kN·m", "BS 8110-1 Cl. 3.8.4.4"))

    # Step 8 – Biaxial enhancement (BS 8110-1 Cl. 3.8.4.5)
    # Enhanced design moment if My is present
    Mxy_des = Mx_des
    if abs(My) > 0.0:
        if (Mx_des / h) >= (abs(My) / b):
            # Enhance about major axis
            beta    = 1.0 - (N_N / (Asc_design * fy + 0.4 * fcu * Ag))
            beta    = max(min(beta, 1.0), 0.3)
            Mxy_des = Mx_des + beta * (h / b) * abs(My)
        else:
            beta    = 1.0 - (N_N / (Asc_design * fy + 0.4 * fcu * Ag))
            beta    = max(min(beta, 1.0), 0.3)
            Mxy_des = abs(My) + beta * (b / h) * Mx_des
        steps.append(_step("Enhanced biaxial design moment",
                            f"M′ = Mx+β·(h/b)·My or My+β·(b/h)·Mx [β={beta:.3f}]",
                            Mxy_des, "kN·m", "BS 8110-1 Cl. 3.8.4.5"))

    # Step 9 – Utilisation ratios
    util_axial = N_Ed / N_cap_kN if N_cap_kN > 0 else 999.0
    util_mom   = Mxy_des / M_cap_kNm if M_cap_kNm > 0 else (0.0 if Mxy_des == 0 else 999.0)
    steps.append(_step("Moment utilisation Mx,des/Mc",
                        f"{Mxy_des:.3f}/{M_cap_kNm:.3f}",
                        util_mom, "–", "BS 8110-1 Cl. 3.8.4.4"))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append({
        "id": "slenderness",
        "label": "Slenderness (lex/h and ley/b ≤ 15)",
        "status": "pass" if is_short else "warn",
        "value":  round(lam_max, 2), "limit": 15.0, "unit": "–",
        "note":   "Short column" if is_short else "Slender – additional moment applied",
        "clause": "BS 8110-1 Cl. 3.8.1.3",
    })
    checks.append(_check("axial_capacity", "Axial – N_Ed ≤ N_cap",
                         "pass" if N_Ed <= N_cap_kN else "fail",
                         N_Ed, N_cap_kN, "kN", "BS 8110-1 Cl. 3.8.4.3"))
    checks.append(_check("moment_capacity", "Moment – Mx,des ≤ Mc",
                         "pass" if Mxy_des <= M_cap_kNm else "fail",
                         Mxy_des, M_cap_kNm, "kN·m", "BS 8110-1 Cl. 3.8.4.4"))
    checks.append(_check("min_steel", "Minimum Asc ≥ 0.4 % Ag",
                         "pass" if as_eff >= Asc_min else "fail",
                         as_eff, Asc_min, "mm²", "BS 8110-1 Table 3.25"))
    checks.append(_check("max_steel", "Maximum Asc ≤ 6 % Ag",
                         "pass" if as_eff <= Asc_max else "fail",
                         as_eff, Asc_max, "mm²", "BS 8110-1 Cl. 3.12.6.2"))

    # ── Verdict & summary ─────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    gov_util = max(util_axial, util_mom)

    summary = (
        f"RC column {b:.0f}×{h:.0f} mm, lex={le_x} m. "
        f"N_Ed={N_Ed:.0f} kN ≤ N_cap={N_cap_kN:.0f} kN. "
        f"Asc,req={Asc_design:.0f} mm². "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 8110-1:1997", "element": "RC Column"}},
            {"title": "Section",
             "content": {"b_mm": f"{b:.0f}", "h_mm": f"{h:.0f}",
                         "Ag_mm2": f"{Ag:.0f}", "cover_mm": f"{cover:.0f}"}},
            {"title": "Slenderness",
             "content": {"lex_h": round(lex_h, 2), "ley_b": round(ley_b, 2),
                         "type": "Short" if is_short else "Slender"}},
            {"title": "Axial Design",
             "content": {"N_Ed_kN": N_Ed, "N_cap_kN": round(N_cap_kN, 1),
                         "Asc_req_mm2": round(Asc_req, 0),
                         "Asc_design_mm2": round(Asc_design, 0)}},
            {"title": "Moment Check",
             "content": {"Mx_des_kNm": round(Mxy_des, 3),
                         "Mc_kNm":     round(M_cap_kNm, 3),
                         "utilisation": round(util_mom, 4)}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":    "rc_column",
        "dimensions": {"b_mm": b, "h_mm": h, "cover_mm": cover},
        "reinforcement": {
            "Asc_design_mm2": round(Asc_design, 1),
            "Asc_min_mm2":    round(Asc_min, 1),
            "Asc_max_mm2":    round(Asc_max, 1),
        },
        "slenderness": {
            "lex_h": round(lex_h, 2), "ley_b": round(ley_b, 2),
            "type":  "short" if is_short else "slender",
        },
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"b_mm": b, "h_mm": h, "cover_mm": cover,
                          "le_x_m": le_x, "le_y_m": le_y},
            "materials": {"fcu_Nmm2": fcu, "fy_Nmm2": fy},
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
    geo = inputs.get("geometry") or {}
    mat = inputs.get("materials") or {}
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

    for key, path in [("b", "inputs.geometry.b"), ("h", "inputs.geometry.h"),
                      ("cover", "inputs.geometry.cover"),
                      ("le_x", "inputs.geometry.le_x"), ("le_y", "inputs.geometry.le_y")]:
        require_positive(geo, key, path)
    require_positive(mat, "fcu", "inputs.materials.fcu")
    require_positive(mat, "fy",  "inputs.materials.fy")
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
