"""Agent-level live smoke for the OpenAI -> Gemini port (B4).

Proves the two failure modes the port had to clear, on gemini-3.5-flash via
langchain-google-genai:

  1. Forced structured output survives — the forced `render_a2ui` shim takes
     scalar string params (`components_json` / `data_json`), so Gemini's
     tool-arg parser must NOT strip the surface payload and the call must
     come back with a non-empty `components_json`.

  2. No thought_signature 400 across a multi-turn tool replay — a prior tool
     turn followed by a forced `tool_choice` call must return cleanly. The
     native SDK replays Gemini's thought signatures; the OpenAI-compat path
     does not.

Run from agent/:
    uv run --env-file ../../.env python smoke_gemini_port.py

(Or point --env-file at agent/.env if you keep a local copy there.)

This talks to the live Gemini API (needs GEMINI_API_KEY). It does NOT boot
the web/agent HTTP stack — that's a separate post-merge step.
"""
from __future__ import annotations

import os
import sys

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

# Import the ported pieces under test.
from src.dynamic_agent import _render_model, render_a2ui
from src.catalog import CATALOG_ID, CATALOG_PROMPT


def _fail(label: str, err: Exception) -> None:
    msg = str(err)
    print(f"[SMOKE] {label}: FAIL\n{type(err).__name__}: {msg}")
    if "items" in msg and "missing field" in msg:
        print("[SMOKE]   -> ARRAY-SCHEMA REGRESSION: a param lost its item schema.")
    if "thought_signature" in msg:
        print("[SMOKE]   -> THOUGHT-SIGNATURE 400: multi-turn replay broke.")
    sys.exit(1)


def main() -> None:
    if not os.getenv("GEMINI_API_KEY"):
        print("[SMOKE] SKIP: no GEMINI_API_KEY in env.")
        sys.exit(2)

    print(f"[SMOKE] model={os.getenv('MODEL', 'gemini-3.5-flash')}")
    model_with_tool = _render_model().bind_tools(
        [render_a2ui], tool_choice="render_a2ui"
    )

    sys_prompt = (
        f"Use this catalog. catalogId: {CATALOG_ID}\n\n{CATALOG_PROMPT}\n\n"
        "Design a tiny A2UI surface. Inline all data."
    )

    # --- Check 1: single forced call (scalar JSON-string params survive) ---
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
    comps_json = args.get("components_json", "")
    if not comps_json or comps_json.strip() in ("", "[]"):
        print(
            "[SMOKE] check-1: FAIL — components_json empty "
            f"({comps_json!r}); the surface payload was stripped or omitted."
        )
        sys.exit(1)
    print(
        f"[SMOKE] check-1: PASS — render_a2ui called; "
        f"surfaceId={args.get('surfaceId')!r} components_json={len(comps_json)} chars"
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
                        "components_json": '[{"id": "root", "component": "Text", "text": "prior"}]',
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
        f"components_json={len(args2.get('components_json', ''))} chars "
        f"(no thought_signature 400, no items-missing 400)"
    )

    print("[SMOKE] ALL CHECKS PASS — Gemini port viable on gemini-3.5-flash.")


if __name__ == "__main__":
    main()
