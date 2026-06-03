"""
NormalizeToolShapeMiddleware — Gemini-OpenAI-compat tool-shape normalizer.

Why this exists
---------------
CopilotKit's V2 frontend-tool API (`useFrontendTool`) registers tools with a
flat shape `{name, description, parameters}`. The Python middleware
(`CopilotKitMiddleware.awrap_model_call`) merges these into the LLM's tool
list as-is. langchain-openai forwards them to the chat-completions endpoint
without re-wrapping.

OpenAI's chat-completions endpoint is lenient and tolerates the flat shape.
**Gemini's OpenAI-compatibility endpoint is strict** and 400s with:

    Invalid JSON payload received. Unknown name "name" at 'tools[5]':
    Cannot find field.

This middleware runs AFTER CopilotKitMiddleware in the chain (place it last
in the `middleware=[...]` list passed to `create_agent`). It normalizes
every tool to the canonical OpenAI shape:

    {"type": "function",
     "function": {"name": "...", "description": "...", "parameters": {...}}}

LangChain tool objects (BaseTool subclasses) are passed through unchanged;
LangChain handles their conversion to the canonical shape when binding to
the model.

Long-term fix: this normalization belongs upstream in CopilotKit's V2
middleware (or in ag-ui's tool serializer). Once that lands, this middleware
can be removed. Until then it's the one-line shim that makes the hackathon
starter work UI→Agent on Gemini.

See:
- agent/main.py — installs this middleware
- FROZEN.md "Why this default (and why NOT 3.5 Flash)" — related Gemini quirk
- https://ai.google.dev/gemini-api/docs/openai (Gemini OpenAI-compat reference)
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.types import ModelRequest, ModelResponse


def _normalize_one(tool: Any) -> Any:
    """Normalize a single tool entry to the canonical OpenAI function-tool shape.

    Pass-through for objects (LangChain tools) — LangChain's `bind_tools` knows
    how to convert these. Only dict entries need our help.
    """
    if not isinstance(tool, dict):
        return tool

    # Already in canonical shape: {"type": "function", "function": {...}}
    if tool.get("type") == "function" and "function" in tool and isinstance(tool["function"], dict):
        # Drop any extra top-level fields that strict parsers reject.
        return {"type": "function", "function": tool["function"]}

    # Flat shape: {"name": "...", "description": "...", "parameters": {...}}
    # Wrap it.
    if "name" in tool:
        return {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": tool.get(
                    "parameters",
                    {"type": "object", "properties": {}},
                ),
            },
        }

    # Unknown shape; pass through. The LLM will tell us if it's bad.
    return tool


class NormalizeToolShapeMiddleware(AgentMiddleware):
    """Reshape merged tool list to strict OpenAI shape before the LLM call.

    Runs in both async and sync paths. Idempotent.
    """

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        normalized = [_normalize_one(t) for t in request.tools]
        return handler(request.override(tools=normalized))

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelResponse:
        normalized = [_normalize_one(t) for t in request.tools]
        return await handler(request.override(tools=normalized))
