# A2A Bolt-On

This directory holds the optional **A2A (agent-to-agent) interop** path for the A2UI hackathon starter. It is the **Track 1** seam — bring your own A2A subagent and the parent app's orchestrator can delegate work to it via the A2A protocol while continuing to render A2UI v0.9 surfaces on the frontend.

The bolt-on is **dormant by default**. The parent app runs unchanged unless you set `A2A_AGENT_URL`.

```
a2a/
├── README.md                  # This file
├── sample-subagent/           # Toy A2A server (Python, a2a-sdk + LangGraph)
│   ├── main.py
│   ├── langgraph.json
│   └── pyproject.toml
└── compliance/
    └── check.ts               # `pnpm check-a2a <url>` validator
```

## TL;DR

```bash
# 1. Boot the toy A2A subagent (in a separate terminal)
cd a2a/sample-subagent
uv sync
uv run python main.py

# 2. Verify it's A2UI v0.9 compliant
pnpm check-a2a http://localhost:8124

# 3. Activate the bolt-on in the parent app
export A2A_AGENT_URL=http://localhost:8124
pnpm dev
```

## What this seam does

The parent app's `/api/copilotkit` route reads `A2A_AGENT_URL` at module init. When unset, the LangGraph agent is served as-is. When set, the LangGraph agent is wrapped with `@ag-ui/a2a-middleware`, which injects a `send_message_to_a2a_agent` tool into the orchestrator's tool list. The orchestrator can then delegate user requests to the A2A subagent, receive its response, and continue the chat — all while the frontend keeps rendering A2UI v0.9 envelopes.

The relevant code lives in `src/app/api/copilotkit/[[...slug]]/route.ts` under "CUSTOMIZATION SEAM #6".

## Env-var contract

| Env var             | Effect |
|---------------------|--------|
| `A2A_AGENT_URL`     | Comma-separated list of A2A subagent base URLs. Setting any value activates the bolt-on. |
| `A2A_INSTRUCTIONS`  | Optional. Domain-specific routing instructions appended to the middleware's system prompt. |

Examples:

```bash
# Single subagent
export A2A_AGENT_URL=http://localhost:8124

# Multiple subagents
export A2A_AGENT_URL=http://localhost:8124,http://localhost:8125

# Custom routing hints
export A2A_INSTRUCTIONS="Always check the research agent before answering."
```

## Envelope-shape contract for partner agents

The compliance checker (`pnpm check-a2a <url>`) verifies that an A2A subagent emits **A2UI v0.9 envelopes** in its responses. Three envelope kinds are recognized; each has its own required fields.

> See `agent/src/tools/risk_register.py:show_risk_register` for the canonical example and <https://a2ui.org/specification/v0.9-a2ui/> for the full spec.

### Common to all envelopes

```json
{
  "version": "v0.9",
  "kind": "<one of: createSurface, updateComponents, updateDataModel>",
  "surfaceId": "<your-surface-id>"
}
```

### createSurface

Declares a new rendered surface on the frontend. Requires `catalogId`.

```json
{
  "version": "v0.9",
  "kind": "createSurface",
  "surfaceId": "my-surface",
  "catalogId": "copilotkit://app-dashboard-catalog"
}
```

### updateComponents

Replaces the component tree on a surface. Requires `components` (array).

```json
{
  "version": "v0.9",
  "kind": "updateComponents",
  "surfaceId": "my-surface",
  "components": [
    { "id": "root", "type": "card", "props": { "title": "Hello" } }
  ]
}
```

### updateDataModel

Updates the reactive data model bound to the surface. Requires `data` (object).

```json
{
  "version": "v0.9",
  "kind": "updateDataModel",
  "surfaceId": "my-surface",
  "data": { "anyKey": "anyValue" }
}
```

## How the toy subagent talks the protocol

`sample-subagent/main.py` does the minimum to be a valid A2A server:

1. Serves an `AgentCard` at `/.well-known/agent.json` so the parent middleware can discover its capabilities and RPC endpoint.
2. Exposes a JSON-RPC endpoint that accepts `message/send` (or `message/stream`) requests.
3. Returns a text message whose body is a JSON array of A2UI v0.9 envelopes.

That's it. A real partner agent would replace `build_a2ui_envelopes()` with an LLM-driven workflow that produces envelopes from real domain data, but the protocol surface stays identical.

## Building your own A2A subagent

The fastest path:

1. Copy `a2a/sample-subagent/` to a new directory (or to a new repo entirely).
2. Replace `build_a2ui_envelopes()` with your domain logic.
3. Update the `AgentCard` `name` / `description` / `skills` to match your agent.
4. Boot it on a unique port: `PORT=8125 uv run python main.py`.
5. Verify the envelope shape: `pnpm check-a2a http://localhost:8125`.
6. Plug it in: `export A2A_AGENT_URL=http://localhost:8125`.

If `check-a2a` complains, follow the teaching message it prints — the validator points at the exact field that needs fixing and at the canonical example to copy.

## Troubleshooting

**`check-a2a` says "Could not reach A2A endpoint"**
- Boot the subagent first: `cd a2a/sample-subagent && uv run python main.py`.
- Probe by hand: `curl http://localhost:8124/.well-known/agent.json`.

**`check-a2a` says "agent responded but no A2UI v0.9 envelopes were found"**
- Your subagent is reachable and A2A-compliant but isn't emitting A2UI envelopes. Check the canonical example: `agent/src/tools/risk_register.py:show_risk_register`.

**`check-a2a` flags missing fields**
- The validator output lists each issue with the field name and the canonical example to copy. Fix the indicated field and re-run.

**Bolt-on activated but the parent app behaves like A2A is dormant**
- Restart `pnpm dev` after setting `A2A_AGENT_URL`. The env var is read at module init.
- Confirm the URL is reachable from where the parent app runs (Docker network gotchas, etc.).

## Related files

- `src/app/api/copilotkit/[[...slug]]/route.ts` — the seam where the middleware wires up
- `agent/src/tools/risk_register.py` — canonical A2UI v0.9 envelope-emitting tool
- <https://a2ui.org/specification/v0.9-a2ui/> — the v0.9 envelope spec
