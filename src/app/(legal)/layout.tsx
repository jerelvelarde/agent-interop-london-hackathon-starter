"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
// @ts-expect-error legalPaperCatalog supplied by B4 in parallel (other-examples/legal-contract-review/catalog)
import { legalPaperCatalog } from "../../../../other-examples/legal-contract-review/catalog";

/**
 * (legal) route group layout.
 *
 * Mirrors the (default) group but mounts the legal-contract-review catalog
 * and the `legal` agent. This lets `/legal` routes operate on a completely
 * different A2UI surface from the dashboard at `/`, both fronted by the same
 * runtime endpoint (`/api/copilotkit`). See PLAN.md §5 / §5.1 for the
 * multi-catalog wiring rationale.
 *
 * NOTE: the `legalPaperCatalog` module is being shipped in a parallel
 * worktree (B4). Until that lands, the import will fail to resolve — the
 * `@ts-expect-error` above suppresses the TS diagnostic. Remove the
 * suppression once B4 merges.
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
