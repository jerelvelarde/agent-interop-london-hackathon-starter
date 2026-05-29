"""Tool: drill into one project (milestones + open risks)."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "project-detail"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "project_detail_schema.json"
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
def show_project_detail(project_id: str) -> str:
    """Drill into one project: milestones and open risks.

    Use for: "status of Atlas", "how is Orion going", "drill into Lyra",
    any project-scoped state question. The project_id MUST come from
    cached_data (e.g. proj_atlas, proj_orion, proj_lyra) — call
    query_data first if you are unsure.

    Do NOT use for free-form update timelines (use show_update_feed) or
    the org-wide view (use show_project_dashboard).
    """
    data = _build_data(project_id)
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


def _build_data(project_id: str) -> dict:
    projects_by_id = {p["id"]: p for p in cached_data.get("projects", [])}
    people_by_id = {p["id"]: p for p in cached_data.get("people", [])}
    sprints_by_id = {s["id"]: s for s in cached_data.get("sprints", [])}

    project = projects_by_id.get(project_id, {})
    sprint = sprints_by_id.get(project.get("sprintId"), {})
    owner = people_by_id.get(project.get("ownerId"), {})

    milestones = [
        {
            "id": m.get("id"),
            "title": m.get("title"),
            "done": bool(m.get("done")),
            "dueLabel": _due_label(m),
        }
        for m in project.get("milestones", [])
    ]

    project_payload = {
        "id": project.get("id"),
        "name": project.get("name", "Unknown project"),
        "status": project.get("status"),
        "ownerName": owner.get("name", "Unassigned"),
        "sprintLabel": _short_sprint_label(sprint.get("name", "")),
        "percentComplete": project.get("percentComplete", 0),
        "taskCounts": project.get(
            "taskCounts",
            {"todo": 0, "inProgress": 0, "inReview": 0, "done": 0},
        ),
        "milestones": milestones,
        "sprintName": _short_sprint_label(sprint.get("name", "")),
        "sprintStartLabel": _date_label(_parse_iso(sprint.get("start"))),
        "sprintEndLabel": _date_label(_parse_iso(sprint.get("end"))),
        "sprintPercentComplete": _sprint_percent(sprint),
        "sprintDaysRemainingLabel": _days_remaining_label(
            _parse_iso(sprint.get("end"))
        ),
        "sprintStatus": sprint.get("status", "Active"),
    }

    tasks_grouped: dict[str, list[dict]] = {b: [] for b in _STATUS_BUCKETS}
    sprint_id = sprint.get("id")
    for task in cached_data.get("tasks", []):
        if task.get("projectId") != project_id:
            continue
        if sprint_id and task.get("sprintId") != sprint_id:
            continue
        bucket = task.get("status")
        if bucket not in tasks_grouped:
            continue
        assignee = people_by_id.get(task.get("assigneeId"), {})
        tasks_grouped[bucket].append(
            {
                "id": task.get("id"),
                "title": task.get("title"),
                "assigneeName": assignee.get("name", "Unassigned"),
                "assigneeAvatarUrl": assignee.get("avatarUrl"),
                "points": task.get("points"),
                "dueLabel": _date_label(_parse_iso(task.get("due"))),
            }
        )

    risks = []
    for risk in cached_data.get("risks", []):
        if risk.get("projectId") != project_id:
            continue
        risk_owner = people_by_id.get(risk.get("ownerId"), {})
        risks.append(
            {
                "id": risk.get("id"),
                "title": risk.get("title"),
                "severity": risk.get("severity"),
                "mitigation": risk.get("mitigation"),
                "ownerName": risk_owner.get("name", "Unassigned"),
                "projectLabel": _short_project_name(project.get("name", "")),
            }
        )

    return {
        "project": project_payload,
        "tasks": tasks_grouped,
        "risks": risks,
    }


def _due_label(milestone: dict) -> str:
    if milestone.get("done"):
        return "done"
    due = _parse_iso(milestone.get("due"))
    if not due:
        return "—"
    delta = (due - _DEMO_TODAY).days
    if 0 <= delta <= 7:
        if delta == 0:
            return "(today)"
        if delta == 1:
            return "(1 day)"
        return f"({delta} days)"
    return _date_label(due)


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
