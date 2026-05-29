"""
LangGraph entry point for the RoundsAI Ward Rounds Copilot example.

Mirrors agent/main.py's provider seam: Gemini 3.5 Flash via the native
Google Gen AI SDK (langchain-google-genai). The native SDK handles
thought-signature replay across tool turns, which langchain-openai's
OpenAI-compat path does not — see FROZEN.md for the history. Do NOT
change the model line without instruction.

Import note:
    This module lives inside the `healthcare_agent` package whose dir
    name matches the package name. langgraph loads this graph via the
    `./healthcare_agent/graph.py:graph` entry in `agent/langgraph.json`,
    which keeps Python's package machinery intact — so `from .tools
    import ...` works without any sys.path manipulation.
"""

import os
import sys
from pathlib import Path

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Import path discipline
#
# This file is loaded TWO different ways depending on the entry point:
#   1. `langgraph dev` (and the LangGraph runtime) loads it as a member
#      of the `healthcare_agent` package — relative imports work.
#   2. The `pnpm smoke` per-example graph probe loads it via
#      `importlib.util.spec_from_file_location` which bypasses package
#      machinery — relative imports raise ImportError.
#
# Try the relative import first (the canonical, fast path). When loaded
# bare (smoke probe), fall back to a sys.path injection + absolute import
# from the sibling tools module. This keeps both paths green without
# forcing the runtime down the slower bare-import route.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
try:
    from .tools import (
        draft_handoff_note,
        show_patient_detail,
        show_patient_roster,
    )
except ImportError:
    _PKG_DIR = Path(__file__).parent
    if str(_PKG_DIR) not in sys.path:
        sys.path.insert(0, str(_PKG_DIR))
    from tools import (  # type: ignore[no-redef]
        draft_handoff_note,
        show_patient_detail,
        show_patient_roster,
    )


model = ChatGoogleGenerativeAI(
    model=os.getenv("MODEL", "gemini-3.5-flash"),
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


SYSTEM_PROMPT = """
You are RoundsAI, a polished ward-rounds copilot for charge nurses and
attending physicians. Synthetic data only — never invent a real-sounding
patient name. Patient names in this demo are intentionally generic
(Patient A, Patient B, ...).

Keep chat responses to 1-2 sentences. The UI does the heavy lifting.

Tool guidance:
- Patient roster ("show me today's roster", "who's on the unit",
  "list the rounds", "show me critical patients only"):
  call show_patient_roster with the user's natural-language query.
  It renders patient cards with name, room, status pill (Stable /
  Watch / Critical), primary issue, and last vitals time.

- Patient drill-in ("drill into Patient A", "show me Patient D's chart",
  "what's Patient A's vitals trend"):
  call show_patient_detail with the patient identifier the user
  supplied. It renders a vitals time-series, meds list, and risk flags.

- Handoff drafts ("draft a handoff note", "write the night-shift handoff",
  "summarize today's rounds for the on-call"):
  call draft_handoff_note with the focus patient when the user names one,
  or an empty string for a ward-wide summary. It renders an editable
  draft with Send / Edit / Discard actions.

A2UI actions: when you see a log_a2ui_event tool result naming an action
("drill_into_patient", "handoff_sent", "handoff_discarded"), respond with
a brief one-sentence confirmation — the UI already updated on the frontend.
"""


agent = create_agent(
    model=model,
    tools=[show_patient_roster, show_patient_detail, draft_handoff_note],
    middleware=[CopilotKitMiddleware()],
    system_prompt=SYSTEM_PROMPT,
)

graph = agent
