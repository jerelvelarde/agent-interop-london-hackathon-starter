"""
Toy A2A subagent for the A2UI hackathon starter.

This is the minimum thing that satisfies the A2A protocol contract while
emitting A2UI v0.9 envelopes. A partner agent can use this file as a
copy-and-customize template: swap the hardcoded payload for whatever
their domain produces and they're talking A2A + A2UI.

Architecture:
- A small LangGraph graph (`graph`) holds the agent logic. The graph
  is hardcoded for the toy case — it just emits a fixed A2UI v0.9
  envelope sequence. Replace this with your real LangGraph workflow
  when adapting.
- An A2A protocol executor (`SampleA2AAgentExecutor`) wraps the graph
  and exposes it over HTTP using `a2a-sdk`. The parent app's
  `@ag-ui/a2a-middleware` speaks the matching client side of A2A.

Boot:
    cd a2a/sample-subagent
    uv sync
    uv run python main.py           # defaults to port 8124
    # or set the port explicitly:
    PORT=8124 uv run python main.py

Verify (from the parent app's worktree):
    pnpm check-a2a http://localhost:8124

Then activate the bolt-on in the parent app:
    export A2A_AGENT_URL=http://localhost:8124
    pnpm dev
"""

from __future__ import annotations

import json
import os
import sys
from typing import TypedDict

import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.apps import A2AStarletteApplication
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill, Message
from a2a.utils import new_agent_text_message
from langgraph.graph import END, StateGraph

PORT = int(os.getenv("PORT", "8124"))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A2UI v0.9 envelopes — hardcoded for the toy demo.
#
# A partner A2A agent should emit envelopes in the same shape from
# whatever their domain produces. The compliance checker in
# a2a/compliance/check.ts validates exactly these three envelope
# shapes against the v0.9 spec at https://a2ui.org/specification/v0.9-a2ui/.
#
# Canonical example (real LLM-driven): agent/src/tools/risk_register.py
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SURFACE_ID = "a2a-sample-surface"
CATALOG_ID = "copilotkit://app-dashboard-catalog"


def build_a2ui_envelopes() -> list[dict]:
    """Return the three v0.9 envelopes the parent app will render."""
    return [
        {
            "version": "v0.9",
            "kind": "createSurface",
            "surfaceId": SURFACE_ID,
            "catalogId": CATALOG_ID,
        },
        {
            "version": "v0.9",
            "kind": "updateComponents",
            "surfaceId": SURFACE_ID,
            "components": [
                {
                    "id": "root",
                    "type": "card",
                    "props": {
                        "title": "Hello from the A2A subagent",
                        "body": (
                            "This card was emitted by a remote A2A agent and "
                            "rendered by the parent app via "
                            "@ag-ui/a2a-middleware."
                        ),
                    },
                }
            ],
        },
        {
            "version": "v0.9",
            "kind": "updateDataModel",
            "surfaceId": SURFACE_ID,
            "data": {
                "source": "a2a-sample-subagent",
                "envelopeCount": 3,
            },
        },
    ]


# ─── LangGraph graph ──────────────────────────────────────────────
# Tiny single-node graph. Stand-in for the real workflow a partner
# A2A agent would run. The graph keeps the door open to LLM-driven
# variants without forcing the toy case to talk to an LLM.


class SubagentState(TypedDict):
    message: str
    envelopes_json: str


def _emit_envelopes(state: SubagentState) -> SubagentState:
    state["envelopes_json"] = json.dumps(build_a2ui_envelopes())
    return state


def _build_graph():
    workflow = StateGraph(SubagentState)
    workflow.add_node("emit_envelopes", _emit_envelopes)
    workflow.set_entry_point("emit_envelopes")
    workflow.add_edge("emit_envelopes", END)
    return workflow.compile()


graph = _build_graph()


# ─── A2A Protocol executor ────────────────────────────────────────


class SampleA2AAgentExecutor(AgentExecutor):
    """Wraps the LangGraph subagent in an A2A protocol endpoint."""

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        # Extract the inbound A2A message text (empty fallback for probes
        # that send a bare ping).
        message: Message | None = context.message
        text_in = ""
        if message and message.parts:
            first = message.parts[0].root
            if hasattr(first, "text"):
                text_in = first.text or ""

        result = graph.invoke({"message": text_in, "envelopes_json": ""})
        await event_queue.enqueue_event(new_agent_text_message(result["envelopes_json"]))

    async def cancel(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        raise Exception("cancel not supported")


skill = AgentSkill(
    id="emit_a2ui_envelopes",
    name="Emit A2UI Envelopes",
    description=(
        "Returns a hardcoded A2UI v0.9 envelope sequence (createSurface, "
        "updateComponents, updateDataModel) so the parent app can render "
        "a sample card from a remote A2A subagent."
    ),
    tags=["a2ui", "a2a", "sample", "hackathon"],
    examples=[
        "Show me the A2A sample",
        "Render a card from the remote agent",
    ],
)

public_agent_card = AgentCard(
    name="A2UI Hackathon Sample A2A Subagent",
    description=(
        "Toy A2A subagent for the A2UI hackathon starter. Emits a fixed "
        "A2UI v0.9 envelope sequence. Use as a template for your own A2A "
        "agent — swap build_a2ui_envelopes() for your domain."
    ),
    url=f"http://localhost:{PORT}/",
    version="0.1.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)


def main() -> int:
    request_handler = DefaultRequestHandler(
        agent_executor=SampleA2AAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler,
        extended_agent_card=public_agent_card,
    )

    print(
        f"A2UI Hackathon sample A2A subagent listening on http://localhost:{PORT}"
    )
    print(f"Agent: {public_agent_card.name}")
    print()
    print(f"Verify shape with: pnpm check-a2a http://localhost:{PORT}")
    print(f"Activate bolt-on:  export A2A_AGENT_URL=http://localhost:{PORT}")

    uvicorn.run(server.build(), host="0.0.0.0", port=PORT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
