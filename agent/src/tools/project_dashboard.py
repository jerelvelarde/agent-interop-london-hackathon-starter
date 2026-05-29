"""Tool: org-level project operations dashboard (showcase surface)."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "project-dashboard"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "project_dashboard_schema.json"
)

# Demo baseline date — keeps the "Week of May 25" label honest in offline mode
# without relying on the wall clock. Override by editing this constant.
_DEMO_TODAY = date(2026, 5, 28)

_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


@tool
def show_project_dashboard() -> str:
    """Show the org-level project ops dashboard.

    Use for opening views, "how's the team doing", "sprint status",
    "weekly check-in", "what's everyone working on". Returns a rich UI
    surface with KPI metrics + sprint progress + per-project cards.
    No arguments required.

    Do NOT use for project-scoped drill-downs (use show_project_detail) or
    free-form analytics (use query_data).
    """
    data = _build_data()
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


def _build_data() -> dict:
    """Aggregate the dashboard payload from cached_data."""
    projects = cached_data.get("projects", [])
    tasks = cached_data.get("tasks", [])
    sprints = cached_data.get("sprints", [])
    people_by_id = {p["id"]: p for p in cached_data.get("people", [])}
    sprints_by_id = {s["id"]: s for s in sprints}

    active_sprint = _active_sprint(sprints)

    kpi = {
        "activeProjects": str(len(projects)),
        "atRisk": str(sum(1 for p in projects if p.get("status") == "At Risk")),
        "openTasks": str(sum(1 for t in tasks if t.get("status") != "done")),
        "velocityLabel": _velocity_label(active_sprint),
    }

    sprint_block = _sprint_block(active_sprint)

    enriched_projects = []
    for project in projects:
        owner = people_by_id.get(project.get("ownerId"), {})
        sprint = sprints_by_id.get(project.get("sprintId"), {})
        enriched_projects.append(
            {
                "id": project.get("id"),
                "name": project.get("name"),
                "status": project.get("status"),
                "ownerName": owner.get("name", "Unassigned"),
                "sprintLabel": _short_sprint_label(sprint.get("name", "")),
                "percentComplete": project.get("percentComplete", 0),
                "taskCounts": project.get(
                    "taskCounts",
                    {"todo": 0, "inProgress": 0, "inReview": 0, "done": 0},
                ),
            }
        )

    week_label = _week_label(active_sprint)

    return {
        "weekLabel": week_label,
        "kpi": kpi,
        "sprint": sprint_block,
        "projects": enriched_projects,
    }


def _active_sprint(sprints: list[dict]) -> dict:
    """Pick the active sprint, or fall back to the first one."""
    for sprint in sprints:
        if sprint.get("status") == "Active":
            return sprint
    return sprints[0] if sprints else {}


def _velocity_label(sprint: dict) -> str:
    committed = sprint.get("committed")
    capacity = sprint.get("capacity")
    if committed is None or capacity is None:
        return "—"
    return f"{committed} / {capacity}"


def _sprint_block(sprint: dict) -> dict:
    """Build the sprint summary block bound to the SprintTimelineBar."""
    if not sprint:
        return {
            "name": "—",
            "startLabel": "—",
            "endLabel": "—",
            "percentComplete": 0,
            "daysRemainingLabel": "—",
            "status": "—",
        }
    start = _parse_iso(sprint.get("start"))
    end = _parse_iso(sprint.get("end"))
    return {
        "name": _short_sprint_label(sprint.get("name", "")),
        "startLabel": _date_label(start),
        "endLabel": _date_label(end),
        "percentComplete": _sprint_percent(start, end),
        "daysRemainingLabel": _days_remaining_label(end),
        "status": sprint.get("status", "Active"),
    }


def _sprint_percent(start: date | None, end: date | None) -> int:
    if not start or not end or end <= start:
        return 0
    total = (end - start).days
    elapsed = (_DEMO_TODAY - start).days
    if elapsed <= 0:
        return 0
    if elapsed >= total:
        return 100
    return int(round(100 * elapsed / total))


def _days_remaining_label(end: date | None) -> str:
    if not end:
        return "—"
    remaining = (end - _DEMO_TODAY).days
    if remaining <= 0:
        return "Sprint complete"
    if remaining == 1:
        return "1 day left"
    return f"{remaining} days left"


def _week_label(sprint: dict) -> str:
    start = _parse_iso(sprint.get("start"))
    if not start:
        return "Project Operations"
    return f"Project Operations · Week of {_date_label(start)}"


def _date_label(d: date | None) -> str:
    if not d:
        return "—"
    return f"{_MONTHS[d.month - 1]} {d.day}"


def _parse_iso(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _short_sprint_label(name: str) -> str:
    """'Sprint 22 (May 25 — Jun 5)' -> 'Sprint 22'."""
    if not name:
        return ""
    return name.split("(", 1)[0].strip()
