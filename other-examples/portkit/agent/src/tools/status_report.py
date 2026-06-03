"""Tool: editable weekly status-report draft for one project."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from copilotkit import a2ui
from langchain.tools import tool

from src.query import cached_data

CATALOG_ID = "copilotkit://app-dashboard-catalog"
SURFACE_ID = "status-report-draft"
SCHEMA = a2ui.load_schema(
    Path(__file__).parent.parent
    / "a2ui"
    / "schemas"
    / "status_report_draft_schema.json"
)

_DEMO_TODAY = date(2026, 5, 28)


@tool
def draft_status_report(project_id: str) -> str:
    """Compose and display an editable weekly status-report draft for one
    project.

    Use for: "draft a status update", "send an update on Atlas", "compose
    the weekly note for Orion", "write the Friday update".

    The rendered draft has a Send button. When the user clicks it, you
    will receive a `send_status_report` event whose context contains the
    report payload (projectId, tldr, asks). Acknowledge the event in
    natural language; do NOT re-emit the draft on the event.

    Do NOT use for read-only views (use show_project_detail or
    show_update_feed) or for cross-project digests.
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

    project = projects_by_id.get(project_id, {})
    short_name = _short_project_name(project.get("name", "this project"))
    channel = f"#{short_name.lower()}-pm" if short_name else "#general-pm"

    progress_bullets = _progress_bullets(project, project_id, people_by_id)
    tldr = _tldr(project, progress_bullets)

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
                "projectLabel": short_name,
            }
        )

    ask_bullets = _ask_bullets(project, short_name)
    asks_joined = " ".join(b["text"] for b in ask_bullets)

    return {
        "headerLabel": f"Draft: Weekly Update — {short_name}",
        "projectId": project_id,
        "tldr": tldr,
        "progressBullets": progress_bullets,
        "risks": risks,
        "askBullets": ask_bullets,
        "asksJoined": asks_joined,
        "sendButtonLabel": f"✓ Send to {channel}",
        "editButtonLabel": "✎ Edit draft",
        "channel": channel,
    }


def _progress_bullets(
    project: dict, project_id: str, people_by_id: dict
) -> list[dict]:
    bullets: list[dict] = []

    # Closed milestones land first as concrete wins.
    for milestone in project.get("milestones", []):
        if milestone.get("done"):
            bullets.append({"text": f"Closed: {milestone.get('title', '—')}"})

    # Recent updates against this project (last 7 days) become commentary.
    for update in cached_data.get("updates", []):
        if update.get("projectId") != project_id:
            continue
        update_date = _parse_iso(update.get("date"))
        if not update_date:
            continue
        if (_DEMO_TODAY - update_date).days <= 7:
            author = people_by_id.get(update.get("authorId"), {})
            bullets.append(
                {
                    "text": f"{author.get('name', 'Team')}: {update.get('body', '')}"
                }
            )

    if not bullets:
        bullets.append({"text": "No progress logged this week."})
    return bullets


def _tldr(project: dict, progress_bullets: list[dict]) -> str:
    name = _short_project_name(project.get("name", "this project"))
    pct = project.get("percentComplete")
    status = project.get("status", "On Track")
    parts = []
    if pct is not None:
        parts.append(f"{name} is at {pct}% complete and {status.lower()}.")
    else:
        parts.append(f"{name} is {status.lower()}.")
    if progress_bullets:
        first = progress_bullets[0]["text"]
        parts.append(f"Headline this week: {first.rstrip('.')}.")
    return " ".join(parts)


def _ask_bullets(project: dict, short_name: str) -> list[dict]:
    bullets: list[dict] = []
    if project.get("status") == "At Risk":
        bullets.append(
            {
                "text": (
                    f"Need a sync this week on {short_name} risk mitigation; "
                    "see Risks block."
                )
            }
        )
    else:
        bullets.append(
            {"text": f"Need a 30-min review slot with the {short_name} core team."}
        )
    return bullets


def _short_project_name(name: str) -> str:
    if not name:
        return ""
    return name.split(":", 1)[0].strip()


def _parse_iso(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None
