"""Canned dashboard inputs for OFFLINE=1 mode.

When OFFLINE=1 is set, the /fixed agent serves a deterministic sample
dashboard with NO Gemini call and no API key (see fixed_agent.py). These
args are passed verbatim to `render_dashboard(**OFFLINE_DASHBOARD_ARGS)`,
so they MUST satisfy that tool's typed inputs:

  - eyebrow / title / subtitle: str
  - kpis: EXACTLY 4 × {label, value, delta, caption}     (Kpi)
  - trend: 6-12 × {label, value: float}                  (Point)
  - share: 3-5 × {label, value: float}                   (Point)
  - rows: 5-8 × {name, category, value, delta}           (Row)
  - scope_options: 3-6 × {label, value}                  (ScopeOption)
  - scope_selected: str (one of scope_options' values)

Dataset: a realistic Tesla Q3 FY24 earnings snapshot. The numbers are
illustrative-but-plausible (revenue / deliveries / margin / EPS, a
trailing revenue trend, an automotive-vs-energy share, and a regional /
segment row table). The system prompt in fixed_agent.py already cites
"Tesla Q3 '24" as a canonical scope-chip example, so this fixture mirrors
that shape.
"""
from __future__ import annotations

from typing import Any

# Keep this a plain dict of JSON-ish primitives so it round-trips cleanly as
# tool-call args and through a2ui.render(...). Field names match the
# TypedDicts in fixed_agent.py (Kpi / Point / Row / ScopeOption) exactly.
OFFLINE_DASHBOARD_ARGS: dict[str, Any] = {
    "eyebrow": "Q3 FY24 · EARNINGS SNAPSHOT",
    "title": "Tesla Q3 FY24 Performance",
    "subtitle": "Revenue, deliveries, and margin for the quarter ended Sep 30, 2024.",
    "kpis": [
        {
            "label": "Total revenue",
            "value": "$25.18B",
            "delta": "+8%",
            "caption": "vs. $23.35B in Q3 FY23",
        },
        {
            "label": "Vehicle deliveries",
            "value": "462,890",
            "delta": "+6%",
            "caption": "vs. 435,059 in Q3 FY23",
        },
        {
            "label": "Operating margin",
            "value": "10.8%",
            "delta": "+3.0pp",
            "caption": "vs. 7.6% in Q3 FY23",
        },
        {
            "label": "Diluted EPS (GAAP)",
            "value": "$0.62",
            "delta": "+17%",
            "caption": "vs. $0.53 in Q3 FY23",
        },
    ],
    # Trailing-quarter total revenue ($B). 8 points (within the 6-12 range).
    "trend": [
        {"label": "Q4 '22", "value": 24.32},
        {"label": "Q1 '23", "value": 23.33},
        {"label": "Q2 '23", "value": 24.93},
        {"label": "Q3 '23", "value": 23.35},
        {"label": "Q4 '23", "value": 25.17},
        {"label": "Q1 '24", "value": 21.30},
        {"label": "Q2 '24", "value": 25.50},
        {"label": "Q3 '24", "value": 25.18},
    ],
    # Revenue share by business line ($B). 4 slices (within the 3-5 range).
    "share": [
        {"label": "Automotive", "value": 20.02},
        {"label": "Energy gen. & storage", "value": 2.38},
        {"label": "Services & other", "value": 2.79},
        {"label": "Regulatory credits", "value": 0.74},
    ],
    # Segment / regional breakdown. 6 rows (within the 5-8 range).
    "rows": [
        {
            "name": "Automotive",
            "category": "Segment",
            "value": "$20.02B",
            "delta": "+2%",
        },
        {
            "name": "Energy generation & storage",
            "category": "Segment",
            "value": "$2.38B",
            "delta": "+52%",
        },
        {
            "name": "Services & other",
            "category": "Segment",
            "value": "$2.79B",
            "delta": "+29%",
        },
        {
            "name": "United States",
            "category": "Region",
            "value": "$12.10B",
            "delta": "+11%",
        },
        {
            "name": "China",
            "category": "Region",
            "value": "$4.67B",
            "delta": "-4%",
        },
        {
            "name": "Other international",
            "category": "Region",
            "value": "$8.41B",
            "delta": "+9%",
        },
    ],
    # Scope chips tailored to a Tesla quarterly PDF (3-6 chips).
    "scope_options": [
        {"label": "Q3 '24", "value": "q3_fy24"},
        {"label": "By segment", "value": "by_segment"},
        {"label": "By region", "value": "by_region"},
        {"label": "Automotive vs Energy", "value": "auto_vs_energy"},
        {"label": "Trailing 4 quarters", "value": "trailing_4q"},
    ],
    "scope_selected": "q3_fy24",
}
