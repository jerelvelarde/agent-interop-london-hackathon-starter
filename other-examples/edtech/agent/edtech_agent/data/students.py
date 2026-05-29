"""Synthetic student dataset for the ScholarAI (edtech) demo.

Every record is fabricated. The dataset is intentionally small (12 students,
mixed risk profiles) so the widgets have varied things to render:

  - 5 at-risk students (the canned demo prompt #1 hits this)
  - 7 on-track students (so the at-risk slice is meaningful)
  - 1 deep-dive student (Maria Chen) with rich grade history for prompt #2
  - 1 shared assignment (calculus pset 7) with mixed completion status for prompt #3

Risk heuristic:
  - GPA < 2.5
  - OR missing_assignments >= 3
  - OR attendance_pct < 75
  - OR trend == "declining"
"""

from __future__ import annotations

from typing import Any


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STUDENT ROSTER
# Keys mirror what the widgets read. Grade history is paired
# (term_label, grade_pct) — the renderer draws an inline SVG line chart.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STUDENTS: list[dict[str, Any]] = [
    {
        "id": "S-1001",
        "name": "Maria Chen",
        "grade_level": 11,
        "advisor": "Mr. Patel",
        "photo_initials": "MC",
        "gpa": 3.8,
        "attendance_pct": 92,
        "missing_assignments": 1,
        "current_grade": "A-",
        "trend": "steady",
        "trend_arrow": "→",
        "last_outreach": "2026-04-12",
        "notes": "Strong analytical student; recovering from flu absence in March.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 88},
            {"term": "Q2", "grade_pct": 86},
            {"term": "Q3", "grade_pct": 89},
            {"term": "Q4", "grade_pct": 91},
        ],
        "courses": [
            {"name": "AP Calculus BC", "instructor": "Mr. Patel", "grade": "A-", "gpa": 3.8},
            {"name": "AP English Lit", "instructor": "Ms. Okafor", "grade": "B+", "gpa": 3.6},
            {"name": "US History", "instructor": "Mr. Lindstrom", "grade": "A", "gpa": 3.9},
        ],
        "recent_assignments": [
            {"title": "Calculus pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "Macbeth essay", "status": "submitted", "due": "2026-05-15", "points": 80},
            {"title": "WWII timeline", "status": "graded", "due": "2026-05-08", "points": 92},
        ],
        "parent_email": "chen.family@example-domain.test",
        "parent_name": "Ms. Chen",
    },
    {
        "id": "S-1002",
        "name": "Devon Carter",
        "grade_level": 10,
        "advisor": "Mr. Patel",
        "photo_initials": "DC",
        "gpa": 2.1,
        "attendance_pct": 71,
        "missing_assignments": 6,
        "current_grade": "D+",
        "trend": "declining",
        "trend_arrow": "↓",
        "last_outreach": "2026-05-02",
        "notes": "At-risk: missed 4 of last 6 problem sets. Parent contacted re: attendance.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 72},
            {"term": "Q2", "grade_pct": 70},
            {"term": "Q3", "grade_pct": 65},
            {"term": "Q4", "grade_pct": 62},
        ],
        "courses": [
            {"name": "Algebra II", "instructor": "Mr. Patel", "grade": "D+", "gpa": 2.1},
            {"name": "World History", "instructor": "Ms. Okafor", "grade": "C", "gpa": 2.4},
            {"name": "Biology", "instructor": "Dr. Rasheed", "grade": "C+", "gpa": 2.6},
        ],
        "recent_assignments": [
            {"title": "Algebra pset 6", "status": "missing", "due": "2026-05-20", "points": 30},
            {"title": "Algebra pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "Bio lab writeup", "status": "late", "due": "2026-05-12", "points": 65},
        ],
        "parent_email": "carter.family@example-domain.test",
        "parent_name": "Mr. Carter",
    },
    {
        "id": "S-1003",
        "name": "Aisha Mensah",
        "grade_level": 12,
        "advisor": "Ms. Okafor",
        "photo_initials": "AM",
        "gpa": 4.0,
        "attendance_pct": 98,
        "missing_assignments": 0,
        "current_grade": "A",
        "trend": "steady",
        "trend_arrow": "→",
        "last_outreach": "2026-03-20",
        "notes": "National Merit semifinalist; considering Caltech early action.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 96},
            {"term": "Q2", "grade_pct": 97},
            {"term": "Q3", "grade_pct": 95},
            {"term": "Q4", "grade_pct": 98},
        ],
        "courses": [
            {"name": "AP Calculus BC", "instructor": "Mr. Patel", "grade": "A", "gpa": 4.0},
            {"name": "AP Chemistry", "instructor": "Dr. Rasheed", "grade": "A", "gpa": 3.95},
            {"name": "AP English Lit", "instructor": "Ms. Okafor", "grade": "A-", "gpa": 3.85},
        ],
        "recent_assignments": [
            {"title": "Calculus pset 7", "status": "submitted", "due": "2026-05-22", "points": 25},
            {"title": "Chem titration lab", "status": "graded", "due": "2026-05-10", "points": 98},
        ],
        "parent_email": "mensah.family@example-domain.test",
        "parent_name": "Mrs. Mensah",
    },
    {
        "id": "S-1004",
        "name": "Owen Reilly",
        "grade_level": 10,
        "advisor": "Mr. Patel",
        "photo_initials": "OR",
        "gpa": 1.8,
        "attendance_pct": 62,
        "missing_assignments": 8,
        "current_grade": "F",
        "trend": "declining",
        "trend_arrow": "↓",
        "last_outreach": "2026-05-20",
        "notes": "URGENT: failing across all courses. Counselor + parents meeting scheduled.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 68},
            {"term": "Q2", "grade_pct": 60},
            {"term": "Q3", "grade_pct": 56},
            {"term": "Q4", "grade_pct": 52},
        ],
        "courses": [
            {"name": "Algebra II", "instructor": "Mr. Patel", "grade": "F", "gpa": 1.8},
            {"name": "World History", "instructor": "Ms. Okafor", "grade": "D", "gpa": 2.2},
            {"name": "Biology", "instructor": "Dr. Rasheed", "grade": "C-", "gpa": 2.5},
        ],
        "recent_assignments": [
            {"title": "Algebra pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "WWII essay", "status": "missing", "due": "2026-05-15", "points": 60},
            {"title": "Bio cell lab", "status": "missing", "due": "2026-05-08", "points": 50},
        ],
        "parent_email": "reilly.family@example-domain.test",
        "parent_name": "Ms. Reilly",
    },
    {
        "id": "S-1005",
        "name": "Leah Kowalski",
        "grade_level": 11,
        "advisor": "Mr. Patel",
        "photo_initials": "LK",
        "gpa": 2.4,
        "attendance_pct": 80,
        "missing_assignments": 3,
        "current_grade": "C",
        "trend": "declining",
        "trend_arrow": "↓",
        "last_outreach": "2026-05-15",
        "notes": "Family situation impacting focus; counselor looped in.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 84},
            {"term": "Q2", "grade_pct": 78},
            {"term": "Q3", "grade_pct": 72},
            {"term": "Q4", "grade_pct": 70},
        ],
        "courses": [
            {"name": "AP Calculus BC", "instructor": "Mr. Patel", "grade": "C", "gpa": 2.4},
            {"name": "AP English Lit", "instructor": "Ms. Okafor", "grade": "B+", "gpa": 3.4},
            {"name": "US History", "instructor": "Mr. Lindstrom", "grade": "B+", "gpa": 3.5},
        ],
        "recent_assignments": [
            {"title": "Calculus pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "Macbeth essay", "status": "late", "due": "2026-05-15", "points": 72},
        ],
        "parent_email": "kowalski.family@example-domain.test",
        "parent_name": "Mr. Kowalski",
    },
    {
        "id": "S-1006",
        "name": "Eliana Ferreira",
        "grade_level": 9,
        "advisor": "Ms. Okafor",
        "photo_initials": "EF",
        "gpa": 2.5,
        "attendance_pct": 79,
        "missing_assignments": 4,
        "current_grade": "C+",
        "trend": "declining",
        "trend_arrow": "↓",
        "last_outreach": "2026-05-10",
        "notes": "Missing assignments piling up; reach out to parents this week.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 82},
            {"term": "Q2", "grade_pct": 80},
            {"term": "Q3", "grade_pct": 75},
            {"term": "Q4", "grade_pct": 73},
        ],
        "courses": [
            {"name": "Algebra I", "instructor": "Mr. Patel", "grade": "C+", "gpa": 2.5},
            {"name": "Physical Science", "instructor": "Dr. Rasheed", "grade": "C+", "gpa": 2.7},
            {"name": "English 9", "instructor": "Ms. Okafor", "grade": "B-", "gpa": 2.9},
        ],
        "recent_assignments": [
            {"title": "Algebra pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "Phys-sci density lab", "status": "missing", "due": "2026-05-19", "points": 40},
        ],
        "parent_email": "ferreira.family@example-domain.test",
        "parent_name": "Mr. Ferreira",
    },
    {
        "id": "S-1007",
        "name": "Bryce Tanaka",
        "grade_level": 9,
        "advisor": "Mr. Patel",
        "photo_initials": "BT",
        "gpa": 2.8,
        "attendance_pct": 85,
        "missing_assignments": 2,
        "current_grade": "B-",
        "trend": "improving",
        "trend_arrow": "↑",
        "last_outreach": "2026-04-28",
        "notes": "Strong recovery after early-term struggle.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 70},
            {"term": "Q2", "grade_pct": 74},
            {"term": "Q3", "grade_pct": 80},
            {"term": "Q4", "grade_pct": 83},
        ],
        "courses": [
            {"name": "Algebra I", "instructor": "Mr. Patel", "grade": "B-", "gpa": 2.8},
            {"name": "Physical Science", "instructor": "Dr. Rasheed", "grade": "B", "gpa": 3.1},
            {"name": "English 9", "instructor": "Ms. Okafor", "grade": "B-", "gpa": 2.9},
        ],
        "recent_assignments": [
            {"title": "Algebra pset 7", "status": "submitted", "due": "2026-05-22", "points": 25},
            {"title": "Phys-sci density lab", "status": "graded", "due": "2026-05-19", "points": 84},
        ],
        "parent_email": "tanaka.family@example-domain.test",
        "parent_name": "Mrs. Tanaka",
    },
    {
        "id": "S-1008",
        "name": "Marcus Boateng",
        "grade_level": 11,
        "advisor": "Mr. Lindstrom",
        "photo_initials": "MB",
        "gpa": 3.4,
        "attendance_pct": 90,
        "missing_assignments": 1,
        "current_grade": "B+",
        "trend": "improving",
        "trend_arrow": "↑",
        "last_outreach": "2026-04-18",
        "notes": "Recovered from rough Q2.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 82},
            {"term": "Q2", "grade_pct": 78},
            {"term": "Q3", "grade_pct": 86},
            {"term": "Q4", "grade_pct": 88},
        ],
        "courses": [
            {"name": "Algebra II", "instructor": "Mr. Patel", "grade": "B+", "gpa": 3.3},
            {"name": "US History", "instructor": "Mr. Lindstrom", "grade": "A-", "gpa": 3.5},
            {"name": "Biology", "instructor": "Dr. Rasheed", "grade": "B+", "gpa": 3.4},
        ],
        "recent_assignments": [
            {"title": "WWII essay", "status": "graded", "due": "2026-05-15", "points": 90},
        ],
        "parent_email": "boateng.family@example-domain.test",
        "parent_name": "Mr. Boateng",
    },
    {
        "id": "S-1009",
        "name": "Priya Sundaram",
        "grade_level": 12,
        "advisor": "Ms. Okafor",
        "photo_initials": "PS",
        "gpa": 3.7,
        "attendance_pct": 93,
        "missing_assignments": 1,
        "current_grade": "A-",
        "trend": "steady",
        "trend_arrow": "→",
        "last_outreach": "2026-04-05",
        "notes": "Strong in problem-solving; bound for Stanford.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 89},
            {"term": "Q2", "grade_pct": 91},
            {"term": "Q3", "grade_pct": 90},
            {"term": "Q4", "grade_pct": 92},
        ],
        "courses": [
            {"name": "AP Calculus BC", "instructor": "Mr. Patel", "grade": "A-", "gpa": 3.7},
            {"name": "AP Chemistry", "instructor": "Dr. Rasheed", "grade": "B+", "gpa": 3.6},
            {"name": "AP English Lit", "instructor": "Ms. Okafor", "grade": "A", "gpa": 3.8},
        ],
        "recent_assignments": [
            {"title": "Calculus pset 7", "status": "submitted", "due": "2026-05-22", "points": 25},
        ],
        "parent_email": "sundaram.family@example-domain.test",
        "parent_name": "Mrs. Sundaram",
    },
    {
        "id": "S-1010",
        "name": "Jordan Whitfield",
        "grade_level": 10,
        "advisor": "Mr. Lindstrom",
        "photo_initials": "JW",
        "gpa": 3.6,
        "attendance_pct": 94,
        "missing_assignments": 0,
        "current_grade": "A-",
        "trend": "steady",
        "trend_arrow": "→",
        "last_outreach": "2026-04-22",
        "notes": "Strong all year.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 87},
            {"term": "Q2", "grade_pct": 89},
            {"term": "Q3", "grade_pct": 90},
            {"term": "Q4", "grade_pct": 91},
        ],
        "courses": [
            {"name": "Algebra II", "instructor": "Mr. Patel", "grade": "A-", "gpa": 3.6},
            {"name": "World History", "instructor": "Mr. Lindstrom", "grade": "A-", "gpa": 3.5},
        ],
        "recent_assignments": [
            {"title": "WWII essay", "status": "graded", "due": "2026-05-15", "points": 88},
        ],
        "parent_email": "whitfield.family@example-domain.test",
        "parent_name": "Mr. Whitfield",
    },
    {
        "id": "S-1011",
        "name": "Nadia Volkov",
        "grade_level": 11,
        "advisor": "Mr. Lindstrom",
        "photo_initials": "NV",
        "gpa": 3.2,
        "attendance_pct": 88,
        "missing_assignments": 2,
        "current_grade": "B",
        "trend": "steady",
        "trend_arrow": "→",
        "last_outreach": "2026-04-29",
        "notes": "Steady but should push for A-range with focused practice.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 84},
            {"term": "Q2", "grade_pct": 83},
            {"term": "Q3", "grade_pct": 85},
            {"term": "Q4", "grade_pct": 84},
        ],
        "courses": [
            {"name": "AP Calculus BC", "instructor": "Mr. Patel", "grade": "B", "gpa": 3.2},
            {"name": "AP English Lit", "instructor": "Ms. Okafor", "grade": "B+", "gpa": 3.5},
            {"name": "US History", "instructor": "Mr. Lindstrom", "grade": "B+", "gpa": 3.3},
        ],
        "recent_assignments": [
            {"title": "Calculus pset 7", "status": "late", "due": "2026-05-22", "points": 22},
        ],
        "parent_email": "volkov.family@example-domain.test",
        "parent_name": "Mr. Volkov",
    },
    {
        "id": "S-1012",
        "name": "Samuel Okonjo",
        "grade_level": 9,
        "advisor": "Ms. Okafor",
        "photo_initials": "SO",
        "gpa": 2.2,
        "attendance_pct": 73,
        "missing_assignments": 5,
        "current_grade": "C-",
        "trend": "declining",
        "trend_arrow": "↓",
        "last_outreach": "2026-05-18",
        "notes": "Falling behind in algebra; schedule a check-in this week.",
        "grade_history": [
            {"term": "Q1", "grade_pct": 78},
            {"term": "Q2", "grade_pct": 73},
            {"term": "Q3", "grade_pct": 68},
            {"term": "Q4", "grade_pct": 66},
        ],
        "courses": [
            {"name": "Algebra I", "instructor": "Mr. Patel", "grade": "C-", "gpa": 2.2},
            {"name": "Physical Science", "instructor": "Dr. Rasheed", "grade": "C", "gpa": 2.4},
            {"name": "English 9", "instructor": "Ms. Okafor", "grade": "B-", "gpa": 2.8},
        ],
        "recent_assignments": [
            {"title": "Algebra pset 7", "status": "missing", "due": "2026-05-22", "points": 25},
            {"title": "Phys-sci density lab", "status": "late", "due": "2026-05-19", "points": 60},
        ],
        "parent_email": "okonjo.family@example-domain.test",
        "parent_name": "Mrs. Okonjo",
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ASSIGNMENT VIEWS
# Each assignment has a sortable per-student status row. Keyed by a stable
# assignment_id so the agent can reference it.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASSIGNMENTS: dict[str, dict[str, Any]] = {
    "calc-pset-7": {
        "id": "calc-pset-7",
        "title": "Calculus pset 7 — series convergence",
        "course": "AP Calculus BC",
        "due": "2026-05-22",
        "total_points": 25,
        "instructor": "Mr. Patel",
    },
    "alg-pset-7": {
        "id": "alg-pset-7",
        "title": "Algebra pset 7 — quadratic systems",
        "course": "Algebra I / II",
        "due": "2026-05-22",
        "total_points": 25,
        "instructor": "Mr. Patel",
    },
    "macbeth-essay": {
        "id": "macbeth-essay",
        "title": "Macbeth essay — Act V analysis",
        "course": "AP English Lit",
        "due": "2026-05-15",
        "total_points": 80,
        "instructor": "Ms. Okafor",
    },
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUERY HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def is_at_risk(student: dict[str, Any]) -> bool:
    """ScholarAI at-risk heuristic. See module docstring."""
    return (
        student["gpa"] < 2.5
        or student["missing_assignments"] >= 3
        or student["attendance_pct"] < 75
        or student["trend"] == "declining"
    )


def get_at_risk(limit: int = 5) -> list[dict[str, Any]]:
    """Return up to `limit` at-risk students, worst-first by GPA."""
    at_risk = [s for s in STUDENTS if is_at_risk(s)]
    at_risk.sort(key=lambda s: s["gpa"])
    return at_risk[:limit]


def get_student(student_ref: str) -> dict[str, Any] | None:
    """Look up a student by ID (`S-1001`) or fuzzy name match (`Maria`)."""
    ref = student_ref.strip().lower()
    if not ref:
        return None
    # Exact ID match first.
    for s in STUDENTS:
        if s["id"].lower() == ref:
            return s
    # Fall through to substring match on full name.
    for s in STUDENTS:
        if ref in s["name"].lower():
            return s
    return None


def get_assignment_status(assignment_ref: str) -> dict[str, Any] | None:
    """Return an assignment + per-student status rows.

    `assignment_ref` accepts an assignment ID (`calc-pset-7`) or a substring
    of the assignment title (`calculus`).
    """
    ref = assignment_ref.strip().lower()
    if not ref:
        return None

    assignment = None
    for aid, a in ASSIGNMENTS.items():
        if aid.lower() == ref or ref in a["title"].lower() or ref in a["course"].lower():
            assignment = a
            break
    if assignment is None:
        return None

    # Synthesize a per-student row by scanning each student's recent_assignments
    # for a title match. Default to "not assigned" when the student doesn't
    # have a row for this assignment.
    rows: list[dict[str, Any]] = []
    for s in STUDENTS:
        match = None
        for ra in s["recent_assignments"]:
            if ra["title"].lower() in assignment["title"].lower() or (
                assignment["title"].lower().split(" —")[0] in ra["title"].lower()
            ):
                match = ra
                break
        rows.append(
            {
                "student_id": s["id"],
                "student_name": s["name"],
                "status": match["status"] if match else "not assigned",
                "points": match.get("points") if match else None,
                "due": match["due"] if match else assignment["due"],
            }
        )

    return {
        "assignment": assignment,
        "rows": rows,
    }
