"""
LangGraph entry point for the ScholarAI (edtech) example.

Mirrors agent/main.py's provider seam: Gemini 3.5 Flash via the native
Google Gen AI SDK (langchain-google-genai). The native SDK handles
thought-signature replay across tool turns, which langchain-openai's
OpenAI-compat path does not — see FROZEN.md for the history. Do NOT
change the model line without instruction.

Import note:
    This module lives inside the `edtech_agent` package whose directory
    name matches the package name. When loaded via the canonical
    langgraph entrypoint (`./edtech_agent/graph.py:graph` in
    `agent/langgraph.json`), Python package machinery stays intact and
    `from .tools import ...` works.

    The `pnpm smoke` per-example probe loads this file with
    `importlib.util.spec_from_file_location`, which bypasses package
    machinery — there is no `__package__` so relative imports fail. We
    work around this by injecting the parent directory into sys.path and
    importing via absolute names, mirroring the workaround the legacy
    legal-contract-review/agent/graph.py used before audit item #6
    introduced the canonical dir-name-matches-package-name layout.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI


def _load_scholarai():
    """Resolve the system prompt + tool bundle, tolerating either loader.

    Three loaders feed this module:
      1. langgraph at dev/runtime — `from .tools` / `from .prompts` work
         directly because the package machinery is intact.
      2. langgraph build (Docker) — same path; the package is installed.
      3. `pnpm smoke`'s `spec_from_file_location` probe — no `__package__`
         is set, so the relative form raises `ImportError`. Fall back to
         injecting the parent directory into sys.path and importing by
         absolute name (`edtech_agent.tools` etc.).
    """
    try:
        from .prompts import SYSTEM_PROMPT  # type: ignore[import-not-found]
        from .tools import SCHOLARAI_TOOLS  # type: ignore[import-not-found]
        return SYSTEM_PROMPT, SCHOLARAI_TOOLS
    except ImportError:
        # Probe path — graph.py was loaded as a bare module file.
        pkg_dir = Path(__file__).resolve().parent  # .../edtech_agent
        parent = pkg_dir.parent  # .../agent
        if str(parent) not in sys.path:
            sys.path.insert(0, str(parent))
        from edtech_agent.prompts import SYSTEM_PROMPT  # type: ignore
        from edtech_agent.tools import SCHOLARAI_TOOLS  # type: ignore
        return SYSTEM_PROMPT, SCHOLARAI_TOOLS


SYSTEM_PROMPT, SCHOLARAI_TOOLS = _load_scholarai()


model = ChatGoogleGenerativeAI(
    model=os.getenv("MODEL", "gemini-3.5-flash"),
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


agent = create_agent(
    model=model,
    tools=SCHOLARAI_TOOLS,
    middleware=[CopilotKitMiddleware()],
    system_prompt=SYSTEM_PROMPT,
)

graph = agent
