# PortKit — archived original starter demo

> **Status: archived snapshot.** PortKit was the starter's default demo
> before **pdf-analyst** (chat-with-your-PDF) took over the `/` route. The
> code here is a point-in-time copy of that demo, moved out of the host app
> when the default changed. It is kept for reference and as a deeper example
> — **it is not a turnkey app.** Running it standalone takes host surgery
> (see below). For the live default demo, go to the repo root.

## What PortKit was

PortKit was a **project-operations workspace** for a small team — the agent
generated the whole UI on demand as A2UI v0.9 envelopes:

- **Project dashboard** — 4 KPI cards, a sprint-progress bar, and per-project
  cards (Atlas / Orion / Lyra).
- **Project drill-down** — a status hero, milestone list, a kanban scoped to
  one sprint, and open risks.
- **Team load** — a bar chart of points-per-person plus an overloaded-teammates
  table.
- **Status-report draft** — an editable TL;DR / Progress / Risks / Asks card
  with action buttons that bubble an `action.event` back to the agent.
- **Flight-search and to-do surfaces** — the base-example carryovers it was
  forked from.

It ran on a **LangGraph-cli agent** (a single graph, `sample_agent`) and
mounted into the host through the `(default)` Next.js route group. The
5-turn on-stage script lives in [`DEMO.md`](./DEMO.md); the gallery manifest
is [`EXAMPLE.json`](./EXAMPLE.json).

The LLM was — and still is, in this snapshot — **Gemini 3.5 Flash** via the
native Google Gen AI SDK, the same default as the rest of the starter (see
the root [`FROZEN.md`](../../FROZEN.md) § LLM provider).

## What's in this folder

```
other-examples/portkit/
├── README.md                     # this file
├── DEMO.md                       # the original 5-turn on-stage script
├── EXAMPLE.json                  # gallery manifest (status: archived)
├── public/
│   └── offline-envelopes.json    # the OFFLINE=1 pre-baked envelopes
├── src/                          # the host-shell frontend it depended on
│   ├── app/(default)/            # the route group it mounted under (page, layout, /debug)
│   ├── app/declarative-generative-ui/   # the 9 dashboard primitives (definitions + renderers)
│   ├── components/example-canvas/       # todo cards/columns/list
│   └── hooks/                    # use-example-suggestions
└── agent/                        # the LangGraph-cli Python agent
    ├── main.py                   # exports `graph` (Gemini + tools + middleware)
    ├── langgraph.json            # LangGraph CLI config (graph: sample_agent)
    ├── pyproject.toml + uv.lock  # its own pinned Python deps
    └── src/                      # tools/ (risk_register, project_dashboard, …),
                                  # query.py, domains/, widgets/, a2ui/schemas/
```

## Why it's not turnkey — the host surgery

PortKit was a *mounted* demo, not a self-contained one. Two layers of
coupling have to be resolved before it runs again.

### 1. Frontend depends on the host shell (`@/` imports)

The pages under `src/app/(default)/` import host-shell modules by the `@/`
alias — e.g.:

```
@/components/BrandFrame
@/components/example-layout      ← no longer in the host src/
@/components/surface-canvas      ← no longer in the host src/
@/components/EnvelopeInspector
@/components/ui/{card,checkbox,button,badge}
@/lib/mirror-renderer
@/hooks  ·  @/hooks/use-envelope-stream  ·  @/types/a2ui
```

When pdf-analyst became the default, the host `src/` was reshaped around it.
**Some of these modules still exist in the host (`BrandFrame`,
`EnvelopeInspector`, `mirror-renderer`, `hooks`, `types/a2ui`, `ui/*`), but
others were removed (`example-layout`, `surface-canvas`).** So a straight
copy of `src/app/(default)/` back into the host will not type-check or build
as-is. To revive it you'd need to either (a) restore the missing shell
components from this snapshot's git history, or (b) port the pages onto the
current host shell. This snapshot does **not** carry copies of every `@/`
dependency it references.

### 2. Agent is a LangGraph-cli graph, not the FastAPI app

The default agent now serves over **FastAPI** (`agent/main.py`,
`uvicorn main:app` on `:8123` — see the root `FROZEN.md` § Serving). PortKit's
agent is the older **langgraph-cli** style: `agent/main.py` exports a `graph`
object and ships its own `langgraph.json` (graph id `sample_agent`). To run
it you'd start it the langgraph-cli way:

```bash
cd other-examples/portkit/agent
uv sync
uv run --reload langgraph dev      # serves the `sample_agent` graph
```

PortKit used to ship an AG-UI/Docker `serve.py` wrapper (a thin
`from main import graph` shim) at the repo root. It was removed when
pdf-analyst became the default — the live demo now serves over FastAPI
(`agent/main.py`), and this archive runs via `langgraph dev` (above), so the
wrapper is no longer needed. Recover it from git history if you want the
standalone AG-UI serving shape; it targeted *this* graph, not the root
FastAPI app.

### 3. Routing

PortKit mounted at `/` via the `(default)` route group. The host now uses
the `(pdf)` group for `/`, `/fixed`, `/dynamic`, `/catalog`. Re-mounting
PortKit means giving its `(default)` group a non-conflicting route (or
swapping the default back), and pointing the frontend transport at the
langgraph-cli agent instead of `src/app/api/copilotkit-pdf/route.ts`.

## If you actually want to run it

The honest path is to treat this folder as **source you lift into a fresh
checkout**, not as a mountable module:

1. Start from a checkout of the starter at (or near) the commit where PortKit
   was the default — its host shell (`example-layout`, `surface-canvas`, the
   `(default)` group, the `route.ts` for the langgraph-cli agent) was intact
   there.
2. Copy this folder's `src/` and `agent/` over that shell.
3. Boot the agent with `langgraph dev` and the web app with `next dev`.
4. `OFFLINE=1` still works against `public/offline-envelopes.json` here — the
   pre-baked-envelope insurance the default demo no longer ships.

For the customization seams PortKit documented (swap data in `query.py`, add
a widget by copying `agent/src/tools/risk_register.py`, switch domains under
`agent/src/domains/`), see `agent/src/README.md` in this folder. Note those
seams describe **this archived demo** — the live starter's seams now point at
the pdf-analyst layout (root `AGENTS.md` / `HACKATHON.md`).
