# CopilotKit A2UI Hackathon Starter

> **The Generative UI Hackathon** — Track 2 starter. Frozen on **2026-05-28**. Run `pnpm verify-pins` to confirm.

## What this is

This is the canonical **Track 2 (A2UI Generative UI)** starter for the Generative UI Hackathon — a globally-coordinated, multi-city, 5-hour build slot sponsored by Google DeepMind, CopilotKit, and Manufact. You get a working Next.js + LangGraph + CopilotKit + **A2UI v0.9** app where the agent emits declarative UI envelopes and the renderer turns them into React. The boring 80% (catalog wiring, envelope inspector, offline fallback, agent loop) is already built so your team can spend the build window on the parts judges remember: your domain, your widgets, your branding.

The default LLM is **Gemini 2.5 Flash** via Google's OpenAI-compatible endpoint (free tier, sponsor-aligned, agentic-tuned). The provider is hot-swappable in a 3-line `.env.example` change.

## 5-minute start

```bash
git clone <your-fork-url>
cd london-a2ui-hackathon
pnpm install              # also installs the Python agent via uv sync

cp .env.example .env
# Edit .env — set GEMINI_API_KEY
# Free Gemini key (no credit card): https://aistudio.google.com/apikey

pnpm doctor               # preflight: Node, pnpm, Python, uv, env vars, ports
pnpm dev                  # boots Next.js + the Python agent concurrently
```

Browser opens at `http://localhost:3000`. Send a chat like *"Show me a flights dashboard"* and watch the agent emit A2UI envelopes that render as live UI. The **envelope inspector** (right rail, default chrome) shows the raw protocol — that's how you know A2UI is actually working.

No `GEMINI_API_KEY` handy? Set `OFFLINE=1` and the agent serves pre-baked envelopes from `public/offline-envelopes.json`. The demo still works; the inspector still shows real A2UI surfaces.

## Building your demo

- Read **[WELCOME.md](WELCOME.md)** for the 200-word orientation.
- Read **[HACKATHON.md](HACKATHON.md)** for your full playbook — six numbered customization seams plus an hour-by-hour template for the 5-hour window.
- Your AI coding assistant reads **[AGENTS.md](AGENTS.md)** (also linked as `CLAUDE.md` and `GEMINI.md`) automatically. It's the cross-tool agents.md standard — Cursor, Windsurf, Codex CLI, Claude Code, Gemini CLI all pick it up natively.
- Use the **envelope inspector** chrome to verify A2UI is actually firing — it's the right rail by default and is non-removable on purpose.
- Need a *second visual identity* (paper, terminal, kiosk) with net-new component primitives? See **[other-examples/](other-examples/)** for the custom-catalog pattern. For just adding widgets to the dashboard, stay with the `create-a2ui-widget` skill.

## Customization seams (the 6 things you'll touch)

Search the repo for `CUSTOMIZATION SEAM` to jump to each one. Full recipes live in [HACKATHON.md](HACKATHON.md).

- **§1 — Re-theme** → `src/lib/a2ui-theme.css` + `src/hooks/use-theme.tsx` (CSS variables, no rebuild)
- **§2 — Re-brand the shell** → `src/components/BrandFrame.tsx` (header, logo, accents)
- **§3 — Swap demo data** → `agent/src/query.py` (or `agent/src/domains/<name>/data/`)
- **§4 — Add an A2UI widget (fixed schema)** → copy `agent/src/a2ui_fixed_schema.py:search_flights` and run the 5-surface dance
- **§5 — Switch domain** → set `DOMAIN=<name>` in `.env`; canonical stub at `agent/src/domains/shopping`
- **§6 — BYO A2A agent (Track 1 interop)** → run `pnpm check-a2a <url>` first, then set `A2A_AGENT_URL`

## Other starters (we don't gatekeep)

A2UI isn't the only protocol pillar in this hackathon. If your team's idea fits one of the other tracks better, build there instead — we'd rather you ship something great than force-fit your demo into our starter.

- **MCP Apps track** — [Manufact's starter](https://github.com/mcp-use)
- **Track 1 multi-team interop (A2A)** — [A2A Net's template](https://a2a.net)
- **Other CopilotKit examples** — [CopilotKit/examples/integrations](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations) (chat-first, LangGraph-only, CrewAI, Mastra, etc.)
- **A2UI Composer** (visual envelope authoring) — [a2ui-composer.ag-ui.com](https://a2ui-composer.ag-ui.com/)

## Sponsors

This starter is built for the **Generative UI Hackathon**, sponsored by:

- **Google DeepMind** — venue + Gemini (the default LLM provider here)
- **CopilotKit** — A2UI + AG-UI protocol + this starter
- **Manufact** (mcp-use) — MCP Apps track
- **A2A Net** — Track 1 multi-team interop platform

If you ship something using this starter, please credit the sponsors in your submission. Judges notice.

## How it's built

```
Browser (Next.js 16 / React 19 / Tailwind 4)
  └── <CopilotKit> → <CopilotChat> + <EnvelopeInspector> (default chrome)
        │
        │  AG-UI (SSE)
        ▼
Next.js /api/copilotkit
  └── CopilotRuntime + a2ui: { schema } + optional A2A middleware (dormant
                                            unless A2A_AGENT_URL is set)
        │
        │  AG-UI
        ▼
LangGraph Python agent (uv, Gemini 2.5 Flash via OpenAI-compat)
  └── create_agent(model=Gemini, tools=[query_data, *todo_tools,
                                        generate_a2ui, search_flights])
```

The agent emits A2UI v0.9 envelopes (`createSurface`, `updateComponents`, `updateDataModel`); the renderer turns them into React. See [FROZEN.md](FROZEN.md) for the version pinning rationale and the per-directory READMEs (`src/app/README.md`, `agent/README.md`, `agent/src/README.md`) for the local view.

## Submitting your demo

See [SUBMITTING.md](SUBMITTING.md). (Submission flow confirmed by event-ops.)

## Troubleshooting

- **Windows clone: missing `CLAUDE.md` / `GEMINI.md`.** These are symlinks to `AGENTS.md`. Some Windows filesystems drop symlinks on checkout. Run `./scripts/sync-memory-files.sh` (Git Bash / WSL) to re-create them, or just open `AGENTS.md` directly.
- **`lefthook: Can't find lefthook in PATH` on commit.** Benign — the commit still succeeds. `lefthook` ships as a dev dep; run `pnpm install` once after clone.

## License

MIT. See [LICENSE](LICENSE).

## Contributing

This is a hackathon starter — the primary audience is hackers during the 5-hour build window, not contributors. But if you ship a genuine improvement post-event, PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Attribution

- **A2UI protocol** — Google
- **AG-UI protocol** — CopilotKit (makers of the AG-UI Protocol)
- **agents.md spec** — Linux Foundation cross-tool standard (backed by OpenAI, Google, Sourcegraph, Cursor, Factory)
- **Base starter** — [CopilotKit/examples/integrations/langgraph-python](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations/langgraph-python)
