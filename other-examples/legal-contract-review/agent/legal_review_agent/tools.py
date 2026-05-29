"""
Tools for the Contract Review Copilot example.

- review_contract: load a sample contract + render the A2UI contract-review surface.
- apply_redline: round-trip a user's accept/reject decision back into the document
  state so the rendered UI updates.

Schema discovery follows the canonical fixed-schema pattern in
agent/src/a2ui_fixed_schema.py:search_flights — load JSON once at import time,
then return an a2ui.render(operations=[...]) envelope from the tool.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from copilotkit import a2ui
from langchain.tools import tool

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Surface + catalog identity. Catalog is namespaced per example to avoid
# collision with the base starter's app-dashboard-catalog.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATALOG_ID = "copilotkit://legal-paper-catalog"
SURFACE_ID = "contract-review"

_THIS_DIR = Path(__file__).parent
_SCHEMA_PATH = _THIS_DIR / "schemas" / "contract_review.json"
_DATA_DIR = _THIS_DIR / "data"


def _load_schema() -> Any:
    """Load the A2UI component schema for the contract-review surface.

    B6 ships schemas/contract_review.json. If it's not on disk yet (e.g. mid-blitz),
    fall back to a minimal placeholder that renders a single Text block. The fallback
    is intentionally ugly — its presence in the rendered surface is a tell that B6
    hasn't merged yet.
    """
    if _SCHEMA_PATH.exists():
        return a2ui.load_schema(_SCHEMA_PATH)

    # Fallback stub — keep this small and obviously placeholder-ish.
    return [
        {
            "id": "root",
            "component": "Column",
            "gap": 12,
            "children": [
                {
                    "id": "fallback-title",
                    "component": "Heading",
                    "text": {"path": "/title"},
                },
                {
                    "id": "fallback-note",
                    "component": "Text",
                    "text": "Contract review schema not yet shipped (B6).",
                },
            ],
        }
    ]


CONTRACT_REVIEW_SCHEMA = _load_schema()


def _load_sample(name: str) -> dict[str, Any]:
    """Load a sample contract JSON document from the data/ dir."""
    candidate = _DATA_DIR / f"{name}.json"
    if not candidate.exists():
        # Fall back to whichever JSON we can find so review_contract never
        # hard-fails in the demo path.
        candidates = sorted(_DATA_DIR.glob("*.json"))
        if not candidates:
            raise FileNotFoundError(
                f"No sample contracts found in {_DATA_DIR}. "
                "Expected at least one .json file."
            )
        candidate = candidates[0]
    return json.loads(candidate.read_text())


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# In-memory document store. The agent re-loads the document from disk every
# review_contract call, then keeps the working copy here so apply_redline can
# mutate it and re-render. Restart the agent process to reset.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_DOCUMENT_STATE: dict[str, Any] = {}


def _set_doc(doc: dict[str, Any]) -> None:
    # Copy in. We deliberately don't replace _DOCUMENT_STATE itself so that
    # outstanding references (e.g. from _get_doc()) keep pointing at live data.
    if doc is _DOCUMENT_STATE:
        # Already pointing at the live state — nothing to copy. clear() + update()
        # in this case would self-destruct.
        return
    _DOCUMENT_STATE.clear()
    _DOCUMENT_STATE.update(doc)


def _get_doc() -> dict[str, Any]:
    # Return the live state. Callers may mutate in place; downstream re-renders
    # see the mutation immediately.
    return _DOCUMENT_STATE


@tool
def review_contract(document_name: str = "nda") -> str:
    """Review a sample contract and display the redline UI.

    Pass a document_name like "nda" or "saas-agreement" to load one of the
    sample contracts shipped with this example. Returns an A2UI envelope that
    creates the contract-review surface, loads the component schema, and
    populates it with the document data.
    """
    doc = _load_sample(document_name)
    _set_doc(doc)

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, CONTRACT_REVIEW_SCHEMA),
            a2ui.update_data_model(SURFACE_ID, doc),
        ],
    )


def _find_redline(doc: dict[str, Any], redline_id: str) -> dict[str, Any] | None:
    for rl in doc.get("redlines", []) or []:
        if rl.get("id") == redline_id:
            return rl
    return None


def _find_clause_index(doc: dict[str, Any], clause_id: str) -> int | None:
    for idx, clause in enumerate(doc.get("clauses", []) or []):
        if clause.get("id") == clause_id:
            return idx
    return None


@tool
def apply_redline(redline_id: str, decision: str) -> str:
    """Apply a user's redline decision to the contract and re-render.

    decision must be either "accepted" or "rejected".
    - On "accepted": replace the matching clause body with the redline's
      proposedText and mark the redline status as "accepted".
    - On "rejected": leave the clause body untouched but mark the redline
      status as "rejected".

    Either way, re-emit the updated data model so the rendered UI reflects
    the new state.
    """
    decision = (decision or "").strip().lower()
    if decision not in {"accepted", "rejected"}:
        return (
            f"apply_redline: invalid decision {decision!r}; "
            "expected 'accepted' or 'rejected'."
        )

    doc = _get_doc()
    if not doc:
        return (
            "apply_redline: no contract loaded yet. "
            "Call review_contract first."
        )

    redline = _find_redline(doc, redline_id)
    if redline is None:
        return f"apply_redline: redline {redline_id!r} not found in current document."

    clauses = doc.get("clauses", []) or []
    clause_idx = _find_clause_index(doc, redline.get("clauseId", ""))

    operations = [
        # Always patch /redlines/{id}/status.
        a2ui.update_data_model(
            SURFACE_ID,
            {"status": decision},
            path=f"/redlines/{redline_id}",
        ),
    ]

    if decision == "accepted" and clause_idx is not None:
        proposed = redline.get("proposedText", "")
        # Mutate the in-memory doc so subsequent renders are consistent.
        clauses[clause_idx]["body"] = proposed
        operations.append(
            a2ui.update_data_model(
                SURFACE_ID,
                {"body": proposed},
                path=f"/clauses/{clause_idx}",
            )
        )

    # Mutate the in-memory redline status too so a follow-up review_contract
    # call (or a later patch) sees the most recent decision.
    redline["status"] = decision
    _set_doc(doc)

    return a2ui.render(operations=operations)


# Keep an ID generator handy so future tools can mint new redlines if needed.
def _new_id() -> str:
    return str(uuid.uuid4())
