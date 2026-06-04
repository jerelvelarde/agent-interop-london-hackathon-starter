# CopilotKit A2UI Hackathon Starter — Agent Guide

You are working in a hackathon starter for the **Generative UI Hackathon**
(London slot, Google CSG venue, May 2026). The hacker wants to customize this
app to demo their own domain inside the build window of a 5-hour hackathon.
Speed and clarity beat completeness. Pattern-match aggressively — copy the
canonical examples named in this guide rather than inventing new ones.

## What this repo is

A Next.js + LangGraph + CopilotKit + A2UI v0.9 starter that demonstrates
**agent-driven generative UI**. The default demo is **pdf-analyst**:
chat-with-your-PDF, where the agent builds the answer UI from a shared
21-component A2UI catalog — a fixed-schema dashboard for the at-a-glance
view and dynamic surfaces (Recharts) for follow-up questions. Three
subsystems:

- `src/app/` — Next.js 16 + React 19 + Tailwind 4 web app. The pdf-analyst
  routes live under the `(pdf)` route group: `/`, `/fixed`, `/dynamic`,
  `/catalog`. The A2UI catalog (definitions + renderers) is at `src/a2ui/`.
- `agent/` — Python LangGraph agents served over **FastAPI**
  (`agent/main.py`, run with `uvicorn main:app` on `:8123`), exposing
  `/fixed`, `/dynamic`, and `/legal`.
- `a2a/` — Optional A2A bolt-on for Track 1 multi-agent interop (dormant
  until `A2A_AGENT_URL` is set)

The agent emits A2UI v0.9 declarative UI envelopes (`createSurface`,
`updateComponents`, `updateDataModel`). The renderer turns them into React.
Read `HACKATHON.md` for the customization recipes.

> **PortKit is archived.** The previous default demo (a project-operations
> dashboard with flights/sprints/todos, served by a LangGraph-cli agent)
> now lives at `other-examples/portkit/` as a deeper, self-contained
> example. Anchors below point at pdf-analyst; PortKit-era paths
> (`agent/src/query.py`, `risk_register`, `domains/`) only exist under
> `other-examples/portkit/`.

## Hard rules

1. **Versions are pinned.** Do NOT bump `@copilotkit/*`, `langchain*`, or
   `langgraph*` versions without explicit instruction. See `FROZEN.md`. The
   pre-commit hook will reject `@copilotkit/*` drift.
2. **Always run `pnpm validate-widget <path>`** after editing any widget JSON.
3. **Always run `pnpm smoke`** before declaring work done. `smoke` is a
   composite gate: validators + pin check + offline path + canned prompt.
4. **Default LLM is Gemini 3.5 Flash via the native Google Gen AI SDK
   (`langchain-google-genai`).** Do not change the `ChatGoogleGenerativeAI(...)`
   model line (it lives in `agent/src/fixed_agent.py`,
   `agent/src/dynamic_agent.py`, and `agent/src/pdf_tools.py`) unless told.
   The native SDK is required because Gemini 3.x's thought-signature replay
   across tool turns is not implemented by `langchain-openai`. The
   OpenAI-compat path is documented as a fallback in `FROZEN.md` § LLM
   provider (sticks on `gemini-2.5-flash` for the same reason).
5. **(Removed — no EnvelopeInspector.)** The pdf-analyst approach no longer
   ships a "show the wire" envelope-inspector rail. The agent's A2UI output is
   surfaced two ways instead: the in-canvas `SurfaceCanvas`
   (`src/components/pdf-analyst/SurfaceCanvas.tsx`) renders the live surface,
   and the chat `MirrorRenderer` pill echoes it inline. Don't reintroduce a
   standalone inspector component.
6. **Don't write new React renderers for A2UI primitives.** Use the catalog
   + theme system. The renderer is provided by `@copilotkit/a2ui-renderer`.

## Customization seams

These are the six grep-anchored seams a hacker (or you) edit to make this
starter their own. Search for `CUSTOMIZATION SEAM` to find each one in code.

1. **Re-theme** → `src/a2ui/theme.css` (A2UI surface tokens) +
   `src/app/(pdf)/pdf-analyst.css` (shell brand) + `src/hooks/use-theme.tsx`
2. **Re-brand the shell** → `src/components/pdf-analyst/Brand.tsx`
   (`SiteNav`, `PageHeader`, logo/nav, page hero)
3. **Swap demo data** → the uploaded **PDF is the data**. Tune extraction
   in `agent/src/pdf_tools.py` (the structured-JSON extractor the agents
   call), or feed a different document. There is no static dataset file in
   the default demo.
4. **Add an A2UI component** → add a definition + Zod prop schema in
   `src/a2ui/catalog/definitions.ts`, a matching React renderer in
   `src/a2ui/catalog/renderers.tsx`, and mirror its one-line prompt summary
   in `agent/src/catalog.py`'s `CATALOG_PROMPT`. The 21-component catalog is
   one shared design system (no per-widget JSON/fixture/tool in this demo).
5. **Swap the agent flow** → edit `agent/src/fixed_agent.py` (the
   fixed-schema dashboard agent + its `render_dashboard` tool; the dashboard
   layout itself is the JSON at `agent/src/a2ui/schemas/dashboard.json`) or
   `agent/src/dynamic_agent.py` (the dynamic-schema Q&A agent + its
   `generate_a2ui` tool). Both are wired in `agent/main.py`.
6. **BYO A2A agent** → set `A2A_AGENT_URL`; run `pnpm check-a2a <url>` first.
   Wired in `src/app/api/copilotkit/[[...slug]]/route.ts`.

`HACKATHON.md` has the full step-by-step recipe for each seam.

## Canonical examples

When the hacker asks for a new something, grep-find and copy the canonical:

- **Fixed-schema A2UI agent:**
  `agent/src/fixed_agent.py` — the dashboard agent. Reads the PDF text,
  calls `render_dashboard` with structured data extracted in the same model
  pass, and streams a surface built from the JSON layout at
  `agent/src/a2ui/schemas/dashboard.json`. Read this first to see how a
  hand-authored layout binds to agent-extracted data.
- **Dynamic-schema A2UI agent:**
  `agent/src/dynamic_agent.py:generate_a2ui` — a server-side tool that spawns
  a secondary LLM to invent the component tree for a follow-up question, then
  wraps it into `create_surface` + `update_components` + `update_data_model`
  ops. The file's docstring explains why it's a real Python tool (not an
  injected frontend tool) — copy that pattern, not the orphan-`function_call`
  trap.
- **The A2UI catalog (21 components):**
  `src/a2ui/catalog/definitions.ts` (Zod prop schemas + descriptions) and
  `src/a2ui/catalog/renderers.tsx` (the React renderers). The Python mirror
  the agents cite is `agent/src/catalog.py` (`CATALOG_ID` + `CATALOG_PROMPT`).
- **PDF → structured data:** `agent/src/pdf_tools.py` (the shared extractor
  the fixed agent uses to turn document text into KPIs/points/rows).
- **Brand shell:** `src/components/pdf-analyst/Brand.tsx`
- **Theme tokens:** `src/a2ui/theme.css` + `src/app/(pdf)/pdf-analyst.css`

## Commands

| Command | What it does |
|---|---|
| `pnpm run doctor` | Preflight env check (Node, pnpm, Python, uv, env vars, ports) |
| `pnpm dev` | Boot Next.js + the FastAPI agent (`uvicorn main:app`, `:8123`) concurrently |
| `pnpm smoke` | Composite gate (validators + pins + offline + canned prompt) |
| `pnpm validate-widget <path>` | Validate a widget JSON against A2UI v0.9 |
| `pnpm check-a2a <url>` | Validate a partner A2A endpoint |
| `pnpm explain <topic>` | Print the right HACKATHON.md section (`themes`, `widgets`, `a2a`, `data`, `branding`, `domain`) |
| `pnpm new-widget <name>` | Scaffold a catalog schema + fixture under `agent/src/a2ui/schemas/` |
| `pnpm theme:reset` | Revert theme to defaults |
| `pnpm verify-pins` | Fail if lockfiles drifted from `FROZEN.md` |

## Slash command vocabulary (for AI assistants)

When the hacker says:

- **"add a widget" / "add a component"** → follow `HACKATHON.md` §4. Add a
  definition + Zod prop schema to `src/a2ui/catalog/definitions.ts`, a React
  renderer to `src/a2ui/catalog/renderers.tsx`, and mirror its one-line
  prompt summary in `agent/src/catalog.py`'s `CATALOG_PROMPT`. Run
  `pnpm validate-widget` then `pnpm smoke` before declaring done.
- **"theme it for X"** → only edit `src/a2ui/theme.css`,
  `src/app/(pdf)/pdf-analyst.css`, and `src/hooks/use-theme.tsx`. Don't
  restructure components. Don't bump deps.
- **"re-brand it"** → edit `src/components/pdf-analyst/Brand.tsx`. Don't
  touch the chat affordances.
- **"make it about Y"** (e.g. a different document type) → tune the
  extraction prompt in `agent/src/pdf_tools.py` and the agent system prompts
  in `agent/src/fixed_agent.py` / `agent/src/dynamic_agent.py`. The data is
  the uploaded PDF — there's no static dataset to swap. Don't restructure.
- **"connect to another agent"** → run `pnpm check-a2a <url>` first; only
  then set `A2A_AGENT_URL` in `.env`. See HACKATHON.md §6.

## Anti-patterns (don't do this)

- Don't run `pnpm install` against a new `@copilotkit/*` version.
- Don't add new top-level dependencies without checking if base already has
  an equivalent (e.g. don't pull in `framer-motion` if the existing
  CSS-transition path suffices). The AG-UI client transport for the
  pdf-analyst demo already ships: `@ag-ui/client` and `@ag-ui/core`
  (`^0.0.53`), plus `recharts` for charts and `pdfjs-dist` for client-side
  PDF parsing — see `FROZEN.md`.
- Don't reintroduce an envelope-inspector rail. The pdf-analyst demo surfaces
  A2UI through the in-canvas `SurfaceCanvas` plus the chat `MirrorRenderer`
  pill — there's no separate "show the wire" panel to keep visible.
- Don't hand-roll React renderers for A2UI primitives. Use the catalog +
  theme system. (`@copilotkit/a2ui-renderer` owns rendering.)
- Don't change the `ChatGoogleGenerativeAI(...)` model call (in
  `agent/src/fixed_agent.py`, `agent/src/dynamic_agent.py`,
  `agent/src/pdf_tools.py`). The provider and model ID are FROZEN — see
  `FROZEN.md`.
- Don't fabricate seams. If `CUSTOMIZATION SEAM` doesn't grep, the hacker is
  asking you to invent one. Push back and ask which existing seam fits.

## Claude Code users

The "slash command vocabulary" above lists recipes, not real CLI commands.
Follow them when the hacker types them in chat. Skills live at:
`.claude/skills/create-a2ui-widget/SKILL.md`.

Useful grep starting points:
- `grep -r "CUSTOMIZATION SEAM" .` — find all seams in two seconds
- `grep -r "Pattern to copy" .` — find canonical examples
- `agent/src/fixed_agent.py` and `agent/src/dynamic_agent.py` — read these
  top-to-bottom before changing an agent flow
- `src/a2ui/catalog/definitions.ts` — the 21-component catalog, read before
  adding a component

## Gemini CLI users

`.gemini/settings.json` sets trust roots and adds
`AGENTS.md` to the context filename list. The starter is fully trusted.

Useful one-liners:
- `gemini -p "explain seam #4 from HACKATHON.md"` — see the recipe
- `gemini -p "add a Timeline component to the A2UI catalog"`

## Cursor / Windsurf / Codex users

`AGENTS.md` (this file) is the cross-tool standard ([agents.md](https://agents.md/),
Linux Foundation) read natively by Cursor, Windsurf, Codex CLI, Kilo Code,
Aider, and Sourcegraph Cody. No extra config needed.

`.vscode/settings.json` + `.vscode/extensions.json`
enable the CopilotKit A2UI catalog preview extension and recommend it on
first open.

## When in doubt

1. `grep -r "CUSTOMIZATION SEAM" .` — find the seam.
2. Read the canonical example named in the anchor comment.
3. Copy its shape. Swap content. Run `pnpm validate-widget` then `pnpm smoke`.
4. If the hacker is asking for something that doesn't have a seam, push back
   before inventing new architecture. The build window is 5 hours.

## Working from a worktree (AI assistants)

This section is for AI assistants (Claude Code blitz agents, Gemini CLI,
Cursor, Codex) running in a git worktree under `.claude/worktrees/<slot>/`.
Worktrees give you isolated branches for parallel work — read this before
running anything in one.

### Fresh-worktree setup

Worktrees inherit git history but **not** `node_modules` or `.venv`. On the
first command in a fresh worktree you will see `sh: tsx: command not found`
(or similar) until you install. Run this once after `git worktree add`:

```
pnpm install --frozen-lockfile
```

Takes ~12s. After that, `pnpm validate-widget`, `pnpm typecheck`, and the
other scripts work normally inside the worktree.

### Worktree-aware env loading (FastAPI agent)

The agent (`uvicorn main:app` via `pnpm dev:agent` → `scripts/run-agent.sh`)
calls `load_dotenv()` from the `agent/` directory, so it reads `agent/.env`
(or walks up to the repo root). Started from a worktree, it will **not** pick
up the main checkout's `.env`. Two workarounds, in order of preference:

1. Copy `.env` into the worktree root: `cp ../../.env .env` (from the
   worktree). Don't commit it — `.env` is already gitignored.
2. Export the var inline: `GEMINI_API_KEY=... uvicorn main:app --port 8123`
   (run from the worktree's `agent/` dir).

`pnpm dev` from the **main** checkout is unaffected — the issue only
applies when launching the agent from inside a worktree.

### What you can't smoke-test from a worktree

`pnpm dev:ui` is rooted in the main repo. A dev server started from the
main checkout will **not** see edits inside a worktree — different working
trees, same node process. The worktree-safe smoke gates are:

- `pnpm typecheck` — once B4's `typecheck` script lands
- `pnpm validate-widget <path>` — widget JSON validation
- `pnpm test:widgets` — fixture/catalog tests

If you need a real dev server against worktree changes, push the branch
and check out that branch in the main repo (or in a fresh terminal in the
worktree itself).

### Benign lefthook warning on commit

`git commit` from a worktree prints `Can't find lefthook in PATH` twice.
**The commit still succeeds.** Don't retry, don't `--no-verify`, don't
investigate further. Tracked at GitHub #5; safe to ignore.

### Resume-an-interrupted-agent recipe

Heavy multi-file blitz slots (≥4 files, ≥800 LOC in one session) risk
mid-flight context exhaustion. Evidence: two confirmed cases in Wave 1
where an agent's session ended at a natural file boundary after writing
most of the artifacts but before the final aggregator/index file and the
commit. The artifacts on disk were complete and well-formed; the agent
simply ran out of context.

**Mitigations, in order of preference:**

1. **Decompose** heavy slots into smaller per-file slots
   (defs / renderers / theme / index dispatched separately).
2. **Write the cheapest aggregator/index file first** (or mid-stream) so
   even a partial completion produces a wireable artifact. Example:
   write `index.ts` (28 lines re-exporting from siblings) **before** the
   heavier renderers, so the catalog is registerable even if the agent
   exhausts context on the heavy file.
3. Keep slot LOC budget under ~800 lines across ≤3 files where possible.

**Recipe for picking up an interrupted agent.** From the orchestrator:

```
cd .claude/worktrees/<slot>
git status                  # see committed vs uncommitted
git log --oneline -5        # see what the prior agent did
git diff HEAD               # see uncommitted partial work
ls -la <expected outputs>   # confirm which files exist
```

Then dispatch a follow-up agent with **explicit scope = only the
unfinished file(s)**. Paste-ready orchestrator wording:

> The prior B-N agent in worktree `.claude/worktrees/blitz-BN` wrote
> `<file-a>` and `<file-b>` but did not finish `<file-c>` (or did not
> commit). Read the worktree state with `git status` and `git log
> --oneline -5`. Your scope is **only** `<file-c>` (and the commit +
> push if the prior agent did not). Do not re-touch the files the prior
> agent completed. When done, push to branch `<branch>` and report the
> PR URL.

The follow-up agent inherits the partial work via the existing branch
and only needs context for the remaining file.

### JSDoc `*/` comment-terminator gotcha

The two-character substring `*` followed by `/` inside a JSDoc
`/** ... */` block terminates the comment early. esbuild then chokes on
whatever follows. This bites when writing path or glob examples in a
top-of-file JSDoc, e.g. a path like `other-examples/<star>/EXAMPLE.json`
where `<star>` is the literal wildcard.

**Safe options:**

- **Escape the slash** so the two characters are no longer adjacent — put
  a backslash between them: `other-examples/<star>\<slash>EXAMPLE.json`.
  The compiler still sees the original path; the comment scanner does not
  see a terminator.
- **Rephrase** to avoid the substring entirely — use
  `other-examples/<dir>/EXAMPLE.json` (angle-bracket placeholder) instead
  of a literal wildcard.
- **Move the path example** out of the JSDoc into a regular `//` line
  comment below it. Line comments have no terminator.

### Acceptance-criteria grep patterns

When writing ACs that say "no X in file Y", specify the **semantic match**,
not the literal substring. Brand text and import statements both contain
the same word, and a naive grep gives false positives.

- **Bad:** `grep -l 'CopilotKit' src/app/layout.tsx`
  — matches `<title>CopilotKit</title>` (page brand text, intentional).
- **Good:** `grep -E '<CopilotKit|@copilotkit/react-core' src/app/layout.tsx`
  — matches the provider component and the import path; ignores brand
  text.

Pattern: anchor on the JSX open-tag (`<Name`) or the package import path
(`@scope/pkg`), not the bare identifier.
