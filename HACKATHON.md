# HACKATHON.md — Your 5-Hour Playbook

Welcome to the Generative UI Hackathon — London slot. This is the
canonical Track 2 (A2UI) starter from CopilotKit. The repo is already wired:
LangGraph agent, A2UI v0.9 renderer, dashboards demo, envelope inspector,
offline fallback. Your job is to make it about **your** domain and ship a
demo your judges will remember.

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
| **0:00–0:30** Boot        | `pnpm install`, `pnpm doctor`, `pnpm dev`. Send a test chat. Confirm the inspector shows envelopes. | —                 |
| **0:30–1:30** Re-skin     | Pick a domain. Re-theme + re-brand. Land a logo and palette.                                        | §1, §2            |
| **1:30–2:30** Swap data   | Replace `query.py` data with your domain's data. Tweak the system prompt.                           | §3, (optional §5) |
| **2:30–3:30** Widget pass | Pick ONE custom widget your demo needs. Copy `risk_register` and adapt.                             | §4                |
| **3:30–4:15** Polish      | Empty-state copy. Suggestion chips. Make the inspector look intentional.                            | §1, §2            |
| **4:15–4:45** Rehearse    | Run the canned demo three times. Test `OFFLINE=1`. Run `pnpm smoke`.                                | —                 |
| **4:45–5:00** Submit      | Push to GitHub. Fill out `SUBMITTING.md`.                                                           | —                 |

If you're behind at the 3:30 mark: **drop the custom widget**, double down
on data + branding, and call the dynamic-schema path from the system prompt
to generate ad-hoc UI. Better a polished re-skin than a half-shipped widget.

---

## §1 — Re-theme

**Files to edit:**

- `src/app/globals.css` — semantic token families (surface, text, border,
  radius, elevation, blur backdrop tints). Both light + dark mode defined.
- `src/lib/a2ui-theme.css` — the brand-override layer. Imported AFTER
  `globals.css` (in `layout.tsx`), so the brand tokens set here WIN:
  the `--cpk-*` accents, `--primary`, `--accent`, `--ring`, `--background`.
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

1. Open `src/lib/a2ui-theme.css`. It holds the brand levers most re-skins
   touch: the `--cpk-*` accent palette, `--primary` (ink), `--accent`,
   `--ring` (focus), and `--background` (page).
2. Replace the values to match your brand. Because this file loads after
   `globals.css`, your overrides win. Tailwind 4 picks them up — no rebuild.
3. Refresh the browser. The whole app and every A2UI envelope inherits
   the new tokens.

**If layout breaks:** `pnpm theme:reset` reverts you to known-good.

**AI assistant slash:** "theme it for X" — they should only edit these two
files. Push back if they want to restructure components.

### Semantic tokens in `globals.css`

`globals.css` holds the full default token system. Reach for these when
you're styling new components or tweaking the shell (override any of them
from `a2ui-theme.css`, which loads last):

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
states) for the canonical CopilotKit look; the lavender `#bec2ff` is the
`--ring` (focus) and feeds `--accent`. Override `--primary` in
`a2ui-theme.css` if your brand wants a coloured primary.

---

## §2 — Re-brand the shell

**Files to edit:**

- `src/components/BrandFrame.tsx` — header, logo slot, palette accents,
  ambient blur backdrop, mode toggle.
- `src/app/layout.tsx` — fonts (loaded via `next/font/google`).

### What `BrandFrame` renders

`BrandFrame` now wraps the app shell with two new pieces of chrome:

- **`<BackgroundBlurCircles />`** — rendered as the frame's first child.
  A fixed, full-viewport, `-z-10`, `pointer-events: none` ambient backdrop
  with 6 blurred radial gradients in lavender / orange / yellow. Tinted by
  the `--cpk-blur-*` vars in `src/app/globals.css` (see §1).
- **`<ModeToggle />`** — a small button in the header (top-right) that
  cycles **dark → light → system** via the existing `useTheme` hook.

**Recipe:**

1. Open `BrandFrame.tsx`. The component wraps the app header and renders
   the blur backdrop + mode toggle.
2. Swap the logo (`/copilotkit-logo-mark.svg` → your asset in `public/`),
   change the product name, and adjust the `accentColor` prop (the
   header's bottom border).
3. **Re-tint the backdrop without editing components:** change the three
   `--cpk-blur-lilac` / `--cpk-blur-orange` / `--cpk-blur-yellow` vars
   in `src/app/globals.css`. `BackgroundBlurCircles` picks them up
   automatically — no component edit needed.
4. **Different fonts?** Edit `src/app/layout.tsx`. Fonts now load through
   `next/font/google` (Plus Jakarta Sans + Spline Sans Mono by default).
   Swap the imports there to your preferred Google fonts.
5. Hot reload picks all of it up.

**Don't touch:** `EnvelopeInspector.tsx` (this is judging chrome — it must
stay visible). The chat affordances. The `ModeToggle` UX (it's load-bearing
for judges who want to A/B your design in dark and light).

---

## §3 — Swap demo data

**Files to edit:**

- `data/projectops.json` — the canonical PortKit dataset (people, projects,
  sprints, tasks, risks, updates). One file at the repo root.
- `agent/src/query.py` — loads `data/projectops.json` at import time and
  exposes the `query_data` tool. Override `DATA_PATH=` in `.env` to point
  the loader at a different file without editing code.

**Recipe (one-line swap):**

1. Replace `data/projectops.json` with your domain's data. Keep the same
   top-level entity keys (or extend them and update the prompt). The whole
   file is hot-reloaded on agent restart.
2. Edit the docstring on `query_data` in `agent/src/query.py` so the agent
   knows when to call it with your domain's language.
3. Edit `agent/src/domains/default/prompts.py`'s `DATASET_NOTES` constant
   to name your entities, and `DOMAIN_BRIEF` to ground the agent in your
   product/team. Both are 2-3 line constants designed to be forked.
4. Restart the agent (`uv run --reload` handles this for you).

**For a deeper swap:** see §5 — `DOMAIN=<name>` in `.env` switches whole
data-and-prompt bundles at boot.

---

## §4 — Add an A2UI widget (fixed schema)

This is the most substantial seam — budget an hour minimum.

**Canonical example (minimal):**
`agent/src/tools/risk_register.py:show_risk_register` — one helper, one
component tree, one template binding. Read this top-to-bottom before you
write anything; it's about 90 lines and demonstrates every piece.

**The 4-surface dance** (skip a step → widget won't render):

1. **Catalog entry** — `agent/src/widgets/<name>.json` (the v0.9 component
   schema, with metadata: `id`, `name`, `catalogId`, `pythonTool`, and a
   `schema` array). Use the
   [A2UI Composer](https://a2ui-composer.ag-ui.com/) to author the
   component tree visually, then save it under `schema:` in the JSON.
2. **Fixture** — `agent/src/widgets/<name>.fixture.json` (sample data the
   renderer will exercise during `pnpm test:widgets` and `OFFLINE=1`).
   Keys: `surfaceId`, `catalogId`, `components`, `data`.
3. **Python tool** — Create `agent/src/tools/<name>.py` with a `@tool`
   function that returns `a2ui.render(operations=[create_surface,
update_components, update_data_model])`. Then register it in
   `agent/src/domains/default/tools.py`'s `default_tools` list. Pattern
   to copy verbatim: `agent/src/tools/risk_register.py`.
4. **Prompt hint** — Add a line to `agent/src/domains/default/prompts.py`'s
   `TOOL_RULES` constant that teaches the agent _when_ to call your tool.
   (Example from default prompt:
   `- "risks / what could go wrong" -> show_risk_register(project_id?)`.)

**Verify:** `pnpm validate-widget agent/src/widgets/<name>.json` (catches
v0.9 envelope shape issues before runtime). Then `pnpm smoke`.

> **Why not 5 surfaces?** Earlier drafts of this guide listed a fifth step
> ("TS schema declaration in `src/app/api/copilotkit/route.ts`"). That
> array doesn't exist in this starter — the runtime is configured with
> `a2ui: { injectA2UITool: false }`, so widgets register entirely on the
> agent side. If you're following an older recipe that mentions five
> surfaces, you can skip the route.ts step.

### Renaming for your domain

The catalog ships 9 named primitives mapped to React renderers. When you
re-skin for a new domain you'll usually keep most of them and rename one
or two. The full list:

`ProjectCard`, `TaskCard`, `KanbanColumn`, `SprintTimelineBar`,
`MilestoneList`, `PersonAvatar`, `RiskFlag`, `UpdateFeedItem`, `Paragraph`.

Find every place a name appears with:

```bash
grep -lE 'ProjectCard|TaskCard|KanbanColumn|SprintTimelineBar|MilestoneList|PersonAvatar|RiskFlag|UpdateFeedItem' src/ agent/
```

If you rename a primitive, update its renderer in
`src/app/declarative-generative-ui/renderers.tsx`, its definition entry in
`src/app/declarative-generative-ui/definitions.ts`, every widget JSON that
references it, and every fixture under `agent/src/widgets/*.fixture.json`.

**Faster alternative — dynamic schema:** if you don't need predictability,
skip steps 1–3. Describe the widget in the system prompt and let
`generate_a2ui` produce it on demand. Tweak the Composer JSON if the LLM's
first pass is wrong. Less reliable in front of judges, faster to iterate.

---

## §5 — Switch domain

**Files involved:**

- `.env` → set `DOMAIN=<name>` (default: `default`)
- `agent/src/domains/<name>/` — data, prompt, optional widget subset

**Canonical stub:** `agent/src/domains/shopping/` (one fully-validated example
— Workstream E lands this; reference it).

**Recipe:**

1. Copy `agent/src/domains/default/` to `agent/src/domains/<your-domain>/`.
2. Replace `data/`, `prompt.txt` (system prompt), and any domain-specific
   widget overrides.
3. Set `DOMAIN=<your-domain>` in `.env`.
4. Restart the agent.

This is the right seam when "swap data" alone isn't enough — when the
whole agent personality needs to change.

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

- `src/app/api/copilotkit/route.ts` — the A2A middleware wiring (touched by
  Workstream B; do not edit by hand)
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
3. **Fall back to `OFFLINE=1`.** Restart `pnpm dev` with `OFFLINE=1` set —
   the agent returns pre-baked envelopes from
   `public/offline-envelopes.json`. The envelope inspector still shows real
   A2UI surfaces; the demo still works. This is your insurance policy.

---

## When something doesn't render

A2UI is a wire protocol. When envelopes hit the renderer and nothing shows,
the bug is in the envelope, not the React tree. Debug systematically:

1. **Check the envelope inspector** (right rail, default chrome). Did the
   agent emit `createSurface`? `updateComponents`? `updateDataModel`? All
   three are required. Missing one means the agent never finished the
   handshake.
2. **Check the tool registration.** Did you add the tool to
   `agent/src/domains/default/tools.py`'s `default_tools` list? An
   unregistered tool can't be called by the agent — there's no schema
   array in `route.ts`, registration is entirely on the agent side.
3. **Validate the JSON.** `pnpm validate-widget agent/src/widgets/<name>.json`
   prints the failing field with a fix hint. The error format is meant to
   be pasted into your AI assistant's context.
4. **Check the prompt hint.** Did you tell the agent _when_ to call your
   tool? Add a line to `agent/src/domains/default/prompts.py`'s
   `TOOL_RULES` constant pointing at your new tool with a use-case anchor.
5. **`/debug` page.** Shows last 20 envelopes per surface, orchestrator
   state, A2A subagent health, latency. Open `http://localhost:3000/debug`.
6. **Hard reload.** Tailwind 4 in dev mode caches aggressively. `Cmd+Shift+R`.

When all else fails: paste the failing envelope JSON into your AI assistant
with the canonical example (`agent/src/tools/risk_register.py:show_risk_register`)
and ask "what's different about the envelope shape." It's almost always a
missing required field.

---

## Pre-judging checklist

Run these before you go up. If anything fails, fix it before you
demo — judges remember broken demos more than missing features.

- [ ] **`pnpm doctor`** — preflight env still green
- [ ] **`pnpm smoke`** — composite gate (validators + pins + offline +
      canned prompt). This is the load-bearing pre-flight.
- [ ] **`pnpm test:widgets`** — every fixture renders
- [ ] **Canned demo runs three times.** No mid-demo retries.
- [ ] **`OFFLINE=1` fallback works.** Boot with `OFFLINE=1 pnpm dev`, send
      the canned prompts, confirm envelopes render. This is your insurance.
- [ ] **Envelope inspector is visible** and shows real envelopes (not just
      the "no envelopes yet" empty state).
- [ ] **Read the sponsor footer.** Google DeepMind, CopilotKit, A2A Net —
      credit them, judges will notice.

> The scripts D delivers (`pnpm doctor`, `pnpm smoke`, `pnpm verify-pins`,
> `pnpm test:widgets`, `pnpm validate-widget`, `pnpm new-widget`, `pnpm
check-a2a`, `pnpm explain`) are landed by Workstream D in parallel with
> this doc. If a script isn't yet wired when you read this, check
> `package.json` for the canonical name.

Good luck. Ship the demo.
