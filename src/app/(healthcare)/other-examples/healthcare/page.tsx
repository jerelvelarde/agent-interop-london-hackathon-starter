"use client";

/**
 * RoundsAI — Ward Rounds Copilot demo route.
 *
 * URL: /other-examples/healthcare
 * Route group: (healthcare) — provides the healthcareCatalog + `healthcare`
 * agent via sibling `src/app/(healthcare)/layout.tsx`. The route-group
 * convention lets this page coexist with the dashboard at `/` without
 * double-mounting CopilotKit.
 *
 * Layout: split-pane, 40% chat / 60% canvas. No mode toggle (the demo IS
 * the split). No `<EnvelopeInspector />` — the demo IS the demo.
 *
 * Visual identity:
 *   - Custom RoundsAI header (teal R+ monogram tile + product mark +
 *     ward vitals strip)
 *   - Clinical teal palette scoped under [data-catalog-style="healthcare"]
 *   - Inter for prose, JetBrains Mono for vital readings, hairline borders,
 *     NO animation.
 *
 * theme.css is imported here so Next.js bundles it for the route.
 */

import { useEffect, useRef } from "react";
import { CopilotChat, useAgent } from "@copilotkit/react-core/v2";

// Side-effect import: registers the scoped healthcare theme. Rules are gated
// by `[data-catalog-style="healthcare"]` so they only apply inside this page.
import "../../../../../other-examples/healthcare/catalog/theme.css";

const AGENT_ID = "healthcare";
const AUTO_PROMPT =
  "Show me today's roster. Call show_patient_roster with an empty query.";

/**
 * Auto-load the roster on first mount via a synthetic user message.
 *
 * Pattern lifted from the legal-contract-review page. We use the shared
 * agent (resolved by agentId match) — adding a user message + kicking
 * runAgent is equivalent to the user typing the prompt themselves.
 * Guarded by a ref so React StrictMode's double-mount doesn't double-fire.
 */
function useAutoShowRoster() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const firedRef = useRef(false);

  useEffect(() => {
    if (!agent) return;
    if (firedRef.current) return;

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
      console.warn("[roundsai] auto-roster failed:", err);
    }
  }, [agent]);
}

/**
 * RoundsAI header — clinical teal R+ monogram tile + product mark +
 * a ward census strip. No mode toggle; the demo IS split-pane.
 */
function RoundsAIHeader() {
  return (
    <header
      data-catalog-style="healthcare"
      className="roundsai-header"
      role="banner"
    >
      <div className="roundsai-brand">
        <span className="roundsai-monogram" aria-hidden="true">
          R+
        </span>
        <div className="roundsai-titles">
          <span className="roundsai-name">RoundsAI</span>
          <span className="roundsai-tag">Ward rounds copilot</span>
        </div>
      </div>
      <div className="roundsai-strip" aria-label="Ward census">
        <span className="hc-pill hc-pill--total">
          <span className="hc-mono">8</span> census
        </span>
        <span className="hc-pill hc-pill--stable">
          <span className="hc-mono">4</span> stable
        </span>
        <span className="hc-pill hc-pill--watch">
          <span className="hc-mono">3</span> watch
        </span>
        <span className="hc-pill hc-pill--critical">
          <span className="hc-mono">1</span> critical
        </span>
        <span className="hc-pill hc-pill--alert">
          <span className="hc-mono">4</span> alerts
        </span>
      </div>
      <style jsx>{`
        .roundsai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          background: #ffffff;
          border-bottom: 1px solid #d8e6e1;
          flex-wrap: wrap;
        }
        .roundsai-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        .roundsai-monogram {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: #0b8e83;
          color: #ffffff;
          font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo,
            monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }
        .roundsai-titles {
          display: inline-flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .roundsai-name {
          font-family: "Inter", ui-sans-serif, system-ui, -apple-system,
            sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #0c1f2c;
        }
        .roundsai-tag {
          font-family: "Inter", ui-sans-serif, system-ui, -apple-system,
            sans-serif;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4b6271;
        }
        .roundsai-strip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
      `}</style>
    </header>
  );
}

/**
 * Surface canvas wrapper. The actual A2UI surface is mounted by the
 * CopilotKit provider via the catalog. Until the agent's first envelope
 * arrives, we render a hint.
 */
function HealthcareCanvas() {
  return (
    <div
      data-catalog-style="healthcare"
      className="hc-shell roundsai-canvas"
    >
      <div className="hc-body roundsai-canvas-empty" aria-live="polite">
        <p className="roundsai-canvas-hint">
          Ask RoundsAI to show today&apos;s roster, drill into a patient, or
          draft a shift handoff. The surface paints itself as the agent
          replies.
        </p>
      </div>
      <footer className="hc-footer">
        Synthetic data · not for clinical use.
      </footer>
      <style jsx>{`
        .roundsai-canvas {
          height: 100%;
          overflow-y: auto;
          background: #fbfdfc;
        }
        .roundsai-canvas-empty {
          flex: 1;
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .roundsai-canvas-hint {
          max-width: 420px;
          margin: 0;
          text-align: center;
          font-family: "Inter", ui-sans-serif, system-ui, -apple-system,
            sans-serif;
          font-size: 14px;
          color: #4b6271;
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}

export default function HealthcareRoundsPage() {
  useAutoShowRoster();

  return (
    <div className="roundsai-root">
      <RoundsAIHeader />
      <div className="roundsai-split">
        <aside className="roundsai-chat" aria-label="RoundsAI assistant">
          <CopilotChat
            agentId={AGENT_ID}
            attachments={{ enabled: false }}
            input={{
              disclaimer: () => null,
              className: "pb-4",
            }}
          />
        </aside>
        <main className="roundsai-surface" aria-label="Ward surface">
          <HealthcareCanvas />
        </main>
      </div>
      <style jsx>{`
        .roundsai-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 100%;
          background: #fbfdfc;
        }
        .roundsai-split {
          flex: 1;
          display: grid;
          grid-template-columns: 40% 60%;
          min-height: 0;
          overflow: hidden;
        }
        .roundsai-chat {
          border-right: 1px solid #d8e6e1;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .roundsai-chat :global(.copilotKitChat) {
          height: 100%;
          background: transparent;
        }
        .roundsai-surface {
          min-width: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 1023px) {
          .roundsai-split {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(40vh, 50vh) 1fr;
          }
          .roundsai-chat {
            border-right: 0;
            border-bottom: 1px solid #d8e6e1;
          }
        }
      `}</style>
    </div>
  );
}
