"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
// A2UI catalog: definitions + renderers in ../declarative-generative-ui/
import { demonstrationCatalog } from "../declarative-generative-ui/renderers";
import { A2UI_MIRRORERS } from "@/lib/mirror-renderer";

/**
 * (default) route group layout.
 *
 * Scopes a `<CopilotKit>` provider with the demonstration catalog and the
 * default agent to every route under this group. The root layout
 * (`src/app/layout.tsx`) intentionally does NOT mount `<CopilotKit>` so that
 * sibling groups like `(legal)` can mount their own provider with a
 * different agent + catalog, avoiding the double-mount problem.
 */
export default function DefaultGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="default"
      inspectorDefaultAnchor={{ horizontal: "right", vertical: "top" }}
      a2ui={{ catalog: demonstrationCatalog }}
      renderActivityMessages={A2UI_MIRRORERS}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
