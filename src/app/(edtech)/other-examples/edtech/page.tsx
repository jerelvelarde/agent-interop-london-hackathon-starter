"use client";

/**
 * ScholarAI demo route — students-at-risk advisor copilot.
 *
 * URL: /other-examples/edtech
 * Route group: (edtech) — provides the edtechCatalog + `edtech` agent via
 * sibling `src/app/(edtech)/layout.tsx`. The route-group convention lets
 * this page coexist with the dashboard at `/` and the legal example at
 * `/other-examples/legal-contract-review` without double-mounting
 * CopilotKit.
 *
 * Shape: dashboard-classic.
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Top bar (term + period + ScholarAI brand)                   │
 *   ├──────────┬──────────────────────────────────────────────────┤
 *   │ Sidebar  │ Surface canvas (A2UI-rendered widgets)            │
 *   │          │                                                   │
 *   │ filters  │                                                   │
 *   │ courses  │                       ┌─────────────────────────┐ │
 *   │ advisors │                       │ Docked chat panel       │ │
 *   │ ........ │                       │ (bottom-right, resizable)│ │
 *   │          │                       └─────────────────────────┘ │
 *   └──────────┴──────────────────────────────────────────────────┘
 *
 * NO `<EnvelopeInspector />` — the edtech demo is a polished
 * single-purpose product, not the dashboard-w/-inspector affordance.
 *
 * Visual identity:
 *   - Spectral (scholarly serif) for headlines, Inter for body
 *   - Cream paper background, navy ink, gold-leaf accents
 *   - Dotted divider beneath the top bar, gold-leaf border on the avatar
 */

import { useEffect, useRef, useState } from "react";
import { Spectral, Inter } from "next/font/google";
import { CopilotChat, useAgent } from "@copilotkit/react-core/v2";

// Side-effect import: registers the scoped edtech theme. All rules are
// gated by `[data-catalog-style="edtech"]` so they only apply inside the
// catalog-rendered surface (and the chrome below that opts in).
import "../../../../../other-examples/edtech/catalog/theme.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const AGENT_ID = "edtech";
const AUTO_PROMPT =
  "Show students at risk this term — call show_students_at_risk with term='current'.";

const COURSE_FILTERS = [
  "AP Calculus BC",
  "AP English Lit",
  "AP Chemistry",
  "Algebra II",
  "Algebra I",
  "World History",
  "US History",
  "Biology",
  "Physical Science",
  "English 9",
];

const ADVISORS = ["Mr. Patel", "Ms. Okafor", "Dr. Rasheed", "Mr. Lindstrom"];

const TERM = "Spring 2026 · Q4";

/**
 * Auto-load the at-risk roster on first mount via a synthetic user
 * message. Mirrors the (legal) page's autoload pattern — addMessage +
 * runAgent is equivalent to the user typing the prompt themselves.
 */
function useAutoOpenRoster() {
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
      // eslint-disable-next-line no-console
      console.warn("[edtech] auto-open roster failed:", err);
    }
  }, [agent]);
}

function ScholarAILogo({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "var(--edt-navy)",
        color: "var(--edt-cream)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-spectral, Spectral, Georgia, serif)",
        fontWeight: 600,
        fontSize: size * 0.45,
        letterSpacing: "0.04em",
        border: "2px solid var(--edt-gold)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
      }}
    >
      SA
    </span>
  );
}

function Sidebar({
  courseFilter,
  setCourseFilter,
  advisorFilter,
  setAdvisorFilter,
}: {
  courseFilter: string | null;
  setCourseFilter: (v: string | null) => void;
  advisorFilter: string | null;
  setAdvisorFilter: (v: string | null) => void;
}) {
  return (
    <aside
      className="sa-sidebar"
      aria-label="ScholarAI filters and course list"
    >
      <div className="sa-side-section">
        <h3 className="sa-side-title">Filters</h3>
        <label className="sa-side-label" htmlFor="sa-risk-filter">
          Risk band
        </label>
        <select id="sa-risk-filter" className="sa-side-select" defaultValue="all">
          <option value="all">All students</option>
          <option value="urgent">Urgent only</option>
          <option value="watch">Watch + urgent</option>
        </select>
        <label className="sa-side-label" htmlFor="sa-grade-filter">
          Grade level
        </label>
        <select id="sa-grade-filter" className="sa-side-select" defaultValue="all">
          <option value="all">All grades</option>
          <option value="9">Grade 9</option>
          <option value="10">Grade 10</option>
          <option value="11">Grade 11</option>
          <option value="12">Grade 12</option>
        </select>
      </div>

      <div className="sa-side-section">
        <h3 className="sa-side-title">Courses</h3>
        <ul className="sa-side-list">
          <li>
            <button
              type="button"
              className="sa-side-link"
              data-active={courseFilter === null}
              onClick={() => setCourseFilter(null)}
            >
              All courses
            </button>
          </li>
          {COURSE_FILTERS.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="sa-side-link"
                data-active={courseFilter === c}
                onClick={() => setCourseFilter(c)}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sa-side-section">
        <h3 className="sa-side-title">Advisors</h3>
        <ul className="sa-side-list">
          <li>
            <button
              type="button"
              className="sa-side-link"
              data-active={advisorFilter === null}
              onClick={() => setAdvisorFilter(null)}
            >
              All advisors
            </button>
          </li>
          {ADVISORS.map((a) => (
            <li key={a}>
              <button
                type="button"
                className="sa-side-link"
                data-active={advisorFilter === a}
                onClick={() => setAdvisorFilter(a)}
              >
                {a}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="sa-side-footer">
        Synthetic student records · FERPA-safe demo.
      </p>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="sa-topbar" aria-label="ScholarAI header">
      <div className="sa-topbar-brand">
        <ScholarAILogo />
        <div>
          <h1 className="sa-topbar-title">ScholarAI</h1>
          <p className="sa-topbar-subtitle">
            Advisor copilot · Westbridge Prep
          </p>
        </div>
      </div>
      <div className="sa-topbar-meta">
        <span className="sa-term-pill">{TERM}</span>
      </div>
    </header>
  );
}

function ChatDock() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className="sa-chat-dock"
      data-collapsed={collapsed}
      aria-label="ScholarAI chat panel"
    >
      <header className="sa-chat-head">
        <div className="sa-chat-headtext">
          <span className="sa-chat-handle" aria-hidden="true" />
          <strong>Chat with ScholarAI</strong>
          <span className="sa-chat-meta">Synthetic demo</span>
        </div>
        <button
          type="button"
          className="sa-chat-collapse"
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand chat" : "Collapse chat"}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "▴" : "▾"}
        </button>
      </header>
      {!collapsed && (
        <div className="sa-chat-body">
          <CopilotChat
            agentId={AGENT_ID}
            attachments={{ enabled: false }}
            input={{
              disclaimer: () => null,
              className: "sa-chat-input",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SurfacePlaceholder() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const isRunning =
    (agent as unknown as { isRunning?: boolean }).isRunning ?? false;
  return (
    <div
      data-catalog-style="edtech"
      className="sa-canvas-empty"
      role="status"
      aria-live="polite"
    >
      <p className="sa-canvas-empty-title">
        {isRunning ? "ScholarAI is preparing the roster…" : "Welcome, advisor."}
      </p>
      <p className="sa-canvas-empty-body">
        Try one of: <em>“Show students at risk this term.”</em>{" "}
        <em>“Drill into Maria Chen.”</em>{" "}
        <em>“Draft outreach emails to parents of those students.”</em>
      </p>
    </div>
  );
}

export default function EdtechPage() {
  useAutoOpenRoster();

  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState<string | null>(null);

  return (
    <div
      data-catalog-style="edtech"
      className={`${spectral.variable} ${inter.variable} sa-shell`}
    >
      <TopBar />
      <div className="sa-divider sa-divider-top" aria-hidden="true" />
      <div className="sa-body">
        <Sidebar
          courseFilter={courseFilter}
          setCourseFilter={setCourseFilter}
          advisorFilter={advisorFilter}
          setAdvisorFilter={setAdvisorFilter}
        />
        <main className="sa-canvas" role="main">
          <SurfacePlaceholder />
          {/* The A2UI surface is auto-mounted by the CopilotKit provider via
              the edtech catalog. Once the agent emits createSurface, its
              rendered tree fills this canvas. */}
        </main>
      </div>
      <ChatDock />
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
        }

        .sa-shell {
          background: var(--edt-cream);
          color: var(--edt-ink);
          font-family: var(--edt-font-body);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .sa-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px 10px 28px;
          background: var(--edt-cream);
        }

        .sa-topbar-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sa-topbar-title {
          font-family: var(--edt-font-headline);
          font-weight: 600;
          font-size: 1.45rem;
          margin: 0;
          color: var(--edt-navy);
          letter-spacing: -0.01em;
        }

        .sa-topbar-subtitle {
          margin: 0;
          font-size: 0.85rem;
          color: var(--edt-muted);
        }

        .sa-term-pill {
          font-family: var(--edt-font-headline);
          font-weight: 500;
          font-size: 0.85rem;
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--edt-navy);
          color: var(--edt-cream);
          letter-spacing: 0.04em;
          border: 1px solid var(--edt-gold);
        }

        .sa-divider {
          height: 1px;
          margin: 0 28px;
          background-image: radial-gradient(
            circle at center,
            var(--edt-border) 30%,
            transparent 30%
          );
          background-size: 6px 1px;
          background-repeat: repeat-x;
        }

        .sa-divider-top {
          margin-bottom: 0;
        }

        .sa-body {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 0;
          flex: 1;
          min-height: 0;
        }

        @media (max-width: 900px) {
          .sa-body {
            grid-template-columns: 1fr;
          }
          .sa-sidebar {
            display: none;
          }
        }

        .sa-sidebar {
          background: var(--edt-cream);
          padding: 24px 20px 24px 28px;
          border-right: 1px dashed var(--edt-border);
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 0;
        }

        .sa-side-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sa-side-title {
          font-family: var(--edt-font-headline);
          font-weight: 600;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--edt-navy);
          margin: 0 0 4px 0;
        }

        .sa-side-label {
          font-size: 0.72rem;
          color: var(--edt-muted);
          font-weight: 500;
          margin-top: 6px;
        }

        .sa-side-select {
          appearance: none;
          font-family: inherit;
          font-size: 0.86rem;
          color: var(--edt-ink);
          background: var(--edt-paper);
          border: 1px solid var(--edt-border);
          border-radius: 4px;
          padding: 6px 10px;
        }

        .sa-side-select:focus-visible {
          outline: 2px solid var(--edt-gold);
          outline-offset: 1px;
        }

        .sa-side-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sa-side-link {
          appearance: none;
          background: transparent;
          border: none;
          font: inherit;
          color: var(--edt-ink);
          cursor: pointer;
          font-size: 0.84rem;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: left;
          transition: background 0.12s ease, color 0.12s ease;
        }

        .sa-side-link:hover,
        .sa-side-link:focus-visible {
          background: var(--edt-navy-soft);
          color: var(--edt-navy);
          outline: none;
        }

        .sa-side-link[data-active="true"] {
          background: var(--edt-navy);
          color: var(--edt-cream);
          font-weight: 600;
        }

        .sa-side-footer {
          margin-top: auto;
          font-size: 0.72rem;
          color: var(--edt-muted);
          font-style: italic;
          border-top: 1px dashed var(--edt-border);
          padding-top: 12px;
        }

        .sa-canvas {
          padding: 24px 28px 200px 24px;
          overflow-y: auto;
          min-height: 0;
          background: linear-gradient(
            180deg,
            var(--edt-cream),
            #f4eedb 70%,
            var(--edt-cream)
          );
        }

        .sa-canvas-empty {
          background: var(--edt-paper);
          border: 1px dashed var(--edt-gold);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          color: var(--edt-ink);
          margin-bottom: 16px;
        }

        .sa-canvas-empty-title {
          font-family: var(--edt-font-headline);
          font-weight: 600;
          color: var(--edt-navy);
          margin: 0 0 8px 0;
          font-size: 1.05rem;
        }

        .sa-canvas-empty-body {
          margin: 0;
          color: var(--edt-muted);
          font-size: 0.88rem;
        }

        .sa-canvas-empty-body em {
          font-style: normal;
          background: var(--edt-gold-soft);
          color: var(--edt-gold-deep);
          padding: 1px 6px;
          border-radius: 4px;
          margin: 0 2px;
          font-weight: 500;
        }

        /* ── Chat dock (bottom-right, resizable via CSS resize handle) ── */
        .sa-chat-dock {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 420px;
          height: 540px;
          min-width: 320px;
          min-height: 180px;
          max-width: 80vw;
          max-height: 90vh;
          background: var(--edt-paper);
          border: 1px solid var(--edt-border);
          border-top: 4px solid var(--edt-gold);
          border-radius: 8px;
          box-shadow: 0 12px 32px rgba(22, 61, 101, 0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          resize: both;
          z-index: 30;
        }

        .sa-chat-dock[data-collapsed="true"] {
          height: 44px !important;
          min-height: 44px;
          resize: none;
        }

        .sa-chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--edt-navy);
          color: var(--edt-cream);
          font-family: var(--edt-font-headline);
          font-size: 0.92rem;
          letter-spacing: 0.01em;
          cursor: move;
        }

        .sa-chat-headtext {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sa-chat-handle {
          width: 16px;
          height: 2px;
          background: var(--edt-gold);
          border-radius: 2px;
        }

        .sa-chat-meta {
          font-size: 0.72rem;
          font-family: var(--edt-font-body);
          color: var(--edt-gold);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 600;
        }

        .sa-chat-collapse {
          appearance: none;
          background: transparent;
          border: none;
          color: var(--edt-cream);
          font-size: 1rem;
          cursor: pointer;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .sa-chat-collapse:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .sa-chat-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--edt-cream);
        }

        .sa-chat-input {
          padding-bottom: 12px !important;
        }

        @media (max-width: 768px) {
          .sa-chat-dock {
            right: 8px;
            bottom: 8px;
            width: calc(100vw - 16px);
            height: 60vh;
            resize: none;
            max-width: 100vw;
          }
        }
      `}</style>
    </div>
  );
}
