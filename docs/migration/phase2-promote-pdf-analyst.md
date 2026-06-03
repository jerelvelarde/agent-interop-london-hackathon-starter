> **Status:** Planned · **Created:** 2026-06-03 · **Owner:** Jerel · **Serving model:** Approach A (unified FastAPI) · **Parent:** A2UI PDF Analyst migration (Phase 1 = DONE, merged via PR #56)

## TL;DR

Promote the self-contained `other-examples/a2ui-pdf-analyst/` mini-app to be the repo's root/default demo, and archive the current **PortKit** demo into `other-examples/portkit/`. Keep the repo's generative-UI **starter identity**, **all of its tooling** (`smoke`/`doctor`/`validate-widget`/`verify-pins`/`new-example`/`new-widget`), and the dormant **A2A** bolt-on — re-pointed and adapted to the pdf-analyst app. Serving standardizes on pdf-analyst's **FastAPI + `HttpAgent`** model, which is already what the repo's Docker/prod path uses.

## Locked decisions (planning session 2026-06-03)

- **Depth — Full promotion.** pdf-analyst's `src/` / `agent/` / configs become the repo root; PortKit moves down to `other-examples/portkit/`.
- **Identity — Keep the "starter", re-pointed.** Stay a generative-UI / A2UI starter; PDF Analyst becomes the canonical demo the seams + docs reference.
- **Tooling + A2A — Keep everything at root** and wire/adapt pdf-analyst into it (the heaviest path; accepted).
- **Serving — Approach A** (unified FastAPI/uvicorn + `HttpAgent` CopilotKit route).
- **Plan home — Notion** (this page).
- **Correction to Rev-3 notes:** the `@copilotkit` 1.56.5 → 1.57.4 bump is **already done** (root is on 1.57.4), so that FROZEN risk is retired.

## Why Approach A (the serving-reconciliation decision)

The repo already runs **two** serving modes today: langgraph-cli dev server (`scripts/run-agent.sh` + `agent/langgraph.json` → `LangGraphAgent`) for `pnpm dev`, but **FastAPI + `HttpAgent`** (`serve.py` + `docker-route-override.ts`) for Docker/prod. pdf-analyst uses exactly that second model — so promoting it standardizes on the model already shipping in prod, rather than introducing a foreign architecture.

| Approach | What it does | Pro | Con | Verdict |
|---|---|---|---|---|
| **A — unified FastAPI** | Root dev + prod both run `uvicorn main:app` (`/fixed` + `/dynamic`); root CopilotKit route = pdf-analyst's `HttpAgent` version. langgraph-cli + `serve.py` retire to the PortKit archive. | Convergent with existing prod; lowest risk to the just-validated demo; dev == prod (simpler). | ~3 coupled scripts reworked; loses langgraph-cli dev convenience. | **CHOSEN** |
| B — keep langgraph-cli | Convert pdf-analyst's `fixed_graph`/`dynamic_graph` into `langgraph.json` entries; drop its FastAPI `main.py`; frontend back to `LangGraphAgent`. | Most tooling unchanged; A2A native. | Undoes validated FastAPI serving; forces frontend off `@ag-ui/client`; re-validation risk (incl. PDF-attachment multimodal patch). | Rejected |
| C — dual serving | Run both at root, route per-agent. | Full compat. | Most complexity, two dep trees. PortKit's graphs leave for the archive, so nothing justifies dual-mode. | Rejected |

---

## Workstreams

### WS0 · Precondition gate (validate before promoting)

Don't promote an unvalidated demo to the headline. Memory flags the standalone full-stack run as still-pending.

- [ ] `cd other-examples/a2ui-pdf-analyst && pnpm install && pnpm dev`
- [ ] Confirm `/fixed`, `/dynamic`, `/catalog` render live on **Gemini** (web :3000 + agent :8123).
- [ ] Confirm the PDF-attachment flow + the `multimodal_middleware` patch work end-to-end.

**Done when:** all three routes render live envelopes on Gemini with no `items` / `thought_signature` / prop-stripping errors.

### WS1 · Archive PortKit → `other-examples/portkit/`

- [ ] Move the demo app: `src/app/(default)/`, `src/app/debug/`, `src/app/declarative-generative-ui/`, demo components (`src/components/example-canvas/`, `src/components/example-layout/`).
- [ ] Move `agent/` (orchestrator `main.py`, `domains/`, `a2ui_fixed_schema.py`, `query.py`, `widgets/`, `todos.py`), `agent/langgraph.json`, and PortKit's `serve.py`.
- [ ] Move demo public assets (`public/offline-envelopes.json`, demo logos) + `DEMO.md`.
- [ ] Add `other-examples/portkit/EXAMPLE.json` (gallery at `src/app/other-examples/page.tsx` auto-enumerates it).
- [ ] Write `other-examples/portkit/README.md` documenting the host-surgery required to run it standalone.

**Done when:** PortKit appears in the gallery and is documented; nothing PortKit-demo-specific remains at root except shared infra.

### WS2 · Promote pdf-analyst → root

- [ ] Move pdf-analyst's `src/` and `agent/` to root.
- [ ] **Merge `package.json`**: fold pdf-analyst deps (`@ag-ui/client`, `pdfjs-dist`, `recharts`, etc.) into the root manifest; reconcile the two `pnpm-lock.yaml` into one root lockfile; reconcile the two `agent/uv.lock`.
- [ ] Reconcile `next.config.ts` / `tsconfig.json` / `postcss.config.mjs`.
- [ ] Root `src/app/api/copilotkit/route.ts` becomes pdf-analyst's `HttpAgent` version (`FIXED_AGENT_URL` / `DYNAMIC_AGENT_URL`).
- [ ] Delete the emptied `other-examples/a2ui-pdf-analyst/`.
- [ ] **Shell decision (see Open Questions):** preserve `EnvelopeInspector` + `BrandFrame` + theme system on the new root, or port the inspector affordance onto pdf-analyst's own shell. AGENTS.md hard-rule #5 requires the EnvelopeInspector to ship **visible by default**.

**Done when:** `pnpm install` resolves a single root lockfile; the root app is the pdf-analyst app; the EnvelopeInspector survives and is visible by default.

### WS3 · Serving reconciliation (Approach A)

- [ ] Root dev scripts run `uvicorn main:app` (port 8123); update/replace `scripts/run-agent.sh` + `scripts/setup-agent.sh`.
- [ ] Update `Dockerfile` + `entrypoint.sh` to FastAPI-native; retire `serve.py` from root (archived with PortKit) and drop the `docker-route-override.ts` swap (root route is already `HttpAgent`).
- [ ] Update `.env.example` (`FIXED_AGENT_URL` / `DYNAMIC_AGENT_URL`; keep `A2A_AGENT_URL` dormant).

**Done when:** `pnpm dev` boots Next.js + uvicorn; Docker build serves the FastAPI agent; one serving model dev == prod.

### WS4 · Adapt tooling (keep all)

From the coupling survey: **3 scripts break outright**, **2 need re-pointing**, **5 are generic**.

- [ ] `scripts/smoke.ts` — replace the `langgraph.json` graph-probe with FastAPI endpoint discovery (`/fixed`, `/dynamic`); point widget validation at pdf-analyst's catalog.
- [ ] `scripts/test-widgets.ts` — point at pdf-analyst's catalog/fixtures (or the archived portkit fixtures).
- [ ] `scripts/new-widget.sh` — re-anchor canonical from `a2ui_fixed_schema.py:search_flights` to pdf-analyst's widget pattern.
- [ ] `scripts/validate-widget.ts` — update canonical schema example to a pdf-analyst widget.
- [ ] `scripts/new-example.ts` — keep `legal-contract-review/` canonical; ensure new `other-examples/portkit/` enumerates.
- [ ] Re-verify generic scripts green: `doctor`, `verify-pins`, `explain`, `theme-reset`.

**Done when:** every `pnpm` script in `package.json` runs green against the new layout.

### WS5 · A2A re-wire (dormant)

- [ ] Layer `@ag-ui/a2a-middleware` on the root `HttpAgent` CopilotKit route (CUSTOMIZATION SEAM #6); keep `pnpm check-a2a`.

**Done when:** with `A2A_AGENT_URL` unset the seam is dead code; with it set, the `send_message_to_a2a_agent` tool is injected.

### WS6 · Re-point starter docs (keep identity)

- [ ] `README.md` — walkthrough flights → PDF analyst.
- [ ] `AGENTS.md` (→ `CLAUDE.md`/`GEMINI.md` symlinks) — seam targets → pdf-analyst locations; PortKit reframed as the "deeper example".
- [ ] `HACKATHON.md` — §3 (swap data), §4 (add widget), §5 (switch domain) re-pointed.
- [ ] `DEMO.md` (now the PortKit archive's concern) + a new root demo walkthrough for the PDF flow.
- [ ] `FROZEN.md` — note the single merged lockfile + that 1.57.4 is the pin.
- [ ] `showcase.json` — default → `pdf-analyst` (confirm how `src/hooks/use-example-suggestions.tsx` consumes it).

**Done when:** `grep -ri portkit` at root only hits intentional "deeper example" references; seams resolve to real pdf-analyst code.

### WS7 · Verify

- [ ] `pnpm install` · `pnpm typecheck` · `pnpm smoke` (adapted) · `pnpm verify-pins` all green.
- [ ] pdf-analyst boots from root (`/fixed` + `/dynamic` + `/catalog` live on Gemini).
- [ ] PortKit listed in the gallery and runnable from `other-examples/portkit/` per its README.
- [ ] A2A dormant-path confirmed (unset = no-op; set = tool injected).
- [ ] EnvelopeInspector visible by default (AGENTS.md hard-rule #5).

### WS8 · Land

- [ ] Branch `feat/promote-pdf-analyst`; PR to `main`.
- [ ] Keep PortKit fully intact inside `other-examples/portkit/` (no behavior change to the archived demo).
- [ ] Update this Notion page status → Done; update the parent migration page's Status line.

---

## Risks & mitigations

- **Lockfile/dep merge conflicts** (two `pnpm-lock.yaml`, two `uv.lock`). Mitigation: both Node sides already on `@copilotkit` 1.57.4 + React 19.2.4; reconcile `next` (16.1.6 vs 16.2.6) to one version; regenerate a single lockfile and run `verify-pins`.
- **Shell/affordance loss** — pdf-analyst has its own UI; PortKit owns the EnvelopeInspector/BrandFrame/theme. Mitigation: WS2 shell decision; hard-rule #5 makes the inspector non-negotiable.
- **Tooling regressions** — 3 scripts assume PortKit's langgraph layout. Mitigation: WS4 + WS7 gate on every script green.
- **Demo regression on Gemini** — Mitigation: WS0 gate before any move; WS7 re-run after.

## Open questions

1. **Which shell wins** — keep PortKit's `BrandFrame` + `EnvelopeInspector` + theme system and render pdf-analyst inside it, or adopt pdf-analyst's own shell and port the inspector onto it? (Recommend: keep the starter shell; it carries the EnvelopeInspector + theming the AGENTS.md rules depend on.)
2. **`next` version** — pin to 16.2.6 (pdf-analyst) or 16.1.6 (root)? (Recommend 16.2.6.)
3. **`new-widget` canonical for a FastAPI app** — does the fixed-schema widget recipe still map cleanly, or does it need a pdf-analyst-shaped rewrite?

## References

- Phase 1 PR (merged): https://github.com/jerelvelarde/agent-interop-london-hackathon-starter/pull/56
- Upstream fork: https://github.com/Anmol-Baranwal/CopilotKit/tree/showcase-a2ui-pdf-analyst/examples/showcases/a2ui-pdf-analyst
- Local Phase-1 branches: feat/a2ui-pdf-analyst, -foundation, -catalog, -agent, -gallery
