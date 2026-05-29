# CopilotKit A2UI Hackathon Starter — Agent Guide

You are working in a hackathon starter for the **Generative UI Hackathon**
(London slot, Google CSG venue, May 2026). The hacker wants to customize this
app to demo their own domain inside the build window of a 5-hour hackathon.
Speed and clarity beat completeness. Pattern-match aggressively — copy the
canonical examples named in this guide rather than inventing new ones.

## What this repo is

A Next.js + LangGraph + CopilotKit + A2UI v0.9 starter that demonstrates
**agent-driven generative UI**. Three subsystems:

- `src/app/` — Next.js 16 + React 19 + Tailwind 4 web app
- `agent/` — Python LangGraph agent emitting A2UI envelopes via CopilotKit
- `a2a/` — Optional A2A bolt-on for Track 1 multi-agent interop (dormant
  until `A2A_AGENT_URL` is set)

The agent emits A2UI v0.9 declarative UI envelopes (`createSurface`,
`updateComponents`, `updateDataModel`). The renderer turns them into React.
Read `HACKATHON.md` for the customization recipes.

## Hard rules

1. **Versions are pinned.** Do NOT bump `@copilotkit/*`, `langchain*`, or
   `langgraph*` versions without explicit instruction. See `FROZEN.md`. The
   pre-commit hook will reject `@copilotkit/*` drift.
2. **Always run `pnpm validate-widget <path>`** after editing any widget JSON.
3. **Always run `pnpm smoke`** before declaring work done. `smoke` is a
   composite gate: validators + pin check + offline path + canned prompt.
4. **Default LLM is Gemini 3.5 Flash via the native Google Gen AI SDK
   (`langchain-google-genai`).** Do not change the model line in
   `agent/main.py` unless told. The native SDK is required because Gemini
   3.x's thought-signature replay across tool turns is not implemented by
   `langchain-openai`. The OpenAI-compat path is documented as a fallback in
   `FROZEN.md` § LLM provider (sticks on `gemini-2.5-flash` for the same
   reason).
5. **Don't edit `src/components/EnvelopeInspector.tsx`** unless asked. It is
   the hackathon's "show the wire" affordance — surfaces must stay visible.
6. **Don't write new React renderers for A2UI primitives.** Use the catalog
   + theme system. The renderer is provided by `@copilotkit/a2ui-renderer`.

## Customization seams

These are the six grep-anchored seams a hacker (or you) edit to make this
starter their own. Search for `CUSTOMIZATION SEAM` to find each one in code.

1. **Re-theme** → `src/lib/a2ui-theme.css` (CSS variables) + `src/hooks/use-theme.tsx`
2. **Re-brand the shell** → `src/components/BrandFrame.tsx` (header, logo, palette accents)
3. **Swap demo data** → `agent/src/query.py` (or `agent/src/domains/<active>/data/`)
4. **Add an A2UI widget (fixed schema)** → copy
   `agent/src/tools/risk_register.py:show_risk_register` (one helper, one
   tree, one template binding — simplest canonical), register in
   `agent/src/domains/default/tools.py`, and add a hint to
   `agent/src/domains/default/prompts.py`'s `TOOL_RULES`.
5. **Switch domain** → set `DOMAIN=<name>` in `.env`; canonical stub at
   `agent/src/domains/shopping`
6. **BYO A2A agent** → set `A2A_AGENT_URL`; run `pnpm check-a2a <url>` first.
   Wired in `src/app/api/copilotkit/route.ts`.

`HACKATHON.md` has the full step-by-step recipe for each seam.

## Canonical examples

When the hacker asks for a new something, grep-find and copy the canonical:

- **Fixed-schema A2UI widget (minimal):**
  `agent/src/tools/risk_register.py:show_risk_register` — one helper, one
  component tree, one template binding. Read this first when adding a
  widget. Pair it with `agent/src/widgets/risk_register.json` (catalog
  entry) and `agent/src/widgets/risk_register.fixture.json` (offline data).
- **Fixed-schema A2UI widget (showcase):**
  `agent/src/tools/project_dashboard.py:show_project_dashboard` — the
  opening-demo surface with 4 KPIs, a sprint timeline, and 3 ProjectCards.
  Heavier `_build_data` if you want to see what filtering + enrichment
  looks like at scale.
- **Dynamic-schema A2UI:** `agent/src/a2ui_dynamic_schema.py:generate_a2ui`
  (secondary LLM produces the component tree on demand)
- **A2UI envelope (raw JSON):** `agent/src/widgets/*.fixture.json`
- **Brand shell:** `src/components/BrandFrame.tsx`
- **Theme tokens:** `src/lib/a2ui-theme.css`

## Commands

| Command | What it does |
|---|---|
| `pnpm doctor` | Preflight env check (Node, pnpm, Python, uv, env vars, ports) |
| `pnpm dev` | Boot Next.js + Python agent concurrently |
| `pnpm smoke` | Composite gate (validators + pins + offline + canned prompt) |
| `pnpm validate-widget <path>` | Validate a widget JSON against A2UI v0.9 |
| `pnpm check-a2a <url>` | Validate a partner A2A endpoint |
| `pnpm explain <topic>` | Print the right HACKATHON.md section (`themes`, `widgets`, `a2a`, `data`, `branding`, `domain`) |
| `pnpm new-widget <name>` | Scaffold from `risk_register` template |
| `pnpm theme:reset` | Revert theme to defaults |
| `pnpm verify-pins` | Fail if lockfiles drifted from `FROZEN.md` |

## Slash command vocabulary (for AI assistants)

When the hacker says:

- **"add a widget"** → follow `HACKATHON.md` §4 (prefer fixed-schema for
  demo predictability). Copy `risk_register`. Run the **4-surface dance**:
  catalog entry + fixture + Python tool (registered in
  `agent/src/domains/default/tools.py`) + prompt hint (in
  `agent/src/domains/default/prompts.py`'s `TOOL_RULES`). Run
  `pnpm validate-widget` then `pnpm smoke` before declaring done.
- **"theme it for X"** → only edit `src/lib/a2ui-theme.css` and
  `src/hooks/use-theme.tsx`. Don't restructure components. Don't bump deps.
- **"re-brand it"** → edit `src/components/BrandFrame.tsx`. Don't touch the
  envelope inspector or chat affordances.
- **"make it about Y"** (e.g. shopping, healthcare) → swap demo data in
  `agent/src/query.py` and the system prompt in `agent/main.py`. Don't
  restructure. Reference `agent/src/domains/shopping/` as the pattern.
- **"connect to another agent"** → run `pnpm check-a2a <url>` first; only
  then set `A2A_AGENT_URL` in `.env`. See HACKATHON.md §6.

## Anti-patterns (don't do this)

- Don't run `pnpm install` against a new `@copilotkit/*` version.
- Don't add new top-level dependencies without checking if base already has
  an equivalent (e.g. don't pull in `framer-motion` if the existing
  CSS-transition path suffices).
- Don't replace the envelope inspector with a toggle. It must stay visible.
- Don't hand-roll React renderers for A2UI primitives. Use the catalog +
  theme system. (`@copilotkit/a2ui-renderer` owns rendering.)
- Don't change `agent/main.py`'s `ChatOpenAI(...)` model call. The provider,
  base URL, and model ID are FROZEN — see `FROZEN.md`.
- Don't fabricate seams. If `CUSTOMIZATION SEAM` doesn't grep, the hacker is
  asking you to invent one. Push back and ask which existing seam fits.

## Claude Code users

The "slash command vocabulary" above lists recipes, not real CLI commands.
Follow them when the hacker types them in chat. Skills live at:
`.claude/skills/create-a2ui-widget/SKILL.md` (when Workstream F lands).

Useful grep starting points:
- `grep -r "CUSTOMIZATION SEAM" .` — find all seams in two seconds
- `grep -r "Pattern to copy" .` — find canonical examples
- `agent/src/tools/risk_register.py` — read this top-to-bottom before adding a widget

## Gemini CLI users

`.gemini/settings.json` (added in Workstream F) sets trust roots and adds
`AGENTS.md` to the context filename list. The starter is fully trusted.

Useful one-liners:
- `gemini -p "explain seam #4 from HACKATHON.md"` — see the recipe
- `gemini -p "add a recipe-card widget patterned after risk_register"`

## Cursor / Windsurf / Codex users

`AGENTS.md` (this file) is the cross-tool standard ([agents.md](https://agents.md/),
Linux Foundation) read natively by Cursor, Windsurf, Codex CLI, Kilo Code,
Aider, and Sourcegraph Cody. No extra config needed.

`.vscode/settings.json` + `.vscode/extensions.json` (added in Workstream F)
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

### Worktree-aware env loading (langgraph)

`langgraph dev` started from a worktree's `agent/` directory will **not**
pick up the main checkout's `.env` — it only looks at the worktree root.
Two workarounds, in order of preference:

1. Copy `.env` into the worktree root: `cp ../../.env .env` (from the
   worktree). Don't commit it — `.env` is already gitignored.
2. Export the var inline: `GEMINI_API_KEY=... langgraph dev`.

`pnpm dev` from the **main** checkout is unaffected — the issue only
applies when launching langgraph from inside a worktree.

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
