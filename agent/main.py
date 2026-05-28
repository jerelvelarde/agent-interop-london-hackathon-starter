"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

import os

from copilotkit import CopilotKitMiddleware, StateStreamingMiddleware, StateItem
from langchain.agents import create_agent

# Data & state tools
from src.query import query_data
from src.todos import AgentState, todo_tools

# A2UI tools
from src.a2ui_dynamic_schema import generate_a2ui
from src.a2ui_fixed_schema import search_flights

from langchain_openai import ChatOpenAI

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM — LLM provider
# Default: Gemini 2.5 Flash via Google's OpenAI-compatible endpoint.
# Why 2.5 (not 3.5): Gemini 3.x requires thought_signature replay across
# tool turns (https://ai.google.dev/gemini-api/docs/thought-signatures);
# langchain-openai 1.1.9 does not implement this, so 3.5 Flash 400s after
# the first tool call. 2.5 Flash has no such requirement.
# Model ID empirically verified 2026-05-28 via scripts/probe-gemini.sh.
# See FROZEN.md for the full probe results and the 3.x upgrade path.
# To swap providers (OpenAI / Anthropic / LiteLLM): see .env.example.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model = ChatOpenAI(
    model=os.getenv("MODEL", "gemini-2.5-flash"),
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("MODEL_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
    model_kwargs={"parallel_tool_calls": False},
)

agent = create_agent(
    model=model,
    tools=[query_data, *todo_tools, generate_a2ui, search_flights],
    middleware=[
        CopilotKitMiddleware(),
        StateStreamingMiddleware(
            StateItem(state_key="todos", tool="manage_todos", tool_argument="todos")
        ),
    ],
    state_schema=AgentState,
    system_prompt="""
        You are a polished, professional demo assistant. Keep responses to 1-2 sentences.

        Tool guidance:
        - Flights: call search_flights to show flight cards with a pre-built schema.
        - Dashboards & rich UI: call generate_a2ui to create dashboard UIs with metrics,
          charts, tables, and cards. It handles rendering automatically.
        - Charts: call query_data first, then render with the chart component.
        - Todos: enable app mode first, then manage todos.
        - A2UI actions: when you see a log_a2ui_event result (e.g. "view_details"),
          respond with a brief confirmation. The UI already updated on the frontend.
    """,
)

graph = agent
