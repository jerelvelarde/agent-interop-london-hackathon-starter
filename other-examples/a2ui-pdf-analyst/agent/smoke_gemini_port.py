"""Agent-level live smoke for the OpenAI -> Gemini port (B4).

Proves the two failure modes the port had to clear, on gemini-3.5-flash via
langchain-google-genai:

  1. Typed-array schema acceptance — the forced `render_a2ui` shim declares
     its `components` array with a typed item model (A2uiComponent), so
     Gemini's function-declaration validator must NOT 400 with
     "parameters.properties[components].items: missing field".

  2. No thought_signature 400 across a multi-turn tool replay — a prior tool
     turn followed by a forced `tool_choice` call must return cleanly. The
     native SDK replays Gemini's thought signatures; the OpenAI-compat path
     does not.

Run from agent/:
    uv run --env-file /Users/jerel-cpk/Projects/london-a2ui-hackathon/.env \
        python smoke_gemini_port.py

This talks to the live Gemini API (needs GEMINI_API_KEY). It does NOT boot
the web/agent HTTP stack — that's a separate post-merge step.
"""
from __future__ import annotations

import os
import sys

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

# Import the ported pieces under test.
from src.dynamic_agent import _RENDER_MODEL, render_a2ui
from src.catalog import CATALOG_ID, CATALOG_PROMPT


def _fail(label: str, err: Exception) -> None:
    msg = str(err)
    print(f"[SMOKE] {label}: FAIL\n{type(err).__name__}: {msg}")
    if "items" in msg and "missing field" in msg:
        print("[SMOKE]   -> TYPED-ARRAY REGRESSION: array param lost its item schema.")
    if "thought_signature" in msg:
        print("[SMOKE]   -> THOUGHT-SIGNATURE 400: multi-turn replay broke.")
    sys.exit(1)


def main() -> None:
    if not os.getenv("GEMINI_API_KEY"):
        print("[SMOKE] SKIP: no GEMINI_API_KEY in env.")
        sys.exit(2)

    print(f"[SMOKE] model={os.getenv('MODEL', 'gemini-3.5-flash')}")
    model_with_tool = _RENDER_MODEL.bind_tools(
        [render_a2ui], tool_choice="render_a2ui"
    )

    sys_prompt = (
        f"Use this catalog. catalogId: {CATALOG_ID}\n\n{CATALOG_PROMPT}\n\n"
        "Design a tiny A2UI surface. Inline all data."
    )

    # --- Check 1: single forced call (typed-array schema must be accepted) ---
    try:
        r1 = model_with_tool.invoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content="Show one StatCard: revenue $94,930M, up 6.1%."),
        ])
    except Exception as e:  # noqa: BLE001
        _fail("check-1 single forced render_a2ui", e)

    if not r1.tool_calls:
        print("[SMOKE] check-1: FAIL — no tool_calls (forced choice produced none).")
        sys.exit(1)
    args = r1.tool_calls[0]["args"]
    comps = args.get("components", [])
    print(
        f"[SMOKE] check-1: PASS — render_a2ui called; "
        f"surfaceId={args.get('surfaceId')!r} components={len(comps)}"
    )

    # --- Check 2: multi-turn tool replay (prior tool turn -> forced call) ---
    # Simulate a realistic dynamic-agent turn: an earlier query_pdf-style tool
    # round-trip already happened, then we force render_a2ui again. This is the
    # exact shape that triggers the thought_signature 400 on OpenAI-compat.
    try:
        r2 = model_with_tool.invoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content="What was operating margin? Then chart the trend."),
            AIMessage(
                content="",
                tool_calls=[{
                    "name": "render_a2ui",
                    "id": "call_prev",
                    "args": {
                        "surfaceId": "prev",
                        "catalogId": CATALOG_ID,
                        "components": [{"id": "root", "component": "Text", "text": "prior"}],
                    },
                }],
            ),
            ToolMessage(content="rendered", tool_call_id="call_prev"),
            HumanMessage(content="Now show the 6-month revenue trend as a LineChart."),
        ])
    except Exception as e:  # noqa: BLE001
        _fail("check-2 multi-turn forced replay", e)

    if not r2.tool_calls:
        print("[SMOKE] check-2: FAIL — no tool_calls on replay turn.")
        sys.exit(1)
    args2 = r2.tool_calls[0]["args"]
    print(
        f"[SMOKE] check-2: PASS — replay forced render_a2ui clean; "
        f"components={len(args2.get('components', []))} "
        f"(no thought_signature 400, no items-missing 400)"
    )

    print("[SMOKE] ALL CHECKS PASS — Gemini port viable on gemini-3.5-flash.")


if __name__ == "__main__":
    main()
