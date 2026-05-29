/**
 * Other Examples Gallery.
 *
 * URL: /other-examples
 *
 * Reads every `other-examples/<example-id>/EXAMPLE.json` manifest at build
 * time (server component → Node fs) and renders a card grid. New examples
 * appear here automatically once they ship their `EXAMPLE.json`. See
 * `other-examples/README.md` for the manifest shape.
 *
 * Styling is intentionally minimal here — the cards just need to be
 * readable and clickable so the gallery is functional out of the box.
 *
 * Note: this page is NOT inside the `(legal)` route group, so it does NOT
 * mount a CopilotKit provider. It's a plain catalog page.
 */

import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

interface ExampleManifest {
  id: string;
  name: string;
  description: string;
  route: string;
  graphId?: string;
  agentName?: string;
  catalogId?: string;
  screenshot?: string;
  tags?: string[];
  status?: "wip" | "stable" | "experimental" | string;
}

/**
 * Walk the `other-examples/` folder at the repo root and collect every
 * `EXAMPLE.json` manifest. Runs once at build time (server component) — no
 * runtime fs reads, no client bundle bloat.
 *
 * Resolution strategy: walk up from the page file (`src/app/other-examples/`)
 * to find the repo root, then descend into `other-examples/`. This works in
 * both `pnpm dev` (cwd = repo root) and `next build` (cwd may vary).
 */
function loadManifests(): ExampleManifest[] {
  // process.cwd() in Next.js is the project root.
  const examplesRoot = path.join(process.cwd(), "other-examples");

  let entries: string[];
  try {
    entries = fs.readdirSync(examplesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    // No other-examples dir — return empty gallery.
    return [];
  }

  const manifests: ExampleManifest[] = [];
  for (const entry of entries) {
    const manifestPath = path.join(examplesRoot, entry, "EXAMPLE.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const raw = fs.readFileSync(manifestPath, "utf8");
      const parsed = JSON.parse(raw) as ExampleManifest;
      manifests.push(parsed);
    } catch (err) {
      // Skip malformed manifests; log so a dev sees it during build.
      // eslint-disable-next-line no-console
      console.warn(
        `[other-examples gallery] failed to parse ${manifestPath}:`,
        err,
      );
    }
  }
  return manifests;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const tone =
    status === "stable"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "wip"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : status === "experimental"
          ? "bg-violet-100 text-violet-800 border-violet-200"
          : "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${tone}`}
    >
      {status}
    </span>
  );
}

export default function OtherExamplesGalleryPage() {
  const manifests = loadManifests();

  return (
    <main className="min-h-screen bg-[var(--background,#fafafa)] py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Other Examples</h1>
          <p className="text-sm opacity-70 max-w-2xl">
            Self-contained example modules that go one layer deeper than the
            dashboard demo — second catalogs, custom visual primitives,
            domain-specific reading experiences. See{" "}
            <code className="text-xs opacity-80">other-examples/README.md</code>{" "}
            for the layout convention.
          </p>
        </header>

        {manifests.length === 0 ? (
          <p className="text-sm opacity-70">
            No examples found. Add a folder under{" "}
            <code>other-examples/</code> with an <code>EXAMPLE.json</code>{" "}
            manifest.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {manifests.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.route}
                  className="block rounded-lg border border-[var(--border,#e5e7eb)] bg-white p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-lg font-semibold">{m.name}</h2>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-sm opacity-80 mb-3">{m.description}</p>
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs font-mono opacity-60">{m.route}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-10 text-xs opacity-50">
          <Link href="/" className="hover:underline">
            ← Back to dashboard
          </Link>
        </footer>
      </div>
    </main>
  );
}
