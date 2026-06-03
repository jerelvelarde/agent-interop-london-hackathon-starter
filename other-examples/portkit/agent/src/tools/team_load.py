"""Tool: team capacity (points-per-person + overloaded list)."""

from __future__ import annotations

from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "team-load"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "team_load_schema.json"
)

# Anyone above this point total for one sprint is considered overloaded.
_OVERLOAD_THRESHOLD_PTS = 10


@tool
def show_team_load(sprint_id: str = "current") -> str:
    """Show team capacity for a sprint: bar chart of points-per-person +
    a table of overloaded people with re-assignment suggestions.

    Pass sprint_id="current" (default) for the active sprint.

    Use for: "who's overloaded?", "team capacity", "load balancing",
    "who has bandwidth?", "where should I send this work?".

    Do NOT use for individual task lists (use show_sprint_board) or
    project-scoped state (use show_project_detail).
    """
    data = _build_data(sprint_id)
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


def _build_data(sprint_id: str) -> dict:
    sprints = cached_data.get("sprints", [])
    sprint = _resolve_sprint(sprint_id, sprints)
    sprint_id_resolved = sprint.get("id") if sprint else None

    people = cached_data.get("people", [])
    points_by_person: dict[str, int] = {p["id"]: 0 for p in people}
    for task in cached_data.get("tasks", []):
        if sprint_id_resolved and task.get("sprintId") != sprint_id_resolved:
            continue
        assignee_id = task.get("assigneeId")
        if assignee_id in points_by_person:
            points_by_person[assignee_id] += int(task.get("points", 0) or 0)

    people_by_id = {p["id"]: p for p in people}

    # Bar chart data: sort by load descending so the biggest bars are left.
    bar_data = sorted(
        (
            {
                "label": _first_name(people_by_id.get(pid, {}).get("name", "?")),
                "value": pts,
            }
            for pid, pts in points_by_person.items()
        ),
        key=lambda row: row["value"],
        reverse=True,
    )

    overloaded_ids = [
        pid for pid, pts in points_by_person.items() if pts > _OVERLOAD_THRESHOLD_PTS
    ]
    underloaded = sorted(
        (
            (pid, pts)
            for pid, pts in points_by_person.items()
            if pts <= _OVERLOAD_THRESHOLD_PTS
        ),
        key=lambda pair: pair[1],
    )

    overloaded = []
    for pid in overloaded_ids:
        person = people_by_id.get(pid, {})
        pts = points_by_person[pid]
        recommendation = _recommendation(pts, underloaded, people_by_id)
        overloaded.append(
            {
                "person": person.get("name", "Unknown"),
                "pts": pts,
                "role": person.get("role", "—"),
                "recommendation": recommendation,
            }
        )

    header_label = _header_label(sprint)
    return {
        "headerLabel": header_label,
        "barData": bar_data,
        "overloaded": overloaded,
    }


def _resolve_sprint(sprint_id: str, sprints: list[dict]) -> dict:
    if sprint_id == "current":
        for sprint in sprints:
            if sprint.get("status") == "Active":
                return sprint
        return sprints[0] if sprints else {}
    for sprint in sprints:
        if sprint.get("id") == sprint_id:
            return sprint
    return {}


def _recommendation(
    pts: int, underloaded: list[tuple[str, int]], people_by_id: dict
) -> str:
    """Naive: send the spillover to the most under-loaded person."""
    spill = pts - _OVERLOAD_THRESHOLD_PTS
    if spill <= 0 or not underloaded:
        return "Monitor load this sprint"
    target_id, _ = underloaded[0]
    target = people_by_id.get(target_id, {})
    target_name = _first_name(target.get("name", "a teammate"))
    suffix = "pt" if spill == 1 else "pts"
    return f"Re-assign {spill} {suffix} to {target_name}"


def _header_label(sprint: dict) -> str:
    name = sprint.get("name") if sprint else ""
    short = name.split("(", 1)[0].strip() if name else "—"
    return f"Team Capacity · {short}"


def _first_name(full_name: str) -> str:
    if not full_name:
        return "—"
    return full_name.split(" ", 1)[0]
