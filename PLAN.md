# A2UI Hackathon Starter — Engineering Spec

**Event:** The Generative UI Hackathon — London slot, Google CSG venue
**Track focus:** Track 2 (A2UI Generative UI Challenge), with Track 1 (A2A interop) wired as a bolt-on
**Author:** Jerel (CopilotKit)
**Scope of this doc:** engineering spec for the starter repo only. Event ops (mentor staffing, registration, judging, prizes, AV, food, on-site logistics) lives in a separate ops doc owned by the event coordinator.

---

## TL;DR

**Fork the official LangGraph A2UI v0.9 starter, layer hackathon ergonomics on top.** CopilotKit already ships `examples/integrations/langgraph-python` with both A2UI paths (dynamic + fixed schema) wired against `@copilotkit/a2ui-renderer@1.56.5`. We fork it, swap the default LLM to Gemini via Google's OpenAI-compatible endpoint (sponsor alignment + free tier), bolt on a minimal A2A layer, and invest heavily in **DX + AX (Agent Experience)** so that AI coding assistants — Claude Code, Gemini CLI, Cursor, Windsurf, Codex — can vibe-code on this repo as fluently as humans. The starter ships an `AGENTS.md` (with `CLAUDE.md` and `GEMINI.md` symlinks) and anchor-commented seams so a hacker + their AI assistant can re-skin and re-brand fast.

**Target loop:** clone → boot → re-skinned demo for a custom domain in well under the event's build window.

---

## Event context

The Generative UI Hackathon is a **globally-coordinated, multi-city, 5-hour build slot** sponsored by Google DeepMind, CopilotKit, and Manufact (mcp-use). Three protocol pillars:

| Pillar | Sponsor | What it is |
|---|---|---|
| **A2UI** | Google + CopilotKit | Agents emit declarative UI envelopes. *This starter's primary focus.* |
| **AG-UI** | CopilotKit | The transport underneath A2UI; protocol for agent ↔ frontend events. This starter uses it natively. |
| **MCP Apps** | Manufact (mcp-use) | MCP servers expose tools to model clients. Independent path; we link out, don't replicate. |

**London is one of ~18 simultaneous city slots on the day.** A global kickoff video runs near doors-open; the venue needs AV to play it (owned by event ops, not this repo).

**Implications for this starter:**
- We are the canonical Track 2 starter (A2UI-focused). Teams who want MCP Apps or pure AG-UI builds are equally valid; we link out to those starters from the README so it's clear we're not gatekeeping the field.
- A2A interop is dormant-by-default (set `A2A_AGENT_URL` to activate). The A2A Net template owns Track 1; we ship the bolt-on for teams who want to combine.
- The starter must run on flaky venue Wi-Fi (`OFFLINE=1` fallback), under a 5-hour build clock (every minute of friction is a meaningful percentage of the build window), and survive a Gemini free-tier rate-limit cliff at ~tens-of-teams concurrency.

---

## Goals

1. **Zero-to-running fast.** Clone, set one env var, `pnpm dev`, see A2UI surfaces render.
2. **Re-skinnable in a small fraction of the build window** by a hacker + their AI assistant (seams 1, 2, 3, 5).
3. **A2UI is visible by default.** Envelope inspector ships as default chrome — teams cannot accidentally hide that they're using A2UI.
4. **AI coding assistants are first-class users.** Repo is structured to be vibe-code-friendly: anchor comments, AGENTS.md, fixtures, validators with teaching errors.
5. **Survives venue Wi-Fi.** `OFFLINE=1` path renders pre-baked envelopes.
6. **Release-safe.** Pinned versions + vendored fallback + frozen-on-fork-date banner.

## Non-goals

- We are *not* building bespoke A2UI middleware or renderer.
- We are *not* building bespoke A2A multi-agent orchestration.
- We are *not* the platform for Track 1 multi-team interop — A2A Net's template owns that.
- We are *not* shipping an MCP Apps starter — Manufact's template owns that. We link out.
- We are *not* the event-ops plan. Mentor staffing, judging, prizes, registration, AV all live elsewhere.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Browser (Next.js 16 / React 19 / Tailwind 4)                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  <CopilotKit runtimeUrl="/api/copilotkit">                      │ │
│ │     <SplitView>                                                 │ │
│ │       <CopilotChat />                                           │ │
│ │       <EnvelopeInspector />   ← default chrome                  │ │
│ │     </SplitView>                                                │ │
│ │  </CopilotKit>                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ AG-UI (SSE)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Next.js /api/copilotkit                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  const runtime = new CopilotRuntime({                           │ │
│ │    agents: { default: langgraphAgent },                         │ │
│ │    a2ui: { schema, injectA2UITool: true },                      │ │
│ │  });                                                            │ │
│ │  // optional A2A bolt-on (dormant unless A2A_AGENT_URL is set)  │ │
│ │  const a2aAgent = new A2AMiddlewareAgent({                      │ │
│ │    orchestrationAgent: langgraphAgent,                          │ │
│ │    agentUrls: [process.env.A2A_AGENT_URL].filter(Boolean),      │ │
│ │  });                                                            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ AG-UI
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LangGraph Python agent (uv, Gemini via OpenAI compat)               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  model = ChatOpenAI(                                            │ │
│ │    model=os.getenv("MODEL", "<resolved-gemini-model-id>"),      │ │
│ │    api_key=os.getenv("GEMINI_API_KEY"),                         │ │
│ │    base_url="https://generativelanguage.googleapis.com"         │ │
│ │             "/v1beta/openai/",                                  │ │
│ │  )                                                              │ │
│ │  agent = create_agent(                                          │ │
│ │    model=model,                                                 │ │
│ │    tools=[query_data, *todo_tools,                              │ │
│ │           generate_a2ui, search_flights],                       │ │
│ │    middleware=[CopilotKitMiddleware(),                          │ │
│ │                StateStreamingMiddleware(...)],                  │ │
│ │  )                                                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Gemini default

1. **Designed for agents.** Google positions the current Gemini Flash tier as the agentic flagship for sustained tool-calling.
2. **Sponsor alignment.** Google is the venue + platform sponsor; Gemini CLI A2A is a headline track.
3. **Free tier.** No credit card to get a key.
4. **Zero code rewrite.** Gemini exposes an OpenAI-compatible endpoint; `ChatOpenAI` works as-is with two env vars changed.
5. **Documented swap matrix.** A 3-line `.env.example` change flips to OpenAI / Anthropic / any LiteLLM-compatible model.

**Model ID is a gate, not a guess.** `<resolved-gemini-model-id>` above is a placeholder. Workstream A (below) must hit the OpenAI-compat endpoint with a tool-calling request, confirm the model ID 200s, and write the verified ID into `.env.example`, `agent/src/main.py`, and `FROZEN.md`. If the latest Flash 404s, fall back to the most recent stable Flash that does. This is the single biggest event-day failure mode and must be empirically verified before any other downstream work commits to a specific ID.

---

## Default demo: inherited from base

Inherits the base starter's todos / dashboards / flights demo unchanged — exercises both A2UI paths and state streaming. The only swap is the default LLM.

---

## The customization seams

### Same-day path (the realistic loop)

**Seam #1: Re-theme** — `src/app/theme.ts` + `src/app/a2ui-theme.css`. Tailwind tokens + CSS variables.

**Seam #2: Re-brand the shell** — `src/components/BrandFrame.tsx`. Header, logo, palette accents.

**Seam #3: Swap demo data** — `agent/src/query.py` or `agent/src/domains/<active>/data/`.

**Seam #5: Switch domain** — `DOMAIN=<name>` in `.env`. Ships with one fully-tested stub (`shopping`) — see "Stub domain" section below.

> HACKATHON.md leads with these four as the realistic loop.

### Stretch path (more substantial change per seam)

**Seam #4: Add an A2UI widget** — two routes:
- *Fixed schema* (recommended): declare in `src/app/api/copilotkit/route.ts` schema array, write a Python tool emitting matching envelopes, add to `tools=[...]` in `main.py`. Copy `search_flights` as the template.
- *Dynamic schema* (faster, less predictable): describe the widget in the system prompt; `generate_a2ui` produces it on demand. Tweak via [A2UI Composer](https://a2ui-composer.ag-ui.com/).

**Seam #6: BYO A2A agent** — set `A2A_AGENT_URL`. **First** run `pnpm check-a2a <url>` (v0.9 envelope shape check). Track 1 interop seam.

### Stub domain (one, deeply finished)

Ship **one** stub domain — `shopping` — that is fully validated, with working fixtures and a known-good system prompt. Two half-finished stubs create more confusion than they solve; we'd rather have one canonical "here is how the swap works" path that demonstrably works than two that bit-rot.

`agent/src/domains/default/` stays as the inherited flights+dashboards+todos demo. `agent/src/domains/shopping/` is the second example. HACKATHON.md §5 walks through how to add a third.

---

## DX (Developer Experience)

The hacker's-eye view of the customization journey. Optimized for a tight build window.

### First minutes (boot)

- **One command.** `pnpm dev` boots Next.js + Python agent concurrently. Browser auto-opens.
- **`pnpm doctor`** — preflight check, runnable on its own and run automatically as the first step of `pnpm dev`. Verifies: pnpm version, Node version, Python version, `uv` installed, `GEMINI_API_KEY` set (or `OFFLINE=1`), network to Gemini reachable, ports 3000 / agent port free. Each failure prints one actionable hint with a link. Catches ~80% of "doesn't boot on my machine" issues before they reach a mentor.
- **Friendly env failures.** Missing `GEMINI_API_KEY` → `stderr` says: *"No model key. Run with `OFFLINE=1` for mock envelopes, or set GEMINI_API_KEY in `agent/.env` (free tier: https://aistudio.google.com/apikey)."*
- **Empty-state suggestions.** First chat opens with three suggestion chips wired to the three A2UI paths: *"Show me a flights dashboard"*, *"Build me a metrics dashboard"*, *"Add a few todos"*. Hacker hits one, sees A2UI render immediately.
- **`WELCOME.md` opens in their editor** on first `postinstall`. ~200 words, points at HACKATHON.md.
- **HACKATHON.md ships an "hour-by-hour" template.** Suggested time budget for the build window (hour 1: clone, boot, re-theme; hour 2: swap data + domain; hour 3: widget tweaks; hour 4: polish; hour 5: rehearse demo). Hackers can ignore it but the prompt frames the day.

### Mid-build (discover seams)

- **In-app "edit this" affordances.** Every envelope in the inspector has a `</>` button that opens its source. Detects `$EDITOR` and tries the matching deeplink (`vscode://`, `cursor://`, `windsurf://`, `zed://`); if no match, **falls back to copying `file:line` to the clipboard** with a toast confirmation. Always does *something*.
- **Anchor comment banners.** Every seam has an identical, grep-friendly banner:
  ```python
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # CUSTOMIZATION SEAM #4 — Add a new A2UI widget (fixed schema)
  # See HACKATHON.md §4 for the full recipe.
  # Pattern to copy: search_flights (below).
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
- **`pnpm explain <topic>`** prints the right HACKATHON.md section to the terminal: `themes`, `widgets`, `a2a`, `data`, `branding`, `domain`.
- **Per-directory READMEs.** `agent/src/README.md`, `src/app/README.md` — ~30 lines each, "what lives here, where the rest of the docs are."

### Edit → see loop

- **Hot reload on both sides.** Next.js native. Python via `uv run --reload` (or `watchfiles`).
- **Pre-flight validators.** `pnpm validate-widget agent/src/widgets/my_card.json` catches v0.9 envelope shape errors *before* runtime. Lefthook pre-commit hook runs the validator on changed widget files.
- **Visible protocol.** Envelope inspector is default chrome — every change is observable as raw JSON, not just rendered pixels.

### Verify before judging

- **`pnpm smoke`** — composite gate that runs **all of**:
  1. Boot + canned prompt against the running stack, assert at least one `createSurface`.
  2. `pnpm validate-widget` over every `*.json` in `agent/src/widgets/`.
  3. `pnpm verify-pins` (lockfile drift check).
  4. `OFFLINE=1` end-to-end smoke (boot, prompt, assert offline envelope renders).
- **`/debug` page** — orchestrator state, last 20 envelopes per surface, A2A subagent health, latency.
- **`pnpm check-a2a <url>`** — partner-agent compliance check before plugging in.

### Pitfalls preempted

| Stumble | Catch |
|---|---|
| Forgot to install something | `pnpm doctor` says exactly what and how |
| Forget `GEMINI_API_KEY` | Boot-time check + offline fallback hint with `aistudio.google.com` link |
| Edit Python, forget restart | `uv run --reload` |
| Malformed widget JSON | `validate-widget` + pre-commit hook |
| Theme broke layout | `pnpm theme:reset` reverts |
| Composer JSON won't render | Validator points at the failing field with example |
| Agent calls unknown tool | Soft chat error + envelope inspector logs the attempt |
| `vscode://` deeplink does nothing | Clipboard fallback + toast |
| Lockfile drift mid-day | `pnpm verify-pins` (also run inside `pnpm smoke`) |
| AI assistant bumps `@copilotkit/*` | Pre-commit hook diffs `package.json` against `FROZEN.md` and rejects |

---

## AX (Agent Experience)

A vibe-code-friendly repo is a force multiplier on time-to-demo. A large fraction of hackers will use Cursor / Claude Code / Gemini CLI / Codex / Copilot to customize. Designed for them.

### Memory file trio

Three files at the repo root, all loaded automatically by their native tool:

| File | Role | Implementation |
|---|---|---|
| **`AGENTS.md`** | Canonical source of truth. Cross-tool standard ([agents.md](https://agents.md/), Linux Foundation; backed by OpenAI, Google, Sourcegraph, Cursor, Factory). Read by Cursor, Windsurf, Codex CLI, Kilo Code natively. | Real file. ~150 lines. |
| **`CLAUDE.md`** | Claude Code reads `CLAUDE.md` natively. | **Symlink → `AGENTS.md`.** |
| **`GEMINI.md`** | Gemini CLI reads `GEMINI.md` natively per the [official spec](https://geminicli.com/docs/cli/gemini-md/). | **Symlink → `AGENTS.md`.** |

Tool-specific notes live as labeled sections inside the canonical AGENTS.md:
- `## Claude Code users` — slash-command vocabulary, skills hint
- `## Gemini CLI users` — `.gemini/settings.json` notes, trust roots
- `## Cursor / Windsurf users` — workspace settings

### Sketched content for AGENTS.md

```markdown
# CopilotKit A2UI Hackathon Starter — Agent Guide

You are working in a hackathon starter for the Generative UI Hackathon.
The hacker wants to customize this app to demo their own domain inside the
build window of a 5-hour hackathon. Speed and clarity beat completeness.

## What this repo is
A Next.js + LangGraph + CopilotKit + A2UI v0.9 starter. Three subsystems:
- `src/app/` — Next.js 16 + React 19 + Tailwind 4 web app
- `agent/` — Python LangGraph agent emitting A2UI envelopes
- `a2a/` — Optional A2A bolt-on for Track 1 interop

## Hard rules
1. **Versions are pinned.** Do not bump @copilotkit/* or langchain/* without
   explicit instruction. See FROZEN.md. The pre-commit hook will reject drift.
2. **Always run `pnpm validate-widget <path>`** after editing any widget JSON.
3. **Always run `pnpm smoke`** before declaring work done. `smoke` is composite:
   validators + pin check + offline path + canned prompt.
4. **Default LLM is Gemini via OpenAI compat** — do not change `base_url` or
   `model` unless told.
5. **Don't edit `src/components/EnvelopeInspector.tsx`** unless asked. It's
   the hackathon's "show the wire" affordance.

## Customization seams
1. **Re-theme** → `src/app/theme.ts`, `src/app/a2ui-theme.css`
2. **Re-brand the shell** → `src/components/BrandFrame.tsx`
3. **Swap demo data** → `agent/src/query.py`, `agent/src/domains/<active>/data/`
4. **Add an A2UI widget (fixed schema)** → copy
   `agent/src/a2ui_fixed_schema.py:search_flights`, declare in
   `src/app/api/copilotkit/route.ts` schema array
5. **Switch domain** → set `DOMAIN=<name>` in `.env`; canonical stub at
   `agent/src/domains/shopping`
6. **BYO A2A agent** → set `A2A_AGENT_URL`; run `pnpm check-a2a <url>` first

## Canonical examples
- Fixed-schema A2UI widget: `agent/src/a2ui_fixed_schema.py:search_flights`
- Dynamic-schema A2UI: `agent/src/a2ui_dynamic_schema.py:generate_a2ui`
- A2UI envelope (raw JSON): `agent/src/widgets/*.fixture.json`

## Commands
- `pnpm doctor` — preflight env check
- `pnpm dev` — boot everything
- `pnpm smoke` — composite gate (validators + pins + offline + canned prompt)
- `pnpm validate-widget <path>` — validate a widget JSON against A2UI v0.9
- `pnpm check-a2a <url>` — validate a partner A2A endpoint
- `pnpm explain <topic>` — print the right HACKATHON.md section
- `pnpm new-widget <name>` — scaffold from search_flights template
- `pnpm theme:reset` — revert theme.ts to defaults
- `pnpm verify-pins` — fail if lockfiles drifted from FROZEN.md

## Slash command vocabulary (for AI assistants)
When the hacker says:
- "add a widget" → follow HACKATHON.md §4 (fixed-schema preferred for predictability)
- "theme it for X" → only edit theme.ts + a2ui-theme.css unless the hacker asks for more
- "make it about Y" → swap demo data + system prompt; don't restructure
- "connect to another agent" → run `pnpm check-a2a <url>` first; only then set `A2A_AGENT_URL`

## Anti-patterns
- Don't `pnpm install` a new @copilotkit/* version.
- Don't add new top-level dependencies without checking if base already has equivalent.
- Don't replace the envelope inspector with a toggle.
- Don't write React renderers for A2UI — use the catalog + theme system.

## Claude Code users
Slash commands above are recipes, not real CLI; follow them when the user types them.
Skills available: `.claude/skills/customize-a2ui/`.

## Gemini CLI users
`.gemini/settings.json` configures trust roots. The starter is fully trusted.

## Cursor / Windsurf users
Workspace settings in `.vscode/settings.json` enable the CopilotKit A2UI extension.
```

### Type everything

- **TS strict mode** in `src/`, **Pydantic + ruff strict** in `agent/`, **Zod schemas** for component catalogs. AI assistants make accurate completions when the type surface is rich.
- **A2UI envelope types** exported from a single `src/types/a2ui.ts` — one import point.

### One canonical example per pattern

- `search_flights` is THE example of fixed-schema A2UI, with a header comment that says exactly that.
- `generate_a2ui` is THE example of dynamic-schema, same treatment.
- AI grep-finds the canonical, copies the shape, swaps the content.

### Fixtures as living documentation

- Every widget gets a `*.fixture.json` alongside it (the [VS Code extension's pattern](https://docs.copilotkit.ai/vs-code-extension)).
- `pnpm test:widgets` runs the renderer against every fixture in CI; also invoked by `pnpm smoke`.

### Validators that teach

Error format is *future instructions*, not just diagnostics:

```
✗ Widget JSON failed validation at agent/src/widgets/my_card.json
  Missing required envelope: 'updateComponents' must follow 'createSurface'.
  Canonical example: agent/src/a2ui_fixed_schema.py:search_flights
  Fix: insert an updateComponents envelope between createSurface and updateDataModel.
  Schema reference: https://a2ui.org/specification/v0.9-a2ui/
```

AI assistants paste these back into their context and self-correct.

### Pre-configured tooling

- **`.vscode/settings.json`** — enables CopilotKit's A2UI catalog preview extension
- **`.vscode/extensions.json`** — recommends extensions on first open
- **`.gemini/settings.json`** — sets project trust + adds AGENTS.md to context filename list
- **`.claude/skills/create-a2ui-widget/SKILL.md`** — Claude Code skill that scaffolds a new A2UI widget end-to-end (catalog entry + fixture + Python tool + TS schema declaration + prompt hint). Triggers on "add a widget", "scaffold a card", "build me a [domain visual]" and similar phrasings — see Workstream F for the full sketch.
- **`.mcp.json`** — suggested MCP server config for live CopilotKit docs search

---

## Repo layout (delta from base)

```text
copilotkit-hackathon-a2ui-starter/
├── README.md                                # 5-min start + hackathon framing            ← NEW/EDIT
├── AGENTS.md                                # Canonical agent guide                       ← NEW
├── CLAUDE.md → AGENTS.md                    # Symlink                                     ← NEW
├── GEMINI.md → AGENTS.md                    # Symlink                                     ← NEW
├── WELCOME.md                               # Opens on first install                      ← NEW
├── HACKATHON.md                             # Six numbered seams + hour-by-hour template  ← NEW
├── FROZEN.md                                # Pinned versions + vendoring notes           ← NEW
├── .env.example                             # GEMINI_API_KEY first, OpenAI swap doc'd     ← EDIT
├── package.json                             # Pinned 1.56.x; new script suite             ← EDIT
│
├── .vscode/
│   ├── settings.json                        # CopilotKit A2UI extension config            ← NEW
│   └── extensions.json                      # Recommended extensions                      ← NEW
├── .gemini/
│   └── settings.json                        # Trust roots + AGENTS.md alias               ← NEW
├── .claude/
│   └── skills/
│       └── create-a2ui-widget/SKILL.md      # Scaffolds the 5-surface widget dance        ← NEW
├── .mcp.json                                # Suggested MCP servers                       ← NEW
├── lefthook.yml                             # Pre-commit: validate-widget + pin drift     ← NEW
│
├── src/                                     # Next.js app (per base)
│   ├── README.md                            # 30-line "what lives here"                   ← NEW
│   ├── app/
│   │   ├── api/copilotkit/route.ts          # +A2A bolt-on, +schema declaration           ← EDIT
│   │   ├── layout.tsx
│   │   ├── page.tsx                         # +<EnvelopeInspector />                      ← EDIT
│   │   ├── theme.ts                         # ← Seam #1 (anchor-commented)
│   │   ├── a2ui-theme.css                   # ← Seam #1
│   │   └── debug/page.tsx                   # /debug envelope viewer                      ← NEW
│   ├── components/
│   │   ├── BrandFrame.tsx                   # ← Seam #2                                   ← NEW
│   │   ├── EnvelopeInspector.tsx            # Default chrome + editor-deeplink fallback   ← NEW
│   │   └── (existing renderer extensions)
│   ├── types/
│   │   └── a2ui.ts                          # Single import point for envelope types      ← NEW
│   └── hooks/
│
├── agent/                                   # LangGraph Python (per base)
│   ├── README.md                            # 30-line "what lives here"                   ← NEW
│   ├── main.py                              # Gemini default, anchor-commented            ← EDIT
│   ├── pyproject.toml                       # Pin copilotkit, langchain, openai           ← EDIT
│   ├── uv.lock                              # Committed                                   ← EDIT
│   └── src/
│       ├── query.py                         # ← Seam #3 (anchor-commented)
│       ├── todos.py
│       ├── a2ui_dynamic_schema.py           # Canonical dynamic example                   ← EDIT
│       ├── a2ui_fixed_schema.py             # Canonical fixed example, ← Seam #4          ← EDIT
│       ├── widgets/                                                                       ← NEW
│       │   ├── *.json                       # Widget catalog entries
│       │   └── *.fixture.json               # Named test scenarios per widget
│       └── domains/                                                                       ← NEW
│           ├── default/                     # current flights+dashboards+todos
│           └── shopping/                    # ← Seam #5 canonical stub (one, finished)
│
├── a2a/                                                                                   ← NEW
│   ├── README.md                            # How to plug in a partner agent
│   ├── sample-subagent/                     # Toy A2A subagent
│   │   ├── main.py
│   │   └── pyproject.toml
│   └── compliance/check.ts                  # `pnpm check-a2a <url>` validator
│
├── scripts/                                                                               ← NEW
│   ├── doctor.ts                            # `pnpm doctor` preflight
│   ├── start-all.sh
│   ├── new-widget.sh                        # `pnpm new-widget`
│   ├── validate-widget.ts                   # `pnpm validate-widget`
│   ├── check-a2a.ts                         # `pnpm check-a2a`
│   ├── explain.ts                           # `pnpm explain <topic>`
│   ├── smoke.ts                             # Composite gate
│   ├── verify-pins.sh                       # `pnpm verify-pins`
│   └── sync-memory-files.sh                 # Re-create CLAUDE.md/GEMINI.md symlinks
│
├── public/
│   └── offline-envelopes.json               # OFFLINE=1 fallback                          ← NEW
│
├── vendor/                                                                                ← NEW
│   └── (vendored copilotkit packages — fallback if upstream breaks before event)
│
└── .github/workflows/
    ├── ci.yml                               # smoke + verify-pins + model-id check        ← EDIT
    └── frozen-banner.yml                    # Warns on FROZEN.md drift                    ← NEW
```

---

## Tech choices — pinned

Frozen on fork date. CI fails if lockfiles drift.

| Layer | Pinned version | Notes |
|---|---|---|
| `@copilotkit/react-core` | `1.56.5` (exact) | No caret ranges |
| `@copilotkit/runtime` | `1.56.5` (exact) | — |
| `@copilotkit/a2ui-renderer` | `1.56.5` (exact) | — |
| `@ag-ui/a2a-middleware` | latest stable at fork date | — |
| `copilotkit` (Python) | latest stable at fork date | Pinned in `pyproject.toml`, lockfile committed |
| `langchain` / `langgraph` | per base | — |
| `next` | 16.1.6 | — |
| `react` | 19.2.4 | — |
| **LLM (default)** | **Gemini Flash** (exact ID resolved in Workstream A) via `https://generativelanguage.googleapis.com/v1beta/openai/` | Env: `GEMINI_API_KEY`. See swap matrix below. |
| Package mgmt | pnpm (JS), uv (Python) | Per base |

### Model swap matrix

`.env.example` documents one-block swaps for the three major providers. All use the same `ChatOpenAI(...)` call shape with different `base_url` / `api_key` / `model`:

| Provider | Default model | base_url | Env var | When to pick |
|---|---|---|---|---|
| **Google Gemini** (default) | Resolved in Workstream A | `https://generativelanguage.googleapis.com/v1beta/openai/` | `GEMINI_API_KEY` | Sponsor angle; free tier; agentic-tuned; the default. |
| **OpenAI** | per base starter | (default — none needed) | `OPENAI_API_KEY` | Hackers with OpenAI credit already. |
| **Anthropic** | Claude Sonnet 4.6 | via `langchain-anthropic` (`ChatAnthropic` swap, 3-line change) | `ANTHROPIC_API_KEY` | 1M context, strong tool-calling. |
| **Bring your own (LiteLLM)** | any | LiteLLM proxy URL | `LITELLM_API_KEY` (or proxy auth) | Bedrock, Vertex, Ollama, local LM Studio, etc. |

Rationale: hackathon hackers don't all have a Gemini key. Showing three drop-in paths in `.env.example` removes the "fail to boot" moment. Default stays Gemini — the swap is opt-in, takes 30 seconds, and the OpenAI fallback path is signed off in CI.

### Vendoring fallback

`vendor/` mirrors `@copilotkit/a2ui-renderer` and `copilotkit` (Python). CI proves the vendored mirror builds and renders the smoke envelope. README banner: *"Frozen on \<fork-date\>. Run `pnpm verify-pins` to confirm."*

### Free-tier load behavior

Gemini free-tier rate limits at ~10s of concurrent agentic users is the known cliff. Mitigations layered:
- Per-team API keys (hackers register their own; the prereq email tells them to do this before doors open).
- A small pool of mentor fallback keys for hackers who hit limits.
- `OFFLINE=1` insurance — every demo can fall back to pre-baked envelopes.

A 30-parallel-request load test against the resolved model ID is part of Workstream A's done-criteria. Document the observed cliff and the recovery runbook in HACKATHON.md.

---

## Day-of affordances

- **Envelope inspector** — default chrome, right rail, shows `createSurface` / `updateComponents` / `updateDataModel` with copy-to-clipboard + "open in Composer" buttons + editor-deeplink (with clipboard fallback).
- **`/debug` page** — orchestrator state, last 20 envelopes per surface, A2A subagent status, latency.
- **`OFFLINE=1` mode** — agent returns pre-baked envelopes from `public/offline-envelopes.json`.
- **A2A compliance checker** — `pnpm check-a2a <url>` validates v0.9 envelope shape from any A2A endpoint.
- **Composer deeplinks** — `pnpm new-widget <name>` opens Composer with scoped starter prompt.
- **CI smoke test** — composite gate as defined above.
- **VS Code extension callout** — README mentions CopilotKit's live-preview extension.

---

## What's pre-built vs. what teams build

| Pre-built (inherited + ours) | Team builds |
|---|---|
| LangGraph agent with CopilotKitMiddleware + Gemini default | Widget designs (Composer or hand-rolled) |
| Both A2UI patterns wired | Domain prompts |
| `a2ui: true` runtime config | Their own data |
| Envelope inspector chrome | Theme + branding |
| `/debug` + offline mode + A2A bolt-on | (Optional) BYO A2A agent |
| AGENTS.md / CLAUDE.md / GEMINI.md trio | (Optional) new A2UI widgets |
| Anchor-commented seams + validators | |
| `.vscode/`, `.gemini/`, `.claude/`, `.mcp.json` | |
| One canonical stub domain (`shopping`) | |

Teams' time should mostly go to **widget design + prompt engineering + domain content** with their AI assistant doing most of the typing.

---

## Workstreams (for parallel dispatch)

These are designed to run as parallel `/blitz` subagents on isolated worktrees off the same fork. They have minimal cross-cutting overlap so they can converge without thrashing.

### Workstream A — Foundation + LLM verification (gating)

**Owner:** must run first — downstream work depends on the verified model ID and the fork being clean.

1. Fork `examples/integrations/langgraph-python` → `CopilotKit/with-a2a-a2ui-hackathon` (or chosen repo name).
2. **Verify the Gemini model ID.** Hit `https://generativelanguage.googleapis.com/v1beta/openai/` with `ChatOpenAI` and a tool-calling request. Confirm the chosen model ID 200s with a tool call. If not, fall back to the latest stable Flash that does.
3. Write the verified ID into `.env.example`, `agent/src/main.py`, `agent/pyproject.toml`, `FROZEN.md`, and the README.
4. Commit pinned lockfiles (`pnpm-lock.yaml`, `uv.lock`).
5. Run a 30-parallel-request load test against the chosen model. Document observed rate-limit behavior in `FROZEN.md` and in HACKATHON.md's "if you get rate-limited" section.
6. Verify the base demo (todos / dashboards / flights) runs end-to-end with the Gemini default.

**Done when:** fork exists, model ID empirically confirmed via tool-calling probe, lockfiles committed, base demo green.

### Workstream B — A2A bolt-on + envelope inspector + `/debug`

**Depends on:** Workstream A (fork must exist).

1. Wire `@ag-ui/a2a-middleware` into `src/app/api/copilotkit/route.ts` (dormant unless `A2A_AGENT_URL` set).
2. Build the toy A2A subagent in `a2a/sample-subagent/`.
3. Build `pnpm check-a2a <url>` — v0.9 envelope shape compliance checker.
4. Build `<EnvelopeInspector />` component (default chrome). Right rail, shows `createSurface` / `updateComponents` / `updateDataModel` with copy-to-clipboard + Composer link + editor-deeplink with clipboard fallback.
5. Build `/debug` page — orchestrator state, last 20 envelopes per surface, A2A subagent health, latency.

**Done when:** booting the app shows envelope inspector by default; `/debug` renders; `check-a2a` returns useful output against the toy subagent.

### Workstream C — AGENTS.md trio + anchor-comment pass + per-directory READMEs

**Depends on:** Workstream A (fork must exist). Can run in parallel with B, D, E.

1. Write `AGENTS.md` per the sketch above. ~150 lines.
2. Create `CLAUDE.md` and `GEMINI.md` as symlinks to `AGENTS.md`. Verify both Claude Code and Gemini CLI pick them up.
3. Anchor-comment every seam (1, 2, 3, 4, 5, 6) with the grep-friendly banner. Include the "Pattern to copy" line and the HACKATHON.md section pointer.
4. Write per-directory READMEs (`agent/src/README.md`, `src/app/README.md`, `a2a/README.md`) — ~30 lines each.
5. Write `WELCOME.md` (~200 words) and wire it to open in editor on `postinstall`.
6. Write `HACKATHON.md` v1 with the six numbered seams + the hour-by-hour template.

**Done when:** all three memory files exist (with symlinks); `grep -r "CUSTOMIZATION SEAM"` finds all six; HACKATHON.md covers all six seams + the time-budget template.

### Workstream D — Script suite + validators + doctor + smoke

**Depends on:** Workstream A.

1. `pnpm doctor` — preflight env check (Node, pnpm, Python, uv, env vars, network, ports).
2. `pnpm validate-widget <path>` — v0.9 envelope shape validator with teaching error format.
3. `pnpm smoke` — composite gate (validator over fixtures, verify-pins, offline path, canned prompt against running stack).
4. `pnpm verify-pins` — fail if `package.json` / `pnpm-lock.yaml` / `uv.lock` drifted from `FROZEN.md`.
5. `pnpm explain <topic>` — print the right HACKATHON.md section.
6. `pnpm new-widget <name>` — scaffold from `search_flights` template.
7. `pnpm theme:reset` — revert theme.ts to defaults.
8. `pnpm test:widgets` — run renderer against every `*.fixture.json`.
9. `scripts/sync-memory-files.sh` — re-create CLAUDE.md / GEMINI.md symlinks if missing.
10. **Lefthook pre-commit hook** — runs `validate-widget` on changed widget files AND diffs `package.json` against `FROZEN.md` and rejects on `@copilotkit/*` version drift.

**Done when:** every script runs successfully on a clean clone with `GEMINI_API_KEY` set; `pnpm smoke` is green end-to-end; pre-commit hook actually rejects a hand-crafted version-bump test commit.

### Workstream E — Fixtures + stub domain + offline envelopes

**Depends on:** Workstream A.

1. Build `agent/src/widgets/` directory. For every catalog widget, add `<name>.json` (catalog entry) + `<name>.fixture.json` (named test scenario).
2. Build `agent/src/domains/shopping/` as the canonical stub. Fully validated: working fixtures, known-good system prompt, sample data, anchor comments. **One, finished — not two, half-finished.**
3. Build `public/offline-envelopes.json` — pre-baked envelope sequences for `OFFLINE=1` mode covering the default demo's primary flows.
4. Write the system prompt for `shopping` domain to demonstrably produce A2UI envelopes against its data.

**Done when:** every widget has a fixture; `pnpm test:widgets` is green; setting `DOMAIN=shopping` boots cleanly and produces A2UI surfaces; `OFFLINE=1 pnpm dev` renders without any network calls to Gemini.

### Workstream F — Pre-configured tooling + vendor fallback + CI

**Depends on:** Workstream A. Can run in parallel with B–E.

1. `.vscode/settings.json` + `.vscode/extensions.json` — CopilotKit A2UI extension config + recommendations.
2. `.gemini/settings.json` — trust roots + AGENTS.md alias.
3. `.claude/skills/create-a2ui-widget/SKILL.md` — Claude Code skill that walks an AI assistant + hacker through scaffolding a new A2UI widget. Coordinates the **five-surface dance** that is the main source of half-finished widgets:
   1. Catalog entry — `agent/src/widgets/<name>.json`
   2. Fixture — `agent/src/widgets/<name>.fixture.json`
   3. Python tool — `agent/src/a2ui_fixed_schema.py` + registration in `agent/src/main.py` `tools=[...]`
   4. TS schema declaration — `src/app/api/copilotkit/route.ts` `a2ui.schema` array
   5. Prompt hint — active domain's system prompt (teaches the agent *when* to call the tool)

   Defaults to fixed-schema for demo predictability; documents the dynamic-schema fallback for explicit requests. Anchored against `search_flights` as the canonical example. Encodes the AGENTS.md hard rules (no `@copilotkit/*` version bumps, run `validate-widget` after edits, run `smoke` before declaring done). Surfaces the common failure modes: editing only the Python tool, skipping the fixture, forgetting the schema array, forgetting the prompt hint.

   Two sibling skills are likely follow-ups (not part of this workstream — defer until create-a2ui-widget lands): `adapt-a2ui-domain` (Seam #5 + #3 coordination) and `debug-a2ui-envelope` (systematic chain-walk when widgets don't render).
4. `.mcp.json` — suggested MCP server config for live CopilotKit docs search.
5. `vendor/` — mirror `@copilotkit/a2ui-renderer` and `copilotkit` (Python). Document the swap in `FROZEN.md`.
6. `.github/workflows/ci.yml` — runs `pnpm smoke` + verifies the vendored fallback builds and renders + re-runs the model ID probe (so we catch upstream changes).
7. `.github/workflows/frozen-banner.yml` — warns on `FROZEN.md` drift.

**Done when:** CI is green on the fork; vendor build path is verified; all four pre-configured tooling files exist and are picked up by their respective tools.

### Workstream G — README + marketing surface + sponsor attribution

**Depends on:** A, C (needs to reference the seams and the AGENTS.md trio).

1. `README.md` — 5-min start + hackathon framing + link out to MCP Apps (Manufact) and Track 1 (A2A Net) starters so we're not gatekeeping the field + the FROZEN banner.
2. Sponsor attribution: app footer + README Sponsors section + tasteful 1-line credit in chat empty-state. Sponsors named: Google DeepMind, CopilotKit, Manufact, A2A Net.
3. LICENSE (MIT), CONTRIBUTING, attribution (Google A2UI, AG-UI maintainers, agents.md spec).

**Done when:** README walks a cold reader from "what is this" to "I have it running" in one read; sponsor logos in place; competing-starter links present.

### Post-blitz dry runs (manual, not a subagent task)

Once Workstreams A–G converge, do at least one cold-clone dry run with each of Claude Code, Gemini CLI, and Cursor as the AI assistant. Run through seams 1, 2, 3, 5 and time them. Specifically test the AX: do AI assistants find the seams via grep? Do error messages teach? Does AGENTS.md ground them?

---

## Quality gates

Before declaring any workstream done:

1. `pnpm doctor` passes on the contributor's machine.
2. `pnpm smoke` is green (this is itself composite — see Workstream D).
3. For workstreams touching widgets / fixtures / domains: `pnpm test:widgets` is green.
4. For workstreams touching the LLM call site: a manual one-shot tool-calling probe is green.
5. CI is green on the workstream's branch before merge.

`pnpm smoke` is the load-bearing gate. If it's flaky, that's a P0 — the whole pinning + vendoring story rests on it being deterministic.

---

## Success metrics

| Metric | Target |
|---|---|
| Teams that get the starter running on event day | ≥ 90% of Track 2 entrants |
| Teams shipping a customized demo at judging | ≥ 65% of Track 2 entrants |
| Median time from clone to first re-themed demo (dry runs) | well under the build window |
| Teams who attempt a new widget (seam #4) | ≥ 30% |
| Demos that visibly use A2UI v0.9 (inspector visible) | 100% of Track 2 finalists |
| AI-assistant-driven customizations that work without human debugging | ≥ 50% of seam-1/2/3/5 attempts in dry runs |
| Post-event GitHub stars | 100+ in first month |

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Gemini model ID 404s in front of hackers | Workstream A empirically verifies via tool-calling probe; CI re-runs the probe; fallback to most recent stable Flash documented in `FROZEN.md`. |
| A2UI v0.9 SDK breaking release | Pinned versions; vendored `vendor/`; `verify-pins` in CI and inside `pnpm smoke`; FROZEN.md banner. |
| Venue Wi-Fi flakes | `OFFLINE=1` path; `pnpm smoke` exercises it. |
| Teams don't realize they're using A2UI | Envelope inspector is *default chrome* — not a toggle. |
| Track 1 partner agents emit pre-v0.9 envelopes | `pnpm check-a2a <url>` flags before integration. |
| Gemini free-tier rate-limits at expected concurrency | Per-team API keys (prereq email tells hackers to register), mentor fallback key pool, `OFFLINE=1` insurance, documented cliff. |
| Python cold-start on Cloud Run | Pre-warmed, min-instances=1. |
| AI assistants misuse the codebase (hallucinated APIs, version bumps) | AGENTS.md hard rules + validators + pre-commit hook on `@copilotkit/*` version drift block obvious mistakes. Dry runs with AI assistants catch the rest. |
| Composer outage | Document the JSON shape in HACKATHON.md; teams can hand-author. |
| Editor deeplink (`vscode://` etc.) silently does nothing | Clipboard fallback with toast — affordance always does *something*. |
| Lockfile drift mid-build | Pre-commit hook rejects `@copilotkit/*` bumps; `pnpm verify-pins` runs inside `pnpm smoke`. |
| Two stub domains rot into half-finished traps | Ship one, deeply finished (`shopping`). HACKATHON.md §5 walks through adding a second yourself. |

---

## Open questions

These don't block the workstreams — they need confirmation from event-ops, not from engineering:

1. **Submission flow.** Devpost? A2A Net's platform? Notion? Engineering needs the answer in time to wire submission affordances (a README template + a metadata field in `package.json`) into the starter. Until confirmed, leave a `SUBMITTING.md` stub linking out.
2. **Sponsor logo placement.** Proposal: app footer + README Sponsors section + tasteful 1-line credit in chat empty-state. Confirm with sponsors.
3. **Accessibility.** Audit A2UI renderer ARIA defaults; document gaps in `ACCESSIBILITY.md`.
4. **Cross-starter linking.** Need URLs for the Manufact (MCP Apps) and A2A Net starters to link from our README. Confirm with event-ops.

Out of scope, owned by event-ops:
- Mentor staffing + on-the-day shift schedule
- Registration platform + capacity
- Judging rubric + judge panel
- Prize logistics (Mac Minis, Meta Ray Bans)
- AV plan for the global kickoff video
- Pre-event prereq email to attendees (engineering supplies the install/clone instructions and `pnpm doctor` reference)
- Food, name tags, network, power
