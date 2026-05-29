"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { realestateCatalog } from "../../../other-examples/realestate/catalog";

/**
 * (realestate) route group layout.
 *
 * Mirrors the (default) and (legal) groups but mounts the realestate
 * catalog (`copilotkit://realestate-catalog`) and the `realestate`
 * agent. This lets `/other-examples/realestate` operate on a completely
 * different A2UI surface from the dashboard at `/`, both fronted by
 * the same runtime endpoint (`/api/copilotkit`).
 *
 * Deliberate omissions vs. the (legal) group:
 *   - No `inspectorDefaultAnchor` — the EnvelopeInspector is NOT mounted
 *     in this example by spec. The realestate example targets buyers,
 *     not judges; the wire is hidden so the magazine surface owns the
 *     full canvas.
 */
export default function RealestateGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="realestate"
      // Suppress the CopilotKit dev-overlay announcement popup. Magazine
      // layout — the bubble overlaps the Chat nav button.
      enableInspector={false}
      a2ui={{ catalog: realestateCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
