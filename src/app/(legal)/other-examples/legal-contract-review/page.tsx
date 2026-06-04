/**
 * Legal Contract Review demo route — TEMPORARILY DESCOPED.
 *
 * URL: /other-examples/legal-contract-review
 *
 * The interactive contract-review experience is disabled for now. The backend
 * `/legal` agent runs cleanly (the "No checkpointer set" crash is fixed), but
 * the review surface does not yet render in the UI — a separate frontend
 * wiring issue (the auto-review's message + `contract-review` surface don't
 * paint despite the agent returning 200). Rather than ship a route that loads
 * but paints nothing, this page shows a short "work in progress" notice.
 *
 * The full implementation (auto-review chat + paper-styled A2UI canvas) lives
 * in this branch's git history — restore it in the follow-up PR that fixes the
 * render. The backend `/legal` endpoint and the `(legal)` route-group layout
 * stay wired, so re-enabling is just this page.
 */

import Link from "next/link";

export default function LegalContractReviewPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background,#fafafa)] px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-wide opacity-60 mb-3">
          Other example · work in progress
        </p>
        <h1 className="text-2xl font-semibold mb-3">Contract Review Copilot</h1>
        <p className="text-sm opacity-75 mb-6">
          This example is being finalized and is temporarily unavailable. The
          live pdf-analyst demo — a fixed-schema dashboard and dynamic
          generative UI, both from one shared A2UI catalog — is ready to
          explore.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link href="/" className="underline hover:opacity-70">
            ← Back to the demo
          </Link>
          <Link href="/catalog" className="underline hover:opacity-70">
            Browse the catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
