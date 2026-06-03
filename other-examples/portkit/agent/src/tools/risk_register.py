"""Tool: show the open-risks register (optionally filtered to one project)."""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #4 — Add an A2UI widget (fixed schema)
# See HACKATHON.md §4 for the full recipe.
# Pattern to copy: this file (show_risk_register) is THE canonical
# minimal example. One helper, one tree, one template binding.
# For the showcase / opening demo see show_project_dashboard.
#
# The 5-surface dance (skip a step → widget won't render):
#   1. Catalog entry — agent/src/widgets/<name>.json (S2 owns)
#   2. Schema        — agent/src/a2ui/schemas/<name>_schema.json (S3 owns)
#   3. Python tool   — this file (a new @tool below) + register in
#                      agent/src/domains/default/tools.py
#   4. TS schema     — src/app/api/copilotkit/route.ts a2ui.schema array
#   5. Prompt hint   — agent/src/domains/default/prompts.py (teach WHEN)
#
# After editing: pnpm validate-widget agent/src/widgets/<name>.json
# Then: pnpm smoke
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "risk-register"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "risk_register_schema.json"
)


@tool
def show_risk_register(project_id: str | None = None) -> str:
    """Show open risks across the org. Pass project_id to scope to one project.

    Use for: "what risks are open?", "what could go wrong with Orion?",
    "risk register", "show me the red flags".

    Do NOT use for: full project drill-down (use show_project_detail) or
    sprint-wide task state (use show_sprint_board).
    """
    data = _build_data(project_id)
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


def _build_data(project_id: str | None) -> dict:
    """Filter + enrich risks for the register surface."""
    people_by_id = {p["id"]: p for p in cached_data.get("people", [])}
    projects_by_id = {p["id"]: p for p in cached_data.get("projects", [])}

    risks = cached_data.get("risks", [])
    if project_id:
        risks = [r for r in risks if r.get("projectId") == project_id]

    enriched = []
    for risk in risks:
        owner = people_by_id.get(risk.get("ownerId"), {})
        project = projects_by_id.get(risk.get("projectId"), {})
        enriched.append(
            {
                "id": risk.get("id"),
                "title": risk.get("title"),
                "severity": risk.get("severity"),
                "mitigation": risk.get("mitigation"),
                "ownerName": owner.get("name", "Unassigned"),
                "projectLabel": _short_project_name(project.get("name", "")),
            }
        )

    header = "Open Risks"
    if project_id and projects_by_id.get(project_id):
        header = f"Open Risks · {_short_project_name(projects_by_id[project_id]['name'])}"
    header = f"{header} · {len(enriched)}"

    return {"headerLabel": header, "risks": enriched}


def _short_project_name(name: str) -> str:
    """'Orion: Self-Serve Billing' -> 'Orion'."""
    if not name:
        return ""
    return name.split(":", 1)[0].strip()
