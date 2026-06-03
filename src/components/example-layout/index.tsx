"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { useLatestSurface } from "@/lib/surface-bus";
import "./example-layout.css";

interface ExampleLayoutProps {
  chatContent: ReactNode;
  appContent: ReactNode;
}

export function ExampleLayout({ chatContent, appContent }: ExampleLayoutProps) {
  const [mode, setMode] = useState<"chat" | "app">("chat");
  const surface = useLatestSurface();

  // Mirror-to-canvas (Phase 4): when the agent emits an A2UI surface, open the
  // canvas pane so it renders full-size beside the chat.
  useEffect(() => {
    if (surface) setMode("app");
  }, [surface]);

  useFrontendTool({
    name: "enableAppMode",
    description:
      "Enable app mode, make sure its open when interacting with todos.",
    handler: async () => {
      setMode("app");
    },
  });

  useFrontendTool({
    name: "enableChatMode",
    description: "Enable chat mode",
    handler: async () => {
      setMode("chat");
    },
  });

  return (
    <div className="h-full flex flex-row pb-6">
      {/* ModeToggle hidden — agents can still flip via useFrontendTool */}

      {/* Chat Content — a floating card on the ambient backdrop, in the same
          language as the canvas cards (soft radius + elevation + a faint
          top-to-bottom gradient) so it no longer reads as a hard pure-white
          slab with a sharp vertical seam. The inner chat surfaces are
          transparent (see globals.css §3), so this gradient is what shows
          behind the messages. */}
      <div
        className={`max-h-full flex flex-col overflow-hidden px-6 m-3 max-lg:m-2 max-lg:px-4 ${
          mode === "app"
            ? "w-1/3 max-lg:hidden" // Hide on mobile in app mode
            : "flex-1"
        }`}
        style={{
          background:
            "linear-gradient(177deg, var(--card) 0%, color-mix(in srgb, var(--muted) 55%, var(--card)) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--elevation-md)",
        }}
      >
        {/* App header lives in BrandFrame (Seam #2); the chat panel is just chat. */}
        <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pt-6 max-lg:pt-4">
          {chatContent}
        </div>
      </div>

      {/* State Panel — no left border: the chat card now floats free with a
          gap, so the old vertical seam would just be a stray line on the
          gradient. The canvas reads as cards-on-backdrop, same as the rail. */}
      <div
        className={`h-full overflow-hidden ${
          mode === "app"
            ? "w-2/3 max-lg:w-full" // Full width on mobile
            : "w-0"
        }`}
      >
        <div className="w-full lg:w-[66.666vw] h-full">{appContent}</div>
      </div>
    </div>
  );
}
