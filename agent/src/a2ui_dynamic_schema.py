"""
Dynamic A2UI tool: LLM-generated UI from conversation context.

A secondary LLM generates v0.9 A2UI components via a structured tool call.
The generate_a2ui tool wraps the output as a2ui_operations, which the
middleware detects in the TOOL_CALL_RESULT and renders automatically.

This file is the CANONICAL EXAMPLE for dynamic-schema A2UI. The fixed-schema
counterpart (a2ui_fixed_schema.py) is the preferred path for demo
predictability — use this dynamic path when you want the LLM to design ad-hoc
UI on the fly and you're willing to accept the unpredictability. See
HACKATHON.md §4 ("Faster alternative — dynamic schema") for the trade-offs.

Tweak the produced schemas in the A2UI Composer:
  https://a2ui-composer.ag-ui.com/
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CANONICAL EXAMPLE — Dynamic-schema A2UI
# See HACKATHON.md §4 for the recipe.
# Pattern to copy: generate_a2ui (below) — secondary LLM designs the
# schema; this tool returns a2ui.render(operations=[...]) for the
# middleware to detect and dispatch.
#
# Prefer the fixed-schema path (agent/src/a2ui_fixed_schema.py:search_flights)
# for anything you'll demo in front of judges. Use this dynamic path for
# exploratory builds where you don't yet know the widget shape.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import json
import os
from typing import Any

from langchain.tools import tool, ToolRuntime
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool as lc_tool
from langchain_google_genai import ChatGoogleGenerativeAI

from copilotkit import a2ui

# Shared JSON-serialization guard — same pattern as the fixed-schema and
# shopping-domain tools. See agent/src/a2ui/_safe.py for the rationale.
from src.a2ui._safe import _safe_envelope_data

CUSTOM_CATALOG_ID = "copilotkit://app-dashboard-catalog"


@lc_tool
def render_a2ui(
    surfaceId: str,
    catalogId: str,
    components: list[dict],
    data: dict | None = None,
) -> str:
    """Render a dynamic A2UI v0.9 surface.

    Args:
        surfaceId: Unique surface identifier.
        catalogId: The catalog ID (use "copilotkit://app-dashboard-catalog").
        components: A2UI v0.9 component array (flat format). The root
            component must have id "root".
        data: Optional initial data model for the surface (e.g. form values,
            list items for data-bound components).
    """
    return "rendered"


@tool()
def generate_a2ui(runtime: ToolRuntime[Any]) -> str:
    """Generate dynamic A2UI components based on the conversation.

    A secondary LLM designs the UI schema and data. The result is
    returned as an a2ui_operations container for the middleware to detect.
    """
    import time

    t0 = time.time()
    print(f"[A2UI-DEBUG] generate_a2ui STARTED at t=0")

    messages = runtime.state["messages"][:-1]
    print(f"[A2UI-DEBUG]   messages count: {len(messages)}")

    # Get context entries from copilotkit state (catalog capabilities + component schema)
    context_entries = runtime.state.get("copilotkit", {}).get("context", [])
    context_text = "\n\n".join(
        entry.get("value", "")
        for entry in context_entries
        if isinstance(entry, dict) and entry.get("value")
    )
    print(
        f"[A2UI-DEBUG]   context entries: {len(context_entries)}, context_text_len: {len(context_text)}"
    )

    prompt = context_text

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Secondary LLM — designs the A2UI schema for dynamic surfaces.
    # Reads the same MODEL / GEMINI_API_KEY env as the primary agent
    # (agent/main.py). Keep the two providers in sync.
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    model = ChatGoogleGenerativeAI(
        model=os.getenv("MODEL", "gemini-3.5-flash"),
        google_api_key=os.getenv("GEMINI_API_KEY"),
    )
    model_with_tool = model.bind_tools(
        [render_a2ui],
        tool_choice="render_a2ui",
    )

    print(f"[A2UI-DEBUG]   calling secondary LLM at t={time.time() - t0:.1f}s")
    response = model_with_tool.invoke(
        [SystemMessage(content=prompt), *messages],
    )
    print(f"[A2UI-RESPONSE] {response}")
    print(f"[A2UI-DEBUG]   secondary LLM responded at t={time.time() - t0:.1f}s")

    if not response.tool_calls:
        print(f"[A2UI-DEBUG]   ERROR: no tool calls in response")
        return json.dumps({"error": "LLM did not call render_a2ui"})

    tool_call = response.tool_calls[0]
    args = tool_call["args"]

    surface_id = args.get("surfaceId", "dynamic-surface")
    catalog_id = args.get("catalogId", CUSTOM_CATALOG_ID)
    components = args.get("components", [])
    data = args.get("data", {})
    print(
        f"[A2UI-DEBUG]   components={len(components)} data_keys={list(data.keys()) if data else []} surface={surface_id}"
    )

    ops = [
        a2ui.create_surface(surface_id, catalog_id=catalog_id),
        a2ui.update_components(surface_id, components),
    ]
    if data:
        ops.append(
            a2ui.update_data_model(
                surface_id, _safe_envelope_data(data, surface_id=surface_id)
            )
        )

    result = a2ui.render(operations=ops)
    print(
        f"[A2UI-DEBUG] generate_a2ui DONE at t={time.time() - t0:.1f}s result_len={len(result)}"
    )
    return result
