"use client";

import { useEffect, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { CopilotChat, useAgent } from "@copilotkit/react-core/v2";
import { SiteNav } from "@/components/pdf-analyst/Brand";
import { SurfaceCanvas, CanvasEmptyState } from "@/components/pdf-analyst/SurfaceCanvas";
import { FilteredUserMessage } from "@/components/pdf-analyst/FilteredUserMessage";
import { FilteredAssistantMessage } from "@/components/pdf-analyst/FilteredAssistantMessage";
import { Split } from "@/components/pdf-analyst/Split";
import { EnvelopeInspector } from "@/components/EnvelopeInspector";
import { extractPdfText } from "@/lib/pdf";

const AGENT_ID = "fixed_agent";

/** localStorage key for the inspector's hidden preference (persists across reloads). */
const INSPECTOR_HIDDEN_KEY = "pdf:fixed:inspector-hidden";

export default function FixedPage() {
  const { agent: _agent } = useAgent({ agentId: AGENT_ID });
  const [loaded, setLoaded] = useState<{
    filename: string;
    pages: number;
    chars: number;
  } | null>(null);

  // Inspector visibility — the hackathon's "show the wire" affordance. Ships
  // visible by default (AGENTS.md hard rule #5), then honors the persisted
  // choice read in an effect to avoid an SSR/hydration mismatch. The hide
  // control lives in the inspector header; a slim edge tab reopens it.
  const [inspectorHidden, setInspectorHidden] = useState(false);
  useEffect(() => {
    try {
      setInspectorHidden(
        window.localStorage.getItem(INSPECTOR_HIDDEN_KEY) === "1",
      );
    } catch {
      /* localStorage unavailable — keep default (visible) */
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
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      <SiteNav active="fixed" />

      <div className="flex-1 min-h-0 flex flex-row">
      <div className="flex-1 min-w-0 h-full flex">
      <Split
        persistKey="fixed.split"
        initialLeftFraction={0.32}
        left={
          <div className="h-full flex flex-col copilot-chat-wrapper">
            {loaded && (
              <div className="shrink-0 px-4 py-2 border-b border-[var(--line)] flex items-center gap-2 bg-[color-mix(in_oklab,var(--mint)_8%,var(--surface))]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d6b4f]" />
                <span className="mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink)]">
                  loaded
                </span>
                <span className="text-[12.5px] font-medium text-[var(--ink)] truncate">
                  {loaded.filename}
                </span>
                <span className="text-[11px] text-[var(--ink)] ml-auto">
                  {loaded.pages} pg · {Math.round(loaded.chars / 1000)}k chars
                </span>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <CopilotChat
                agentId={AGENT_ID}
                chatView={{
                  messageView: {
                    userMessage: FilteredUserMessage,
                    assistantMessage: FilteredAssistantMessage,
                  },
                }}
                attachments={{
                  enabled: true,
                  accept: "application/pdf",
                  maxSize: 20 * 1024 * 1024,
                  onUpload: async (file) => {
                    const { text, pages } = await extractPdfText(file);
                    setLoaded({
                      filename: file.name,
                      pages,
                      chars: text.length,
                    });
                    return {
                      type: "data",
                      value: text.slice(0, 60_000),
                      mimeType: "text/plain",
                      metadata: {
                        filename: file.name,
                        pages,
                        originalMime: "application/pdf",
                      },
                    };
                  },
                  onUploadFailed: (err) =>
                    console.warn("[pdf upload failed]", err),
                }}
                labels={{
                  chatInputPlaceholder:
                    "Attach a PDF (📎), then ask to render the dashboard…",
                  welcomeMessageText:
                    "Attach a PDF using the 📎 button, then ask: “Render the dashboard.”",
                }}
              />
            </div>
          </div>
        }
        right={
          <SurfaceCanvas
            channel={AGENT_ID}
            emptyState={
              <CanvasEmptyState
                title="Canvas is empty"
                subtitle="Attach a PDF in the chat (📎 in the input toolbar) and ask the agent to render the dashboard. The rendered A2UI surface will fill this canvas."
                hint={
                  <span className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]">
                    try: “Render the dashboard.”
                  </span>
                }
              />
            }
          />
        }
      />
      </div>

      {/* Right rail: A2UI envelope inspector — visible by default, hideable
          (persisted to localStorage), reopenable from a slim edge tab. Hidden
          below the `lg` breakpoint to keep narrow viewports usable. */}
      {inspectorHidden ? (
        <aside
          className="hidden lg:flex h-full shrink-0 items-stretch"
          aria-label="A2UI envelope inspector (hidden)"
        >
          <button
            type="button"
            onClick={() => setHidden(false)}
            title="Show the A2UI envelope inspector"
            className="h-full flex flex-col items-center gap-3 px-2 pt-4 border-l border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            style={{ background: "var(--surface)" }}
          >
            <PanelRightOpen size={16} style={{ color: "var(--lilac)" }} />
            <span
              style={{
                writingMode: "vertical-rl",
                fontSize: "0.66rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "var(--font-spline-mono)",
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
          <EnvelopeInspector
            agentId={AGENT_ID}
            onHide={() => setHidden(true)}
          />
        </aside>
      )}
      </div>
    </div>
  );
}
