"use client";

/**
 * Legal Contract Review demo route.
 *
 * URL: /other-examples/legal-contract-review
 * Route group: (legal) — provides the legalPaperCatalog + `legal` agent via
 * sibling `src/app/(legal)/layout.tsx`. The route-group convention lets this
 * page coexist with the dashboard at `/` without double-mounting CopilotKit.
 *
 * Behavior:
 *   - Renders a CopilotChat (left) + paper-styled contract surface (right)
 *     reusing `<ExampleLayout>` from the dashboard for the chat-shell affordance.
 *   - On first mount, auto-invokes the agent with a "Review the NDA" prompt
 *     so the demo is wow-on-load. Skip if the agent already has messages
 *     (e.g. user navigated back).
 *   - Sets `data-catalog-style="legal-paper"` on the surface wrapper so the
 *     scoped theme.css rules (warm off-white, serif body) apply without
 *     leaking into the dashboard route.
 *
 * theme.css is imported here so Next.js bundles it for the route.
 */

import { useEffect, useRef } from "react";
import {
  CopilotChat,
  useAgent,
  useFrontendTool,
} from "@copilotkit/react-core/v2";

import { ExampleLayout } from "@/components/example-layout";
import { EnvelopeInspector } from "@/components/EnvelopeInspector";

// Side-effect import: registers the scoped paper theme. The rules are gated
// by `[data-catalog-style="legal-paper"]` so they only apply inside this page.
import "../../../../../other-examples/legal-contract-review/catalog/theme.css";

const AGENT_ID = "legal";
const AUTO_PROMPT =
  "Open document 1 — the Master Supply Agreement with Apex Servos — for review. Use review_document(document_id=1) so I can see the risk-flag margin notes and the verdict.";

/**
 * Auto-load the NDA on first mount via a synthetic user message.
 *
 * We use the CopilotChat-shared agent (resolved by agentId match) — adding a
 * user message + kicking runAgent is equivalent to the user typing the prompt
 * themselves. Guarded by a ref so React StrictMode's double-mount doesn't
 * double-fire.
 */
function useAutoReviewNda() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const firedRef = useRef(false);

  useEffect(() => {
    if (!agent) return;
    if (firedRef.current) return;

    // If the user already has a conversation in flight, don't hijack it.
    const messages =
      (agent as unknown as { messages?: ReadonlyArray<unknown> }).messages ?? [];
    if (messages.length > 0) {
      firedRef.current = true;
      return;
    }

    firedRef.current = true;
    try {
      (
        agent as unknown as {
          addMessage: (m: {
            id: string;
            role: "user";
            content: string;
          }) => void;
        }
      ).addMessage({
        id: `auto-${crypto.randomUUID()}`,
        role: "user",
        content: AUTO_PROMPT,
      });
      void (
        agent as unknown as { runAgent: () => Promise<unknown> }
      ).runAgent();
    } catch (err) {
      // If the agent isn't fully wired yet, log and let the user kick it manually.
      // eslint-disable-next-line no-console
      console.warn("[legal-contract-review] auto-review failed:", err);
    }
  }, [agent]);
}

/**
 * Canvas: the rendered A2UI surface lives inside the CopilotKit-provided
 * renderer (auto-mounted by the provider when the runtime reports a2ui).
 * We host it inside a scoped wrapper so the paper theme applies, and the
 * envelopes streamed by the agent paint themselves into the surface.
 */
function LegalCanvas() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const isRunning =
    (agent as unknown as { isRunning?: boolean }).isRunning ?? false;

  return (
    <div
      data-catalog-style="legal-paper"
      className="lp-shell h-full overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-8 py-10">
        {isRunning && (
          <p className="lp-disclaimer text-xs italic opacity-70 mb-4">
            Reviewing contract...
          </p>
        )}
        {/* The actual A2UI surface is mounted by the CopilotKit provider via
            the catalog. The agent's first envelope creates the surface and
            populates it. Until then, render a hint. */}
        <p className="lp-disclaimer text-xs italic opacity-70">
          Demo mode only — not legal advice. Fictional parties and clauses.
        </p>
      </div>
    </div>
  );
}

export default function LegalContractReviewPage() {
  useAutoReviewNda();

  // Suggestion chip — gives the user an obvious "try this" entry point if the
  // auto-load doesn't kick in (or if they want to try the SaaS sample too).
  useFrontendTool({
    name: "noop_legal_chip",
    description: "Placeholder — never invoked. Suppresses 'no tools' warning.",
    handler: async () => {},
  });

  return (
    <div className="h-full w-full flex flex-row">
      {/* Left + center: chat + paper canvas */}
      <div className="flex-1 min-w-0 h-full">
        <ExampleLayout
          chatContent={
            <CopilotChat
              agentId={AGENT_ID}
              attachments={{ enabled: false }}
              input={{
                disclaimer: () => null,
                className: "pb-6",
              }}
            />
          }
          appContent={<LegalCanvas />}
        />
      </div>

      {/* Right rail: envelope inspector — same affordance as the dashboard so
          judges can see the wire. Hidden below lg breakpoint to keep mobile usable. */}
      <aside
        className="hidden lg:flex h-full shrink-0"
        style={{ width: 380 }}
        aria-label="A2UI envelope inspector"
      >
        <EnvelopeInspector />
      </aside>
    </div>
  );
}
