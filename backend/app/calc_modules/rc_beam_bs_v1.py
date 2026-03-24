"""
RC Beam Design Module – BS 8110-1:1997

Covered subtypes:
  simply_supported  — M = wl²/8,   V = wl/2
  continuous        — M = 0.086wl² (mid-span), V = 0.6wl/2 (end support)
  cantilever        — M = wl²/2,   V = wl

Units throughout:
  Lengths / dimensions : mm  (span input in m, converted internally)
  Forces               : kN, kN/m
  Moments              : kN·m  (converted to N·mm for formula use)
  Stresses             : N/mm²
"""

from __future__ import annotations

import math
from typing import Any

from app.reporting.handcalcs_report import render_formula_steps

MODULE_ID = "rc_beam_bs_v1"
CODE = "BS"
VERSION = "1.0"

# ── BS 8110-1:1997 constants ──────────────────────────────────────────────────
_K_PRIME = 0.156          # max K for singly-reinforced section (no redistribution)
_GAMMA_M_SHEAR = 1.25     # partial safety factor for vc  (BS 8110 Cl. 2.4.4.1)

_BASIC_L_D: dict[str, float] = {
    "simply_supported": 20.0,
    "continuous":       26.0,
    "cantilever":        7.0,
}

# Minimum tension steel ratio  (BS 8110-1 Table 3.25, rectangular beam in tension)
def _rho_min(fy: float) -> float:
    return 0.0013 if fy >= 460.0 else 0.0024


# ── Public entry point ────────────────────────────────────────────────────────

def run(inputs: dict[str, Any]) -> dict[str, Any]:
    """
    Deterministic RC beam check/design to BS 8110-1:1997.
    Returns the full result envelope defined in API-Contract-V1.md.
    """
    errs = _validate(inputs)
    if errs:
        return _error_envelope(errs)

    # ── Unpack ────────────────────────────────────────────────────────────────
    geo = inputs["geometry"]
    mat = inputs["materials"]
    lds = inputs["loads"]
    des = inputs.get("design") or {}

    span      = float(geo["span"])              # m
    b         = float(geo["b"])                 # mm
    h         = float(geo["h"])                 # mm
    cover     = float(geo["cover"])             # nominal cover, mm
    support   = str(geo.get("support_type", "simply_supported"))

    fcu = float(mat["fcu"])                     # N/mm²
    fy  = float(mat["fy"])                      # N/mm²

    gk  = float(lds["gk"])                      # kN/m
    qk  = float(lds["qk"])                      # kN/m

    # Optional provided steel — used for deflection / vc refinement
    as_prov_bot = float(des.get("as_prov_bottom", 0.0))   # mm²

    steps:    list[dict[str, Any]] = []
    warnings: list[str]            = []
    checks:   list[dict[str, Any]] = []

    # ── Step 1: Effective depth ───────────────────────────────────────────────
    bar_dia  = 16.0    # assumed main bar ⌀ (mm)
    link_dia =  8.0    # assumed link ⌀ (mm)
    d = h - cover - link_dia - bar_dia / 2.0

    steps.append(_step(
        "Effective depth d",
        f"h − cover − link⌀ − bar⌀/2 = {h} − {cover} − {link_dia} − {bar_dia/2:.1f}",
        d, "mm", "BS 8110-1 Cl. 3.3.1",
    ))

    if d <= 0.0:
        return _error_envelope([{
            "field": "inputs.geometry.h / cover",
            "issue": "Section too shallow — effective depth d ≤ 0. Increase h or reduce cover.",
        }])

    # ── Step 2: Ultimate UDL ──────────────────────────────────────────────────
    w = 1.4 * gk + 1.6 * qk    # kN/m
    steps.append(_step(
        "Design UDL w",
        f"1.4×gk + 1.6×qk = 1.4×{gk} + 1.6×{qk}",
        w, "kN/m", "BS 8110-1 Cl. 2.4.3 Table 2.1",
    ))

    # ── Step 3: Design moment and shear ──────────────────────────────────────
    if support == "simply_supported":
        M      = w * span**2 / 8.0
        M_expr = f"wl²/8 = {w:.3f}×{span}²/8"
        V      = w * span / 2.0
        V_expr = f"wl/2 = {w:.3f}×{span}/2"

    elif support == "cantilever":
        M      = w * span**2 / 2.0
        M_expr = f"wl²/2 = {w:.3f}×{span}²/2"
        V      = w * span
        V_expr = f"wl = {w:.3f}×{span}"

    else:   # continuous — mid-span positive moment, BS 8110 Table 3.5
        M      = 0.086 * w * span**2
        M_expr = f"0.086×wl² = 0.086×{w:.3f}×{span}²"
        V      = 0.6 * w * span / 2.0
        V_expr = f"0.6×wl/2 = 0.6×{w:.3f}×{span}/2"
        warnings.append(
            "Continuous beam: mid-span positive moment coefficient 0.086 applied "
            "(BS 8110-1 Table 3.5, simply supported end conditions assumed). "
            "Review hogging moment at supports separately."
        )

    steps.append(_step("Design moment M",         M_expr,  M,  "kN·m", "BS 8110-1 Cl. 3.4.3"))
    steps.append(_step("Design shear force V",    V_expr,  V,  "kN",   "BS 8110-1 Cl. 3.4.5"))

    # ── Step 4: Bending – K factor ──────────────────────────────────────────
    M_Nmm = M * 1.0e6                           # kN·m → N·mm
    K = M_Nmm / (fcu * b * d**2)

    steps.append(_step(
        "K factor",
        f"M/(fcu·b·d²) = {M_Nmm:.0f}/({fcu:.0f}×{b:.0f}×{d:.1f}²)",
        K, "–", "BS 8110-1 Cl. 3.4.4.4",
    ))

    if K > _K_PRIME:
        warnings.append(
            f"K = {K:.4f} exceeds K′ = {_K_PRIME} — section is over-stressed in bending. "
            "Compression steel is required or section depth must be increased."
        )

    # ── Step 5: Lever arm z ──────────────────────────────────────────────────
    k_use   = min(K, _K_PRIME)
    inner   = max(0.25 - k_use / 0.9, 0.0)
    z_ratio = min(0.5 + math.sqrt(inner), 0.95)
    z       = d * z_ratio

    steps.append(_step(
        "Lever arm z",
        f"d·min(0.5 + √(0.25 − K/0.9), 0.95) = {d:.1f}·{z_ratio:.4f}",
        z, "mm", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # ── Step 6: Required tension steel ───────────────────────────────────────
    As_req = M_Nmm / (0.87 * fy * z)

    steps.append(_step(
        "Required tension steel As,req",
        f"M / (0.87·fy·z) = {M_Nmm:.0f} / (0.87×{fy:.0f}×{z:.1f})",
        As_req, "mm²", "BS 8110-1 Cl. 3.4.4.4",
    ))

    # ── Step 7: Minimum steel ─────────────────────────────────────────────────
    As_min = _rho_min(fy) * b * h

    steps.append(_step(
        "Minimum tension steel As,min",
        f"ρ_min·b·h = {_rho_min(fy)*100:.2f}%×{b:.0f}×{h:.0f}",
        As_min, "mm²", "BS 8110-1 Table 3.25",
    ))

    As_design = max(As_req, As_min)

    # Steel used for vc / deflection  (fall back to As_design if no as_prov given)
    as_eff = as_prov_bot if as_prov_bot > 0.0 else As_design

    # ── Step 8: Design shear stress v ────────────────────────────────────────
    V_N   = V * 1.0e3                           # kN → N
    v     = V_N / (b * d)
    v_max = min(0.8 * math.sqrt(fcu), 5.0)     # BS 8110-1 Cl. 3.4.5.2

    steps.append(_step(
        "Design shear stress v",
        f"V / (b·d) = {V_N:.0f} / ({b:.0f}×{d:.1f})",
        v, "N/mm²", "BS 8110-1 Cl. 3.4.5.2",
    ))

    # ── Step 9: Concrete shear resistance vc ─────────────────────────────────
    # BS 8110-1 Table 3.8
    rho_100   = min(100.0 * as_eff / (b * d), 3.0)
    d_factor  = max(400.0 / d, 1.0) ** 0.25
    fcu_cap   = min(fcu, 40.0)                  # BS 8110 clause caps at 40 N/mm²
    fcu_factor = (fcu_cap / 25.0) ** (1.0 / 3.0)
    vc = (0.79 * rho_100 ** (1.0 / 3.0) * d_factor * fcu_factor) / _GAMMA_M_SHEAR

    steps.append(_step(
        "Concrete shear resistance vc",
        (
            f"(0.79/γm)·(100As/bd)^(1/3)·(400/d)^(1/4)·(fcu/25)^(1/3) "
            f"= (0.79/{_GAMMA_M_SHEAR})·{rho_100:.3f}^(1/3)·{d_factor:.3f}·{fcu_factor:.3f}"
        ),
        vc, "N/mm²", "BS 8110-1 Table 3.8",
    ))

    # ── Step 10: Deflection – span/depth ratio ───────────────────────────────
    ld_basic = _BASIC_L_D[support]

    # Service stress in tension steel  (BS 8110-1 Cl. 3.4.6.5)
    fs = (2.0 * fy * As_design) / (3.0 * as_eff)   # N/mm²

    M_bd2      = M_Nmm / (b * d**2)                # N/mm² — used in MF formula
    mf_raw     = 0.55 + (477.0 - fs) / (120.0 * (0.9 + M_bd2))
    mf         = min(max(mf_raw, 0.0), 2.0)
    ld_allow   = ld_basic * mf
    ld_actual  = (span * 1000.0) / d               # l(mm) / d(mm)

    steps.append(_step(
        "Tension steel modification factor MF",
        f"0.55 + (477−fs) / (120·(0.9 + M/bd²)) = 0.55 + (477−{fs:.1f}) / (120·(0.9+{M_bd2:.3f})), capped {mf:.3f}",
        mf, "–", "BS 8110-1 Cl. 3.4.6.5",
    ))
    steps.append(_step(
        "Allowable span/depth ratio",
        f"Basic {ld_basic:.0f} × MF {mf:.3f}",
        ld_allow, "–", "BS 8110-1 Cl. 3.4.6 Table 3.9",
    ))
    steps.append(_step(
        "Actual span/depth ratio",
        f"l/d = {span*1000:.0f} / {d:.1f}",
        ld_actual, "–", "BS 8110-1 Cl. 3.4.6",
    ))

    # ── Assemble design checks ────────────────────────────────────────────────
    checks.append(_check(
        "bending_k",
        "Bending – K ≤ K′ (singly reinforced)",
        "pass" if K <= _K_PRIME else "fail",
        K, _K_PRIME, "–",
        "BS 8110-1 Cl. 3.4.4.4",
    ))

    checks.append(_check(
        "shear_max",
        "Max shear stress v ≤ 0.8√fcu and ≤ 5 N/mm²",
        "pass" if v <= v_max else "fail",
        v, v_max, "N/mm²",
        "BS 8110-1 Cl. 3.4.5.2",
    ))

    if v <= vc:
        shear_link_status, shear_note = "pass", "Nominal links sufficient"
    elif v <= vc + 0.4:
        shear_link_status, shear_note = "warn", "Minimum designed links required (v > vc)"
    else:
        shear_link_status, shear_note = "warn", "Full link design required (v > vc + 0.4)"

    checks.append({
        "id": "shear_vc",
        "label": "Shear — concrete resistance",
        "status": shear_link_status,
        "value": round(v, 3),
        "limit": round(vc, 3),
        "unit": "N/mm²",
        "note": shear_note,
        "clause": "BS 8110-1 Cl. 3.4.5.3 Table 3.8",
    })

    checks.append(_check(
        "deflection",
        "Deflection – actual l/d ≤ allowable l/d",
        "pass" if ld_actual <= ld_allow else "fail",
        ld_actual, ld_allow, "–",
        "BS 8110-1 Cl. 3.4.6 Table 3.9",
    ))

    checks.append(_check(
        "min_steel",
        "Minimum tension reinforcement",
        "pass" if As_design >= As_min else "fail",
        As_design, As_min, "mm²",
        "BS 8110-1 Table 3.25",
    ))

    # ── Governing utilisation & verdict ──────────────────────────────────────
    util_bending  = K / _K_PRIME
    util_defl     = ld_actual / ld_allow if ld_allow > 0.0 else 0.0
    gov_util      = max(util_bending, util_defl, v / v_max)

    statuses = [c["status"] for c in checks]
    if "fail" in statuses:
        verdict = "fail"
    elif "warn" in statuses:
        verdict = "warn"
    else:
        verdict = "pass"

    summary = (
        f"RC beam {b:.0f}×{h:.0f} mm, {span} m {support.replace('_', ' ')}. "
        f"As,req = {As_design:.0f} mm²  (K = {K:.4f}, K′ = {_K_PRIME}). "
        f"l/d = {ld_actual:.1f} vs {ld_allow:.1f} allowable. "
        f"Overall: {verdict.upper()}."
    )

    # ── Report payload ────────────────────────────────────────────────────────
    report_payload: dict[str, Any] = {
        "formula_engine": "handcalcs",
        "formula_steps": render_formula_steps(steps),
        "sections": [
            {
                "title": "Project Details",
                "content": {"code": "BS 8110-1:1997", "element": "RC Beam"},
            },
            {
                "title": "Section Properties",
                "content": {
                    "width_b":           f"{b:.0f} mm",
                    "overall_depth_h":   f"{h:.0f} mm",
                    "effective_depth_d": f"{d:.1f} mm",
                    "span":              f"{span} m",
                    "support_type":      support.replace("_", " ").title(),
                    "cover":             f"{cover:.0f} mm",
                },
            },
            {
                "title": "Materials",
                "content": {
                    "concrete_grade_fcu": f"{fcu:.0f} N/mm²",
                    "steel_grade_fy":     f"{fy:.0f} N/mm²",
                },
            },
            {
                "title": "Loading",
                "content": {
                    "dead_load_gk":       f"{gk:.3f} kN/m",
                    "live_load_qk":       f"{qk:.3f} kN/m",
                    "ultimate_UDL_w":     f"{w:.3f} kN/m",
                    "design_moment_M":    f"{M:.3f} kN·m",
                    "design_shear_V":     f"{V:.3f} kN",
                },
            },
            {
                "title": "Bending Design",
                "content": {
                    "K":                  round(K, 4),
                    "K_prime":            _K_PRIME,
                    "lever_arm_z":        f"{z:.1f} mm",
                    "As_required":        f"{As_req:.0f} mm²",
                    "As_minimum":         f"{As_min:.0f} mm²",
                    "As_design":          f"{As_design:.0f} mm²",
                },
            },
            {
                "title": "Shear Design",
                "content": {
                    "design_shear_stress_v":     f"{v:.3f} N/mm²",
                    "max_shear_stress_v_max":    f"{v_max:.3f} N/mm²",
                    "concrete_shear_resistance_vc": f"{vc:.3f} N/mm²",
                    "links_required":            v > vc,
                    "recommendation":            shear_note,
                },
            },
            {
                "title": "Deflection Check",
                "content": {
                    "basic_span_depth_ratio":    ld_basic,
                    "modification_factor_MF":    round(mf, 3),
                    "allowable_l_d":             round(ld_allow, 2),
                    "actual_l_d":                round(ld_actual, 2),
                    "status":                    "Pass" if ld_actual <= ld_allow else "Fail",
                },
            },
        ]
    }

    # ── Detailing payload ─────────────────────────────────────────────────────
    detailing_payload: dict[str, Any] = {
        "element":    "rc_beam",
        "dimensions": {
            "b_mm":    b,
            "h_mm":    h,
            "d_mm":    round(d, 1),
            "span_m":  span,
        },
        "cover_mm":   cover,
        "reinforcement": {
            "tension_zone":       "bottom" if support != "cantilever" else "top",
            "as_design_mm2":      round(As_design, 1),
            "compression_steel":  K > _K_PRIME,
        },
        "shear": {
            "v_Nmm2":        round(v, 3),
            "vc_Nmm2":       round(vc, 3),
            "links_required": v > vc,
            "link_note":      shear_note,
        },
    }

    return {
        "status": "ok",
        "normalizedInputs": {
            "geometry":  {"span_m": span, "b_mm": b, "h_mm": h, "cover_mm": cover, "support_type": support},
            "materials": {"fcu_Nmm2": fcu, "fy_Nmm2": fy},
            "loads":     {"gk_kNm": gk, "qk_kNm": qk, "ultimate_w_kNm": round(w, 3)},
        },
        "results": {
            "verdict":     verdict,
            "utilization": round(gov_util, 4),
            "summary":     summary,
        },
        "checks":           checks,
        "steps":            steps,
        "warnings":         warnings,
        "reportPayload":    report_payload,
        "detailingPayload": detailing_payload,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _step(
    label: str, expression: str, value: float, unit: str, clause: str
) -> dict[str, Any]:
    return {
        "label":      label,
        "expression": expression,
        "value":      round(value, 4),
        "unit":       unit,
        "clause":     clause,
    }


def _check(
    cid: str, label: str, status: str,
    value: float, limit: float, unit: str, clause: str,
) -> dict[str, Any]:
    return {
        "id":     cid,
        "label":  label,
        "status": status,
        "value":  round(value, 4),
        "limit":  round(limit, 4),
        "unit":   unit,
        "clause": clause,
    }


# ── Validation ────────────────────────────────────────────────────────────────

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

    require_positive(geo, "span",  "inputs.geometry.span")
    require_positive(geo, "b",     "inputs.geometry.b")
    require_positive(geo, "h",     "inputs.geometry.h")
    require_positive(geo, "cover", "inputs.geometry.cover")
    require_positive(mat, "fcu",   "inputs.materials.fcu")
    require_positive(mat, "fy",    "inputs.materials.fy")
    require_non_negative(lds, "gk", "inputs.loads.gk")
    require_non_negative(lds, "qk", "inputs.loads.qk")

    # Ensure at least some load exists
    if not errors:
        if float(lds.get("gk", 0)) + float(lds.get("qk", 0)) <= 0.0:
            errors.append({
                "field": "inputs.loads",
                "issue": "At least one of gk or qk must be greater than zero",
            })

    support = geo.get("support_type", "simply_supported")
    if support not in ("simply_supported", "continuous", "cantilever"):
        errors.append({
            "field": "inputs.geometry.support_type",
            "issue": "Must be one of: simply_supported, continuous, cantilever",
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
