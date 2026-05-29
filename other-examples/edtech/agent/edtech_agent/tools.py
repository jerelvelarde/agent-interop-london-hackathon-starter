"""ScholarAI (edtech) tools — four fixed-schema A2UI widgets.

Each tool emits an `a2ui.render(operations=[...])` envelope that creates a
surface against the `copilotkit://edtech-catalog` catalog, attaches the
component tree, and patches the data model.

Surfaces:
  - student-roster        — grid of StudentCard
  - student-profile       — single StudentProfile with grade history
  - assignment-status     — AssignmentStatusTable
  - outreach-batch        — OutreachBatchDraft with per-row send/edit/skip

Surface IDs are stable across calls so subsequent `update_data_model`
patches replace the rendered content cleanly. Adding new tools follows the
canonical legal example shape — see HACKATHON.md §4 for the 5-surface dance.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from copilotkit import a2ui
from langchain.tools import tool

from .data import (
    STUDENTS,
    get_assignment_status,
    get_at_risk,
    get_student,
    is_at_risk,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Surface + catalog identity.
# CATALOG_ID is the custom edtech catalog registered in
# other-examples/edtech/catalog/index.ts. Using the `copilotkit://` scheme
# (not `https://...`) so the in-process renderer can resolve it.
# Pre-flight fix carried over from F18 — the URL form fails with
# "Catalog not found" at render time.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATALOG_ID = "copilotkit://edtech-catalog"
ROSTER_SURFACE = "student-roster"
PROFILE_SURFACE = "student-profile"
ASSIGNMENT_SURFACE = "assignment-status"
OUTREACH_SURFACE = "outreach-batch"


_SCHEMAS_DIR = Path(__file__).parent.parent.parent / "schemas"


def _load_schema(name: str) -> Any:
    """Load an A2UI component schema bundled with this example.

    Returns the parsed list of components when the JSON exists; otherwise
    returns a tiny placeholder so the agent never hard-fails in the demo
    path (the visible placeholder is the tell that the schemas file is
    missing).
    """
    path = _SCHEMAS_DIR / name
    if path.exists():
        return a2ui.load_schema(path)
    return [
        {
            "id": "root",
            "component": "PlaceholderText",
            "text": f"Schema not found: {name}",
        }
    ]


_ROSTER_SCHEMA = _load_schema("student_roster.schema.json")
_PROFILE_SCHEMA = _load_schema("student_profile.schema.json")
_ASSIGNMENT_SCHEMA = _load_schema("assignment_status.schema.json")
_OUTREACH_SCHEMA = _load_schema("outreach_batch.schema.json")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Data shaping — flatten the rich student records into the
# per-widget shapes the renderers consume.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def _risk_level(student: dict[str, Any]) -> str:
    """Map the at-risk heuristic to a 3-band severity for the renderer.

    The renderer uses this to color the gold-leaf pill on each card.
    """
    if not is_at_risk(student):
        return "ok"
    if student["gpa"] < 2.0 or student["missing_assignments"] >= 6:
        return "urgent"
    return "watch"


def _shape_student_card(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": s["id"],
        "name": s["name"],
        "photoInitials": s["photo_initials"],
        "gradeLevel": f"Grade {s['grade_level']}",
        "advisor": s["advisor"],
        "currentGrade": s["current_grade"],
        "gpa": s["gpa"],
        "missingAssignments": s["missing_assignments"],
        "attendancePct": s["attendance_pct"],
        "trend": s["trend"],
        "trendArrow": s["trend_arrow"],
        "riskLevel": _risk_level(s),
        "notes": s["notes"],
    }


def _shape_student_profile(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": s["id"],
        "name": s["name"],
        "photoInitials": s["photo_initials"],
        "gradeLevel": f"Grade {s['grade_level']}",
        "advisor": s["advisor"],
        "currentGrade": s["current_grade"],
        "gpa": s["gpa"],
        "attendancePct": s["attendance_pct"],
        "missingAssignments": s["missing_assignments"],
        "trend": s["trend"],
        "trendArrow": s["trend_arrow"],
        "riskLevel": _risk_level(s),
        "gradeHistory": s["grade_history"],
        "courses": s["courses"],
        "recentAssignments": s["recent_assignments"],
        "notes": s["notes"],
        "lastOutreach": s["last_outreach"],
    }


def _shape_outreach_draft(s: dict[str, Any]) -> dict[str, Any]:
    """Generate a synthetic parent-outreach email draft for a student."""
    name = s["name"]
    grade = s["current_grade"]
    missing = s["missing_assignments"]
    course_line = ", ".join(c["name"] for c in s["courses"][:2])
    subject = f"Checking in on {name}'s progress in {course_line}"
    body_parts = [
        f"Dear {s['parent_name']},",
        "",
        f"I'm reaching out to discuss {name}'s recent work in {course_line}. "
        f"{name} is currently at a {grade} with {missing} missing assignment"
        f"{'s' if missing != 1 else ''} this term.",
    ]
    if s["trend"] == "declining":
        body_parts.append(
            "I've noticed a downward trend in the most recent grade reports "
            "and I'd love to find a time to talk about how we can support "
            f"{name} together."
        )
    else:
        body_parts.append(
            f"I'd love to set up a short call to talk through how we can "
            f"keep {name} on track for the rest of the term."
        )
    body_parts += [
        "",
        "Please let me know a time that works in the next week.",
        "",
        "Warmly,",
        s["advisor"],
        "(Sent via ScholarAI — synthetic demo data, no real students involved.)",
    ]
    return {
        "studentId": s["id"],
        "studentName": s["name"],
        "parentName": s["parent_name"],
        "parentEmail": s["parent_email"],
        "subject": subject,
        "body": "\n".join(body_parts),
        "riskLevel": _risk_level(s),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOLS — exposed to the agent.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@tool
def show_students_at_risk(term: str = "current") -> str:
    """Render the at-risk student roster for a given term.

    Use this when the teacher asks who is struggling, falling behind, or
    needs follow-up. Returns up to 5 students worst-first by GPA.

    Args:
        term: Free-form term label like "current", "Q4", "spring 2026".
              Only used in the displayed header — the data is the same
              synthetic snapshot today.
    """
    students = get_at_risk(limit=5)
    data = {
        "term": term,
        "headline": f"At-risk students — {term}",
        "subhead": f"{len(students)} student"
        + ("" if len(students) == 1 else "s")
        + " flagged via GPA, attendance, missing work, or trend.",
        "students": [_shape_student_card(s) for s in students],
    }
    return a2ui.render(
        operations=[
            a2ui.create_surface(ROSTER_SURFACE, catalog_id=CATALOG_ID),
            a2ui.update_components(ROSTER_SURFACE, _ROSTER_SCHEMA),
            a2ui.update_data_model(ROSTER_SURFACE, data),
        ],
    )


@tool
def show_student_profile(student: str) -> str:
    """Drill into a single student — grade history, courses, assignments.

    Args:
        student: Either a student ID like "S-1001" or a substring of the
                 student's name like "Maria" or "Devon Carter".
    """
    s = get_student(student)
    if s is None:
        return (
            f"No student found matching {student!r}. Try a student ID like "
            "'S-1001' or a name like 'Maria Chen'."
        )
    data = _shape_student_profile(s)
    return a2ui.render(
        operations=[
            a2ui.create_surface(PROFILE_SURFACE, catalog_id=CATALOG_ID),
            a2ui.update_components(PROFILE_SURFACE, _PROFILE_SCHEMA),
            a2ui.update_data_model(PROFILE_SURFACE, data),
        ],
    )


@tool
def show_assignment_status(assignment: str) -> str:
    """Render the per-student status table for a specific assignment.

    Args:
        assignment: Either an assignment ID like "calc-pset-7" or a
                    substring of the title/course like "calculus" or "Macbeth".
    """
    payload = get_assignment_status(assignment)
    if payload is None:
        return (
            f"No assignment found matching {assignment!r}. Try 'calculus', "
            "'algebra', 'Macbeth', or an assignment ID like 'calc-pset-7'."
        )
    a = payload["assignment"]
    data = {
        "title": a["title"],
        "course": a["course"],
        "instructor": a["instructor"],
        "due": a["due"],
        "totalPoints": a["total_points"],
        "rows": payload["rows"],
    }
    return a2ui.render(
        operations=[
            a2ui.create_surface(ASSIGNMENT_SURFACE, catalog_id=CATALOG_ID),
            a2ui.update_components(ASSIGNMENT_SURFACE, _ASSIGNMENT_SCHEMA),
            a2ui.update_data_model(ASSIGNMENT_SURFACE, data),
        ],
    )


@tool
def draft_outreach_batch(student_ids: list[str] | None = None) -> str:
    """Draft parent outreach emails for a batch of students.

    When `student_ids` is empty or None, the tool drafts emails for every
    student currently flagged at-risk. Otherwise it drafts emails for the
    listed students.

    Args:
        student_ids: Optional list of student IDs (e.g. ["S-1002", "S-1004"]).
    """
    if student_ids:
        students = [s for s in STUDENTS if s["id"] in set(student_ids)]
    else:
        students = get_at_risk(limit=5)

    if not students:
        return (
            "No matching students to draft outreach for. Try calling "
            "show_students_at_risk first and then pass the IDs."
        )

    data = {
        "headline": "Draft outreach to parents",
        "subhead": f"{len(students)} draft"
        + ("" if len(students) == 1 else "s")
        + " ready — edit, send, or skip per row.",
        "drafts": [_shape_outreach_draft(s) for s in students],
    }
    return a2ui.render(
        operations=[
            a2ui.create_surface(OUTREACH_SURFACE, catalog_id=CATALOG_ID),
            a2ui.update_components(OUTREACH_SURFACE, _OUTREACH_SCHEMA),
            a2ui.update_data_model(OUTREACH_SURFACE, data),
        ],
    )


SCHOLARAI_TOOLS = [
    show_students_at_risk,
    show_student_profile,
    show_assignment_status,
    draft_outreach_batch,
]
