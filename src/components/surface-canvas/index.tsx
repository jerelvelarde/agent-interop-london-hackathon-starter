"use client";

import { useMemo, type ComponentType } from "react";
import { useAgent, createA2UIMessageRenderer } from "@copilotkit/react-core/v2";
import { viewerTheme, type Theme } from "@copilotkit/a2ui-renderer";
import { demonstrationCatalog } from "@/app/declarative-generative-ui/renderers";
import { useLatestSurface } from "@/lib/surface-bus";

/**
 * Generative canvas (Phase 4 — mirror-to-canvas).
 *
 * Renders the latest A2UI surface full-size, outside the chat transcript. It
 * reuses CopilotKit's *own* A2UI renderer with the exact theme (viewerTheme)
 * and catalog (demonstrationCatalog) the inline path uses, so the surface looks
 * identical — just bigger and with room to breathe. Surfaces arrive via the
 * surface bus, pushed by the mirror renderer (src/lib/mirror-renderer.tsx).
 *
 * Passing `agent` through to the renderer keeps surface interactivity working:
 * chip/button clicks dispatch back to the agent exactly as they did inline.
 */
export function SurfaceCanvas() {
  const { agent } = useAgent();
  const content = useLatestSurface();

  // The same renderer CopilotKit registers inline (theme + catalog matched), so
  // there is zero visual drift between the chat's would-be render and ours.
  const SurfaceRender = useMemo(
    () =>
      createA2UIMessageRenderer({
        theme: viewerTheme as unknown as Theme,
        catalog: demonstrationCatalog,
      }).render as unknown as ComponentType<{
        content: unknown;
        agent: unknown;
      }>,
    [],
  );

  if (!content) {
    return <CanvasEmptyState />;
  }

  return (
    <div className="flex h-full flex-col px-6 max-lg:px-4">
      <SurfaceRender content={content} agent={agent} />
    </div>
  );
}

function CanvasEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "var(--cpk-ambient-gradient)" }}
      >
        ✦
      </div>
      <div>
        <p
          className="text-lg font-light"
          style={{ color: "var(--text-primary)" }}
        >
          The canvas is ready
        </p>
        <p
          className="mt-1 max-w-xs text-sm"
          style={{ color: "var(--text-disabled)" }}
        >
          Ask the agent for something visual — the rendered A2UI surface appears
          here, full-size.
        </p>
      </div>
      <p
        className="text-[12px]"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-code)",
        }}
      >
        try: “What’s going on this week?”
      </p>
    </div>
  );
}
