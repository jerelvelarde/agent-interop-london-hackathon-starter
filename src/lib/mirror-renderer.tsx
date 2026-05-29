"use client";

import { useEffect } from "react";
import { z } from "zod";
import type { ReactActivityMessageRenderer } from "@copilotkit/react-core/v2";
import { A2UI_ACTIVITY_TYPE } from "@/types/a2ui";
import { pushSurface } from "@/lib/surface-bus";

/**
 * Mirror-to-canvas (Phase 4).
 *
 * Instead of rendering an A2UI surface inline inside the chat bubble, we
 * intercept the "a2ui-surface" activity message, push its content to the
 * surface bus (the generative canvas renders it full-size), and leave a small
 * breadcrumb in the transcript. The renderer is agent-scoped (agentId
 * "default") so CopilotKit's resolver picks it ahead of the built-in inline
 * A2UI renderer (whose agentId is undefined) — i.e. it *replaces* the inline
 * render rather than duplicating it.
 *
 * The exported array MUST stay referentially stable — `<CopilotKit>` throws on
 * a changing `renderActivityMessages` prop — so it lives at module scope and is
 * imported into layout.tsx as-is. Verified available on the FROZEN
 * @copilotkit/react-core 1.56.5 (see the D6 spike).
 */

function MirrorBreadcrumb({ content }: { content: Record<string, unknown> }) {
  useEffect(() => {
    pushSurface(content ?? null);
  }, [content]);

  return (
    <div
      className="my-1 inline-flex items-center gap-2 rounded-full border px-3 py-1"
      style={{
        borderColor: "var(--border-container, #dbdbe5)",
        background: "var(--white-65, rgba(255, 255, 255, 0.65))",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--cpk-lilac-400, #bec2ff)" }}
      />
      <span
        className="text-[10px] uppercase tracking-[0.14em]"
        style={{
          color: "var(--text-secondary, #57575b)",
          fontFamily: "var(--font-code)",
        }}
      >
        surface → rendered in the canvas
      </span>
    </div>
  );
}

export const A2UI_MIRRORERS: ReactActivityMessageRenderer<
  Record<string, unknown>
>[] = [
  {
    activityType: A2UI_ACTIVITY_TYPE,
    agentId: "default",
    content: z.any(),
    render: MirrorBreadcrumb,
  },
];
