"""
LangGraph entry point for the Contract Review Copilot example.

Provider seam: Gemini 3.5 Flash via the native Google Gen AI SDK
(`langchain-google-genai`'s `ChatGoogleGenerativeAI`). This is the FROZEN.md
canonical (see FROZEN.md L19–25): the native SDK handles `thought_signature`
replay correctly across multi-turn tool calls, where the OpenAI-compatibility
endpoint strips that metadata and 400s on the second tool turn.

The OpenAI-compat path with `gemini-2.5-flash` is the documented fallback
only — see FROZEN.md L67–84 if `langchain-google-genai` ever breaks worse
than the OpenAI-compat trap. Do NOT change the model line back without
re-reading that section.

Import note (langgraph dev workaround):
    langgraph CLI loads graphs via `importlib.util.spec_from_file_location`
    when the graph spec is a path (contains "/"), which bypasses Python's
    package machinery and breaks `from .tools import ...`. We sidestep that
    by adding this file's directory to sys.path and using an absolute import
    against the sibling `tools` module. Works both via langgraph dev and via
    `python -c "from agent.graph import graph"`.
"""

import os
import sys
from pathlib import Path

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from tools import (  # noqa: E402  (sys.path tweak above)
    apply_redline,
    find_expiring_contracts,
    list_firm_matters,
    list_matter_documents,
    review_document,
    search_legal_documents,
)


model = ChatGoogleGenerativeAI(
    model=os.getenv("MODEL", "gemini-3.5-flash"),
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


agent = create_agent(
    model=model,
    tools=[
        list_firm_matters,
        list_matter_documents,
        find_expiring_contracts,
        search_legal_documents,
        review_document,
        apply_redline,
    ],
    middleware=[CopilotKitMiddleware()],
    system_prompt="""
        You are an AI legal associate at Sterling & Crane LLP. Demo mode only — not legal advice.

        The firm's database contains 6 clients, 15 matters, and 30 real-shaped
        documents (contracts, briefs, memos) with risk flags and cited
        authorities. ALWAYS prefer rendering an A2UI surface over plain prose —
        the document, the matter list, and the expiry report are the answer.

        Tool routing:
        - "what's expiring", "renewal", "any contracts coming due"
          → find_expiring_contracts(within_days=90 or 180)
        - "show me the matters", "active engagements", "what are we working on"
          → list_firm_matters(status="active" by default)
        - "show me [matter] documents", "drill into matter N"
          → list_matter_documents(matter_id)
        - "find ...", "search for ...", anything keyword-shaped
          → search_legal_documents(query, limit=8)
        - "review the MSA", "open document 1", "look at the CRISPR license",
          "what are the risks on [doc]"
          → review_document(document_id)  ← this is the headline visual

        When the user names a document by description (not ID), first call
        search_legal_documents to find it, then review_document with the ID.

        ACTION HANDLING: When you receive a log_a2ui_event tool result naming
        "redline_accepted" or "redline_rejected", you MUST call apply_redline
        with the redlineId from the event context and the matching decision.

        Keep chat responses to 1–2 sentences. The A2UI surface IS the response.
    """,
)

graph = agent
