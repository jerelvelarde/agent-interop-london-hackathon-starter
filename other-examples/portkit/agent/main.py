"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

import os

from copilotkit import CopilotKitMiddleware, StateStreamingMiddleware, StateItem
from langchain.agents import create_agent

# State schema is domain-agnostic; tools are loaded per-domain below.
from src.todos import AgentState
from src.middleware.normalize_tools import NormalizeToolShapeMiddleware

from langchain_google_genai import ChatGoogleGenerativeAI

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM ⊥ — LLM provider (FROZEN — do NOT change without instruction)
# See HACKATHON.md "If you get rate-limited" for the runbook.
# Pattern to copy: this block IS the canonical example; for provider swaps
# (OpenAI / Anthropic / LiteLLM) see .env.example.
#
# Default: Gemini 3.5 Flash via the native Google Gen AI SDK
# (langchain-google-genai). The native SDK handles thought_signature replay
# across tool turns, which langchain-openai's OpenAI-compat path does not —
# see FROZEN.md "The Gemini 3.5 Flash trap" for the history.
# Model ID empirically verified 2026-05-28; current Google flagship Flash.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model = ChatGoogleGenerativeAI(
    model=os.getenv("MODEL", "gemini-3.5-flash"),
    google_api_key=os.getenv("GEMINI_API_KEY"),
)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# END CUSTOMIZATION SEAM ⊥ (LLM provider)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #5 — Switch domain (DOMAIN env)
# See HACKATHON.md §5 for the full recipe.
# Pattern to copy: agent/src/domains/shopping/ (canonical stub).
#
# Set DOMAIN=<name> in .env to swap the whole tool bundle + system prompt.
# Ships with two domains:
#   - default  → flights + dashboards + todos (inherited base demo)
#   - shopping → canonical stub: product search + order dashboards
# To add your own, copy agent/src/domains/shopping/ and add an elif branch.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN = os.getenv("DOMAIN", "default")
if DOMAIN == "default":
    from src.domains.default.tools import default_tools as _tools
    from src.domains.default.prompts import SYSTEM_PROMPT as _system_prompt
elif DOMAIN == "shopping":
    from src.a2ui_dynamic_schema import generate_a2ui
    from src.domains.shopping.tools import shopping_tools
    from src.domains.shopping.prompts import SYSTEM_PROMPT as _system_prompt
    _tools = [generate_a2ui, *shopping_tools]
else:
    raise ValueError(
        f"Unknown DOMAIN={DOMAIN!r}. Set DOMAIN=default or DOMAIN=shopping in .env, "
        f"or add a new branch in agent/main.py. See HACKATHON.md §5."
    )

agent = create_agent(
    model=model,
    tools=_tools,
    middleware=[
        CopilotKitMiddleware(),
        StateStreamingMiddleware(
            StateItem(state_key="todos", tool="manage_todos", tool_argument="todos")
        ),
        # Last so it sees the merged tools after CopilotKitMiddleware injects
        # frontend tools — reshapes them to strict OpenAI form for Gemini.
        NormalizeToolShapeMiddleware(),
    ],
    state_schema=AgentState,
    system_prompt=_system_prompt,
)

graph = agent
