"""
Fixed-schema A2UI tool: flight search results.

Schema is loaded from a JSON file. Only the data changes per invocation.

This file is the CANONICAL EXAMPLE for fixed-schema A2UI widgets.
When the hacker (or their AI assistant) wants to add a new widget,
copy `search_flights` below and adapt. See HACKATHON.md §4 for the
full 5-surface dance.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, TypedDict

from copilotkit import a2ui
from langchain.tools import tool


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JSON-serialization guard for A2UI envelope data
#
# Why this exists: A2UI envelopes are streamed as JSON. If `_build_data`
# returns an object containing a non-primitive value (e.g. `datetime.date`,
# `Decimal`, `numpy` scalar, an unhandled object), the streaming write
# truncates mid-envelope and the user sees the cryptic toast
# "Unexpected end of JSON input" with no clue which field broke.
#
# Guard pattern: run `json.dumps(data)` BEFORE calling
# `a2ui.update_data_model(...)`. On failure, walk the dict to surface the
# offending JSONPath-ish location (e.g. `$.flights[0].date (date)`) so the
# participant can coerce it to a primitive.
#
# Copy this pattern when you add a new fixed-schema tool — wrap your
# `update_data_model(SURFACE_ID, data)` call with
# `_safe_envelope_data(data, surface_id=SURFACE_ID)`.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #4 — Add an A2UI widget (fixed schema)
# See HACKATHON.md §4 for the full recipe.
# Pattern to copy: search_flights (below) — it is THE canonical example.
#
# The 5-surface dance (skip a step → widget won't render):
#   1. Catalog entry — agent/src/widgets/<name>.json
#   2. Fixture       — agent/src/widgets/<name>.fixture.json
#   3. Python tool   — this file (a new @tool below) + register in
#                      agent/src/domains/<active-domain>/tools.py
#                      (default_tools list — main.py loads it per DOMAIN env)
#   4. TS schema     — src/app/api/copilotkit/route.ts a2ui.schema array
#   5. Prompt hint   — agent/src/domains/<active-domain>/prompts.py
#                      SYSTEM_PROMPT (teach the agent WHEN to call it)
#
# After editing: pnpm validate-widget agent/src/widgets/<name>.json
# Then: pnpm smoke
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "flight-search-results"
FLIGHT_SCHEMA = a2ui.load_schema(
    Path(__file__).parent / "a2ui" / "schemas" / "flight_schema.json"
)


class Flight(TypedDict):
    id: str
    airline: str
    airlineLogo: str
    flightNumber: str
    origin: str
    destination: str
    date: str
    departureTime: str
    arrivalTime: str
    duration: str
    status: str
    statusIcon: str
    price: str


@tool
def search_flights(flights: list[Flight]) -> str:
    """Search for flights and display the results as rich cards. Return exactly 2 flights.

    Each flight must have: id, airline (e.g. "United Airlines"),
    airlineLogo (use Google favicon API: https://www.google.com/s2/favicons?domain={airline_domain}&sz=128
    e.g. "https://www.google.com/s2/favicons?domain=united.com&sz=128" for United,
    "https://www.google.com/s2/favicons?domain=delta.com&sz=128" for Delta,
    "https://www.google.com/s2/favicons?domain=aa.com&sz=128" for American,
    "https://www.google.com/s2/favicons?domain=alaskaair.com&sz=128" for Alaska),
    flightNumber, origin, destination,
    date (short readable format like "Tue, Mar 18" — use near-future dates),
    departureTime, arrivalTime,
    duration (e.g. "4h 25m"), status (e.g. "On Time" or "Delayed"),
    statusIcon (colored dot: use "https://placehold.co/12/22c55e/22c55e.png"
    for On Time, "https://placehold.co/12/eab308/eab308.png" for Delayed,
    "https://placehold.co/12/ef4444/ef4444.png" for Cancelled),
    and price (e.g. "$289").
    """
    data = _safe_envelope_data({"flights": flights}, surface_id=SURFACE_ID)
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, FLIGHT_SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )
