"use client";

import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { travelCatalog } from "../../../other-examples/travel/catalog";

/**
 * (travel) route group layout.
 *
 * Mounts the TripWeaver catalog + `travel` agent so the routes under this
 * group operate on a completely different A2UI surface from the
 * dashboard at `/` and the contract reviewer at `/other-examples/legal-...`.
 *
 * This route group deliberately does NOT mount the EnvelopeInspector —
 * the four polished examples are a different demo modality from the
 * dashboard surface where the inspector is load-bearing. Trip planning
 * is mobile-first and consumer-shaped; the wire-trace affordance lives
 * on the dashboard.
 */
export default function TravelGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="travel"
      // Suppress the CopilotKit dev-overlay announcement popup.
      enableInspector={false}
      a2ui={{ catalog: travelCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
