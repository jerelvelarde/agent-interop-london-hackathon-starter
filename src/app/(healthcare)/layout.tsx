"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { healthcareCatalog } from "../../../other-examples/healthcare/catalog";

/**
 * (healthcare) route group layout.
 *
 * Mirrors the (legal) group but mounts the RoundsAI healthcare catalog
 * and the `healthcare` agent. This lets `/other-examples/healthcare`
 * routes operate on a completely different A2UI surface from the
 * dashboard at `/`, both fronted by the same runtime endpoint
 * (`/api/copilotkit`).
 *
 * NO `<EnvelopeInspector />` mounts under this route group — the demo
 * IS the demo, per the per-example spec for the examples-overhaul
 * blast.
 */
export default function HealthcareGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="healthcare"
      // Suppress the CopilotKit dev-overlay announcement popup. The demo is
      // the demo; no third-party "Big update" bubbles on a polished surface.
      enableInspector={false}
      a2ui={{ catalog: healthcareCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
