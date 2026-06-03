# Phase 2 — Execution Plan (implementation-grade, 2026-06-03)

Derived from 3 parallel wiring surveys. Companion to `phase2-promote-pdf-analyst.md` (strategy/decisions).

## Key facts (from the maps)

- Root = a multi-example **starter**: a shared shell + gallery (`src/app/other-examples/`) + a `(legal)` example + `(default)` = the PortKit demo. It is NOT a single app.
- Default-demo wiring: `src/app/(default)/layout.tsx` mounts `<CopilotKit agent="default" a2ui={{ catalog: demonstrationCatalog }}>`; `(default)/page.tsx` = `ExampleLayout` + `ExampleCanvas` (todo canvas) + `EnvelopeInspector`.
- pdf-analyst = self-contained app on CopilotKit **v2** APIs (`@copilotkit/*/v2`, `createCopilotRuntimeHandler`, `useAgent`, `useRenderTool`), its OWN catalog (`src/a2ui/`, 21 components), `Providers`/`SurfaceCanvas`/`Split`/`Filtered*` renderers, routes `/fixed` `/dynamic` `/catalog`, agents `fixed_agent` + `dynamic_agent`, FastAPI serving + `HttpAgent` route.
- The starter shell is **v1** (`@copilotkit/react-core` 1.57.4 v1 surface; `EnvelopeInspector` → `surface-bus`/`mirror-renderer`). **→ v1↔v2 reconciliation is the main hazard.**
- `legal_review_agent` is currently **disabled** in `agent/langgraph.json` (langgraph-cli subdir restriction). Approach A's `/legal` FastAPI endpoint fixes it.

## File partition

**ARCHIVE → `other-examples/portkit/`:** `src/app/(default)/`, `src/components/example-canvas/`, `src/app/declarative-generative-ui/`, `src/hooks/use-example-suggestions.tsx`, root `agent/` (LangGraph orchestrator + `domains/` + `langgraph.json` + `serve.py`), `public/offline-envelopes.json`, `DEMO.md`.

**KEEP — shell:** `src/app/layout.tsx`, `globals.css`, `src/lib/a2ui-theme.css`, `EnvelopeInspector`, `EnvelopeTimeline`, `BrandFrame`, `ModeToggle`, `BackgroundBlurCircles`, `headless-chat`, `tool-rendering`, `surface-canvas/`, `ui/`, `generative-ui/`, hooks (`use-theme`, `use-envelope-stream`, `use-generative-ui-examples`, `index`), lib (`surface-bus`, `mirror-renderer`, `envelope-*`, `utils`), `types/a2ui.ts`, `api/copilotkit/[[...slug]]/route.ts`, `example-layout/` (generic).

**KEEP — gallery/legal:** `src/app/other-examples/`, `src/app/(legal)/`, `showcase.json`.

## Ordered execution (additive-first → each stage has a verifiable checkpoint)

- **S1 — additive, non-breaking (typecheck-green).** Bring pdf-analyst's frontend into root under `src/app/pdf-analyst/` (real path segment, URLs `/pdf-analyst/*`) with an ISOLATED runtime route `src/app/api/copilotkit-pdf/route.ts` + its own `Providers`. Copy `src/a2ui/`, `src/lib/pdf.ts`, components → `src/components/pdf-analyst/`. Add `@ag-ui/core`. CSS scoped. PortKit + host route untouched. ✅ `pnpm typecheck`.
- **S2 — serving.** Root `agent/` → pdf-analyst FastAPI `main.py` exposing `/fixed` + `/dynamic` + `/legal` (legal Option A). Archive PortKit agent. Reconcile `agent/pyproject.toml` + `uv.lock`. Update `run-agent.sh`/`setup-agent.sh`, `Dockerfile`/`entrypoint.sh` (drop `serve.py` + `docker-route-override.ts`), `.env.example`.
- **S3 — swap default (resolve v1↔v2 here).** Make pdf-analyst the `/` default inside the shell; unify on the `[[...slug]]` route (HttpAgent: default + dynamic + legal); archive PortKit frontend; `showcase.json` → pdf-analyst; update `mirror-renderer` `SURFACE_TO_TOOL`; add `other-examples/portkit/EXAMPLE.json` + README; remove the temporary `src/app/pdf-analyst/` + isolated route.
- **S4 — A2A dormant** on the default HttpAgent (seam #6); keep `check-a2a`.
- **S5 — parallel sub-agents:** docs (`README`/`AGENTS`/`HACKATHON`/`FROZEN`/`DEMO`) + tooling (`smoke`/`test-widgets`/`new-widget`/`validate-widget`).
- **S6 — deps:** merge `package.json` → single lockfile; pin `next` 16.2.6.
- **S7 — verify:** `typecheck`, `smoke` (adapted), `validate-widget`, `test:widgets`, `verify-pins`.

## Cannot verify from this worktree

Live dev server + Gemini agent runtime (the WS0/WS7 runtime rows): `/pdf-analyst/*` then default `/fixed` `/dynamic` `/catalog` rendering on Gemini, legal endpoint, A2A dormant path, EnvelopeInspector visible-by-default in the live app. Static gates run here.
