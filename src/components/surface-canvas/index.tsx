"use client";

import { useMemo, type ComponentType } from "react";
import { useAgent, createA2UIMessageRenderer } from "@copilotkit/react-core/v2";
import { viewerTheme, type Theme } from "@copilotkit/a2ui-renderer";
// NOTE: the PortKit `demonstrationCatalog` was archived to
// other-examples/portkit/ during the pdf-analyst default swap. This shell
// canvas is no longer mounted by any kept route (the pdf default uses
// @/components/pdf-analyst/SurfaceCanvas), so we repoint to the pdf-analyst
// catalog purely to keep this file typecheck-valid.
import { catalog as demonstrationCatalog } from "@/a2ui/catalog";
import { useLatestSurface } from "@/lib/surface-bus";
import { A2UI_OPERATIONS_KEY } from "@/types/a2ui";
import "./surface-canvas.css";

/**
 * Generative canvas (Phase 4 — mirror-to-canvas).
 *
 * Renders the latest A2UI surface full-size, outside the chat transcript,
 * reusing CopilotKit's *own* A2UI renderer with the exact theme (viewerTheme)
 * and catalog (demonstrationCatalog) the inline path uses — so the surface
 * looks identical. Surfaces arrive via the surface bus, pushed by the mirror
 * renderer (src/lib/mirror-renderer.tsx).
 *
 * Paint-in: the frozen `copilotkit.a2ui` API emits the whole component tree in
 * one shot (see FROZEN.md) — there is no streaming on the wire, and the
 * canonical upstream showcase (other-examples/a2ui-pdf-analyst) is one-shot
 * too. So rather than fabricate a fake partial-tree reveal, we render the real,
 * complete, valid surface and let CSS stagger its top-level sections in (see
 * surface-canvas.css). Honest about the wire, ~no JS, respects reduced-motion.
 *
 * Passing `agent` through keeps surface interactivity working: chip/button
 * clicks dispatch back to the agent exactly as they did inline.
 */

type SurfaceContent = Record<string, unknown>;

/** Stable-ish key so the entrance animation re-fires when a new surface loads. */
function surfaceKey(content: SurfaceContent | null): string {
  if (!content) return "none";
  const ops = content[A2UI_OPERATIONS_KEY];
  const create = Array.isArray(ops)
    ? ops.find((o) => (o as { createSurface?: unknown })?.createSurface)
    : undefined;
  const sid = (create as { createSurface?: { surfaceId?: string } })
    ?.createSurface?.surfaceId;
  return `${sid ?? "surface"}:${Array.isArray(ops) ? ops.length : 0}`;
}

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
      <div key={surfaceKey(content)} className="surface-paint-in">
        <SurfaceRender content={content} agent={agent} />
      </div>
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
