# Generative UI Hackathon — London Starter Kit

Welcome to the **London slot of the Generative UI Hackathon: Agentic Interfaces**! This starter kit gives you a working agent-driven UI — a Next.js + LangGraph app where the agent emits declarative **A2UI** envelopes and the frontend renders them as live React components. Wired up with CopilotKit, AG-UI, Google A2UI, Gemini, and an optional A2A bolt-on for Track 1 interop.

The boring 80% (catalog wiring, envelope inspector, offline fallback, agent loop) is already built so your team can spend the 5-hour build window on the parts judges remember: your domain, your widgets, your branding.

> Frozen on **2026-05-28**. Run `pnpm verify-pins` to confirm. Versions are pinned for the build window — see [FROZEN.md](FROZEN.md) for the why.

## About this starter

This is the canonical **Track 2 (A2UI Generative UI)** starter for the Generative UI Hackathon — a globally-coordinated, multi-city, 5-hour build slot. The default LLM is **Gemini 3.5 Flash** via the native Google Gen AI SDK (`langchain-google-genai`), with hot-swappable providers in a 3-line `.env.example` change (OpenAI GPT-5.5, Anthropic Claude Opus 4.7, or any LiteLLM-compatible endpoint).

This is an example application that we built to help you get started quickly. Everything you see can be customized, replaced, augmented, or built upon. Six grep-anchored **customization seams** mark the spots designed to be edited — search the repo for `CUSTOMIZATION SEAM` and the full recipes live in [HACKATHON.md](HACKATHON.md).

## Generative UI

> Generative UI describes any AI-driven interface where the agent **chooses, composes, or writes UI at runtime**. The field spans a spectrum from controlled component menus (safe, predictable, but limited) to fully open-ended LLM-generated DOM (flexible, but unreliable). This starter sits in the middle — a declarative, schema-driven envelope (**A2UI v0.9**) that the agent emits and a typed renderer turns into real React.

The agent sends three operations: `createSurface`, `updateComponents`, `updateDataModel`. A renderer from `@copilotkit/a2ui-renderer` materializes them into live UI. The **envelope inspector** in the right rail is non-removable on purpose — judges need to see real A2UI is actually firing.

## Stack

- **[A2UI](https://a2ui.org/)** — Google's open declarative UI envelope protocol. Lets agents "speak UI" by sending JSON that renders natively across frameworks. This starter is built around A2UI v0.9. [Spec →](https://a2ui.org/specification/v0.9-a2ui/) · [Repo →](https://github.com/google/A2UI)
- **[AG-UI](https://docs.ag-ui.com/)** — Open, lightweight, event-based protocol that standardizes how agents connect to user-facing apps. Originated from CopilotKit; now maintained by the [AG-UI Protocol working group](https://github.com/ag-ui-protocol/ag-ui). AG-UI carries A2UI envelopes between the LangGraph agent and the Next.js runtime here.
- **[A2A](https://a2a-protocol.org/)** — Agent2Agent protocol for cross-team interop. Linux Foundation project, contributed by Google. v1.0.1 GA. Wired here as a dormant bolt-on (set `A2A_AGENT_URL` to activate). [Repo →](https://github.com/a2aproject/A2A)
- **[CopilotKit](https://docs.copilotkit.ai/)** — The runtime that wires AG-UI through your Next.js app and ships the A2UI renderer. The chat UI, envelope inspector, and provider plumbing all come from here. AI-assistant skills + MCP server at [`docs.copilotkit.ai/built-in-agent/build-with-agents`](https://docs.copilotkit.ai/built-in-agent/build-with-agents).
- **[LangGraph (Python)](https://langchain-ai.github.io/langgraph/)** — The agent loop that emits A2UI envelopes via tool-calls. Boots via `uv`. Configured for both a single-graph layout (dashboard) and a sub-repo multi-graph layout (legal-contract-review example).
- **[Gemini 3.5 Flash](https://aistudio.google.com/)** — Default LLM via the native Google Gen AI SDK (`langchain-google-genai`). Free tier, no credit card. The native SDK is required to handle thought-signature replay across tool turns — see [FROZEN.md](FROZEN.md) for the Gemini 3.x trap history.

## Run it locally

Prereqs: Node 20+, pnpm 10+, Python 3.12+, [uv](https://docs.astral.sh/uv/).

```bash
git clone <your-fork-url>
cd agent-interop-london-hackathon-starter
pnpm install              # also installs the Python agent via uv sync

cp .env.example .env
# Edit .env — set GEMINI_API_KEY
# Free Gemini key (no credit card): https://aistudio.google.com/apikey

pnpm doctor               # preflight: Node, pnpm, Python, uv, env vars, ports
pnpm dev                  # boots Next.js + the Python agent concurrently
```

Browser opens at `http://localhost:3000`. Send a chat like *"Show me a flights dashboard"* and watch the agent emit A2UI envelopes that render as live UI. The envelope inspector (right rail, default chrome) shows the raw protocol — that's how you know A2UI is actually working.

> **No `GEMINI_API_KEY` handy?** Set `OFFLINE=1` and the agent serves pre-baked envelopes from `public/offline-envelopes.json`. The demo still works; the inspector still shows real A2UI surfaces. Useful for flaky venue Wi-Fi.

## Customization seams (the 6 things you'll touch)

Search the repo for `CUSTOMIZATION SEAM` to jump to each one. Full recipes live in [HACKATHON.md](HACKATHON.md).

- **§1 — Re-theme** → `src/lib/a2ui-theme.css` + `src/hooks/use-theme.tsx` (CSS variables, no rebuild)
- **§2 — Re-brand the shell** → `src/components/BrandFrame.tsx` (header, logo, accents)
- **§3 — Swap demo data** → `agent/src/query.py` (or `agent/src/domains/<name>/data/`)
- **§4 — Add an A2UI widget (fixed schema)** → copy `agent/src/a2ui_fixed_schema.py:search_flights` and run the 5-surface dance
- **§5 — Switch domain** → set `DOMAIN=<name>` in `.env`; canonical stub at `agent/src/domains/shopping`
- **§6 — BYO A2A agent (Track 1 interop)** → run `pnpm check-a2a <url>` first, then set `A2A_AGENT_URL`

Need a *second visual identity* (paper, terminal, kiosk) with net-new component primitives? See **[other-examples/](other-examples/)** for the custom-catalog pattern. For just adding widgets to the dashboard, stay with seam §4.

## Vibe coding

This starter is built to be vibe-code-friendly. Your AI assistant (Claude Code, Gemini CLI, Cursor, Windsurf, Codex) reads **[AGENTS.md](AGENTS.md)** automatically — it's the cross-tool [agents.md](https://agents.md/) standard backed by OpenAI, Google, Sourcegraph, Cursor, and Factory. `CLAUDE.md` and `GEMINI.md` are symlinks to the same file.

The starter also ships:

- **[`.mcp.json`](.mcp.json)** pointing at the canonical CopilotKit MCP server (`https://mcp.copilotkit.ai/sse`) — gives any MCP-capable assistant grounded answers about CopilotKit + A2UI APIs instead of hallucinating.
- A **`create-a2ui-widget` skill** at `.claude/skills/` that drives an AI assistant through the [5-surface widget dance](HACKATHON.md) (catalog entry, fixture, Python tool, TS schema, prompt hint).
- **Validators that teach** — `pnpm validate-widget` and `pnpm test:widgets` point you at a real JSON template on failure (not at a Python file you can't mirror).

> **The 5-surface widget dance.** Adding a fixed-schema widget touches five files. Each is grep-anchored from the canonical example: `agent/src/a2ui_fixed_schema.py:search_flights`. Run `pnpm new-widget <name>` to scaffold from that template.

## Other tracks (we don't gatekeep)

A2UI isn't the only protocol pillar in this hackathon. If your team's idea fits one of the other tracks better, build there instead — we'd rather you ship something great than force-fit your demo into our starter.

- **Track 1 multi-team interop (A2A)** — [A2A Net's template](https://a2a.net)
- **Other CopilotKit examples** — [CopilotKit/examples/integrations](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations) (chat-first, LangGraph-only, CrewAI, Mastra, etc.)
- **A2UI Composer** (visual envelope authoring) — [a2ui-composer.ag-ui.com](https://a2ui-composer.ag-ui.com/)

## Documentation

- **[WELCOME.md](WELCOME.md)** — 200-word orientation
- **[HACKATHON.md](HACKATHON.md)** — your full 5-hour playbook with hour-by-hour template
- **[AGENTS.md](AGENTS.md)** — agent guide for your AI coding assistant
- **[FROZEN.md](FROZEN.md)** — version-pinning rationale and the Gemini 3.x thought-signature trap
- **[SUBMITTING.md](SUBMITTING.md)** — what you'll need at submission time
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — what we'll merge post-event

## Troubleshooting

- **Windows clone: missing `CLAUDE.md` / `GEMINI.md`.** These are symlinks to `AGENTS.md`. Some Windows filesystems drop symlinks on checkout. Run `./scripts/sync-memory-files.sh` (Git Bash / WSL) to re-create them, or just open `AGENTS.md` directly.
- **`lefthook: Can't find lefthook in PATH` on commit.** Benign — the commit still succeeds. `lefthook` ships as a dev dep; run `pnpm install` once after clone.

## License

MIT. See [LICENSE](LICENSE).

## Attribution

- **A2UI protocol** — [Google](https://github.com/google/A2UI)
- **AG-UI protocol** — [AG-UI Protocol working group](https://github.com/ag-ui-protocol/ag-ui) (originated at CopilotKit)
- **A2A protocol** — [Linux Foundation + Google](https://github.com/a2aproject/A2A)
- **agents.md spec** — Linux Foundation cross-tool standard (backed by OpenAI, Google, Sourcegraph, Cursor, Factory)
- **Base starter** — [CopilotKit/examples/integrations/langgraph-python](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations/langgraph-python)

Built for the **Generative UI Hackathon: Agentic Interfaces** — London slot.
