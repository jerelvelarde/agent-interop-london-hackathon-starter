"""
Query helpers over the legal SQLite database.

Mirrors lib/legal/queries.ts in the legal-copilot-demo reference repo. Each
function returns plain dicts (or lists thereof) so the tool layer can feed
them straight into A2UI envelopes via a2ui.render(...).
"""

from __future__ import annotations

from typing import Any

from legal_db import FIRM_NAME, TODAY, get_db, iso_add_days


def _doc_row(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "matterId": row["matter_id"],
        "title": row["title"],
        "docType": row["doc_type"],
        "status": row["status"],
        "counterparty": row["counterparty"],
        "governingLaw": row["governing_law"],
        "effectiveDate": row["effective_date"],
        "expirationDate": row["expiration_date"],
        "value": row["value"],
        "riskLevel": row["risk_level"],
        "summary": row["summary"],
        "body": row["body"],
    }


def _doc_with_context_row(row: Any) -> dict[str, Any]:
    base = _doc_row(row)
    base["matterName"] = row["matterName"]
    base["clientName"] = row["clientName"]
    return base


_DOC_COLS = """
    d.id, d.matter_id, d.title, d.doc_type, d.status,
    d.counterparty, d.governing_law,
    d.effective_date, d.expiration_date,
    d.value, d.risk_level, d.summary, d.body,
    m.name AS matterName, c.name AS clientName
"""


def firm_overview() -> dict[str, Any]:
    db = get_db()

    def one(sql: str, *args: Any) -> int:
        cur = db.execute(sql, args)
        row = cur.fetchone()
        return int(row[0]) if row is not None else 0

    cutoff = iso_add_days(TODAY, 90)
    return {
        "firmName": FIRM_NAME,
        "today": TODAY,
        "clients": one("SELECT COUNT(*) FROM clients"),
        "activeMatters": one("SELECT COUNT(*) FROM matters WHERE status = 'active'"),
        "totalMatters": one("SELECT COUNT(*) FROM matters"),
        "docsInReview": one("SELECT COUNT(*) FROM documents WHERE status = 'in-review'"),
        "expiringSoon": one(
            """
            SELECT COUNT(*) FROM documents
            WHERE status = 'executed' AND expiration_date IS NOT NULL
              AND expiration_date BETWEEN ? AND ?
            """,
            TODAY,
            cutoff,
        ),
        "highRiskFlags": one(
            "SELECT COUNT(*) FROM risk_flags WHERE severity = 'high'"
        ),
    }


def list_clients() -> list[dict[str, Any]]:
    db = get_db()
    return [
        {"id": r["id"], "name": r["name"], "industry": r["industry"], "since": r["since"]}
        for r in db.execute(
            "SELECT id, name, industry, since FROM clients ORDER BY name"
        )
    ]


def list_matters(status: str | None = None) -> list[dict[str, Any]]:
    db = get_db()
    where = "WHERE m.status = ?" if status else ""
    args = (status,) if status else ()
    rows = db.execute(
        f"""
        SELECT m.id, m.client_id, m.name, m.practice_area, m.status,
               m.lead_attorney, m.opened_at,
               c.name AS clientName,
               (SELECT COUNT(*) FROM documents d WHERE d.matter_id = m.id) AS documentCount
        FROM matters m
        JOIN clients c ON c.id = m.client_id
        {where}
        ORDER BY m.opened_at DESC
        """,
        args,
    )
    return [
        {
            "id": r["id"],
            "clientId": r["client_id"],
            "name": r["name"],
            "practiceArea": r["practice_area"],
            "status": r["status"],
            "leadAttorney": r["lead_attorney"],
            "openedAt": r["opened_at"],
            "clientName": r["clientName"],
            "documentCount": r["documentCount"],
        }
        for r in rows
    ]


def get_matter(matter_id: int) -> dict[str, Any] | None:
    db = get_db()
    row = db.execute(
        """
        SELECT m.id, m.client_id, m.name, m.practice_area, m.status,
               m.lead_attorney, m.opened_at,
               c.name AS clientName, c.industry AS industry,
               (SELECT COUNT(*) FROM documents d WHERE d.matter_id = m.id) AS documentCount
        FROM matters m
        JOIN clients c ON c.id = m.client_id
        WHERE m.id = ?
        """,
        (matter_id,),
    ).fetchone()
    if not row:
        return None

    documents = [
        _doc_row(d)
        for d in db.execute(
            "SELECT * FROM documents WHERE matter_id = ? ORDER BY id",
            (matter_id,),
        )
    ]
    return {
        "id": row["id"],
        "clientId": row["client_id"],
        "name": row["name"],
        "practiceArea": row["practice_area"],
        "status": row["status"],
        "leadAttorney": row["lead_attorney"],
        "openedAt": row["opened_at"],
        "clientName": row["clientName"],
        "industry": row["industry"],
        "documentCount": row["documentCount"],
        "documents": documents,
    }


def list_documents(matter_id: int | None = None) -> list[dict[str, Any]]:
    db = get_db()
    where = "WHERE d.matter_id = ?" if matter_id is not None else ""
    args = (matter_id,) if matter_id is not None else ()
    rows = db.execute(
        f"""
        SELECT {_DOC_COLS}
        FROM documents d
        JOIN matters m ON m.id = d.matter_id
        JOIN clients c ON c.id = m.client_id
        {where}
        ORDER BY d.id
        """,
        args,
    )
    return [_doc_with_context_row(r) for r in rows]


def get_document(document_id: int) -> dict[str, Any] | None:
    db = get_db()
    row = db.execute(
        f"""
        SELECT {_DOC_COLS}
        FROM documents d
        JOIN matters m ON m.id = d.matter_id
        JOIN clients c ON c.id = m.client_id
        WHERE d.id = ?
        """,
        (document_id,),
    ).fetchone()
    if not row:
        return None
    doc = _doc_with_context_row(row)

    risks = [
        {
            "id": r["id"],
            "documentId": r["document_id"],
            "clause": r["clause"],
            "severity": r["severity"],
            "note": r["note"],
        }
        for r in db.execute(
            """
            SELECT id, document_id, clause, severity, note
            FROM risk_flags WHERE document_id = ?
            ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
            """,
            (document_id,),
        )
    ]
    authorities = [
        {
            "id": r["id"],
            "documentId": r["document_id"],
            "citation": r["citation"],
            "court": r["court"],
            "year": r["year"],
            "summary": r["summary"],
        }
        for r in db.execute(
            """
            SELECT id, document_id, citation, court, year, summary
            FROM authorities WHERE document_id = ?
            ORDER BY year DESC
            """,
            (document_id,),
        )
    ]
    doc["risks"] = risks
    doc["authorities"] = authorities
    return doc


def search_documents(query: str, limit: int = 8) -> list[dict[str, Any]]:
    db = get_db()
    like = f"%{query.strip()}%"
    rows = db.execute(
        f"""
        SELECT {_DOC_COLS}
        FROM documents d
        JOIN matters m ON m.id = d.matter_id
        JOIN clients c ON c.id = m.client_id
        WHERE d.title LIKE ? OR d.counterparty LIKE ? OR d.summary LIKE ?
           OR d.body LIKE ? OR m.name LIKE ? OR c.name LIKE ?
           OR d.doc_type LIKE ?
        ORDER BY d.id
        LIMIT ?
        """,
        (like, like, like, like, like, like, like, limit),
    )
    return [_doc_with_context_row(r) for r in rows]


def find_expiring_contracts(within_days: int = 90) -> list[dict[str, Any]]:
    db = get_db()
    cutoff = iso_add_days(TODAY, within_days)
    rows = db.execute(
        f"""
        SELECT {_DOC_COLS}
        FROM documents d
        JOIN matters m ON m.id = d.matter_id
        JOIN clients c ON c.id = m.client_id
        WHERE d.status = 'executed' AND d.expiration_date IS NOT NULL
          AND d.expiration_date BETWEEN ? AND ?
        ORDER BY d.expiration_date ASC
        """,
        (TODAY, cutoff),
    )
    return [_doc_with_context_row(r) for r in rows]
