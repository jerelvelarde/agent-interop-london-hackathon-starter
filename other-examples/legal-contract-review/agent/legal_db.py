"""
SQLite-backed legal firm database for the Contract Review Copilot example.

Schema and seed data are a Python port of legal-copilot-demo/lib/legal/{db,seed}.ts.
The database lives under agent/.data/legal/legal.db. It is created and seeded on
first import. The seed mirrors a real-ish mid-sized law-firm portfolio so the
A2UI surfaces feel like a working tool, not a toy.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any

# Pinned "today" so time-relative views stay stable regardless of clock skew.
TODAY = "2026-05-27"
FIRM_NAME = "Sterling & Crane LLP"

_THIS_DIR = Path(__file__).parent
_DATA_DIR = _THIS_DIR / ".data" / "legal"
_DB_PATH = _DATA_DIR / "legal.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  industry  TEXT NOT NULL,
  since     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matters (
  id            INTEGER PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  name          TEXT NOT NULL,
  practice_area TEXT NOT NULL,
  status        TEXT NOT NULL,
  lead_attorney TEXT NOT NULL,
  opened_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id              INTEGER PRIMARY KEY,
  matter_id       INTEGER NOT NULL REFERENCES matters(id),
  title           TEXT NOT NULL,
  doc_type        TEXT NOT NULL,
  status          TEXT NOT NULL,
  counterparty    TEXT,
  governing_law   TEXT,
  effective_date  TEXT,
  expiration_date TEXT,
  value           INTEGER,
  risk_level      TEXT NOT NULL,
  summary         TEXT NOT NULL,
  body            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_flags (
  id          INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id),
  clause      TEXT NOT NULL,
  severity    TEXT NOT NULL,
  note        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authorities (
  id          INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id),
  citation    TEXT NOT NULL,
  court       TEXT NOT NULL,
  year        INTEGER NOT NULL,
  summary     TEXT NOT NULL
);
"""

CLIENTS: list[tuple[int, str, str, int]] = [
    (1, "Northwind Robotics", "Industrial Automation", 2019),
    (2, "Halcyon Bio", "Biotechnology", 2021),
    (3, "Meridian Capital Partners", "Private Equity", 2017),
    (4, "Cobalt Studios", "Media & Entertainment", 2022),
    (5, "Verdant Energy", "Renewable Energy", 2020),
    (6, "Atlas Freight Systems", "Logistics", 2018),
]

MATTERS: list[tuple[int, int, str, str, str, str, str]] = [
    (1, 1, "Acquisition of Apex Servos GmbH", "M&A", "active", "Eleanor Vance", "2025-11-03"),
    (2, 1, "Master Supply Agreement — Tier-1 OEMs", "Commercial Contracts", "active", "Marcus Webb", "2026-01-14"),
    (3, 2, "Series C Financing", "M&A", "active", "Priya Nair", "2026-02-20"),
    (4, 2, "Licensing — CRISPR Platform", "IP & Licensing", "active", "Priya Nair", "2025-09-10"),
    (5, 3, "Fund IV Formation", "Regulatory", "active", "David Okafor", "2025-12-01"),
    (6, 3, "Portfolio Co. Roll-up", "M&A", "on-hold", "Eleanor Vance", "2026-03-05"),
    (7, 4, "Distribution Agreement — Streaming", "Commercial Contracts", "active", "Sofia Russo", "2026-02-02"),
    (8, 4, "Talent Disputes", "Litigation", "active", "James Whitlock", "2025-10-18"),
    (9, 5, "Solar PPA — Mojave Array", "Commercial Contracts", "active", "Marcus Webb", "2026-01-28"),
    (10, 5, "Land Lease — Section 12", "Real Estate", "active", "David Okafor", "2025-08-22"),
    (11, 6, "Fleet Financing", "Commercial Contracts", "active", "Marcus Webb", "2026-03-18"),
    (12, 6, "Union Negotiation", "Employment", "on-hold", "James Whitlock", "2025-12-12"),
    (13, 1, "Patent Infringement — Servo Controls", "Litigation", "active", "James Whitlock", "2026-04-01"),
    (14, 2, "Employment — VP Research Hire", "Employment", "closed", "Sofia Russo", "2025-07-15"),
    (15, 4, "Trademark Portfolio", "IP & Licensing", "active", "Priya Nair", "2026-01-09"),
]

DOCUMENTS: list[tuple[Any, ...]] = [
    (1, 2, "Master Supply Agreement — Servo Components", "MSA", "executed", "Apex Servos GmbH", "Delaware", "2025-02-01", "2026-06-30", 4_200_000, "high", "Three-year supply agreement with auto-renewal and an uncapped IP indemnity that sits outside the liability cap.", "Supplier shall indemnify, defend, and hold harmless Buyer from any and all claims arising from infringement of third-party intellectual property. Liability under this Section 9 shall not be subject to the limitation of liability set forth in Section 11. This Agreement renews automatically for successive one-year terms unless either party gives ninety (90) days' written notice."),
    (2, 2, "MSA Amendment No. 1 — Pricing Pass-Through", "MSA", "in-review", "Apex Servos GmbH", "Delaware", None, None, None, "medium", "Surcharge pass-through amendment; confirm interaction with the existing liability cap.", "The parties agree to amend Exhibit B to permit pass-through of documented raw-material surcharges, subject to a quarterly true-up. All other terms remain in full force and effect."),
    (3, 1, "Share Purchase Agreement — Apex Servos GmbH", "SPA", "draft", "Apex Servos GmbH (Sellers)", "Germany / Delaware", None, None, 87_500_000, "high", "Cross-border share purchase with escrow, earn-out, and a foreign-investment clearance condition.", "Closing is conditioned upon receipt of clearance under the German Foreign Trade and Payments Act (AWG). Twelve percent (12%) of the Purchase Price shall be held in escrow for eighteen (18) months. The Earn-Out shall be calculated by reference to Adjusted EBITDA for the trailing twelve months."),
    (4, 1, "Mutual NDA — Project Helix", "NDA", "executed", "Apex Servos GmbH", "Delaware", "2025-10-15", "2026-10-15", None, "low", "Standard mutual NDA covering diligence for the Apex acquisition.", "Each party agrees to hold the other's Confidential Information in strict confidence for a period of three (3) years from the date of disclosure and to use such information solely for the Permitted Purpose."),
    (5, 1, "Seller Disclosure Schedules — Draft", "Memo", "in-review", None, None, None, None, None, "medium", "Seller disclosure schedules; several scheduled IP items require independent verification.", "Schedule 3.12 (Intellectual Property) lists fourteen registered patents and six pending applications. Three entries lack assignment records and should be verified against the USPTO and DPMA registers before reliance."),
    (6, 3, "Series C Stock Purchase Agreement", "SPA", "in-review", "Cementer Ventures (Lead)", "Delaware", None, None, 60_000_000, "medium", "Series C SPA with a 1x non-participating preference and broad-based weighted-average anti-dilution.", "The Series C Preferred shall carry a 1x non-participating liquidation preference. Anti-dilution protection shall be on a broad-based weighted-average basis. The Lead Investor shall be entitled to one seat on the Board of Directors."),
    (7, 4, "CRISPR Platform License Agreement", "License", "executed", "Genova Therapeutics", "California", "2025-09-20", "2026-08-15", 12_000_000, "high", "Exclusive field-of-use license with milestone royalties and a most-favored-licensee clause.", "Licensor grants an exclusive, worldwide license within the Field. If Licensor grants any third party more favorable royalty terms for comparable rights, such terms shall be offered to Licensee retroactively. Milestone payments are due upon IND, Phase II, and first commercial sale."),
    (8, 4, "License — Side Letter (Sublicensing)", "License", "draft", "Genova Therapeutics", "California", None, None, None, "medium", "Side letter introducing a limited sublicensing carve-out.", "Notwithstanding Section 2.3, Licensee may grant sublicenses to bona fide research collaborators solely for non-commercial use, subject to Licensor's prior written consent, not to be unreasonably withheld."),
    (9, 7, "Streaming Distribution Agreement", "Distribution", "executed", "Lumen+ Streaming", "New York", "2025-04-01", "2026-07-10", 9_500_000, "high", "Multi-title distribution with exclusivity windows and a most-favored-nation clause on license fees.", "Distributor receives exclusive streaming rights in the Territory during the Exclusivity Window. The license fee shall be no less favorable than that offered to any comparable distributor (MFN). Windowing shall not conflict with theatrical commitments."),
    (10, 7, "Content Delivery SOW No. 3", "SOW", "executed", "Lumen+ Streaming", "New York", "2026-01-05", "2026-12-31", 750_000, "low", "Quarterly content delivery statement of work under the distribution MSA.", "Provider shall deliver mastered content in the agreed specifications no later than fifteen (15) business days prior to each scheduled release date."),
    (11, 9, "Solar Power Purchase Agreement — Mojave Array", "PPA", "executed", "Pacifica Grid Authority", "California", "2025-06-30", "2026-06-15", 45_000_000, "high", "20-year PPA; one-directional change-in-law pass-through and uncapped curtailment exposure under review.", "Seller shall deliver Net Energy at the Delivery Point. In the event of a Change in Law increasing Seller's costs, the Contract Price shall be adjusted upward; no symmetrical downward adjustment applies. Buyer may curtail deliveries for reliability with compensation only above the Curtailment Threshold."),
    (12, 9, "Interconnection Agreement", "MSA", "in-review", "Pacifica Grid Authority", "California", None, None, None, "medium", "Grid interconnection terms with liquidated damages for commissioning delay.", "If the Facility fails to achieve Commercial Operation by the Guaranteed Date, Seller shall pay liquidated damages of $25,000 per day, capped at the Interconnection Security amount."),
    (13, 10, "Ground Lease — Section 12 Parcel", "Lease", "executed", "High Desert Land Trust", "California", "2025-08-22", "2045-08-21", None, "low", "20-year ground lease for the solar array site with two ten-year renewal options.", "Lessor leases the Section 12 Parcel for an initial term of twenty (20) years. Lessee shall have two (2) options to renew for ten (10) years each upon nine (9) months' notice."),
    (14, 11, "Fleet Master Financing Agreement", "MSA", "executed", "Cascade Equipment Finance", "Washington", "2026-02-01", "2026-08-01", 18_000_000, "medium", "Revolving fleet financing with a broad material-adverse-change clause and affiliate cross-default.", "Lender may decline to fund any Advance upon the occurrence of any event that, in Lender's reasonable judgment, constitutes a Material Adverse Change. An Event of Default includes any default by Borrower or any Affiliate under any obligation exceeding $500,000."),
    (15, 11, "Security Agreement — Tractors & Trailers", "MSA", "executed", "Cascade Equipment Finance", "Washington", "2026-02-01", None, None, "medium", "UCC-1 security interest over the rolling stock fleet.", "Borrower grants Lender a continuing security interest in all Equipment now owned or hereafter acquired, together with proceeds, to secure the Obligations."),
    (16, 5, "Fund IV Limited Partnership Agreement", "Memo", "in-review", None, "Delaware", None, None, None, "high", "LPA terms: single-trigger key-person clause, uncapped GP clawback, and SEC marketing-rule compliance.", "Upon a Key Person Event, the Commitment Period shall be suspended. The General Partner shall restore any excess carried interest (the Clawback) without limitation by reference to after-tax amounts. Marketing materials shall comply with Rule 206(4)-1."),
    (17, 5, "Private Placement Memorandum — Fund IV", "Memo", "draft", None, "Delaware", None, None, None, "medium", "PPM risk factors and regulatory disclosures for limited partners.", "An investment in the Fund involves significant risks, including illiquidity, leverage, and concentration. Prospective investors should review the Risk Factors in their entirety with independent advisers."),
    (18, 6, "Roll-up — Letter of Intent (Bridgeline)", "Memo", "draft", "Bridgeline Components", "Delaware", None, None, 22_000_000, "medium", "Non-binding LOI with a 60-day exclusivity period and a break-fee.", "Except for the Exclusivity and Confidentiality provisions, this Letter is non-binding. The parties shall negotiate exclusively for sixty (60) days. A break-fee of $750,000 applies if Seller transacts with a third party during the period."),
    (19, 8, "Plaintiff's Motion to Compel Arbitration", "Brief", "executed", "Vega Talent Group", "New York", "2026-03-12", None, None, "high", "Motion to compel arbitration under clause 14 of the talent agreement.", "Plaintiff respectfully moves to compel arbitration pursuant to the Federal Arbitration Act and clause 14 of the Talent Agreement, and to stay these proceedings pending arbitration."),
    (20, 8, "Memorandum — Enforceability of Arbitration Clause", "Memo", "executed", None, "New York", "2026-02-28", None, None, "medium", "Analysis of arbitration-clause enforceability and the delegation provision under New York law.", "The clause delegates threshold questions of arbitrability to the arbitrator. Under controlling precedent, such delegation is enforceable where clear and unmistakable, though the threshold question of formation remains for the court."),
    (21, 13, "Complaint — Patent Infringement (Servo Controls)", "Brief", "executed", "Torsion Dynamics Inc.", "Federal / N.D. Cal.", "2026-04-05", None, None, "high", "Infringement complaint asserting three claims of the '418 patent.", "Defendant has infringed and continues to infringe claims 1, 7, and 12 of U.S. Patent No. 9,xxx,418 by making, using, and selling servo-control modules embodying the claimed invention. Plaintiff seeks damages and a permanent injunction."),
    (22, 13, "Opening Claim Construction Brief", "Brief", "in-review", "Torsion Dynamics Inc.", "Federal / N.D. Cal.", None, None, None, "high", "Opening Markman brief on the disputed term \"substantially synchronous.\"", "The intrinsic record compels construction of \"substantially synchronous\" to mean within one control cycle. The specification repeatedly describes synchronization at the cycle level, and the prosecution history disclaims broader timing."),
    (23, 13, "Memo — Willfulness & Enhanced Damages", "Memo", "draft", None, "Federal", None, None, None, "medium", "Assessment of willfulness exposure and the standard for enhanced damages.", "Enhanced damages are within the court's discretion and are no longer governed by the rigid two-part Seagate test. The record of pre-suit knowledge and the absence of a non-infringement opinion bear on the analysis."),
    (24, 12, "Collective Bargaining Agreement — Draft", "Employment", "in-review", "Teamsters Local 117", "Washington", None, None, None, "high", "CBA draft: wage scale, grievance procedure, and a no-strike clause lacking an arbitration backstop.", "The Union agrees there shall be no strike, slowdown, or work stoppage during the term. Grievances shall proceed through a three-step procedure. An annual wage reopener applies in years two and three."),
    (25, 12, "Memo — Successor Employer Obligations", "Memo", "draft", None, "Washington", None, None, None, "medium", "Successorship analysis under the National Labor Relations Act.", "A successor employer that hires a majority of the predecessor's workforce in an unchanged unit generally inherits the duty to bargain, though not the substantive terms of the predecessor's CBA."),
    (26, 14, "Executive Employment Agreement — VP Research", "Employment", "executed", "Dr. Helena Cross", "California", "2025-07-15", None, None, "medium", "VP Research offer with equity, IP assignment, and a non-compete that is void under California law.", "Executive shall not, during employment and for twelve (12) months thereafter, engage in any competing business. Executive assigns to the Company all inventions conceived during employment. Equity vests over four (4) years with a one-year cliff."),
    (27, 14, "Confidential Information & Invention Assignment", "NDA", "executed", "Dr. Helena Cross", "California", "2025-07-15", None, None, "low", "Standard confidential information and invention assignment agreement.", "Employee agrees to hold Company confidential information in confidence and assigns all right, title, and interest in inventions made within the scope of employment, excepting inventions qualifying under California Labor Code section 2870."),
    (28, 15, "Trademark License — Cobalt Marks", "License", "executed", "Pixel Forge Studios", "New York", "2025-11-01", "2026-08-20", 300_000, "medium", "Limited trademark license for a co-branded release with a quality-control clause.", "Licensee may use the Cobalt Marks solely on the Licensed Products. Licensor shall have the right to approve samples to maintain quality standards. Failure to maintain such control may jeopardize the Marks."),
    (29, 15, "Trademark Coexistence Agreement", "License", "draft", "Cobalt Mining Co. (unrelated)", "New York", None, None, None, "low", "Coexistence agreement resolving a likelihood-of-confusion dispute across unrelated classes.", "The parties acknowledge that their respective goods travel in distinct channels of trade and agree to coexist, each refraining from expansion into the other's field of use."),
    (30, 3, "Mutual NDA — Series C Diligence", "NDA", "executed", "Cementer Ventures", "Delaware", "2026-02-10", "2027-02-10", None, "low", "Diligence NDA covering the Series C financing process.", "Each party shall use the other's Confidential Information solely to evaluate the proposed financing and shall not solicit the other's employees for a period of one (1) year."),
]

RISK_FLAGS: list[tuple[int, str, str, str]] = [
    (1, "Indemnification (§9)", "high", "Uncapped IP indemnity is carved out of the §11 liability cap — exposure is unlimited."),
    (1, "Auto-Renewal (§3.2)", "medium", "Evergreen renewal with a 90-day opt-out; calendar the notice deadline."),
    (3, "Earn-Out (§2.4)", "high", "Earn-out references \"Adjusted EBITDA\" without a defined calculation — high dispute risk."),
    (3, "FDI Clearance (§7.1)", "high", "Closing conditioned on German AWG clearance; the long-stop date may be too tight."),
    (7, "Most-Favored-Licensee (§7)", "high", "Retroactive MFL could force royalty give-backs if better terms are granted elsewhere."),
    (7, "Milestone Royalties (§4)", "medium", "Stacked milestones may exceed the net-sales royalty cap."),
    (9, "MFN on License Fees (§5)", "high", "Fee MFN exposes pricing to every comparable distributor deal."),
    (9, "Exclusivity Window (§3)", "medium", "Windowing conflicts with the SOW No. 3 delivery calendar."),
    (11, "Change-in-Law (§14)", "high", "Pass-through is one-directional — Buyer bears upside cost, gets no downside benefit."),
    (11, "Curtailment (§8)", "medium", "No compensation floor below the curtailment threshold."),
    (14, "Cross-Default (§8.1)", "high", "Cross-default reaches any affiliate obligation over $500K."),
    (14, "Material Adverse Change", "medium", "MAC definition is broad and left to lender discretion."),
    (16, "Key-Person (§6.1)", "high", "Single-trigger key-person event with no cure or replacement window."),
    (16, "GP Clawback (§9.4)", "medium", "Clawback is not limited by an after-tax cap."),
    (24, "No-Strike (§22)", "high", "No-strike clause lacks a binding arbitration backstop for unresolved grievances."),
    (24, "Wage Reopener", "medium", "Annual reopener creates recurring renegotiation exposure."),
    (26, "Non-Compete (§5)", "medium", "Post-employment non-compete is void under Cal. Bus. & Prof. Code §16600 — strike or carve out."),
    (28, "Quality Control (§4)", "medium", "QC standards are vague; risk of a \"naked license\" and loss of mark rights."),
    (19, "Delegation (cl.14)", "medium", "Delegation clause may not clearly reach threshold arbitrability."),
]

AUTHORITIES: list[tuple[int, str, str, int, str]] = [
    (20, "AT&T Mobility LLC v. Concepcion, 563 U.S. 333", "U.S. Supreme Court", 2011, "The FAA preempts state-law rules that disfavor arbitration agreements."),
    (20, "Epic Systems Corp. v. Lewis, 584 U.S. 497", "U.S. Supreme Court", 2018, "Class- and collective-action waivers in arbitration agreements are enforceable."),
    (19, "Rent-A-Center, West, Inc. v. Jackson, 561 U.S. 63", "U.S. Supreme Court", 2010, "A delegation provision assigning arbitrability to the arbitrator is severable and enforceable."),
    (21, "Markman v. Westview Instruments, Inc., 517 U.S. 370", "U.S. Supreme Court", 1996, "Claim construction is a question of law for the court, not the jury."),
    (22, "Phillips v. AWH Corp., 415 F.3d 1303", "Federal Circuit (en banc)", 2005, "Claim terms are construed primarily from the intrinsic record — claims, specification, and prosecution history."),
    (22, "Nautilus, Inc. v. Biosig Instruments, Inc., 572 U.S. 898", "U.S. Supreme Court", 2014, "A claim is indefinite if it fails to inform, with reasonable certainty, those skilled in the art of the scope."),
    (23, "Halo Electronics, Inc. v. Pulse Electronics, Inc., 579 U.S. 93", "U.S. Supreme Court", 2016, "Enhanced damages under §284 are within the district court's discretion; the rigid Seagate test is rejected."),
    (16, "Investment Adviser Marketing Rule, 17 C.F.R. §275.206(4)-1", "SEC", 2021, "Governs adviser advertisements and solicitation, including performance and testimonial requirements."),
]


_conn: sqlite3.Connection | None = None


def _connect() -> sqlite3.Connection:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(_SCHEMA)
    return conn


def _seed_if_empty(conn: sqlite3.Connection, force: bool = False) -> None:
    cur = conn.execute("SELECT COUNT(*) AS n FROM clients")
    existing = cur.fetchone()["n"]
    if existing > 0 and not force:
        return

    with conn:
        conn.executemany(
            "INSERT INTO clients (id, name, industry, since) VALUES (?, ?, ?, ?)",
            CLIENTS,
        )
        conn.executemany(
            "INSERT INTO matters (id, client_id, name, practice_area, status, lead_attorney, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            MATTERS,
        )
        conn.executemany(
            "INSERT INTO documents (id, matter_id, title, doc_type, status, counterparty, governing_law, effective_date, expiration_date, value, risk_level, summary, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            DOCUMENTS,
        )
        conn.executemany(
            "INSERT INTO risk_flags (document_id, clause, severity, note) VALUES (?, ?, ?, ?)",
            RISK_FLAGS,
        )
        conn.executemany(
            "INSERT INTO authorities (document_id, citation, court, year, summary) VALUES (?, ?, ?, ?, ?)",
            AUTHORITIES,
        )


def get_db() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = _connect()
        _seed_if_empty(_conn)
    return _conn


def reset_db() -> None:
    """Wipe + re-seed. Used for `/api/seed`-style endpoints or test isolation."""
    conn = get_db()
    with conn:
        conn.executescript(
            """
            DELETE FROM authorities;
            DELETE FROM risk_flags;
            DELETE FROM documents;
            DELETE FROM matters;
            DELETE FROM clients;
            """
        )
    _seed_if_empty(conn, force=True)


def iso_add_days(iso: str, days: int) -> str:
    import datetime as _dt

    base = _dt.date.fromisoformat(iso)
    return (base + _dt.timedelta(days=days)).isoformat()


# Best-effort eager init so tools fail fast on bad seed data instead of failing
# on first call. Skip for `LEGAL_DB_LAZY=1` if a caller wants to defer.
if not os.getenv("LEGAL_DB_LAZY"):
    try:
        get_db()
    except Exception:  # pragma: no cover — surface in import logs
        pass
