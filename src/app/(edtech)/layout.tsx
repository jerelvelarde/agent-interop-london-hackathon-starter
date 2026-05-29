"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { edtechCatalog } from "../../../other-examples/edtech/catalog";

/**
 * (edtech) route group layout — ScholarAI.
 *
 * Mounts a `<CopilotKit>` provider scoped to the edtech catalog and the
 * `edtech` agent. Sibling groups like (legal) and (default) carry their
 * own provider so each surface can run a different agent + catalog
 * without double-mounting.
 *
 * Note: this layout deliberately does NOT render `<EnvelopeInspector />`.
 * The edtech demo is a single-purpose advisor copilot — every screen
 * affordance is in the dashboard shell (sidebar, top bar, docked chat).
 * The page beneath this layout is responsible for the visual chrome.
 */
export default function EdtechGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="edtech"
      a2ui={{ catalog: edtechCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
