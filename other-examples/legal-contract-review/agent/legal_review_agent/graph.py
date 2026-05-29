"""
LangGraph entry point for the Contract Review Copilot example.

Mirrors agent/main.py's provider seam: Gemini 3.5 Flash via the native
Google Gen AI SDK (langchain-google-genai). The native SDK handles
thought-signature replay across tool turns, which langchain-openai's
OpenAI-compat path does not — see FROZEN.md for the history. Do NOT
change the model line without instruction.

Import note:
    This module lives inside the `legal_review_agent` package whose dir
    name matches the package name. langgraph loads this graph via the
    `./legal_review_agent/graph.py:graph` entry in `agent/langgraph.json`,
    which keeps Python's package machinery intact — so `from .tools
    import ...` works without any sys.path manipulation. The earlier
    `sys.path.insert(...)` workaround (when this file lived directly in
    `agent/` and the package name didn't match the dir) is no longer
    needed — see GitHub audit item #6.
"""

import os

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from .tools import apply_redline, review_contract


model = ChatGoogleGenerativeAI(
    model=os.getenv("MODEL", "gemini-3.5-flash"),
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


agent = create_agent(
    model=model,
    tools=[review_contract, apply_redline],
    middleware=[CopilotKitMiddleware()],
    system_prompt="""
        You are a legal-document review assistant. Demo mode only — not legal advice.

        When asked to review a contract, call review_contract with the loaded document.

        ACTION HANDLING: When you receive a log_a2ui_event tool result naming
        "redline_accepted" or "redline_rejected", you MUST call apply_redline with
        the redlineId from the event context and the matching decision. Then briefly
        confirm in chat (1-2 sentences max).

        Keep all chat responses to 1-2 sentences. The UI does the heavy lifting.
    """,
)

graph = agent
