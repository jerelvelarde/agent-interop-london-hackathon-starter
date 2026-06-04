# Submitting Your Demo

> **Submission flow is TBD.** The event organizers will confirm whether
> submissions go through Devpost, A2A Net's platform, or a Notion form closer
> to the day. Watch the event channel for the official link. Until then, prep
> the artifacts below so you can submit the moment the flow opens.

## What you'll need

- **Team name** — same as registration.
- **Demo URL** — Vercel deploy preferred. (A "Deploy to Vercel" button will land
  in this README before event day; if not, push the repo to GitHub and run
  `npx vercel --prod`.)
- **Public repo URL** — your fork of this starter, with your customizations.
- **30-second demo video** — screen recording of your canned prompt sequence.
  Loom, OBS, or QuickTime all fine.
- **One-paragraph pitch** — what your demo does, what domain you re-skinned to,
  what makes it memorable.
- **Envelope sample** — paste 1–2 A2UI envelopes the agent streamed during
  your demo (the `createSurface` / `updateComponents` ops) into the
  submission. Judges want to see real A2UI is firing. Grab them from the
  browser DevTools Network tab on the request to `/fixed` or `/dynamic`, or
  from the `agent` terminal pane.

## Sponsor credit

Name **Google DeepMind, CopilotKit, A2A Net** in your submission copy.
Judges notice.

## Track 1 entries (A2A interop)

If you wired a partner agent via Seam #6, also include:
- Partner team name + their agent URL.
- Output of `pnpm check-a2a <partner-url>` confirming v0.9 envelope compliance.

## Backup plan

If your live demo flakes during judging, `OFFLINE=1` is your insurance for the
`/fixed` view: it paints a real A2UI surface from a built-in canned sample
(`agent/src/offline_sample.py`) — no Gemini call, no network. It shows the
sample dashboard, not your uploaded PDF, and `/dynamic` still needs a key, so
keep a tested document + tight script on hand too. Don't sweat it.

> This doc is a stub. The canonical submission link and Vercel deploy button
> land here once the submission platform is announced.
