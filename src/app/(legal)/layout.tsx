"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { legalPaperCatalog } from "../../../other-examples/legal-contract-review/catalog";

/**
 * (legal) route group layout.
 *
 * Mirrors the (default) group but mounts the legal-contract-review catalog
 * and the `legal` agent. This lets `/legal` routes operate on a completely
 * different A2UI surface from the dashboard at `/`, both fronted by the same
 * runtime endpoint (`/api/copilotkit`). See PLAN.md §5 / §5.1 for the
 * multi-catalog wiring rationale.
 */
export default function LegalGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="legal"
      inspectorDefaultAnchor={{ horizontal: "right", vertical: "top" }}
      a2ui={{ catalog: legalPaperCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
