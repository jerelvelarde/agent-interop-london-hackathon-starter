# London A2A & A2UI Hackathon — Starter Kit

Welcome to the **London A2A & A2UI Hackathon** — a full-day event at **Google London CSG** on **Saturday, June 13, 2026**, brought to you by Google Cloud, [A2A Net](https://a2anet.com/), [CopilotKit](https://copilotkit.ai), [Linkup](https://www.linkup.so/), and [Redis](https://redis.io/iris/). This starter kit is CopilotKit's head start for the **A2UI (Generative UI) track** — a Next.js + FastAPI app where the agent emits declarative **A2UI** envelopes and the frontend renders them as live React components. Wired up with CopilotKit, AG-UI, Google A2UI, Gemini, and an A2A bolt-on for the **Agent Interoperability track**.

The headline demo is **pdf-analyst**: drop a PDF in chat and the agent builds the answer UI for you — a fixed-schema dashboard for the at-a-glance view and dynamic A2UI surfaces (Recharts) for any follow-up question. The boring 80% (a 21-component A2UI catalog, the in-canvas surface renderer, the agent loop, the FastAPI transport) is already built so your team can spend the build day on the parts judges remember: your domain, your widgets, your branding.

https://github.com/user-attachments/assets/c053d2e8-1d40-43cb-8c5a-8e5c121b851f

## About this starter

This is CopilotKit's starter for the **A2UI (Generative UI) track** of the London A2A & A2UI Hackathon — a full-day, in-person build at Google London CSG. The default LLM is **Gemini 3.5 Flash** via the native Google Gen AI SDK (`langchain-google-genai`). The provider is deliberately pinned for the build window; if you must swap (OpenAI, Anthropic, or an OpenAI-compatible endpoint), the supported paths are documented in `.env.example` and [FROZEN.md](FROZEN.md) § LLM provider — it's a small code edit in the three agent files, not just an env change.

This is an example application that we built to help you get started quickly. Everything you see can be customized, replaced, augmented, or built upon. Six grep-anchored **customization seams** mark the spots designed to be edited — search the repo for `CUSTOMIZATION SEAM` and the full recipes live in [HACKATHON.md](HACKATHON.md).

> Frozen on **2026-05-28**. Run `pnpm verify-pins` to confirm. Versions are pinned for the build window — see [FROZEN.md](FROZEN.md) for the why.

## Generative UI

> Generative UI describes any AI-driven interface where the agent **chooses, composes, or writes UI at runtime**. The field spans a spectrum from controlled component menus (safe, predictable, but limited) to fully open-ended LLM-generated DOM (flexible, but unreliable). This starter sits in the middle — a declarative, schema-driven envelope (**A2UI v0.9**) that the agent emits and a typed renderer turns into real React.

The agent sends three operations: `createSurface`, `updateComponents`, `updateDataModel`. A renderer from `@copilotkit/a2ui-renderer` materializes them into live UI. The rendered surface fills the **canvas** beside the chat, and a `MirrorRenderer` pill echoes it inline in the conversation — so judges can see real A2UI is actually firing.

## Stack

- **[A2A](https://a2a-protocol.org/)** — Agent2Agent protocol for cross-team interop, and the basis of the hackathon's **Track 1 (Interoperability Challenge)**. Linux Foundation project, contributed by Google. v1.0.1 GA. Wired here as a bolt-on for connecting to another team's agent (set `A2A_AGENT_URL` to activate — see [A2A Net](https://a2anet.com/)). [Repo →](https://github.com/a2aproject/A2A)
- **[A2UI](https://a2ui.org/)** — Google's open declarative UI envelope protocol. Lets agents "speak UI" by sending JSON that renders natively across frameworks. This starter is built around A2UI v0.9. [Spec →](https://a2ui.org/specification/v0.9-a2ui/) · [Repo →](https://github.com/google/A2UI)
- **[AG-UI](https://docs.ag-ui.com/)** — Open, lightweight, event-based protocol that standardizes how agents connect to user-facing apps. Originated from CopilotKit; now maintained by the [AG-UI Protocol working group](https://github.com/ag-ui-protocol/ag-ui). AG-UI carries A2UI envelopes between the LangGraph agent and the Next.js runtime here.
- **[CopilotKit](https://docs.copilotkit.ai/)** — The runtime that wires AG-UI through your Next.js app and ships the A2UI renderer. The chat UI, the in-canvas surface renderer, and provider plumbing all come from here. AI-assistant skills + MCP server at [`docs.copilotkit.ai/built-in-agent/build-with-agents`](https://docs.copilotkit.ai/built-in-agent/build-with-agents).
- **[LangGraph (Python)](https://langchain-ai.github.io/langgraph/)** — The agent loop that emits A2UI envelopes via tool-calls. Two graphs ship by default — a **fixed-schema** dashboard agent and a **dynamic-schema** Q&A agent — served over a FastAPI app (`agent/main.py`, `uvicorn main:app` on `:8123`) that exposes `/fixed`, `/dynamic`, and `/legal` (the `/legal` example's UI is currently a WIP stub; the endpoint itself works). Boots via `uv`.
- **[Gemini 3.5 Flash](https://aistudio.google.com/)** — Default LLM via the native Google Gen AI SDK (`langchain-google-genai`). Free tier, no credit card. The native SDK is required to handle thought-signature replay across tool turns — see [FROZEN.md](FROZEN.md) for the Gemini 3.x trap history.
- **[Linkup](https://www.linkup.so/)** — Production-grade **web search API for AI agents**, and a hackathon sponsor. One API call returns sourced, cited answers grounded in live web data — useful when your agent needs facts beyond the uploaded document. Not wired into the default demo, but quick to add to your own agent: grab a free key, then use whichever fits — the LangChain tool (`pip install langchain-linkup` → `LinkupSearchTool`), the hosted **MCP server** (`https://mcp.linkup.so/mcp?apiKey=...`), or the **agent skills** (`npx skills add LinkupPlatform/skills`). Start here: [Linkup for agents →](https://docs.linkup.so/pages/documentation/get-started/for-agents) · [Docs →](https://docs.linkup.so/)
- **[Redis](https://redis.io/iris/)** — Agent **context & memory** layer, and a hackathon partner. Many stacks already run Redis for caching; here, treat it as your **runtime context layer** — the shared memory that connects your agents, so a customer's history, a mid-session decision, or a resolved ticket can live in Redis and be available to every agent that needs it. This matters most for **Track 1 (multi-agent interop)**: a multi-agent system is only as good as its ability to share what it knows, and the strongest submissions show agents that actually learn, remember, and collaborate — not three bots running in parallel. Lean on **Redis Agent Memory** (short- and long-term context across tasks and agents) and **Redis Context Retriever** (makes external data navigable by agents) from the [Redis Iris](https://redis.io/iris/) context platform. Not wired into the default demo. [All agent capabilities → redis.io/iris](https://redis.io/iris/)

## Run it locally

Prereqs: Node 20+, pnpm 10+, Python 3.12+, [uv](https://docs.astral.sh/uv/).

```bash
git clone <your-fork-url>
cd generative-ui-london-hackathon-starter
pnpm install              # also installs the Python agent via uv sync

cp .env.example .env
# Edit .env — set GEMINI_API_KEY
# Free Gemini key (no credit card): https://aistudio.google.com/apikey

pnpm run doctor           # preflight: Node, pnpm, Python, uv, env vars, ports
pnpm dev                  # boots Next.js + the FastAPI agent (uvicorn main:app, :8123) concurrently
```

Browser opens at `http://localhost:3000` (or the next free port — Next.js bumps to 3001+ if 3000 is taken, so check the terminal output). The default demo is **pdf-analyst** — chat-with-your-PDF, where the agent builds the answer UI from a 21-component A2UI catalog. The landing page (`/`) routes to two modes; both read the **same** catalog:

- **`/fixed` — fixed-schema dashboard.** You author the dashboard layout once (one JSON file); the agent extracts KPIs, a trend, a share split, and table rows from the PDF and fills them in. Fast, predictable, brand-locked.
- **`/dynamic` — dynamic A2UI surfaces.** Ask any follow-up question and a secondary LLM invents the component tree for the answer — Recharts bar/line/donut charts, tables, callouts — on demand.
- **`/catalog`** — a gallery of every primitive the agent is allowed to use.

Try it:

1. Open `/fixed`, attach a PDF in chat (a quarterly report, a paper, an invoice). → the agent paints a KPI dashboard with a trend chart and a data table, all streamed down as A2UI.
2. *"Break the revenue down by region as a bar chart."* → a dynamic surface invents the chart from the document.
3. *"Summarise the risks as a bulleted callout."* → a dynamic surface composes a callout + bullet list.

Every surface is generated on demand: the agent picks the components, emits an A2UI envelope, the renderer turns it into React. The surface paints into the canvas beside the chat, with a `MirrorRenderer` pill echoing it inline — that's how you know A2UI is actually working.

> **No `GEMINI_API_KEY` handy?** A key is required for the *live* chat demo — the agent calls Gemini to generate every A2UI surface on `/fixed` and `/dynamic`, so without it the chat won't respond. Two no-key options: (1) browse the full catalog at **`/catalog`**, which renders real A2UI surfaces statically in the browser, no agent call; (2) set **`OFFLINE=1`** in `.env` — the `/fixed` endpoint then serves a built-in sample dashboard (a canned Tesla Q3 FY24 surface) with no Gemini call and no key, so you can see a real painted surface end-to-end. Only `/fixed` works offline; `/dynamic` and `/legal` still require a key. Get a free-tier key (no credit card): https://aistudio.google.com/apikey.

> **Demoing live?** Have a tested PDF ready and run the walkthrough above. (The previous on-stage script belonged to the archived PortKit demo — see [`other-examples/portkit/DEMO.md`](other-examples/portkit/DEMO.md).)

## Customization seams (the 6 things you'll touch)

Search the repo for `CUSTOMIZATION SEAM` to jump to each one. Full recipes live in [HACKATHON.md](HACKATHON.md).

- **§1 — Re-theme** → `src/a2ui/theme.css` (A2UI surface tokens) + `src/app/(pdf)/pdf-analyst.css` (shell brand) + `src/hooks/use-theme.tsx` (CSS variables, no rebuild)
- **§2 — Re-brand the shell** → `src/components/pdf-analyst/Brand.tsx` (header, nav, page hero)
- **§3 — Swap demo data** → the PDF is the data; tune extraction in `agent/src/pdf_tools.py` (or feed a different document)
- **§4 — Add an A2UI component** → add a definition + renderer in `src/a2ui/catalog/{definitions.ts,renderers.tsx}` and mirror its prompt summary in `agent/src/catalog.py`
- **§5 — Swap the agent flow** → edit `agent/src/fixed_agent.py` (dashboard) or `agent/src/dynamic_agent.py` (Q&A); both served from `agent/main.py`
- **§6 — BYO A2A agent (Track 1 interop)** → run `pnpm check-a2a <url>` first, then set `A2A_AGENT_URL`

Need the original project-dashboard demo (flights / sprints / todos via a LangGraph-cli agent), a second visual identity (legal paper), or net-new component primitives? See **[other-examples/](other-examples/)** — the archived **PortKit** demo lives at `other-examples/portkit/` and the legal-paper catalog at `other-examples/legal-contract-review/`.

## Vibe coding

This starter is built to be vibe-code-friendly. Your AI assistant (Claude Code, Gemini CLI, Cursor, Windsurf, Codex) reads **[AGENTS.md](AGENTS.md)** automatically — it's the cross-tool [agents.md](https://agents.md/) standard backed by OpenAI, Google, Sourcegraph, Cursor, and Factory. `CLAUDE.md` and `GEMINI.md` are symlinks to the same file.

The starter also ships:

- **[`.mcp.json`](.mcp.json)** pointing at the canonical CopilotKit MCP server (`https://mcp.copilotkit.ai/sse`) — gives any MCP-capable assistant grounded answers about CopilotKit + A2UI APIs instead of hallucinating.
- A **`create-a2ui-widget` skill** at `.claude/skills/` that drives an AI assistant through adding an A2UI component to the catalog.
- **Validators that teach** — `pnpm validate-widget` and `pnpm test:widgets` point you at a real JSON template on failure.

> **Adding a component.** The pdf-analyst catalog is a single design system — a component definition + React renderer in `src/a2ui/catalog/{definitions.ts,renderers.tsx}`, mirrored as a prompt summary in `agent/src/catalog.py` so the agent knows it exists. (The original fixed-schema "widget dance" — catalog JSON + fixture + Python tool + prompt hint — lives with the archived PortKit demo under [`other-examples/portkit/`](other-examples/portkit/).)

## The two tracks

The hackathon runs two tracks. This starter is built for **Track 2**, and supports **Track 1** via the A2A bolt-on:

- **Track 1 — A2A Interoperability Challenge.** Build a system of 3+ agents that coordinate to solve a problem, and integrate with an agent built by *another team*. Runs on the [A2A Net platform](https://a2anet.com/); connect this starter's agent to partner agents via `A2A_AGENT_URL` (Seam §6).
- **Track 2 — A2UI (Generative UI) Challenge.** Build a dynamic app that features both an autonomous agent and a Generative UI. This starter is your head start — a pre-built agent + 21-component A2UI catalog — so you can focus on the UI.

Other building blocks (use what helps, skip what doesn't):

- **A2UI Composer** (visual envelope authoring) — [a2ui-composer.ag-ui.com](https://a2ui-composer.ag-ui.com/)
- **Other CopilotKit examples** — [CopilotKit/examples/integrations](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations) (chat-first, LangGraph-only, CrewAI, Mastra, etc.)

## Documentation

- **[WELCOME.md](WELCOME.md)** — 200-word orientation
- **[HACKATHON.md](HACKATHON.md)** — your full build-day playbook with hour-by-hour template
- **[other-examples/portkit/DEMO.md](other-examples/portkit/DEMO.md)** — the archived PortKit on-stage script (3 min, 5 turns + recovery)
- **[AGENTS.md](AGENTS.md)** — agent guide for your AI coding assistant
- **[FROZEN.md](FROZEN.md)** — version-pinning rationale and the Gemini 3.x thought-signature trap
- **[SUBMITTING.md](SUBMITTING.md)** — what you'll need at submission time
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — what we'll merge post-event

## Troubleshooting

- **UI loads but the chat doesn't respond.** The Python agent (FastAPI / `uvicorn main:app` on `:8123`) probably failed to start — most commonly a missing or invalid `GEMINI_API_KEY`. Check the `agent` pane in your terminal for a stack trace, set the key (see `.env.example` / `agent/.env.example`), and restart `pnpm dev`. Run `pnpm run doctor` to confirm the key is found and `:8123` is free.
- **Windows clone: missing `CLAUDE.md` / `GEMINI.md`.** These are symlinks to `AGENTS.md`. Some Windows filesystems drop symlinks on checkout. Run `./scripts/sync-memory-files.sh` (Git Bash / WSL) to re-create them, or just open `AGENTS.md` directly.
- **`lefthook: Can't find lefthook in PATH` on commit.** Benign — the commit still succeeds. `lefthook` ships as a dev dep; run `pnpm install` once after clone.

## License

MIT. See [LICENSE](LICENSE).

## Attribution

- **A2UI protocol** — [Google](https://github.com/google/A2UI)
- **AG-UI protocol** — [AG-UI Protocol working group](https://github.com/ag-ui-protocol/ag-ui) (originated at CopilotKit)
- **A2A protocol** — [Linux Foundation + Google](https://github.com/a2aproject/A2A)
- **agents.md spec** — Linux Foundation cross-tool standard (backed by OpenAI, Google, Sourcegraph, Cursor, Factory)
- **Linkup** — web search API for AI agents ([linkup.so](https://www.linkup.so/)), hackathon sponsor
- **Redis** — agent context & memory platform (Redis Iris, [redis.io/iris](https://redis.io/iris/)), hackathon partner
- **Base starter** — [CopilotKit/examples/integrations/langgraph-python](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations/langgraph-python)

