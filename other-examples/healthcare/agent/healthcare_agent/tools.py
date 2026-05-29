"""
Tools for the RoundsAI Ward Rounds Copilot example.

- show_patient_roster: load the ward census and render the PatientRoster surface.
- show_patient_detail: drill into a single patient — vitals trend, meds, risks.
- draft_handoff_note: produce a shift-handoff draft as an editable card.

Schema discovery follows the canonical fixed-schema pattern: load JSON once
at import time, then return an a2ui.render(operations=[...]) envelope from
the tool. Pattern mirrors
other-examples/legal-contract-review/agent/legal_review_agent/tools.py.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from copilotkit import a2ui
from langchain.tools import tool

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Surface + catalog identity. Catalog is namespaced per example so it
# can't collide with the base starter's app-dashboard-catalog.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATALOG_ID = "copilotkit://healthcare-catalog"
SURFACE_ROSTER = "patient-roster"
SURFACE_DETAIL = "patient-detail"
SURFACE_HANDOFF = "handoff-note-draft"

_THIS_DIR = Path(__file__).parent
_EXAMPLE_ROOT = _THIS_DIR.parent.parent  # → other-examples/healthcare/
_SCHEMA_DIR = _EXAMPLE_ROOT / "schemas"
_DATA_DIR = _THIS_DIR / "data"


# ─── Schema discovery ────────────────────────────────────────────
def _load_schema(name: str) -> Any:
    """Load one of the example's component-tree schemas.

    Returns the components array. Falls back to a single-text-block
    placeholder so the surface is never blank when the schema file is
    missing (e.g. mid-blitz, before B6 lands).
    """
    path = _SCHEMA_DIR / f"{name}.json"
    if path.exists():
        try:
            return a2ui.load_schema(path)
        except Exception:
            pass
        # If a2ui.load_schema balks (e.g. wrapper shape), try a raw load —
        # the validator's fixture shape (a) `[components]` and (c) `{components}`
        # are both common patterns in this repo.
        try:
            raw = json.loads(path.read_text())
            if isinstance(raw, list):
                return raw
            if isinstance(raw, dict) and isinstance(raw.get("components"), list):
                return raw["components"]
            if isinstance(raw, dict) and isinstance(raw.get("schema"), list):
                return raw["schema"]
        except Exception:
            pass
    return [
        {
            "id": "root",
            "component": "Column",
            "gap": 12,
            "children": [
                {
                    "id": "fallback-note",
                    "component": "Text",
                    "text": f"Healthcare schema '{name}.json' not yet shipped.",
                }
            ],
        }
    ]


ROSTER_SCHEMA = _load_schema("patient_roster")
DETAIL_SCHEMA = _load_schema("patient_detail")
HANDOFF_SCHEMA = _load_schema("handoff_note_draft")


# ─── Data loaders (module-level, read once) ──────────────────────
def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


_PATIENTS_FILE = _DATA_DIR / "patients.json"
_VITALS_FILE = _DATA_DIR / "vitals.json"


def _load_patients() -> dict[str, Any]:
    return _load_json(_PATIENTS_FILE)


def _load_vitals() -> dict[str, Any]:
    return _load_json(_VITALS_FILE)


# ─── Patient lookup helpers ──────────────────────────────────────
_STATUS_LABEL = {
    "stable": "Stable",
    "watch": "Watch",
    "critical": "Critical",
}


def _format_meta(p: dict[str, Any]) -> str:
    age = p.get("age", "")
    sex = p.get("sex", "")
    room = p.get("room", "")
    day = p.get("admittedDays", "")
    parts: list[str] = []
    if age != "" and sex:
        parts.append(f"{age}{sex}")
    if room:
        parts.append(f"Room {room}")
    if day != "":
        parts.append(f"Day {day}")
    return " · ".join(parts)


def _find_patient(query: str) -> dict[str, Any] | None:
    """Resolve a free-form patient reference to a patient record.

    Accepts: patient id ("pt-001"), letter suffix ("A", "patient a",
    "drill into Patient A"), room number, or substring match on name.
    Returns None when nothing matches.
    """
    data = _load_patients()
    patients: list[dict[str, Any]] = data.get("patients", [])
    if not patients:
        return None
    q = (query or "").strip().lower()
    if not q:
        return patients[0]

    # Exact id match
    for p in patients:
        if p.get("id", "").lower() == q:
            return p

    # Single-letter shorthand: "A" / "patient a" / "drill into patient a"
    letter = None
    for token in q.replace(".", " ").split():
        if len(token) == 1 and token.isalpha():
            letter = token.upper()
            break
        if token.startswith("patient") and len(token) > 7:
            tail = token[7:]
            if len(tail) == 1 and tail.isalpha():
                letter = tail.upper()
                break
    if letter is None:
        # Look for "patient <letter>" two-token pattern.
        toks = q.split()
        for i, t in enumerate(toks):
            if t == "patient" and i + 1 < len(toks):
                nxt = toks[i + 1]
                if len(nxt) == 1 and nxt.isalpha():
                    letter = nxt.upper()
                    break
    if letter is not None:
        for p in patients:
            if p.get("name", "").endswith(f" {letter}"):
                return p

    # Room number match
    for p in patients:
        room = p.get("room", "").lower()
        if room and room in q:
            return p

    # Substring on name
    for p in patients:
        name = p.get("name", "").lower()
        if name and name in q:
            return p

    # Fall back to first patient — never leave the surface blank.
    return patients[0]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Tools — exposed to the agent. Each returns an a2ui.render(...) envelope.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@tool
def show_patient_roster(query: str = "") -> str:
    """Show today's ward roster as a grid of patient cards.

    Call this whenever the user asks to see, list, browse, or review
    patients on the ward — e.g. "show me today's roster", "who's on the
    unit", "list the rounds", "show me critical patients only".

    Pass the user's natural-language query — this filters by name, room,
    status, attending physician, or primary issue. If nothing matches the
    full roster is returned so the surface is never empty.

    Returns A2UI envelopes that render patient cards with name, room, age,
    status pill (Stable / Watch / Critical), primary issue, and last
    vitals time.
    """
    data = _load_patients()
    patients: list[dict[str, Any]] = data.get("patients", [])
    q = (query or "").lower()

    # Status-only filter shortcut: "critical", "show watch", etc.
    matches: list[dict[str, Any]] = []
    if q:
        for p in patients:
            haystack = " ".join(
                [
                    p.get("name", ""),
                    p.get("room", ""),
                    p.get("status", ""),
                    p.get("attending", ""),
                    p.get("primaryIssue", ""),
                ]
            ).lower()
            if any(w in haystack for w in q.split() if w):
                matches.append(p)
    if not matches:
        matches = patients

    cards = []
    for p in matches:
        status = (p.get("status") or "").strip().lower()
        cards.append(
            {
                "id": p["id"],
                "name": p.get("name", ""),
                "room": p.get("room", ""),
                "meta": _format_meta(p),
                "status": status or "stable",
                "statusLabel": _STATUS_LABEL.get(status, status.title() or "Stable"),
                "primaryIssue": p.get("primaryIssue", ""),
                "attending": p.get("attending", ""),
                "lastVitalsAt": p.get("lastVitalsAt", ""),
            }
        )

    census = data.get(
        "census",
        {
            "total": len(patients),
            "stable": sum(1 for p in patients if p.get("status") == "stable"),
            "watch": sum(1 for p in patients if p.get("status") == "watch"),
            "critical": sum(1 for p in patients if p.get("status") == "critical"),
            "alerts": sum(len(p.get("riskFlags") or []) for p in patients),
        },
    )

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ROSTER, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ROSTER, ROSTER_SCHEMA),
            a2ui.update_data_model(
                SURFACE_ROSTER,
                {
                    "title": "Today's roster",
                    "census": census,
                    "patients": cards,
                },
            ),
        ],
    )


@tool
def show_patient_detail(patient_id: str) -> str:
    """Drill into a single patient — vitals trend, meds, risk flags.

    Call this when the user asks to drill into a specific patient or
    examine their vitals/meds/risks — e.g. "drill into Patient A",
    "show me Patient D's chart", "what are Patient A's vitals".

    Pass the patient identifier the user supplied. Accepts patient id
    ("pt-001"), letter suffix ("A"), room number, or partial name —
    the tool resolves on best-effort and falls back to the first patient
    if nothing matches so the surface never goes blank.
    """
    p = _find_patient(patient_id)
    if p is None:
        return "show_patient_detail: no patients in roster — call show_patient_roster first."

    vitals_all = _load_vitals()
    vitals = vitals_all.get(p["id"]) or {
        "patientId": p["id"],
        "patientName": p.get("name", ""),
        "windowHours": 24,
        "readings": [],
    }

    # Pre-format readings so the renderer can read primitive strings
    # (path bindings inside the renderer are simpler when values are flat).
    formatted_readings = []
    for r in vitals.get("readings", []):
        ts = r.get("ts", "")
        time_label = ts[-5:] if len(ts) >= 5 else ts
        formatted_readings.append(
            {
                "ts": ts,
                "timeLabel": time_label,
                "heartRate": r.get("heartRate"),
                "systolicBp": r.get("systolicBp"),
                "diastolicBp": r.get("diastolicBp"),
                "respRate": r.get("respRate"),
                "tempC": r.get("tempC"),
                "o2Sat": r.get("o2Sat"),
                "bpLabel": f"{r.get('systolicBp', '')}/{r.get('diastolicBp', '')}",
                "note": r.get("note", ""),
            }
        )

    latest = formatted_readings[-1] if formatted_readings else {}

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_DETAIL, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_DETAIL, DETAIL_SCHEMA),
            a2ui.update_data_model(
                SURFACE_DETAIL,
                {
                    "patient": {
                        "id": p["id"],
                        "name": p.get("name", ""),
                        "room": p.get("room", ""),
                        "meta": _format_meta(p),
                        "status": p.get("status", "stable"),
                        "statusLabel": _STATUS_LABEL.get(
                            p.get("status", ""), p.get("status", "").title() or "Stable"
                        ),
                        "primaryIssue": p.get("primaryIssue", ""),
                        "attending": p.get("attending", ""),
                        "allergies": p.get("allergies", "None known"),
                    },
                    "vitals": {
                        "windowHours": vitals.get("windowHours", 24),
                        "readings": formatted_readings,
                        "latest": latest,
                    },
                    "meds": p.get("meds", []),
                    "riskFlags": p.get("riskFlags", []),
                },
            ),
        ],
    )


@tool
def draft_handoff_note(focus_patient: str = "") -> str:
    """Draft a shift-handoff note for the night-shift charge nurse.

    Call this when the user asks to draft, write, or compose a handoff —
    e.g. "draft a handoff note", "write a night-shift handoff", "summarize
    today's rounds for the on-call".

    Pass the patient identifier when the handoff should focus on one
    patient ("Patient A"), or an empty string for a ward-wide summary.
    The draft renders as an editable text card with Send / Edit / Discard
    actions.
    """
    data = _load_patients()
    patients: list[dict[str, Any]] = data.get("patients", [])
    focus = _find_patient(focus_patient) if focus_patient else None

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = []
    if focus is not None:
        risks = focus.get("riskFlags", []) or []
        meds = focus.get("meds", []) or []
        lines.append(f"NIGHT-SHIFT HANDOFF — {now} UTC")
        lines.append(f"Focus patient: {focus.get('name', '')} · Room {focus.get('room', '')}")
        lines.append("")
        lines.append(f"Primary issue: {focus.get('primaryIssue', '')}")
        lines.append(f"Attending: {focus.get('attending', '')}")
        lines.append(f"Allergies: {focus.get('allergies', 'None known')}")
        lines.append("")
        if risks:
            lines.append("Active concerns:")
            for r in risks:
                lines.append(f"  - [{r.get('severity', '').upper()}] {r.get('label', '')}")
                if r.get("detail"):
                    lines.append(f"      {r['detail']}")
        else:
            lines.append("No active concerns flagged.")
        lines.append("")
        if meds:
            lines.append("Active orders:")
            for m in meds[:6]:
                lines.append(f"  - {m.get('name', '')} {m.get('dose', '')} ({m.get('indication', '')})")
        lines.append("")
        lines.append("Plan: continue current orders. Reassess at 22:00 rounds.")
    else:
        census = data.get(
            "census",
            {
                "total": len(patients),
                "stable": 0,
                "watch": 0,
                "critical": 0,
                "alerts": 0,
            },
        )
        lines.append(f"NIGHT-SHIFT HANDOFF — {now} UTC")
        lines.append(
            f"Census: {census.get('total')} total — "
            f"{census.get('stable')} stable · "
            f"{census.get('watch')} watch · "
            f"{census.get('critical')} critical · "
            f"{census.get('alerts')} active alerts"
        )
        lines.append("")
        for p in patients:
            status = (p.get("status") or "stable").upper()
            lines.append(
                f"  - {p.get('name', '')} (Room {p.get('room', '')}) — [{status}] {p.get('primaryIssue', '')}"
            )
        lines.append("")
        lines.append("Watch list: re-evaluate any 'watch' or 'critical' patients at 22:00 rounds.")

    body = "\n".join(lines)

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_HANDOFF, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_HANDOFF, HANDOFF_SCHEMA),
            a2ui.update_data_model(
                SURFACE_HANDOFF,
                {
                    "title": "Night-shift handoff (draft)",
                    "subtitle": (
                        f"Focus: {focus.get('name', '')}"
                        if focus is not None
                        else "Ward-wide summary"
                    ),
                    "body": body,
                    "patientName": focus.get("name", "") if focus is not None else "",
                    "status": "draft",
                },
            ),
        ],
    )


healthcare_tools = [show_patient_roster, show_patient_detail, draft_handoff_note]
