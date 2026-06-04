"""Offline (OFFLINE=1) builder for the /fixed dashboard agent.

The goal: serve a real, deterministic A2UI dashboard surface with ZERO
Gemini calls and no API key, while keeping the emitted envelope byte-for-byte
identical to the production path.

Mechanism: a deterministic stub `BaseChatModel` drives the SAME
`create_agent(...)` ReAct loop and the SAME `render_dashboard` tool used
online. The stub:

  - on the first turn (no ToolMessage yet) returns an `AIMessage` with a
    forced tool call to `render_dashboard(**OFFLINE_DASHBOARD_ARGS)`;
  - after the tool runs (a ToolMessage is present) returns a short final
    `AIMessage`.

Because the REAL tool runs inside the REAL ToolNode, the tool result is the
real `a2ui.render(...)` JSON (createSurface / updateComponents /
updateDataModel under the `a2ui_operations` key). `ag_ui_langgraph` emits
that ToolMessage content as a TOOL_CALL_RESULT event and the JS-side a2ui
middleware paints it — exactly as in the online path.

Uses only already-installed packages (langchain / langchain-core /
langgraph). No new deps.
"""
from __future__ import annotations

import uuid
from typing import Any, Sequence

from langchain.agents import create_agent
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langgraph.checkpoint.memory import MemorySaver

from src.offline_sample import OFFLINE_DASHBOARD_ARGS

_TOOL_NAME = "render_dashboard"
_FINAL_TEXT = "Offline mode — showing a sample Tesla Q3 FY24 dashboard."


class OfflineDashboardModel(BaseChatModel):
    """Deterministic stub that forces one `render_dashboard` call, then stops.

    Inspecting the message history is enough to decide the turn:
      - no ToolMessage yet  → emit the forced tool call;
      - a ToolMessage exists → emit the final text and end the loop.
    """

    @property
    def _llm_type(self) -> str:
        return "offline-dashboard-stub"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "OfflineDashboardModel":
        # create_agent calls model.bind_tools(tools, tool_choice=..., **settings).
        # The stub ignores the tools/settings (it hard-codes the one call it
        # makes) and returns itself so the bound model is still this stub.
        return self

    def bind(self, **kwargs: Any) -> "OfflineDashboardModel":
        # create_agent falls back to model.bind(**settings) when there are no
        # tools to bind. Keep returning self so invoke() hits _generate.
        return self

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        already_rendered = any(isinstance(m, ToolMessage) for m in messages)
        if already_rendered:
            message: BaseMessage = AIMessage(content=_FINAL_TEXT)
        else:
            message = AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": _TOOL_NAME,
                        "args": dict(OFFLINE_DASHBOARD_ARGS),
                        "id": f"call_{uuid.uuid4().hex[:12]}",
                    }
                ],
            )
        return ChatResult(generations=[ChatGeneration(message=message)])


def build_offline_fixed_agent(render_dashboard_tool: Any, system_prompt: str):
    """Return a compiled /fixed graph that paints the sample dashboard offline.

    `render_dashboard_tool` and `system_prompt` are passed in from
    fixed_agent.py so the offline path reuses the exact same tool object and
    prompt as online — only the model is swapped for the stub.
    """
    return create_agent(
        model=OfflineDashboardModel(),
        tools=[render_dashboard_tool],
        system_prompt=system_prompt,
        checkpointer=MemorySaver(),
    )
