"""Tool: kanban board for a sprint, across ALL projects."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "sprint-board"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "sprint_board_schema.json"
)

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
_STATUS_BUCKETS = ("todo", "inProgress", "inReview", "done")


@tool
def show_sprint_board(sprint_id: str = "current") -> str:
    """Show the full kanban board for a sprint across ALL projects.

    Pass sprint_id="current" (default) for the active sprint, or pass an
    explicit sprint id from cached_data.

    Use for: "what's in flight?", "sprint board", "what are we working on",
    "kanban across projects".

    Do NOT use for: one-project drill-downs (use show_project_detail) or
    capacity / load views (use show_team_load).
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

    people_by_id = {p["id"]: p for p in cached_data.get("people", [])}
    projects_by_id = {p["id"]: p for p in cached_data.get("projects", [])}

    tasks_grouped: dict[str, list[dict]] = {b: [] for b in _STATUS_BUCKETS}
    for task in cached_data.get("tasks", []):
        if sprint_id_resolved and task.get("sprintId") != sprint_id_resolved:
            continue
        bucket = task.get("status")
        if bucket not in tasks_grouped:
            continue
        assignee = people_by_id.get(task.get("assigneeId"), {})
        project = projects_by_id.get(task.get("projectId"), {})
        tasks_grouped[bucket].append(
            {
                "id": task.get("id"),
                "title": task.get("title"),
                "assigneeName": assignee.get("name", "Unassigned"),
                "assigneeAvatarUrl": assignee.get("avatarUrl"),
                "points": task.get("points"),
                "dueLabel": _date_label(_parse_iso(task.get("due"))),
                "projectLabel": _short_project_name(project.get("name", "")),
            }
        )

    sprint_block = {
        "headerLabel": _header_label(sprint, sum(len(v) for v in tasks_grouped.values())),
        "name": _short_sprint_label(sprint.get("name", "")) if sprint else "—",
        "startLabel": _date_label(_parse_iso(sprint.get("start")) if sprint else None),
        "endLabel": _date_label(_parse_iso(sprint.get("end")) if sprint else None),
        "percentComplete": _sprint_percent(sprint) if sprint else 0,
        "daysRemainingLabel": _days_remaining_label(
            _parse_iso(sprint.get("end")) if sprint else None
        ),
        "status": sprint.get("status", "Active") if sprint else "—",
    }

    return {"sprint": sprint_block, "tasks": tasks_grouped}


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


def _header_label(sprint: dict, task_count: int) -> str:
    if not sprint:
        return f"Sprint Board · {task_count} tasks"
    return f"{_short_sprint_label(sprint.get('name', ''))} · {task_count} tasks in flight"


def _sprint_percent(sprint: dict) -> int:
    start = _parse_iso(sprint.get("start"))
    end = _parse_iso(sprint.get("end"))
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


def _short_project_name(name: str) -> str:
    if not name:
        return ""
    return name.split(":", 1)[0].strip()


def _short_sprint_label(name: str) -> str:
    if not name:
        return ""
    return name.split("(", 1)[0].strip()
