"""
RC Slab Design Module – BS 8110-1:1997

Covered subtypes  (geometry.slab_type):
  one_way   — Slab spanning in one direction; 1 m design strip; UDL in kN/m²
  two_way   — Two-way slab spanning in orthogonal directions, simply supported
              on four edges (BS 8110-1 Table 3.14 coefficients)
  cantilever — Cantilever slab; 1 m design strip; UDL in kN/m²

Units throughout:
  Linear dimensions : mm  (spans input in m, converted internally)
  Forces            : kN, kN/m²
  Moments           : kN·m/m  (per metre width, converted to N·mm for formula use)
  Stresses          : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "rc_slab_bs_v1"
CODE      = "BS"
VERSION   = "1.0"

# ── BS 8110-1:1997 constants ──────────────────────────────────────────────────
_K_PRIME       = 0.156   # max K for singly‑reinforced section
_GAMMA_M_SHEAR = 1.25    # partial factor for vc  (Cl. 2.4.4.1)

# Basic span/depth ratios – BS 8110-1 Table 3.9
_BASIC_L_D: dict[str, float] = {
    "simply_supported": 20.0,
    "continuous":       26.0,
    "cantilever":        7.0,
}

# Table 3.14 – two-way simply-supported slabs (αsx, αsy)
_TWOWAY_TABLE = [
    (1.00, 0.062, 0.062),
    (1.10, 0.074, 0.061),
    (1.20, 0.084, 0.059),
    (1.30, 0.093, 0.055),
    (1.40, 0.099, 0.051),
    (1.50, 0.104, 0.046),
    (1.75, 0.113, 0.037),
    (2.00, 0.118, 0.029),
]


def _interp_twoway(ratio: float) -> tuple[float, float]:
    """Linear interpolation of αsx, αsy from BS 8110-1 Table 3.14."""
    if ratio <= _TWOWAY_TABLE[0][0]:
        return _TWOWAY_TABLE[0][1], _TWOWAY_TABLE[0][2]
    if ratio >= _TWOWAY_TABLE[-1][0]:
        return _TWOWAY_TABLE[-1][1], _TWOWAY_TABLE[-1][2]
    for i in range(len(_TWOWAY_TABLE) - 1):
        r0, ax0, ay0 = _TWOWAY_TABLE[i]
        r1, ax1, ay1 = _TWOWAY_TABLE[i + 1]
        if r0 <= ratio <= r1:
            t = (ratio - r0) / (r1 - r0)
            return ax0 + t * (ax1 - ax0), ay0 + t * (ay1 - ay0)
    return _TWOWAY_TABLE[-1][1], _TWOWAY_TABLE[-1][2]


def _rho_min(fy: float) -> float:
    return 0.0013 if fy >= 460.0 else 0.0024


# ── Public entry point ────────────────────────────────────────────────────────

def run(inputs: dict[str, Any]) -> dict[str, Any]:
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    geo       = inputs["geometry"]
    mat       = inputs["materials"]
    lds       = inputs["loads"]
    des       = inputs.get("design") or {}
    slab_type = str(geo.get("slab_type", "one_way"))

    fcu    = float(mat["fcu"])
    fy     = float(mat["fy"])
    h      = float(geo["h"])
    cover  = float(geo["cover"])

    if slab_type == "two_way":
        return _run_two_way(geo, mat, lds, des, fcu, fy, h, cover)

    support = "cantilever" if slab_type == "cantilever" else str(
        geo.get("support_type", "simply_supported")
    )
    return _run_one_way(geo, mat, lds, des, fcu, fy, h, cover, support)


# ── One-way / cantilever ──────────────────────────────────────────────────────

def _run_one_way(
    geo: dict, mat: dict, lds: dict, des: dict,
    fcu: float, fy: float, h: float, cover: float, support: str,
) -> dict[str, Any]:
    span    = float(geo["span"])          # m
    gk      = float(lds["gk"])            # kN/m²
    qk      = float(lds["qk"])            # kN/m²
    as_prov = float(des.get("as_prov", 0.0))

    b = 1000.0                            # 1 m design strip (mm)
    slab_type = "cantilever" if support == "cantilever" else "one_way"

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Effective depth
    bar_dia = 12.0
    d = h - cover - bar_dia / 2.0
    steps.append(_step(
        "Effective depth d",
        f"h − cover − bar⌀/2 = {h} − {cover} − {bar_dia/2:.1f}",
        d, "mm", "BS 8110-1 Cl. 3.3.1",
    ))
    if d <= 0.0:
        return _error_envelope([{
            "field": "inputs.geometry.h / cover",
            "issue": "Section too shallow — effective depth d ≤ 0. Increase h or reduce cover.",
        }])

    # Step 2 – Design UDL
    w = 1.4 * gk + 1.6 * qk
    steps.append(_step(
        "Design UDL w",
        f"1.4×gk + 1.6×qk = 1.4×{gk} + 1.6×{qk}",
        w, "kN/m²", "BS 8110-1 Cl. 2.4.3 Table 2.1",
    ))

    # Step 3 – Design moment and shear
    if support == "cantilever":
        M      = w * span**2 / 2.0
        M_expr = f"wl²/2 = {w:.3f}×{span}²/2"
        V      = w * span
        V_expr = f"wl = {w:.3f}×{span}"
    elif support == "continuous":
        M      = 0.086 * w * span**2
        M_expr = f"0.086wl² = 0.086×{w:.3f}×{span}²"
        V      = 0.6 * w * span / 2.0
        V_expr = f"0.6wl/2 = 0.6×{w:.3f}×{span}/2"
        warnings.append(
            "Continuous slab: mid-span coefficient 0.086 used "
            "(BS 8110-1 Table 3.5). Review hogging steel at supports."
        )
    else:   # simply_supported
        M      = w * span**2 / 8.0
        M_expr = f"wl²/8 = {w:.3f}×{span}²/8"
        V      = w * span / 2.0
        V_expr = f"wl/2 = {w:.3f}×{span}/2"

    steps.append(_step("Design moment M (per m)", M_expr, M, "kN·m/m", "BS 8110-1 Cl. 3.5.2"))
    steps.append(_step("Design shear V (per m)",  V_expr, V, "kN/m",   "BS 8110-1 Cl. 3.5.5"))

    # Step 4 – K factor
    M_Nmm = M * 1.0e6
    K = M_Nmm / (fcu * b * d**2)
    steps.append(_step(
        "K factor",
        f"M/(fcu·b·d²) = {M_Nmm:.0f}/({fcu:.0f}×{b:.0f}×{d:.1f}²)",
        K, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    if K > _K_PRIME:
        warnings.append(
            f"K = {K:.4f} > K′ = {_K_PRIME} — slab over-stressed in bending; "
            "increase thickness h."
        )

    # Step 5 – Lever arm z
    k_use   = min(K, _K_PRIME)
    inner   = max(0.25 - k_use / 0.9, 0.0)
    z_ratio = min(0.5 + math.sqrt(inner), 0.95)
    z       = d * z_ratio
    steps.append(_step(
        "Lever arm z",
        f"d·min(0.5+√(0.25−K/0.9), 0.95) = {d:.1f}·{z_ratio:.4f}",
        z, "mm", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # Step 6 – Required tension steel
    As_req = M_Nmm / (0.87 * fy * z)
    steps.append(_step(
        "Required steel As,req",
        f"M/(0.87·fy·z) = {M_Nmm:.0f}/(0.87×{fy:.0f}×{z:.1f})",
        As_req, "mm²/m", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # Step 7 – Minimum steel
    As_min    = _rho_min(fy) * b * h
    As_design = max(As_req, As_min)
    as_eff    = as_prov if as_prov > 0.0 else As_design
    steps.append(_step(
        "Minimum steel As,min",
        f"ρ_min·b·h = {_rho_min(fy)*100:.2f}%×{b:.0f}×{h:.0f}",
        As_min, "mm²/m", "BS 8110-1 Table 3.25",
    ))

    # Step 8 – Design shear stress
    V_N   = V * 1.0e3
    v     = V_N / (b * d)
    v_max = min(0.8 * math.sqrt(fcu), 5.0)
    steps.append(_step(
        "Design shear stress v",
        f"V/(b·d) = {V_N:.0f}/({b:.0f}×{d:.1f})",
        v, "N/mm²", "BS 8110-1 Cl. 3.5.5.2",
    ))

    # Step 9 – Concrete shear resistance vc
    rho_100    = min(100.0 * as_eff / (b * d), 3.0)
    d_factor   = max(400.0 / d, 1.0) ** 0.25
    fcu_factor = (min(fcu, 40.0) / 25.0) ** (1.0 / 3.0)
    vc = (0.79 * rho_100 ** (1.0 / 3.0) * d_factor * fcu_factor) / _GAMMA_M_SHEAR
    steps.append(_step(
        "Concrete shear resistance vc",
        (
            f"(0.79/γm)·(100As/bd)^(1/3)·(400/d)^(1/4)·(fcu/25)^(1/3) "
            f"= (0.79/1.25)·{rho_100:.3f}^(1/3)·{d_factor:.3f}·{fcu_factor:.3f}"
        ),
        vc, "N/mm²", "BS 8110-1 Table 3.8",
    ))

    # Step 10 – Deflection (span/depth ratio)
    ld_basic  = _BASIC_L_D[support]
    fs        = (2.0 * fy * As_design) / (3.0 * as_eff)
    M_bd2     = M_Nmm / (b * d**2)
    mf        = min(max(0.55 + (477.0 - fs) / (120.0 * (0.9 + M_bd2)), 0.0), 2.0)
    ld_allow  = ld_basic * mf
    ld_actual = (span * 1000.0) / d
    steps.append(_step(
        "Modification factor MF",
        f"0.55+(477−{fs:.1f})/(120·(0.9+{M_bd2:.3f})), capped → {mf:.3f}",
        mf, "–", "BS 8110-1 Cl. 3.4.6.5",
    ))
    steps.append(_step(
        "Allowable l/d",
        f"Basic {ld_basic:.0f} × MF {mf:.3f}",
        ld_allow, "–", "BS 8110-1 Table 3.9",
    ))
    steps.append(_step(
        "Actual l/d",
        f"l/d = {span*1000:.0f}/{d:.1f}",
        ld_actual, "–", "BS 8110-1 Cl. 3.4.6",
    ))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append(_check(
        "bending_k", "Bending – K ≤ K′ (singly reinforced)",
        "pass" if K <= _K_PRIME else "fail", K, _K_PRIME, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    checks.append(_check(
        "shear_max", "Max shear stress v ≤ 0.8√fcu and ≤ 5 N/mm²",
        "pass" if v <= v_max else "fail", v, v_max, "N/mm²", "BS 8110-1 Cl. 3.5.5.2",
    ))
    if v <= vc:
        shear_st, shear_note = "pass", "No shear reinforcement required"
    else:
        shear_st, shear_note = "warn", "Shear reinforcement required (v > vc)"
        warnings.append(shear_note)
    checks.append({
        "id": "shear_vc", "label": "Shear – concrete resistance",
        "status": shear_st, "value": round(v, 3), "limit": round(vc, 3),
        "unit": "N/mm²", "note": shear_note, "clause": "BS 8110-1 Table 3.8",
    })
    checks.append(_check(
        "deflection", "Deflection – actual l/d ≤ allowable l/d",
        "pass" if ld_actual <= ld_allow else "fail", ld_actual, ld_allow, "–",
        "BS 8110-1 Table 3.9",
    ))
    checks.append(_check(
        "min_steel", "Minimum reinforcement",
        "pass" if As_design >= As_min else "fail", As_design, As_min, "mm²/m",
        "BS 8110-1 Table 3.25",
    ))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    util     = max(K / _K_PRIME, ld_actual / ld_allow if ld_allow > 0 else 0.0, v / v_max)

    summary = (
        f"RC slab h={h:.0f} mm, {span} m {support.replace('_', ' ')}. "
        f"As,req = {As_design:.0f} mm²/m. "
        f"l/d = {ld_actual:.1f} vs {ld_allow:.1f} allowable. "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 8110-1:1997", "element": f"RC Slab ({slab_type.replace('_', '-')})"}},
            {"title": "Slab Properties",
             "content": {"thickness_h": f"{h:.0f} mm", "span": f"{span} m",
                         "support_type": support.replace("_", " ").title(),
                         "cover": f"{cover:.0f} mm"}},
            {"title": "Materials",
             "content": {"fcu": f"{fcu:.0f} N/mm²", "fy": f"{fy:.0f} N/mm²"}},
            {"title": "Loading (per m width)",
             "content": {"gk": f"{gk:.3f} kN/m²", "qk": f"{qk:.3f} kN/m²",
                         "w_ult": f"{w:.3f} kN/m²", "M": f"{M:.3f} kN·m/m",
                         "V": f"{V:.3f} kN/m"}},
            {"title": "Bending Design",
             "content": {"K": round(K, 4), "z_mm": f"{z:.1f}",
                         "As_req_mm2_per_m": f"{As_req:.0f}",
                         "As_design_mm2_per_m": f"{As_design:.0f}"}},
            {"title": "Deflection Check",
             "content": {"l_d_allowable": round(ld_allow, 2),
                         "l_d_actual":    round(ld_actual, 2),
                         "status": "Pass" if ld_actual <= ld_allow else "Fail"}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":   f"rc_slab_{slab_type}",
        "dimensions": {"h_mm": h, "span_m": span, "support_type": support},
        "cover_mm":  cover,
        "reinforcement": {
            "main_As_mm2_per_m":         round(As_design, 1),
            "distribution_min_mm2_per_m": round(0.20 * As_design, 1),
        },
        "shear": {"v_Nmm2": round(v, 3), "vc_Nmm2": round(vc, 3)},
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"span_m": span, "h_mm": h, "cover_mm": cover,
                          "slab_type": slab_type, "support_type": support},
            "materials": {"fcu_Nmm2": fcu, "fy_Nmm2": fy},
            "loads":     {"gk_kNm2": gk, "qk_kNm2": qk, "ultimate_w_kNm2": round(w, 3)},
        },
        "results":          {"verdict": verdict, "utilization": round(util, 4), "summary": summary},
        "checks":           checks,
        "steps":            steps,
        "warnings":         warnings,
        "reportPayload":    report_payload,
        "detailingPayload": detailing_payload,
    }


# ── Two-way slab ──────────────────────────────────────────────────────────────

def _run_two_way(
    geo: dict, mat: dict, lds: dict, des: dict,
    fcu: float, fy: float, h: float, cover: float,
) -> dict[str, Any]:
    lx = float(geo["lx"])
    ly = float(geo.get("ly", lx * 1.5))
    gk = float(lds["gk"])
    qk = float(lds["qk"])
    b  = 1000.0   # 1 m strip

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # Step 1 – Effective depths (two layers of steel)
    bar_dia = 12.0
    dx = h - cover - bar_dia / 2.0            # short-span (main) direction
    dy = h - cover - bar_dia - bar_dia / 2.0  # long-span  (secondary) direction
    if dx <= 0.0 or dy <= 0.0:
        return _error_envelope([{
            "field": "inputs.geometry.h / cover",
            "issue": "Effective depth ≤ 0 — increase h or reduce cover.",
        }])
    steps.append(_step(
        "Effective depth dx (short span)",
        f"h − cover − bar⌀/2 = {h} − {cover} − {bar_dia/2:.1f}",
        dx, "mm", "BS 8110-1 Cl. 3.3.1",
    ))
    steps.append(_step(
        "Effective depth dy (long span)",
        f"h − cover − bar⌀ − bar⌀/2 = {h} − {cover} − {bar_dia} − {bar_dia/2:.1f}",
        dy, "mm", "BS 8110-1 Cl. 3.3.1",
    ))

    # Step 2 – ULS load
    w = 1.4 * gk + 1.6 * qk
    steps.append(_step(
        "Design UDL w",
        f"1.4×{gk} + 1.6×{qk}",
        w, "kN/m²", "BS 8110-1 Cl. 2.4.3 Table 2.1",
    ))

    # Step 3 – Span ratio and Table 3.14 coefficients
    ratio = ly / lx
    if ratio > 2.0:
        warnings.append(
            f"ly/lx = {ratio:.2f} > 2.0 — slab acts predominantly as one-way; "
            "redesign as one-way slab. Two-way coefficients for ratio=2.0 used."
        )
        ratio = 2.0
    asx, asy = _interp_twoway(ratio)
    steps.append(_step(
        "Span ratio ly/lx",
        f"ly/lx = {ly}/{lx}",
        ratio, "–", "BS 8110-1 Table 3.14",
    ))
    steps.append(_step(
        "Short-span moment coefficient αsx",
        f"Interpolated from Table 3.14 at ly/lx = {ratio:.3f}",
        asx, "–", "BS 8110-1 Table 3.14",
    ))
    steps.append(_step(
        "Long-span moment coefficient αsy",
        f"Interpolated from Table 3.14 at ly/lx = {ratio:.3f}",
        asy, "–", "BS 8110-1 Table 3.14",
    ))

    # Step 4 – Design moments (per unit width)
    Msx = asx * w * lx**2
    Msy = asy * w * lx**2
    steps.append(_step(
        "Short-span moment Msx",
        f"αsx×w×lx² = {asx:.4f}×{w:.3f}×{lx}²",
        Msx, "kN·m/m", "BS 8110-1 Table 3.14",
    ))
    steps.append(_step(
        "Long-span moment Msy",
        f"αsy×w×lx² = {asy:.4f}×{w:.3f}×{lx}²",
        Msy, "kN·m/m", "BS 8110-1 Table 3.14",
    ))

    # Step 5 – Short-span K, z, As
    Msx_Nmm = Msx * 1.0e6
    Kx = Msx_Nmm / (fcu * b * dx**2)
    steps.append(_step(
        "K factor (short span)",
        f"Msx/(fcu·b·dx²) = {Msx_Nmm:.0f}/({fcu:.0f}×{b:.0f}×{dx:.1f}²)",
        Kx, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    if Kx > _K_PRIME:
        warnings.append(f"Kx = {Kx:.4f} > K′ = {_K_PRIME} — increase slab thickness.")
    zx_ratio = min(0.5 + math.sqrt(max(0.25 - min(Kx, _K_PRIME) / 0.9, 0.0)), 0.95)
    zx       = dx * zx_ratio
    Asx_req  = Msx_Nmm / (0.87 * fy * zx)
    steps.append(_step(
        "Required Asx,req (short span)",
        f"Msx/(0.87·fy·zx) = {Msx_Nmm:.0f}/(0.87×{fy:.0f}×{zx:.1f})",
        Asx_req, "mm²/m", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # Step 6 – Long-span K, z, As
    Msy_Nmm = Msy * 1.0e6
    Ky = Msy_Nmm / (fcu * b * dy**2)
    steps.append(_step(
        "K factor (long span)",
        f"Msy/(fcu·b·dy²) = {Msy_Nmm:.0f}/({fcu:.0f}×{b:.0f}×{dy:.1f}²)",
        Ky, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    zy_ratio = min(0.5 + math.sqrt(max(0.25 - min(Ky, _K_PRIME) / 0.9, 0.0)), 0.95)
    zy       = dy * zy_ratio
    Asy_req  = Msy_Nmm / (0.87 * fy * zy)
    steps.append(_step(
        "Required Asy,req (long span)",
        f"Msy/(0.87·fy·zy) = {Msy_Nmm:.0f}/(0.87×{fy:.0f}×{zy:.1f})",
        Asy_req, "mm²/m", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # Minimum steel
    As_min    = _rho_min(fy) * b * h
    Asx_design = max(Asx_req, As_min)
    Asy_design = max(Asy_req, As_min)

    # Step 7 – Deflection (short span governs)
    fs_x    = (2.0 * fy * Asx_design) / (3.0 * Asx_design)  # as_eff = As_design
    M_bd2_x = Msx_Nmm / (b * dx**2)
    mf      = min(max(0.55 + (477.0 - fs_x) / (120.0 * (0.9 + M_bd2_x)), 0.0), 2.0)
    ld_allow  = 20.0 * mf   # simply-supported short span
    ld_actual = (lx * 1000.0) / dx
    steps.append(_step(
        "Modification factor MF (short span)",
        f"0.55+(477−{fs_x:.1f})/(120·(0.9+{M_bd2_x:.3f})), capped → {mf:.3f}",
        mf, "–", "BS 8110-1 Cl. 3.4.6.5",
    ))
    steps.append(_step(
        "Allowable l/d (short span)",
        f"20×MF = 20×{mf:.3f}",
        ld_allow, "–", "BS 8110-1 Table 3.9",
    ))
    steps.append(_step(
        "Actual l/d (short span)",
        f"lx/dx = {lx*1000:.0f}/{dx:.1f}",
        ld_actual, "–", "BS 8110-1 Cl. 3.4.6",
    ))

    # ── Checks ───────────────────────────────────────────────────────────────
    checks.append(_check(
        "bending_k_short", "Bending K ≤ K′ (short span)",
        "pass" if Kx <= _K_PRIME else "fail", Kx, _K_PRIME, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    checks.append(_check(
        "bending_k_long", "Bending K ≤ K′ (long span)",
        "pass" if Ky <= _K_PRIME else "fail", Ky, _K_PRIME, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))
    checks.append(_check(
        "deflection", "Deflection – lx/dx ≤ allowable l/d",
        "pass" if ld_actual <= ld_allow else "fail", ld_actual, ld_allow, "–", "BS 8110-1 Table 3.9",
    ))
    checks.append(_check(
        "min_steel_x", "Minimum reinforcement (short span)",
        "pass" if Asx_design >= As_min else "fail", Asx_design, As_min, "mm²/m",
        "BS 8110-1 Table 3.25",
    ))
    checks.append(_check(
        "min_steel_y", "Minimum reinforcement (long span)",
        "pass" if Asy_design >= As_min else "fail", Asy_design, As_min, "mm²/m",
        "BS 8110-1 Table 3.25",
    ))

    # ── Verdict ───────────────────────────────────────────────────────────────
    statuses = [c["status"] for c in checks]
    verdict  = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    util     = max(Kx / _K_PRIME, Ky / _K_PRIME, ld_actual / ld_allow if ld_allow > 0 else 0.0)

    summary = (
        f"Two-way RC slab h={h:.0f} mm, lx={lx} m × ly={ly} m. "
        f"Asx={Asx_design:.0f} mm²/m, Asy={Asy_design:.0f} mm²/m. "
        f"l/d = {ld_actual:.1f} vs {ld_allow:.1f} allowable. "
        f"Overall: {verdict.upper()}."
    )

    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps":  render_formula_steps(steps),
        "sections": [
            {"title": "Project Details",
             "content": {"code": "BS 8110-1:1997", "element": "RC Slab (two-way)"}},
            {"title": "Slab Properties",
             "content": {"thickness_h": f"{h:.0f} mm", "short_span_lx": f"{lx} m",
                         "long_span_ly": f"{ly} m", "cover": f"{cover:.0f} mm",
                         "span_ratio_ly_lx": round(ratio, 3)}},
            {"title": "Table 3.14 Coefficients",
             "content": {"αsx": round(asx, 4), "αsy": round(asy, 4)}},
            {"title": "Bending (short span)",
             "content": {"Msx": f"{Msx:.3f} kN·m/m", "Kx": round(Kx, 4),
                         "Asx_design": f"{Asx_design:.0f} mm²/m"}},
            {"title": "Bending (long span)",
             "content": {"Msy": f"{Msy:.3f} kN·m/m", "Ky": round(Ky, 4),
                         "Asy_design": f"{Asy_design:.0f} mm²/m"}},
            {"title": "Deflection Check",
             "content": {"l_d_allowable": round(ld_allow, 2),
                         "l_d_actual":    round(ld_actual, 2),
                         "status": "Pass" if ld_actual <= ld_allow else "Fail"}},
        ],
    }
    detailing_payload: dict[str, Any] = {
        "element":   "rc_slab_two_way",
        "dimensions": {"h_mm": h, "lx_m": lx, "ly_m": ly},
        "cover_mm":  cover,
        "reinforcement": {
            "short_span_Asx_mm2_per_m": round(Asx_design, 1),
            "long_span_Asy_mm2_per_m":  round(Asy_design, 1),
        },
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"lx_m": lx, "ly_m": ly, "h_mm": h,
                          "cover_mm": cover, "slab_type": "two_way"},
            "materials": {"fcu_Nmm2": fcu, "fy_Nmm2": fy},
            "loads":     {"gk_kNm2": gk, "qk_kNm2": qk, "ultimate_w_kNm2": round(w, 3)},
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
    lds = inputs.get("loads") or {}

    def require_positive(container: dict, key: str, path: str) -> None:
        val = container.get(key)
        if val is None:
            errors.append({"field": path, "issue": "required field missing"})
        else:
            try:
                if float(val) <= 0.0:
                    errors.append({"field": path, "issue": "must be greater than zero"})
            except (TypeError, ValueError):
                errors.append({"field": path, "issue": "must be a number"})

    def require_non_negative(container: dict, key: str, path: str) -> None:
        val = container.get(key)
        if val is None:
            errors.append({"field": path, "issue": "required field missing"})
        else:
            try:
                if float(val) < 0.0:
                    errors.append({"field": path, "issue": "must be ≥ 0"})
            except (TypeError, ValueError):
                errors.append({"field": path, "issue": "must be a number"})

    slab_type = geo.get("slab_type", "one_way")
    if slab_type not in ("one_way", "two_way", "cantilever"):
        errors.append({
            "field": "inputs.geometry.slab_type",
            "issue": "Must be one of: one_way, two_way, cantilever",
        })

    require_positive(geo, "h",     "inputs.geometry.h")
    require_positive(geo, "cover", "inputs.geometry.cover")
    require_positive(mat, "fcu",   "inputs.materials.fcu")
    require_positive(mat, "fy",    "inputs.materials.fy")
    require_non_negative(lds, "gk", "inputs.loads.gk")
    require_non_negative(lds, "qk", "inputs.loads.qk")

    if slab_type == "two_way":
        require_positive(geo, "lx", "inputs.geometry.lx")
    else:
        require_positive(geo, "span", "inputs.geometry.span")

    if not errors:
        if float(lds.get("gk", 0)) + float(lds.get("qk", 0)) <= 0.0:
            errors.append({
                "field": "inputs.loads",
                "issue": "At least one of gk or qk must be greater than zero",
            })

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
