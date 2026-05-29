"""Synthetic ScholarAI dataset.

FERPA-safe demo data — every student record is fabricated. Names, IDs, and
grades are picked to give the four widget surfaces something visually
distinct to render. Real teacher/advisor copilots would query a SIS;
this module fakes it.
"""

from .students import (
    STUDENTS,
    ASSIGNMENTS,
    get_student,
    get_at_risk,
    get_assignment_status,
    is_at_risk,
)

__all__ = [
    "STUDENTS",
    "ASSIGNMENTS",
    "get_student",
    "get_at_risk",
    "get_assignment_status",
    "is_at_risk",
]
