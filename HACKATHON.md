# HACKATHON.md — Your 5-Hour Playbook

Welcome to the Generative UI Hackathon — London slot. This is the
canonical Track 2 (A2UI) starter from CopilotKit. The repo is already wired:
two LangGraph agents on a FastAPI server (`uvicorn main:app`, `:8123`), an
A2UI v0.9 renderer, a 21-component catalog, the **pdf-analyst** demo
(chat-with-your-PDF → the agent builds the answer UI), and the envelope
inspector. Your job is to make it about **your** domain and ship a demo
your judges will remember.

There are **six customization seams** — six places in the code marked with
a grep-friendly banner (`CUSTOMIZATION SEAM #N`). Edit those, leave the rest
alone, and the starter does the rest.

> If you take one thing from this doc: **`grep -r "CUSTOMIZATION SEAM" .`**
> tells you everywhere you should be editing.

---

## Hour-by-hour template

A suggested time budget. Ignore it if you have a better plan — but if
you're stuck, this is a known-good path that has produced a demoable
result in past dry runs.

| Hour                      | Goal                                                                                                | Seams you touch   |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| **0:00–0:30** Boot        | `pnpm install`, `pnpm run doctor`, `pnpm dev`. Open `/fixed`, attach a PDF. Confirm the `MirrorRenderer` pill shows envelopes. | —                 |
| **0:30–1:30** Re-skin     | Pick a domain. Re-theme + re-brand. Land a logo and palette.                                        | §1, §2            |
| **1:30–2:30** Swap data   | Point the demo at your document type. Tune the extractor + agent prompts.                            | §3, (optional §5) |
| **2:30–3:30** Widget pass | Pick ONE custom component your demo needs. Add it to the catalog and adapt. | §4                |
| **3:30–4:15** Polish      | Empty-state copy. Suggestion chips. Make the inspector look intentional.                            | §1, §2            |
| **4:15–4:45** Rehearse    | Run the demo three times against your PDF. Run `pnpm smoke`.                                | —                 |
| **4:45–5:00** Submit      | Push to GitHub. Fill out `SUBMITTING.md`.                                                           | —                 |

If you're behind at the 3:30 mark: **drop the custom component**, double down
on the extractor + branding, and lean on the dynamic-schema agent
(`/dynamic`) to generate ad-hoc UI. Better a polished re-skin than a
half-shipped component.

---

## §1 — Re-theme

**Files to edit:**

- `src/a2ui/theme.css` — the **A2UI surface tokens**, scoped to
  `.a2ui-surface` and consumed by `@copilotkit/a2ui-renderer`. This is what
  every generated surface inherits: `--background`, `--card`, `--primary`,
  `--accent`, `--border`, `--radius`. Edit here to re-skin the agent's UI.
- `src/app/(pdf)/pdf-analyst.css` — the **shell brand tokens**, scoped to
  `.pdf-analyst-root`: `--ink`, `--lilac`, `--mint`, `--orange`,
  `--brand-gradient`, surfaces, lines. This is the chrome around the chat.
- `src/app/globals.css` — host `:root` tokens (surface/text/border families)
  + the CopilotKit chat-framework workaround block (see note).
- `src/hooks/use-theme.tsx` — dark/light/system toggle (see §2 for the UI).

> **Quick note on the chat framework workarounds.** `src/app/globals.css`
> ends with a clearly labelled block of three defensive CSS overrides that
> patch known issues on our pinned CopilotKit `1.57.4`: (1) restoring
> `pointer-events` on items below the input pill (disclaimer slot),
> (2) adding a default 12px cushion below the chat input, and
> (3) making chat descendants transparent so the frosted backdrop shows
> through. Leave them in place unless you upgrade CopilotKit past 1.57.4
> — and you can't, because it's [FROZEN](FROZEN.md).

**Recipe:**

1. Open `src/a2ui/theme.css` for the agent-rendered surfaces and
   `src/app/(pdf)/pdf-analyst.css` for the shell. Between them they hold the
   brand levers most re-skins touch: accents, ink/primary, surfaces, radius,
   and the `--brand-gradient`.
2. Replace the values to match your brand. Tailwind 4 picks them up — no
   rebuild.
3. Refresh the browser. The shell and every A2UI surface inherit the new
   tokens.

**If layout breaks:** `pnpm theme:reset` reverts you to known-good.

**AI assistant slash:** "theme it for X" — they should only edit these two
files. Push back if they want to restructure components.

### Semantic tokens in `globals.css`

`globals.css` holds the full default host token system. Reach for these when
you're styling new components or tweaking the shell (for the pdf-analyst
pages, override them from `src/app/(pdf)/pdf-analyst.css`, scoped to
`.pdf-analyst-root`):

- **Surface family** — `--surface-main`, `--surface-container`,
  `--surface-background`. Use for any container background. Both light and
  dark mode values are defined; the `[data-theme="dark"]` block flips them
  automatically.
- **Text family** — `--text-primary`, `--text-secondary`, `--text-disabled`.
- **Border family** — `--border-container`, `--border-default`.
- **Radius scale** — `--radius-xs` (4px), `--radius-sm` (8px),
  `--radius-md` (12px), `--radius-lg` (16px), `--radius-full` (9999px).
  Consume via arbitrary values: `rounded-[var(--radius-md)]`.
- **Elevation scale** — `--elevation-sm`, `--elevation-md`, `--elevation-lg`,
  `--elevation-xl`. Consume via `shadow-[var(--elevation-sm)]`.
- **Blur backdrop tints** — `--cpk-blur-lilac`, `--cpk-blur-orange`,
  `--cpk-blur-yellow`. Consumed by `BackgroundBlurCircles` (see §2).
  Edit these three vars to re-tint the ambient backdrop without touching
  the component.

Example — a card matching the new system:

```tsx
<div
  className="rounded-[var(--radius-md)] shadow-[var(--elevation-sm)] border"
  style={{
    background: "var(--surface-container)",
    borderColor: "var(--border-container)",
    color: "var(--text-primary)",
  }}
>
  …
</div>
```

### Primary & accent

`--primary` is `#010507` (near-black ink — buttons, badges, selected
states) for the canonical CopilotKit look; the lavender `#bec2ff` feeds
`--accent`. Override `--primary` in `src/a2ui/theme.css` (for the agent
surfaces) or `--ink` in `src/app/(pdf)/pdf-analyst.css` (for the shell) if
your brand wants a coloured primary.

---

## §2 — Re-brand the shell

**Files to edit:**

- `src/components/pdf-analyst/Brand.tsx` — the pdf-analyst chrome:
  `Logo`, `SiteNav` (top nav), `PageHeader` (landing hero), and
  `WorkspaceHeader` (the `/fixed` and `/dynamic` workspace bar).
- `src/app/(pdf)/layout.tsx` — fonts (Plus Jakarta Sans + Spline Sans Mono
  via `next/font/google`) and the `.pdf-analyst-root` wrapper.

### What `Brand.tsx` renders

The pdf-analyst pages compose their chrome from `Brand.tsx`:

- **`<Logo />`** — renders `/brand/logo-full.svg` (swap the asset in
  `public/brand/`).
- **`<SiteNav active=… />`** — the top navigation across `/`, `/fixed`,
  `/dynamic`, `/catalog`.
- **`<PageHeader eyebrow title subtitle … />`** — the landing-page hero on
  `/`.
- **`<WorkspaceHeader />`** — the compact header on the workspace routes.

**Recipe:**

1. Open `Brand.tsx`. Swap the logo (`/brand/logo-full.svg` → your asset in
   `public/brand/`), change the product name and `SiteNav` labels, and
   rewrite the `PageHeader` hero copy on `/`.
2. **Re-tint the brand:** edit the `--lilac` / `--mint` / `--orange` /
   `--brand-gradient` vars in `src/app/(pdf)/pdf-analyst.css` (see §1). The
   chrome picks them up automatically — no component edit needed.
3. **Different fonts?** Edit `src/app/(pdf)/layout.tsx`. Fonts load through
   `next/font/google` (Plus Jakarta Sans + Spline Sans Mono by default).
   Swap the imports there to your preferred Google fonts.
4. Hot reload picks all of it up.

> **Heads up:** the legacy shell components `BrandFrame.tsx` /
> `BackgroundBlurCircles.tsx` / `ModeToggle` still exist under
> `src/components/` but are **not** mounted by the pdf-analyst `(pdf)` route
> group. They belong to the archived PortKit shell — don't wire them into the
> pdf-analyst pages unless you mean to.

**Don't touch:** the chat affordances.

---

## §3 — Swap demo data

In the pdf-analyst demo **the uploaded PDF is the data** — there's no static
dataset file to swap. "Swapping data" means pointing the demo at a different
kind of document and teaching the extractor to read it.

**Files to edit:**

- `agent/src/pdf_tools.py` — the shared extractor. A cheap secondary Gemini
  call (`_EXTRACTOR`) turns PDF text into the structured shapes the dashboard
  binds to (`Kpi`, `Point`, table rows). Edit the extraction prompt + the
  `TypedDict` shapes to match your document type.
- `agent/src/fixed_agent.py` / `agent/src/dynamic_agent.py` — each agent's
  system prompt. Reword them to ground the agent in your domain's language.

**Recipe:**

1. Decide what your document type yields (invoice → totals + line items;
   paper → findings + figures; report → KPIs + trend). Update the extractor
   prompt and the `TypedDict` shapes in `agent/src/pdf_tools.py` to match.
2. Reword the fixed agent's system prompt in `agent/src/fixed_agent.py` so it
   knows what to extract, and the dynamic agent's prompt in
   `agent/src/dynamic_agent.py` so it answers follow-ups in your domain.
3. Restart the agent (`--reload` handles this for you; `pnpm dev` runs
   `uvicorn main:app --reload`).
4. Drop a representative PDF into the chat and watch the surface build.

**For a deeper swap:** see §5 — change the agent flows themselves
(`fixed_agent.py` / `dynamic_agent.py`).

---

## §4 — Add an A2UI component

In the pdf-analyst demo the catalog is **one shared design system**: a set
of platform-agnostic component definitions (props + descriptions) paired
with React renderers. Both agents (`/fixed` and `/dynamic`) compose surfaces
from the same catalog, so adding a component makes it available everywhere.
Budget an hour for a non-trivial renderer.

**Canonical example:** read `src/a2ui/catalog/definitions.ts` (the 21
shipped components) and the matching renderer in
`src/a2ui/catalog/renderers.tsx` before you write anything.

**The component dance** (skip a step → the component won't render or the
agent won't know it exists):

1. **Definition** — add an entry to the `definitions` object in
   `src/a2ui/catalog/definitions.ts`: a one-line `description` plus a Zod
   `props` schema. Use the `childRef` / `childrenRef` / `stringOrPath`
   helpers at the top of that file for child references and bindable props.
   Match the Zod major version `@copilotkit/a2ui-renderer` ships
   (`zod@^3.25`) or the binder silently treats every prop as static.
2. **Renderer** — add the matching React component to the `renderers` map in
   `src/a2ui/catalog/renderers.tsx`. The binder hands you resolved props
   (literals, not `{path}` objects). Style it with the A2UI surface tokens
   from `src/a2ui/theme.css`.
3. **Prompt mirror** — add a one-line summary to `CATALOG_PROMPT` in
   `agent/src/catalog.py` so the agent knows the component exists and what
   props it accepts. This file is the agent-side mirror of the catalog —
   keep it in sync with `definitions.ts`. (`CATALOG_ID` is shared between
   the two so `createSurface` resolves to your renderer.)

**Verify:** `pnpm validate-widget <path>` then `pnpm smoke`.

> **Note — no per-widget JSON/fixture/Python-tool.** The pdf-analyst catalog
> doesn't use the old PortKit "widget" files (`agent/src/widgets/<name>.json`
> + fixture + `agent/src/tools/<name>.py`). Components live entirely in the
> TypeScript catalog (`src/a2ui/catalog/`) with a prompt mirror in
> `agent/src/catalog.py`. That older fixed-schema flow ships with the
> archived PortKit demo under `other-examples/portkit/`.

**Faster alternative — let the dynamic agent invent it.** If you don't need
a brand-new primitive, you often don't need to touch the catalog at all: the
`/dynamic` agent composes answers from the 21 existing components on demand.
Just ask it the question and tweak `agent/src/dynamic_agent.py`'s prompt if
the first pass is wrong. Less control, faster to iterate.

---

## §5 — Swap the agent flow

The pdf-analyst demo has no `DOMAIN=` switch — the two agent flows *are* the
demo. This is the right seam when "swap data" (§3) alone isn't enough and the
whole agent behavior needs to change.

**Files involved:**

- `agent/src/fixed_agent.py` — the fixed-schema dashboard flow: reads the
  PDF, calls `render_dashboard` with extracted data, streams a surface built
  from `agent/src/a2ui/schemas/dashboard.json`. Edit the layout JSON for a
  different fixed dashboard; edit the tool + prompt for different behavior.
- `agent/src/dynamic_agent.py` — the dynamic-schema Q&A flow: its
  `generate_a2ui` tool spawns a secondary LLM to invent the answer's
  component tree. Edit its prompt to change how it composes UI.
- `agent/main.py` — the FastAPI app that mounts both graphs (and `/legal`).
  Add a new endpoint here if you stand up a third agent.

**Recipe:**

1. Pick the flow to change (fixed dashboard vs dynamic Q&A) and edit its
   agent file. For a new fixed dashboard, rewrite
   `agent/src/a2ui/schemas/dashboard.json` (the layout) and the
   `render_dashboard` tool's typed inputs.
2. Reword the system prompt in that agent file for your domain.
3. Restart the agent (`uvicorn main:app --reload` via `pnpm dev`).

> **If you're spinning up a whole second LangGraph agent in a sub-repo**
> (the legal-contract-review pattern — a separate `agent/` dir under
> `other-examples/<name>/agent/`), the gotcha to know is langgraph's
> path-based graph loader bypasses Python's package machinery, so
> relative imports (`from .tools import ...`) break. The canonical fix
> is four lines of sys.path injection at the top of `graph.py` plus
> absolute imports. `other-examples/legal-contract-review/agent/graph.py`
> is the reference. Don't try to make relative imports work — they won't.

---

## §6 — BYO A2A agent (Track 1 interop)

**Where it lives:**

- `src/app/api/copilotkit/[[...slug]]/route.ts` — the A2A middleware wiring
  (touched by Workstream B; do not edit by hand)
- `a2a/` — toy subagent + compliance checker

**Recipe (in order — don't skip the check):**

1. `pnpm check-a2a <your-partner-url>` — validates that the partner agent
   emits A2UI v0.9-compliant envelopes. If this fails, you'll spend the
   rest of the day debugging the partner instead of building.
2. Once green, set `A2A_AGENT_URL=<partner-url>` in `.env`.
3. Restart. The A2A middleware activates and the partner agent becomes
   reachable from your orchestrator.

**A2A is dormant by default.** Unset `A2A_AGENT_URL` and the codepath
disappears — zero cost if you're not using Track 1.

---

## If you get rate-limited

The default LLM is **Gemini 3.5 Flash** via the native Google Gen AI SDK
(`langchain-google-genai`). The empirical load test in `FROZEN.md` measured
the OpenAI-compat fallback path on `gemini-2.5-flash`, but the headroom
shape is similar:

- Single key, 30 concurrent agentic requests: 30/30 succeed, p95 ~2s.
- Single key, 100 concurrent: 100/100 succeed, p95 ~2.3s.

You almost certainly have headroom. But if you see a `429` in chat:

1. **Switch to your own key.** The prereq email asked everyone to register
   a free Gemini key at https://aistudio.google.com/apikey. Drop it in
   `.env` as `GEMINI_API_KEY=...`.
2. **Ask a mentor for a fallback key.** There's a small mentor pool for
   teams who didn't register early.
3. **Have a known-good PDF + script ready.** `OFFLINE=1` only paints a canned
   sample dashboard on `/fixed` (`agent/src/offline_sample.py`, no key) — it
   can't reproduce *your* uploaded-PDF demo or the `/dynamic` follow-ups (the
   old `public/offline-envelopes.json` replay shipped only with the archived
   PortKit demo under `other-examples/portkit/`). Your real insurance is a
   tested document and a tight script, so a single retry recovers the demo fast.

---

## When something doesn't render

A2UI is a wire protocol. When envelopes hit the renderer and nothing shows,
the bug is in the envelope, not the React tree. Debug systematically:

1. **Check the canvas** (beside the chat) and the `MirrorRenderer` pill in
   the conversation. Did the agent emit `createSurface`? `updateComponents`?
   `updateDataModel`? All three are required. Missing one means the agent
   never finished the handshake — and the canvas stays on its empty state.
2. **Check the catalog mirror.** If you added a component, is it in BOTH
   `src/a2ui/catalog/definitions.ts` (+ a renderer in `renderers.tsx`) AND
   `agent/src/catalog.py`'s `CATALOG_PROMPT`? If the agent emits a component
   type the frontend catalog doesn't know, nothing renders; if `CATALOG_PROMPT`
   doesn't list it, the agent never emits it.
3. **Check `CATALOG_ID` matches.** The constant in
   `src/a2ui/catalog/definitions.ts` and `agent/src/catalog.py` must be
   identical — `createSurface` uses it to resolve to your renderers.
4. **Validate the JSON.** `pnpm validate-widget <path>` prints the failing
   field with a fix hint. The error format is meant to be pasted into your
   AI assistant's context.
5. **Check the agent reached the model.** Is `agent/main.py` (`uvicorn
   main:app`) up on `:8123`, and is `GEMINI_API_KEY` set? The frontend talks
   to it via `src/app/api/copilotkit-pdf/route.ts` (`FIXED_AGENT_URL` /
   `DYNAMIC_AGENT_URL`).
6. **Hard reload.** Tailwind 4 in dev mode caches aggressively. `Cmd+Shift+R`.

When all else fails: paste the failing envelope JSON into your AI assistant
with the catalog (`src/a2ui/catalog/definitions.ts`) and ask "what's different
about the envelope shape." It's almost always a missing required field or a
component type that isn't in the catalog.

---

## Pre-judging checklist

Run these before you go up. If anything fails, fix it before you
demo — judges remember broken demos more than missing features.

- [ ] **`pnpm run doctor`** — preflight env still green
- [ ] **`pnpm smoke`** — composite gate (validators + pins + offline-shape
      check + agent-graph registration). This is the load-bearing pre-flight.
- [ ] **`pnpm test:widgets`** — every catalog schema/fixture validates
- [ ] **Your PDF demo runs three times.** Same document, no mid-demo
      surprises — `/fixed` paints the dashboard, `/dynamic` answers a
      follow-up.
- [ ] **Known-good PDF in hand.** `OFFLINE=1` only paints the canned `/fixed`
      sample dashboard (no key) — it can't reproduce your uploaded-PDF demo or
      `/dynamic`, so a tested document + a tight script is your insurance.
- [ ] **The canvas paints a real surface** (not just the "Canvas is empty"
      empty state) when you run your demo prompt.
- [ ] **Read the sponsor footer.** Google DeepMind, CopilotKit, A2A Net —
      credit them, judges will notice.

> The scripts D delivers (`pnpm run doctor`, `pnpm smoke`, `pnpm verify-pins`,
> `pnpm test:widgets`, `pnpm validate-widget`, `pnpm new-widget`, `pnpm
check-a2a`, `pnpm explain`) are landed by Workstream D in parallel with
> this doc. If a script isn't yet wired when you read this, check
> `package.json` for the canonical name.

Good luck. Ship the demo.
