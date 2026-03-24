from __future__ import annotations

import re
from typing import Any

try:
    import handcalcs.handcalcs as _hc
    _HANDCALCS_AVAILABLE = True
except Exception:  # pragma: no cover - fallback path tested indirectly
    _hc = None
    _HANDCALCS_AVAILABLE = False


def _sanitize_rhs(rhs: str) -> str:
    """Convert Unicode/math display expression text to python-evaluable text."""
    text = rhs.strip()

    # Common glyph and formatting replacements
    replacements = {
        "×": "*",
        "·": "*",
        "÷": "/",
        "−": "-",
        "–": "-",
        "^": "**",
        "²": "**2",
        "³": "**3",
        "√": "sqrt",
        "γ": "gamma",
        "′": "_prime",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # Remove thin spaces and odd separators
    text = text.replace("\u2009", " ").replace("\u00a0", " ")

    # Replace unsupported symbols in identifiers
    text = re.sub(r"[^A-Za-z0-9_().,+\-*/= ]", "", text)

    # Normalize repeated spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


def _expression_to_source(step: dict[str, Any], idx: int) -> tuple[str, dict[str, Any]]:
    """Build source code and values dict for handcalcs.latex()."""
    expr = str(step.get("expression", "")).strip()

    # Use RHS when available, it is usually numerically concrete in our step strings.
    rhs = expr.split("=")[-1] if "=" in expr else expr
    rhs = _sanitize_rhs(rhs)

    # If expression cannot be parsed into a useful python-like string, keep plain text.
    if not rhs or all(ch in "=-+*/()., " for ch in rhs):
        rhs = "0"

    var = f"step_{idx}"
    source = f"{var} = {rhs}"

    value = step.get("value")
    if isinstance(value, (int, float)):
        results = {var: float(value)}
    else:
        results = {var: 0.0}

    return source, results


def render_formula_steps(steps: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Report-only formula rendering adapter.

    Returns a structure for report payload consumption:
    {
      "engine": "handcalcs" | "fallback",
      "items": [{label, clause, unit, raw_expression, raw_value, rendered_latex, rendered}]
    }
    """
    items: list[dict[str, Any]] = []

    if not _HANDCALCS_AVAILABLE:
        for step in steps:
            items.append(
                {
                    "label": step.get("label"),
                    "clause": step.get("clause"),
                    "unit": step.get("unit"),
                    "raw_expression": step.get("expression"),
                    "raw_value": step.get("value"),
                    "rendered_latex": None,
                    "rendered": False,
                }
            )
        return {"engine": "fallback", "items": items}

    # Build one-cell-per-step latex for traceability in report output.
    config = _hc.global_config._config
    for idx, step in enumerate(steps, start=1):
        source, results = _expression_to_source(step, idx)
        rendered_latex = None
        rendered = False

        try:
            rendered_latex = _hc.latex(
                raw_python_source=source,
                calculated_results=results,
                override_commands="",
                config_options=config,
                cell_precision=3,
                cell_notation=False,
            )
            rendered = True
        except Exception:
            rendered_latex = None
            rendered = False

        items.append(
            {
                "label": step.get("label"),
                "clause": step.get("clause"),
                "unit": step.get("unit"),
                "raw_expression": step.get("expression"),
                "raw_value": step.get("value"),
                "rendered_latex": rendered_latex,
                "rendered": rendered,
            }
        )

    return {"engine": "handcalcs", "items": items}
