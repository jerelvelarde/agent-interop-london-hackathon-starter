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
- **Envelope sample** — paste 1–2 A2UI envelopes from your envelope inspector
  into the submission. Judges want to see real A2UI is firing. Right rail of
  the app → click the copy-to-clipboard icon next to any `createSurface`.

## Sponsor credit

Name **Google DeepMind, CopilotKit, A2A Net** in your submission copy.
Judges notice.

## Track 1 entries (A2A interop)

If you wired a partner agent via Seam #6, also include:
- Partner team name + their agent URL.
- Output of `pnpm check-a2a <partner-url>` confirming v0.9 envelope compliance.

## Backup plan

If your live demo flakes during judging, the `OFFLINE=1` path is your insurance.
The envelope inspector still shows real A2UI surfaces from
`public/offline-envelopes.json` — same protocol, no network. Don't sweat it.

> This doc is a stub. The canonical submission link and Vercel deploy button
> land here once the submission platform is announced.
