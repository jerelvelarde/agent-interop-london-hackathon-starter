"""Tool: recent project-update feed (org-wide or scoped to one project)."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "update-feed"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent / "a2ui" / "schemas" / "update_feed_schema.json"
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


@tool
def show_update_feed(project_id: str | None = None, days: int = 7) -> str:
    """Show recent project updates as a chronological feed.

    Pass project_id to filter to one project; leave empty for the org-wide
    feed. The `days` argument bounds the window (defaults to last 7 days).

    Use for: "what's been happening?", "recent updates", "catch me up",
    "what did the team post this week?".

    Do NOT use for project state / kanban / risks (use show_project_detail)
    or for drafting an outgoing update (use draft_status_report).
    """
    data = _build_data(project_id, days)
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


def _build_data(project_id: str | None, days: int) -> dict:
    people_by_id = {p["id"]: p for p in cached_data.get("people", [])}
    projects_by_id = {p["id"]: p for p in cached_data.get("projects", [])}

    cutoff = _DEMO_TODAY
    updates: list[dict] = []
    for update in cached_data.get("updates", []):
        if project_id and update.get("projectId") != project_id:
            continue
        update_date = _parse_iso(update.get("date"))
        if not update_date:
            continue
        delta_days = (cutoff - update_date).days
        if delta_days < 0 or delta_days > days:
            continue
        author = people_by_id.get(update.get("authorId"), {})
        project = projects_by_id.get(update.get("projectId"), {})
        author_name = author.get("name", "Unknown")
        updates.append(
            {
                "id": update.get("id"),
                "_sortKey": update_date.isoformat(),
                "authorName": author_name,
                "authorInitials": _initials(author_name),
                "authorAvatarUrl": author.get("avatarUrl"),
                "dateLabel": _date_label_relative(update_date),
                "projectLabel": _short_project_name(project.get("name", "")),
                "body": update.get("body", ""),
            }
        )

    # Newest first (by date), then drop the sort key from the payload.
    updates.sort(key=lambda u: u["_sortKey"], reverse=True)
    for u in updates:
        u.pop("_sortKey", None)

    header = "Recent Updates"
    if project_id and projects_by_id.get(project_id):
        header = (
            f"Recent Updates · "
            f"{_short_project_name(projects_by_id[project_id]['name'])}"
        )

    return {
        "headerLabel": header,
        "updates": updates,
    }


def _initials(full_name: str) -> str:
    if not full_name:
        return "?"
    parts = [p for p in full_name.split(" ") if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _date_label_relative(d: date) -> str:
    delta = (_DEMO_TODAY - d).days
    if delta <= 0:
        return "today"
    if delta == 1:
        return "1 day ago"
    if delta < 7:
        return f"{delta} days ago"
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
