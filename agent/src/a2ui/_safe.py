"""
JSON-serialization guard for A2UI envelope data.

Why this module exists: A2UI envelopes are streamed as JSON. If the data
dict handed to `a2ui.update_data_model(...)` contains a non-primitive value
(e.g. `datetime.date`, `Decimal`, `numpy` scalar, an unhandled object), the
streaming write truncates mid-envelope and the user sees the cryptic toast
"Unexpected end of JSON input" with no clue which field broke.

Guard pattern: run `json.dumps(data)` BEFORE calling
`a2ui.update_data_model(...)`. On failure, walk the dict to surface the
offending JSONPath-ish location (e.g. `$.flights[0].date (date)`) so the
participant can coerce it to a primitive.

Copy this pattern when you add a new fixed-schema tool — wrap your
`update_data_model(SURFACE_ID, data)` call with
`_safe_envelope_data(data, surface_id=SURFACE_ID)`.

Originally lived inline in `agent/src/a2ui_fixed_schema.py` (Friction #17).
Lifted into this shared module so the dynamic-schema path and the shopping
domain tools can share it without duplicating the helpers.
"""

from __future__ import annotations

import json
from typing import Any


def _safe_envelope_data(data: dict, *, surface_id: str) -> dict:
    """Assert the data dict is JSON-serializable BEFORE handing it to
    a2ui.update_data_model — otherwise a non-serializable field surfaces
    to the renderer as the cryptic "Unexpected end of JSON input" toast.
    Raises ValueError with the offending field path on failure.
    """
    try:
        json.dumps(data)
    except (TypeError, ValueError) as exc:
        # Walk the dict to find the first non-serializable path
        problem = _find_non_serializable(data)
        raise ValueError(
            f"Surface {surface_id!r}: field {problem!r} is not JSON-serializable. "
            f"Coerce it to a primitive (str/int/float/bool/None/list/dict) before emit. "
            f"Original: {exc}"
        ) from exc
    return data


def _find_non_serializable(obj: Any, path: str = "$") -> str | None:
    """Walk a value depth-first and return the first JSONPath-ish location
    that does not JSON-serialize, or None if everything is a primitive.

    Returned format: `$.flights[0].date (date)` — path + offending type.
    """
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return None
    if isinstance(obj, list):
        for i, v in enumerate(obj):
            p = _find_non_serializable(v, f"{path}[{i}]")
            if p:
                return p
        return None
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = _find_non_serializable(v, f"{path}.{k}")
            if p:
                return p
        return None
    return f"{path} ({type(obj).__name__})"
