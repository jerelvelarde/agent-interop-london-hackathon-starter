"""For each rich-UI tool: invoke + assert envelope shape.

This gate exists to catch the class of bug where a tool either returns the
wrong type, points at the wrong catalog, or skips one of the three required
A2UI v0.9 operations (createSurface / updateComponents / updateDataModel).
The renderer fails silently on any of those.

Run from the agent/ directory:

    uv run python -m pytest tests/test_envelope_shapes.py -v
"""

from __future__ import annotations

import os

import pytest

# Ensure tool modules that touch ChatOpenAI / Gemini at import don't fail
# in the test env. The tests never make a live call.
os.environ.setdefault("OPENAI_API_KEY", "sk-probe-placeholder")
os.environ.setdefault("GEMINI_API_KEY", "sk-probe-placeholder")

from src.tools.project_dashboard import show_project_dashboard
from src.tools.project_detail import show_project_detail
from src.tools.risk_register import show_risk_register
from src.tools.sprint_board import show_sprint_board
from src.tools.status_report import draft_status_report
from src.tools.team_load import show_team_load
from src.tools.update_feed import show_update_feed

CATALOG_ID = "copilotkit://app-dashboard-catalog"

# (tool, expected surfaceId, invoke kwargs) — kwargs go straight to .invoke().
TOOL_SURFACE = [
    (show_project_dashboard, "project-dashboard", {}),
    (show_project_detail, "project-detail", {"project_id": "proj_orion"}),
    (show_sprint_board, "sprint-board", {}),
    (show_team_load, "team-load", {}),
    (show_risk_register, "risk-register", {}),
    (draft_status_report, "status-report-draft", {"project_id": "proj_orion"}),
    (show_update_feed, "update-feed", {}),
]


@pytest.mark.parametrize(
    "tool,surface_id,kwargs",
    TOOL_SURFACE,
    ids=[t.name for t, _, _ in TOOL_SURFACE],
)
def test_envelope_shape(tool, surface_id, kwargs):
    out = tool.invoke(kwargs)

    # 1. Tool returns a string (a serialized A2UI render envelope).
    assert isinstance(out, str), (
        f"{tool.name} returned {type(out).__name__}, expected str"
    )

    # 2. Envelope points at the dashboard catalog.
    assert CATALOG_ID in out, (
        f"{tool.name} envelope missing catalog id '{CATALOG_ID}'"
    )

    # 3. Envelope mounts on the right surfaceId.
    assert surface_id in out, (
        f"{tool.name} envelope missing surface id '{surface_id}'"
    )

    # 4. All three required A2UI v0.9 operations are present.
    # copilotkit's a2ui.render serializes to camelCase JSON keys.
    assert "createSurface" in out, (
        f"{tool.name} envelope missing createSurface op"
    )
    assert "updateComponents" in out, (
        f"{tool.name} envelope missing updateComponents op"
    )
    assert "updateDataModel" in out, (
        f"{tool.name} envelope missing updateDataModel op"
    )
