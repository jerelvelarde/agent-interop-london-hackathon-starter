/**
 * A2UI PDF Analyst — static overview page.
 *
 * URL: /other-examples/a2ui-pdf-analyst
 *
 * This is the gallery card's destination. It is a STATIC server component —
 * NO CopilotKit provider, no agent, no chat. The example itself is a
 * SELF-CONTAINED MINI-APP that runs as its own app (its own `pnpm dev` →
 * web :3000 + agent :8123) and is NOT mounted into this host Next app.
 * This page just explains what the example is and how to run it standalone.
 *
 * Styling mirrors the plain catalog look of `src/app/other-examples/page.tsx`
 * so the two pages feel like one gallery.
 */

import Link from "next/link";

const RUN_STEPS: { cmd: string; note: string }[] = [
  {
    cmd: "cd other-examples/a2ui-pdf-analyst",
    note: "the self-contained mini-app lives here",
  },
  {
    cmd: "cp agent/.env.example agent/.env",
    note: "then set GEMINI_API_KEY in agent/.env",
  },
  {
    cmd: "pnpm install",
    note: "installs Next.js + runs the Python agent's deps",
  },
  {
    cmd: "pnpm dev",
    note: "boots web on :3000 and the agent on :8123",
  },
];

const ROUTES: { path: string; what: string }[] = [
  {
    path: "/fixed",
    what: "Hand-authored JSON dashboard — the agent only extracts the data (KPIs, trend, segment splits, table rows) and fills the slots. Predictable, brand-locked layout.",
  },
  {
    path: "/dynamic",
    what: "No pre-written layout — the agent reads the question, picks components from the catalog, and composes the surface on the fly. The form of the answer follows the question.",
  },
  {
    path: "/catalog",
    what: "Every component rendered live, filterable by group (Layout, Content, Data viz, Interactive). A sanity check on the renderers and a reference for what the agent can draw from.",
  },
];

export default function A2uiPdfAnalystOverviewPage() {
  return (
    <main className="min-h-screen bg-[var(--background,#fafafa)] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-6 text-xs">
          <Link href="/other-examples" className="opacity-60 hover:underline">
            ← Other Examples
          </Link>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">A2UI PDF Analyst</h1>
            <span className="inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-200">
              wip
            </span>
          </div>
          <p className="text-sm opacity-80 max-w-2xl">
            Chat with your PDF and watch the agent build the UI for each
            answer. Powered by A2UI v0.9 (Agent-to-UI) — the open protocol
            that lets an agent describe a surface as structured component
            operations the frontend renders against its own design system.
            Same chat input, two rendering strategies, one shared component
            catalog.
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-[var(--border,#e5e7eb)] bg-white p-5">
          <h2 className="text-sm font-semibold mb-2">
            Self-contained mini-app
          </h2>
          <p className="text-sm opacity-80">
            This example is <strong>not mounted into this host app</strong>.
            It runs as its own application with its own dev server (web on
            port 3000, the LangGraph agent on port 8123) on Gemini. This page
            is just an overview — follow the steps below to run it locally.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Run it standalone</h2>
          <ol className="space-y-2">
            {RUN_STEPS.map((step, i) => (
              <li
                key={step.cmd}
                className="rounded-lg border border-[var(--border,#e5e7eb)] bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono opacity-50 mt-0.5">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <code className="block text-xs font-mono break-words">
                      {step.cmd}
                    </code>
                    <p className="text-xs opacity-60 mt-1">{step.note}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs opacity-60 mt-3">
            Then open{" "}
            <code className="font-mono">http://localhost:3000</code>. Needs
            Node 20+, pnpm, Python 3.12, and{" "}
            <a
              href="https://docs.astral.sh/uv/"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              uv
            </a>{" "}
            for the Python agent. See the example&apos;s{" "}
            <code className="font-mono">README.md</code> for the full setup.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">
            Three routes inside the mini-app
          </h2>
          <ul className="space-y-3">
            {ROUTES.map((r) => (
              <li
                key={r.path}
                className="rounded-lg border border-[var(--border,#e5e7eb)] bg-white p-4"
              >
                <code className="text-xs font-mono font-semibold">
                  {r.path}
                </code>
                <p className="text-sm opacity-80 mt-1">{r.what}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-10 text-xs opacity-50">
          <Link href="/other-examples" className="hover:underline">
            ← Back to Other Examples
          </Link>
        </footer>
      </div>
    </main>
  );
}
