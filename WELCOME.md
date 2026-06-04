# Welcome to the A2UI Hackathon Starter

You're looking at the official **Track 2 (A2UI Generative UI)** starter for the
Generative UI Hackathon. Today, your team has roughly 5 hours to fork this
repo, re-skin it for a domain your judges will remember, and demo agent-driven
UI live on stage. The starter does the boring 80% so you can focus on the fun
20%.

## First 5 minutes

```bash
pnpm install   # also installs the Python agent via postinstall
cp .env.example .env
# Edit .env — set GEMINI_API_KEY (free key: https://aistudio.google.com/apikey)
pnpm run doctor # confirms your machine is ready
pnpm dev       # boots the web app + the Python agent
```

Browser opens at `http://localhost:3000` (or the next free port — check the
terminal). The default demo is **pdf-analyst**: open `/fixed`, attach a PDF in
chat (📎), and ask *"Render the dashboard."* — watch the agent emit A2UI
envelopes that render as a live dashboard in the canvas. A `MirrorRenderer` pill
echoes the surface inline so you can see the raw protocol firing.

## Where to go next

- **`HACKATHON.md`** — your playbook for the next 5 hours. Six numbered
  customization seams + an hour-by-hour template.
- **`AGENTS.md`** (also `CLAUDE.md`, `GEMINI.md`) — the guide your AI coding
  assistant should read. Skim it; they'll do the typing.
- **`README.md`** — 5-minute primer + sponsor links + competing-starter
  pointers if A2UI isn't your track.

## When something breaks

Run `pnpm run doctor`. It catches ~80% of "doesn't boot on my machine" issues
and prints an actionable hint. If the chat doesn't respond, the Python agent
(FastAPI on `:8123`) probably failed to start — check the `agent` pane in your
terminal, most commonly a missing `GEMINI_API_KEY`. If Gemini rate-limits you,
switch to your own free key (https://aistudio.google.com/apikey) and keep a
tested PDF + tight script on hand — `OFFLINE=1` only paints the canned
`/fixed` sample dashboard, not your uploaded document.

Now `cat HACKATHON.md` (or just open it) and start hacking. Good luck.
