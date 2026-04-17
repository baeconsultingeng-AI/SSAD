"""
AI parameter extraction.
Primary: DeepSeek  |  Fallback: Anthropic Claude
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

import anthropic

_SYSTEM_PROMPT = """You are a structural engineering AI assistant for SSAD (Smart Structural Analysis & Design), developed by BAE Consulting Engineers.

Your task is to extract structural design parameters from a natural-language description and return them as a strict JSON object.

ELEMENT TYPES you can handle:
- rc_beam_bs_v1: Reinforced concrete beam (BS 8110)
- rc_slab_bs_v1: Reinforced concrete slab (BS 8110)
- rc_column_bs_v1: Reinforced concrete column (BS 8110)
- rc_foundation_bs_v1: Pad foundation (BS 8110)
- steel_beam_bs_v1: Steel beam (BS 5950)
- steel_column_bs_v1: Steel column (BS 5950)
- steel_truss_bs_v1: Steel truss member (BS 5950)

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no explanation:
{
  "module": "<module_id>",
  "extracted": {
    "geometry": {},
    "materials": {},
    "loads": {},
    "design": {}
  },
  "summary": "<one sentence describing the element and key parameters>",
  "confidence": "high" | "medium" | "low",
  "missing": ["<field1>", "<field2>"],
  "param_confidence": {
    "<field_name>": <integer 0-100>,
    ...
  }
}

For param_confidence, assign an integer score (0–100) to every field that appears in "extracted":
- 90–100: explicitly stated in the user input with clear numeric value or unambiguous keyword
- 70–89: strongly implied by context or typical engineering practice
- 50–69: assumed / defaulted — not mentioned but a standard default applies
- 20–49: inferred with some uncertainty — reasonable guess from incomplete information
- 0–19: not mentioned and cannot be reliably inferred; should also appear in "missing"

CRITICAL: Use EXACTLY the field names below — no unit suffixes, no alternative spellings.

=== rc_beam_bs_v1 ===
geometry: span (metres), b (mm), h (mm), cover (mm, default 25), support_type ("simply_supported"|"continuous"|"cantilever", default "simply_supported")
materials: fcu (N/mm²), fy (N/mm², default 460)
loads: gk (kN/m), qk (kN/m)

=== rc_slab_bs_v1 ===
geometry: span (metres), h (mm), cover (mm, default 20), slab_type ("one_way"|"two_way"), support_type ("simply_supported"|"one_end_cont"|"both_ends_cont")
materials: fcu (N/mm²), fy (N/mm², default 460)
loads: gk (kPa), qk (kPa)

=== rc_column_bs_v1 ===
geometry: b (mm), h (mm), cover (mm, default 40), le_x (mm, effective length about x), le_y (mm, effective length about y — use same as le_x if not stated)
materials: fcu (N/mm²), fy (N/mm², default 460)
loads: N_Ed (kN), Mx (kN·m, default 0), My (kN·m, default 0)

=== rc_foundation_bs_v1 ===
geometry: L (m, pad length), B (m, pad breadth), h (mm, pad depth, default 400), cover (mm, default 50), col_b (mm, column width), col_h (mm, column depth)
materials: fcu (N/mm², default 25), fy (N/mm², default 460)
loads: N_sls (kN, serviceability axial), N_uls (kN, ultimate axial), M_sls (kN·m, default 0), qa (kPa, allowable bearing)

=== steel_beam_bs_v1 ===
geometry: span (metres), support_type ("simply_supported"|"cantilever"|"fixed_fixed"), lateral_restraint ("full"|"intermediate"|"none", default "full")
materials: py (N/mm², typically 275 or 355)
loads: gk (kN/m), qk (kN/m)

=== steel_column_bs_v1 ===
geometry: le_y (m, effective length about y), le_z (m, effective length about z — use same as le_y if not stated)
materials: py (N/mm², typically 275 or 355)
loads: N_Ed (kN), Mx (kN·m, default 0), My (kN·m, default 0)

=== steel_truss_bs_v1 ===
geometry: le (m, member length)
materials: py (N/mm², typically 275 or 355)
loads: F_Ed (kN, positive=tension, negative=compression)

Use your structural engineering knowledge to infer reasonable defaults where parameters are not explicitly stated.
If a key parameter cannot be inferred, add it to the "missing" array.
"""


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences if the model wraps output in ```json ... ```."""
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _call_claude(description: str, model_env: str = "AI_FALLBACK_1_MODEL") -> dict[str, Any]:
    """Call Anthropic Claude."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")

    model = os.getenv(model_env, "claude-sonnet-4-20250514").strip()
    if not model:
        model = "claude-sonnet-4-20250514"

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": description}],
    )
    return json.loads(_strip_fences(message.content[0].text))


def _call_deepseek(description: str, model_env: str = "AI_PRIMARY_MODEL") -> dict[str, Any]:
    """Call DeepSeek via its OpenAI-compatible API."""
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not set")

    from openai import OpenAI

    model = os.getenv(model_env, "deepseek-chat").strip()
    if not model or model.lower().startswith("deepseek-v"):
        model = "deepseek-chat"

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    response = client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": description},
        ],
    )
    return json.loads(_strip_fences(response.choices[0].message.content))


def extract_params(description: str) -> dict[str, Any]:
    """Extract structural parameters from description.
    Provider order is controlled by AI_PRIMARY_PROVIDER env var.
    Raises RuntimeError if both providers fail.
    """
    primary = os.getenv("AI_PRIMARY_PROVIDER", "anthropic").strip().lower()

    if primary == "deepseek":
        first_name, fallback_name = "DeepSeek", "Claude"
        def _first() -> dict[str, Any]:
            return _call_deepseek(description, model_env="AI_PRIMARY_MODEL")
        def _fallback() -> dict[str, Any]:
            return _call_claude(description, model_env="AI_FALLBACK_1_MODEL")
    else:
        first_name, fallback_name = "Claude", "DeepSeek"
        def _first() -> dict[str, Any]:
            return _call_claude(description, model_env="AI_PRIMARY_MODEL")
        def _fallback() -> dict[str, Any]:
            return _call_deepseek(description, model_env="AI_FALLBACK_1_MODEL")

    def _primary_model() -> str:
        default = "deepseek-chat" if primary == "deepseek" else "claude-sonnet-4-20250514"
        return os.getenv("AI_PRIMARY_MODEL", default).strip() or default

    def _fallback_model() -> str:
        default = "claude-sonnet-4-20250514" if primary == "deepseek" else "deepseek-chat"
        return os.getenv("AI_FALLBACK_1_MODEL", default).strip() or default

    try:
        data = _first()
        data["_provider_used"] = first_name
        data["_model_used"] = _primary_model()
        return data
    except Exception as first_err:
        print(f"[AI] {first_name} failed ({first_err!r}); trying {fallback_name} fallback…")
        try:
            data = _fallback()
            data["_provider_used"] = fallback_name
            data["_model_used"] = _fallback_model()
            return data
        except Exception as second_err:
            raise RuntimeError(
                f"All AI providers failed. "
                f"{first_name}: {first_err} | {fallback_name}: {second_err}"
            ) from first_err
