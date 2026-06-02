"use client";

import { useEffect, useState } from "react";
import { PanelRightOpen } from "lucide-react";

import { BrandFrame } from "@/components/BrandFrame";
import { ExampleLayout } from "@/components/example-layout";
import { SurfaceCanvas } from "@/components/surface-canvas";
import { EnvelopeInspector } from "@/components/EnvelopeInspector";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";

import { CopilotChat } from "@copilotkit/react-core/v2";

/** localStorage key for the inspector's hidden preference (persists across reloads). */
const INSPECTOR_HIDDEN_KEY = "a2ui:inspector-hidden";

/**
 * Default homepage.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┬─────────────────┐
 *   │  ExampleLayout (chat + optional canvas) │ EnvelopeInspector│
 *   └─────────────────────────────────────────┴─────────────────┘
 *
 * The inspector is the hackathon's "show the wire" affordance — it ships
 * always-on as default chrome (not a toggle). Teams cannot accidentally hide
 * that they're using A2UI.
 *
 * The right rail is hidden below the `lg` breakpoint to keep mobile usable.
 */
export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();

  // Inspector visibility — defaults visible, then honors the persisted choice
  // (read in an effect to avoid an SSR/hydration mismatch). The hide control
  // lives in the inspector header; a slim edge tab reopens it.
  const [inspectorHidden, setInspectorHidden] = useState(false);
  useEffect(() => {
    try {
      setInspectorHidden(
        window.localStorage.getItem(INSPECTOR_HIDDEN_KEY) === "1",
      );
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);
  const setHidden = (hidden: boolean) => {
    setInspectorHidden(hidden);
    try {
      window.localStorage.setItem(INSPECTOR_HIDDEN_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <BrandFrame>
      <div className="h-full w-full flex flex-row">
        {/* Left + center: existing chat + app-mode canvas */}
        <div className="flex-1 min-w-0 h-full">
          <ExampleLayout
            chatContent={
              <CopilotChat
                attachments={{ enabled: true }}
                input={{ disclaimer: () => null, className: "pb-6" }}
              />
            }
            appContent={<SurfaceCanvas />}
          />
        </div>

        {/* Right rail: envelope inspector. Hideable (persisted); a slim edge tab
            reopens it when hidden. */}
        {inspectorHidden ? (
          <aside
            className="hidden lg:flex h-full shrink-0 items-stretch"
            aria-label="A2UI envelope inspector (hidden)"
          >
            <button
              type="button"
              onClick={() => setHidden(false)}
              title="Show the A2UI envelope inspector"
              className="h-full flex flex-col items-center gap-3 px-2 pt-4 border-l border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              style={{ background: "var(--background)" }}
            >
              <PanelRightOpen
                size={16}
                style={{ color: "var(--cpk-lilac-400)" }}
              />
              <span
                style={{
                  writingMode: "vertical-rl",
                  fontSize: "0.66rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-code)",
                }}
              >
                A2UI envelopes
              </span>
            </button>
          </aside>
        ) : (
          <aside
            className="hidden lg:flex h-full shrink-0"
            style={{ width: 380 }}
            aria-label="A2UI envelope inspector"
          >
            <EnvelopeInspector onHide={() => setHidden(true)} />
          </aside>
        )}
      </div>

      {/* Tasteful sponsor credit — the canonical Track 2 starter for the
          Generative UI Hackathon. Removable if it gets in your way, but
          leaving it in is the easiest way to credit sponsors during judging. */}
      <p
        aria-label="Sponsor credit"
        className="pointer-events-none fixed bottom-1 left-1/2 -translate-x-1/2 z-10 text-[10px] text-[var(--muted-foreground,#9ca3af)] opacity-60 select-none max-lg:hidden"
      >
        Built for the Generative UI Hackathon. Sponsored by Google DeepMind
        &middot; CopilotKit &middot; A2A Net.
      </p>
    </BrandFrame>
  );
}
