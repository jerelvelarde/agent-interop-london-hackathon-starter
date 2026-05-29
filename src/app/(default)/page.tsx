"use client";

import { BrandFrame } from "@/components/BrandFrame";
import { ExampleLayout } from "@/components/example-layout";
import { SurfaceCanvas } from "@/components/surface-canvas";
import { EnvelopeInspector } from "@/components/EnvelopeInspector";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";

import { CopilotChat } from "@copilotkit/react-core/v2";

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

        {/* Right rail: envelope inspector (default chrome — not a toggle) */}
        <aside
          className="hidden lg:flex h-full shrink-0"
          style={{ width: 380 }}
          aria-label="A2UI envelope inspector"
        >
          <EnvelopeInspector />
        </aside>
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
