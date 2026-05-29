"""
Tools for the Contract Review Copilot example.

This is the DB-backed, multi-surface version. Documents live in a SQLite DB
(see `legal_db.py`) seeded with a realistic mid-sized law-firm portfolio
(15 matters, 30 documents, real risk flags + cited authorities, ported from
the legal-copilot-demo reference repo).

Every tool returns an A2UI envelope rendered against the `legal-paper-catalog`.
Surfaces:
- review_document(document_id):    full paper surface with verdict, body,
                                   risk-flag margin notes, and citations.
- list_firm_matters(status?):      directory of matters as paper cards.
- find_expiring_contracts(days):   expiring-soon directory.
- search_legal_documents(query):   keyword search results.
- apply_redline(redline_id, decision): legacy round-trip kept for the
                                   inline accept/reject flow.

Schema discovery follows the canonical fixed-schema pattern in
agent/src/a2ui_fixed_schema.py:search_flights. Inline schemas (no JSON file
on disk) are used for the directory tools so a hacker can add a new
directory shape without touching the schemas/ folder.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from copilotkit import a2ui
from langchain.tools import tool

from queries import (
    find_expiring_contracts as _q_find_expiring_contracts,
    firm_overview,
    get_document as _q_get_document,
    list_documents as _q_list_documents,
    list_matters as _q_list_matters,
    search_documents as _q_search_documents,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Surface + catalog identity. Catalog is namespaced per example to avoid
# collision with the base starter's app-dashboard-catalog.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATALOG_ID = "copilotkit://legal-paper-catalog"
SURFACE_ID = "contract-review"

_THIS_DIR = Path(__file__).parent
# Schema lives at the example root (../schemas/), not inside agent/. The
# example's catalog package and schema/fixture live together at
# other-examples/legal-contract-review/schemas/.
_SCHEMA_PATH = _THIS_DIR.parent / "schemas" / "contract_review.json"


def _load_review_schema() -> Any:
    """Load the A2UI component schema for the single-document review surface.

    Mirrors the original fallback: if the on-disk schema is missing the tool
    still produces a tiny paper surface (`fallback-note` is the tell).
    """
    if _SCHEMA_PATH.exists():
        return a2ui.load_schema(_SCHEMA_PATH)
    return [
        {
            "id": "root",
            "component": "Column",
            "gap": 12,
            "children": [
                {"id": "fallback-title", "component": "Heading", "text": {"path": "/title"}},
                {
                    "id": "fallback-note",
                    "component": "Text",
                    "text": "Contract review schema not yet shipped (B6).",
                },
            ],
        }
    ]


REVIEW_SCHEMA = _load_review_schema()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# In-memory document state for the apply_redline round-trip. The agent
# loads a document into this slot via review_document(), then apply_redline
# mutates it and re-emits update_data_model patches.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_DOCUMENT_STATE: dict[str, Any] = {}


def _set_doc(doc: dict[str, Any]) -> None:
    if doc is _DOCUMENT_STATE:
        return
    _DOCUMENT_STATE.clear()
    _DOCUMENT_STATE.update(doc)


def _get_doc() -> dict[str, Any]:
    return _DOCUMENT_STATE


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Data-model adapters: convert DB rows into the shape the legal-paper
# catalog expects (matches schemas/contract_review.json's path bindings).
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_SEVERITY_TO_MARGIN: dict[str, str] = {
    "high": "critical",
    "medium": "warning",
    "low": "info",
}

_RISK_TO_TONE: dict[str, str] = {
    "high": "negative",
    "medium": "neutral",
    "low": "positive",
}


def _split_into_clauses(body: str) -> list[str]:
    """Best-effort split of a paragraph into clause-sized chunks for the
    paper surface. Real contracts get split on '. ' boundaries; legal briefs
    end up as one or two long clauses, which is fine — the verdict and
    margin notes carry the analysis."""
    body = (body or "").strip()
    if not body:
        return []
    chunks: list[str] = []
    cur = ""
    for sentence in body.replace("\n", " ").split(". "):
        sentence = sentence.strip()
        if not sentence:
            continue
        if not sentence.endswith("."):
            sentence += "."
        if len(cur) + len(sentence) < 320:
            cur = (cur + " " + sentence).strip()
        else:
            if cur:
                chunks.append(cur)
            cur = sentence
    if cur:
        chunks.append(cur)
    return chunks or [body]


def _document_data_model(doc: dict[str, Any]) -> dict[str, Any]:
    risks = doc.get("risks", []) or []
    authorities = doc.get("authorities", []) or []
    clause_texts = _split_into_clauses(doc.get("body", ""))

    # Margin notes built from real risk_flags rows. Each risk becomes a note
    # attached to the first clause by default so the warm right margin lights
    # up — the visual payoff of the paper catalog.
    margin_notes = []
    for r in risks:
        cite = None
        # Attach an authority citation when we have one for this document.
        if authorities:
            a = authorities[0]
            cite = {
                "label": a["citation"],
                "pinpoint": a.get("court") or "",
            }
        margin_notes.append(
            {
                "id": f"margin-{r['id']}",
                "body": f"{r['clause']}: {r['note']}",
                "severity": _SEVERITY_TO_MARGIN.get(r["severity"], "info"),
                **({"citation": cite} if cite else {}),
            }
        )

    clauses = []
    for idx, body in enumerate(clause_texts):
        is_first = idx == 0
        clauses.append(
            {
                "id": f"clause-{idx + 1}",
                "number": str(idx + 1),
                "heading": doc["title"] if is_first else f"§ {idx + 1}",
                "body": body,
                "risk": doc.get("riskLevel", "low"),
                # All risk notes ride on the first clause so the right
                # margin in the paper view is dense, not sparse.
                "marginNotes": margin_notes if is_first else [],
                "redlines": [],
            }
        )

    return {
        "id": f"doc-{doc['id']}",
        "title": doc["title"],
        # parties is z.array(z.string()) per the catalog definitions; flatten
        # the counterparty + governing-law pair into two friendly strings.
        "parties": _document_parties(doc),
        "effectiveDate": doc.get("effectiveDate") or "—",
        "verdict": {
            "headline": f"Risk: {doc.get('riskLevel', 'low').upper()} · {doc.get('docType', 'Document')}",
            "summary": doc.get("summary", ""),
            "tone": _RISK_TO_TONE.get(doc.get("riskLevel", "low"), "neutral"),
        },
        "clauses": clauses,
        # Top-level redlines list is kept so apply_redline has a place to
        # work even when the document has none seeded yet.
        "redlines": [],
        # Carry the raw metadata so the agent (and downstream surfaces)
        # can reference it without another DB roundtrip.
        "_meta": {
            "docId": doc["id"],
            "matter": doc.get("matterName"),
            "client": doc.get("clientName"),
            "status": doc.get("status"),
            "value": doc.get("value"),
            "governingLaw": doc.get("governingLaw"),
            "expirationDate": doc.get("expirationDate"),
            "counterparty": doc.get("counterparty"),
            "authorities": authorities,
        },
    }


def _document_parties(doc: dict[str, Any]) -> list[str]:
    bits = []
    if doc.get("counterparty"):
        bits.append(f"Counterparty: {doc['counterparty']}")
    if doc.get("clientName"):
        bits.append(f"Client: {doc['clientName']}")
    if doc.get("governingLaw"):
        bits.append(f"Governing law: {doc['governingLaw']}")
    return bits or ["Internal memorandum"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Tool 1 — review_document. Full paper surface for a single DB document.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@tool
def review_document(document_id: int) -> str:
    """Open a contract or brief from the firm's database and render the
    paper-style review surface (verdict + body + risk-flag margin notes).

    document_id is the integer primary key from the `documents` table.
    Useful IDs include:
      1  — Master Supply Agreement (Northwind/Apex Servos) — HIGH risk
      3  — Share Purchase Agreement (Apex acquisition)     — HIGH risk
      7  — CRISPR Platform License (Halcyon/Genova)        — HIGH risk
      9  — Streaming Distribution Agreement (Cobalt/Lumen+) — HIGH risk
      11 — Solar PPA (Verdant/Pacifica Grid)               — HIGH risk
      16 — Fund IV LPA (Meridian)                          — HIGH risk

    Call list_firm_matters() or find_expiring_contracts() first if you don't
    know the ID.
    """
    doc = _q_get_document(int(document_id))
    if not doc:
        return f"review_document: no document with id {document_id} in the firm database."

    data = _document_data_model(doc)
    _set_doc(data)

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, REVIEW_SCHEMA),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Directory-style surfaces — inline component trees built per call.
# These reuse the legal-paper-catalog: each list item is a Clause whose
# heading is the doc title and body is the doc summary, with a risk badge.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def _directory_components(doc_count: int) -> list[dict[str, Any]]:
    """Component tree for an inline directory surface. Root LegalDocumentShell
    with N Clause children, each path-bound into /items[i]."""
    children = [f"row-{i}" for i in range(doc_count)] or ["empty-row"]

    components: list[dict[str, Any]] = [
        {
            "id": "root",
            "component": "LegalDocumentShell",
            "title": {"path": "/title"},
            "parties": {"path": "/parties"},
            "effectiveDate": {"path": "/effectiveDate"},
            "children": children,
        },
    ]
    for i in range(doc_count):
        components.append(
            {
                "id": f"row-{i}",
                "component": "Clause",
                "number": {"path": f"/items/{i}/number"},
                "heading": {"path": f"/items/{i}/heading"},
                "body": {"path": f"/items/{i}/body"},
                "risk": {"path": f"/items/{i}/risk"},
            }
        )
    if doc_count == 0:
        components.append(
            {
                "id": "empty-row",
                "component": "Clause",
                "number": "—",
                "heading": "No matches",
                "body": "Try a different query or a wider window.",
                "risk": "low",
            }
        )
    return components


def _doc_row(idx: int, doc: dict[str, Any]) -> dict[str, Any]:
    label = doc.get("docType", "Document")
    counterparty = doc.get("counterparty") or "Internal"
    matter = doc.get("matterName", "")
    body = f"{label} · {counterparty}\n{matter}\n— {doc['summary']}"
    return {
        "number": str(idx + 1),
        "heading": doc["title"],
        "body": body,
        "risk": doc.get("riskLevel", "low"),
    }


@tool
def list_firm_matters(status: str = "active") -> str:
    """List the firm's matters with their client, practice area, and document
    count. Renders as a paper-style directory so the user can pick a matter
    to drill into.

    status is one of "active", "on-hold", "closed", or "all" (default: active).
    """
    matters = _q_list_matters(None if status == "all" else status)
    overview = firm_overview()

    components = _directory_components(len(matters))
    items = []
    for i, m in enumerate(matters):
        items.append(
            {
                "number": str(i + 1),
                "heading": f"{m['name']}",
                "body": (
                    f"{m['practiceArea']} · {m['clientName']} · "
                    f"{m['leadAttorney']}\n"
                    f"Status: {m['status']} · Opened {m['openedAt']} · "
                    f"{m['documentCount']} document(s)"
                ),
                "risk": "medium" if m["status"] == "active" else "low",
            }
        )

    data = {
        "title": f"{overview['firmName']} · Matters ({status})",
        "parties": [
            f"As of {overview['today']}",
            f"{overview['activeMatters']} active / {overview['totalMatters']} total",
            f"{overview['docsInReview']} in review · {overview['highRiskFlags']} high-risk flags",
        ],
        "effectiveDate": overview["today"],
        "items": items,
    }

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, components),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


@tool
def find_expiring_contracts(within_days: int = 90) -> str:
    """Find executed contracts that expire within the given window and
    render them as a paper-style directory sorted by expiration date.

    Defaults to a 90-day window. Use a larger window (e.g. 180) to surface
    auto-renewal traps further out.
    """
    docs = _q_find_expiring_contracts(int(within_days))
    components = _directory_components(len(docs))

    items = []
    for i, d in enumerate(docs):
        items.append(
            {
                "number": str(i + 1),
                "heading": d["title"],
                "body": (
                    f"{d['docType']} · {d['counterparty'] or 'Internal'} · "
                    f"{d['matterName']}\n"
                    f"Expires: {d['expirationDate']} · "
                    f"Governing law: {d.get('governingLaw') or '—'}\n"
                    f"— {d['summary']}"
                ),
                "risk": d.get("riskLevel", "low"),
            }
        )

    data = {
        "title": f"Contracts expiring within {within_days} days",
        "parties": [
            f"Window: TODAY → +{within_days}d",
            f"{len(docs)} contract(s) flagged",
        ],
        "effectiveDate": "—",
        "items": items,
    }

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, components),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


@tool
def search_legal_documents(query: str, limit: int = 8) -> str:
    """Search the firm's document corpus by title, counterparty, summary,
    body text, matter name, client name, or doc type. Renders results as a
    paper-style directory.
    """
    docs = _q_search_documents(query, limit=int(limit))
    components = _directory_components(len(docs))

    items = [
        {
            **_doc_row(i, d),
            "body": (
                f"{d['docType']} · {d['counterparty'] or 'Internal'} · "
                f"{d['matterName']}\n— {d['summary']}"
            ),
        }
        for i, d in enumerate(docs)
    ]

    data = {
        "title": f"Search: \"{query}\"",
        "parties": [
            f"{len(docs)} result(s)",
            "Sterling & Crane LLP",
        ],
        "effectiveDate": "—",
        "items": items,
    }

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, components),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


@tool
def list_matter_documents(matter_id: int) -> str:
    """List every document attached to a single matter as a paper-style
    directory. Use after list_firm_matters to drill in on a specific engagement.
    """
    docs = _q_list_documents(int(matter_id))
    components = _directory_components(len(docs))

    items = []
    for i, d in enumerate(docs):
        items.append(
            {
                "number": str(i + 1),
                "heading": d["title"],
                "body": (
                    f"{d['docType']} · {d['status']} · "
                    f"{d['counterparty'] or 'Internal'}\n"
                    f"— {d['summary']}"
                ),
                "risk": d.get("riskLevel", "low"),
            }
        )

    matter_name = docs[0]["matterName"] if docs else f"Matter #{matter_id}"
    client_name = docs[0]["clientName"] if docs else ""
    data = {
        "title": f"{matter_name}",
        "parties": [f"Client: {client_name}", f"{len(docs)} document(s)"],
        "effectiveDate": "—",
        "items": items,
    }

    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, components),
            a2ui.update_data_model(SURFACE_ID, data),
        ],
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# apply_redline — kept from the original example. Operates on the
# in-memory document loaded by review_document().
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


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
    """Apply a user's redline decision to the current document and re-render.

    decision must be either "accepted" or "rejected".
    Used to round-trip the Accept / Reject button events back into the
    paper surface so the redline collapses to a checkmark.
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
            "Call review_document first."
        )

    redline = _find_redline(doc, redline_id)
    if redline is None:
        return f"apply_redline: redline {redline_id!r} not found in current document."

    clauses = doc.get("clauses", []) or []
    clause_idx = _find_clause_index(doc, redline.get("clauseId", ""))

    operations = [
        a2ui.update_data_model(
            SURFACE_ID,
            {"status": decision},
            path=f"/redlines/{redline_id}",
        ),
    ]

    if decision == "accepted" and clause_idx is not None:
        proposed = redline.get("proposedText", "")
        clauses[clause_idx]["body"] = proposed
        operations.append(
            a2ui.update_data_model(
                SURFACE_ID,
                {"body": proposed},
                path=f"/clauses/{clause_idx}",
            )
        )

    redline["status"] = decision
    _set_doc(doc)
    return a2ui.render(operations=operations)
