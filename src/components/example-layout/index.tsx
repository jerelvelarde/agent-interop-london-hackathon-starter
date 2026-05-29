"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import "./example-layout.css";

interface ExampleLayoutProps {
  chatContent: ReactNode;
  appContent: ReactNode;
}

export function ExampleLayout({ chatContent, appContent }: ExampleLayoutProps) {
  const [mode, setMode] = useState<"chat" | "app">("chat");

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
      <ModeToggle mode={mode} onModeChange={setMode} />

      {/*
        Chat Content.
        Note: the page-level brand (logo + product name) lives in
        <BrandFrame> (CUSTOMIZATION SEAM #2). See HACKATHON.md §2. The
        chat panel intentionally has no inline brand header anymore so
        that editing BrandFrame.tsx is the single source of truth.
      */}
      <div
        className={`max-h-full flex flex-col bg-[var(--surface-container)] backdrop-blur-md border-r border-[var(--border-default)] shadow-[var(--elevation-sm)] ${
          mode === "app"
            ? "w-1/3 px-6 max-lg:hidden" // Hide on mobile in app mode
            : "flex-1 max-lg:px-4"
        }`}
      >
        <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pt-6 max-lg:pt-4">
          {chatContent}
        </div>
      </div>

      {/* State Panel */}
      <div
        className={`h-full overflow-hidden ${
          mode === "app"
            ? "w-2/3 max-lg:w-full border-l border-[var(--border)] max-lg:border-l-0" // Full width on mobile
            : "w-0 border-l-0"
        }`}
      >
        <div className="w-full lg:w-[66.666vw] h-full">{appContent}</div>
      </div>
    </div>
  );
}
