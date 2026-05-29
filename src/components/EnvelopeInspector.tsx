/**
 * EnvelopeInspector — the hackathon's "show the wire" affordance.
 *
 * Ships as default chrome (NOT a toggle). Every A2UI envelope emitted by
 * the agent appears here in a chronological list, grouped by surfaceId.
 *
 * Each envelope card carries three affordances:
 *  1. Copy-to-clipboard — copies the raw envelope JSON
 *  2. "</> Edit this" — editor deeplink with clipboard fallback (always copies
 *     `file:line` to the clipboard so the affordance is never a no-op)
 *  3. "Open in Composer" — opens https://a2ui-composer.ag-ui.com/ with the
 *     envelope JSON as a query param (Composer reads it on load)
 *
 * Do not replace this with a toggle. Teams should never be able to
 * accidentally hide that they're using A2UI.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Layers,
  Inbox,
} from "lucide-react";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import "react18-json-view/src/dark.css";

import { useEnvelopeStream } from "@/hooks/use-envelope-stream";
import { useTheme } from "@/hooks/use-theme";
import { summarizeEnvelope } from "@/lib/envelope-summary";
import { kindMeta, LIFECYCLE_LEGEND } from "@/lib/envelope-kind-meta";
import { EnvelopeTimeline } from "@/components/EnvelopeTimeline";
import type { CapturedEnvelope } from "@/types/a2ui";

const COMPOSER_URL = "https://a2ui-composer.ag-ui.com/";

/**
 * Map of editor name -> deeplink template.
 * `{path}` and `{line}` are substituted at runtime.
 *
 * The OS can't reliably tell us if the deeplink succeeded from JS, so we
 * always also copy `path:line` to the clipboard as the safety net.
 */
const EDITOR_DEEPLINKS: Record<string, (path: string, line: number) => string> =
  {
    vscode: (path, line) => `vscode://file/${path}:${line}`,
    cursor: (path, line) => `cursor://file/${path}:${line}`,
    windsurf: (path, line) => `windsurf://file/${path}:${line}`,
    zed: (path, line) => `zed://file/${path}:${line}`,
  };

/** Read the preferred editor from a window-injected hint (set by start-all.sh). */
function detectEditor(): string {
  if (typeof window === "undefined") return "vscode";
  const w = window as unknown as {
    __EDITOR__?: string;
    __NEXT_DATA__?: { props?: { pageProps?: { editor?: string } } };
  };
  const fromWindow = w.__EDITOR__;
  if (fromWindow) return fromWindow.toLowerCase();
  const fromNext = w.__NEXT_DATA__?.props?.pageProps?.editor;
  if (fromNext) return fromNext.toLowerCase();
  return "vscode";
}

/**
 * Best-guess source-file mapping for a given envelope.
 * Hackers can swap this out per domain — the only thing that matters is the
 * affordance always lands somewhere reasonable + the clipboard fallback fires.
 */
function envelopeSourceLocation(env: CapturedEnvelope): {
  path: string;
  line: number;
} {
  // PortKit fixed-schema surfaces each live in their own tool file under
  // agent/src/tools/. The dynamic-schema path is the fallback for anything
  // we don't recognise. Hackers can extend this map as they add widgets.
  const SURFACE_TO_TOOL: Record<string, string> = {
    "project-dashboard": "agent/src/tools/project_dashboard.py",
    "project-detail": "agent/src/tools/project_detail.py",
    "sprint-board": "agent/src/tools/sprint_board.py",
    "team-load": "agent/src/tools/team_load.py",
    "risk-register": "agent/src/tools/risk_register.py",
    "status-report-draft": "agent/src/tools/status_report.py",
    "update-feed": "agent/src/tools/update_feed.py",
  };
  if (env.surfaceId && SURFACE_TO_TOOL[env.surfaceId]) {
    return { path: SURFACE_TO_TOOL[env.surfaceId], line: 1 };
  }
  return { path: "agent/src/a2ui_dynamic_schema.py", line: 1 };
}

/** Copy a string to the clipboard, fall back to a textarea hack on older browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Tiny toast component — mounted in the inspector's root. */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: "var(--card)",
        color: "var(--card-foreground)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: "0.85rem",
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
        maxWidth: 360,
      }}
    >
      {message}
    </div>
  );
}

/**
 * Pretty-print a kind label with a colored dot. Color + teaching tooltip come
 * from the shared `envelope-kind-meta` source of truth (the legacy local
 * KIND_COLORS map lived here before — kind-meta mirrors its exact hexes).
 */
function KindBadge({ kind }: { kind: string }) {
  const meta = kindMeta(kind);
  const color = meta.color;
  return (
    <span
      title={meta.tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 9999,
        background: `color-mix(in srgb, ${color} 18%, var(--card))`,
        border: `1px solid color-mix(in srgb, ${color} 50%, transparent)`,
        color: "var(--card-foreground)",
        fontFamily: "var(--font-code)",
        fontSize: "0.72rem",
        fontWeight: 500,
        cursor: "help",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {kind}
    </span>
  );
}

function EnvelopeCard({
  env,
  onToast,
  isDark,
}: {
  env: CapturedEnvelope;
  onToast: (msg: string) => void;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const summary = summarizeEnvelope(env);
  const composerHref = useMemo(() => {
    const json = encodeURIComponent(JSON.stringify(env.body));
    return `${COMPOSER_URL}?envelope=${json}`;
  }, [env.body]);

  const onCopy = useCallback(async () => {
    const ok = await copyText(JSON.stringify(env.body, null, 2));
    setCopied(ok);
    onToast(ok ? "Copied envelope JSON" : "Copy failed — JSON is in the panel");
    if (ok) window.setTimeout(() => setCopied(false), 1500);
  }, [env.body, onToast]);

  const onEdit = useCallback(async () => {
    const loc = envelopeSourceLocation(env);
    const editor = detectEditor();
    const builder = EDITOR_DEEPLINKS[editor] ?? EDITOR_DEEPLINKS.vscode;
    const deeplink = builder(loc.path, loc.line);

    // Try the deeplink. We can't observe success from JS — that's fine, the
    // clipboard is the safety net.
    try {
      window.location.href = deeplink;
    } catch {
      /* deeplink can throw on some browsers — clipboard still fires */
    }

    const cbText = `${loc.path}:${loc.line}`;
    await copyText(cbText);
    onToast(`Copied ${cbText} — paste into your editor's quick-open`);
  }, [env, onToast]);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--card)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <KindBadge kind={env.kind} />
          {env.surfaceId ? (
            <span
              title={env.surfaceId}
              style={{
                fontFamily: "var(--font-code)",
                fontSize: "0.72rem",
                color: "var(--muted-foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}
            >
              {env.surfaceId}
            </span>
          ) : (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--muted-foreground)",
                fontStyle: "italic",
              }}
            >
              no surface
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={onCopy}
            title="Copy envelope JSON"
            aria-label="Copy envelope JSON"
            style={iconBtnStyle}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Open source in editor (copies file:line as fallback)"
            aria-label="Open source in editor"
            style={iconBtnStyle}
          >
            <Code2 size={14} />
          </button>
          <a
            href={composerHref}
            target="_blank"
            rel="noreferrer noopener"
            title="Open in A2UI Composer"
            aria-label="Open in A2UI Composer"
            style={{ ...iconBtnStyle, textDecoration: "none" }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Summary — the card reads as a sentence first. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "var(--card-foreground)",
            lineHeight: 1.35,
          }}
        >
          {summary.line}
        </span>
        {summary.detail && (
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--muted-foreground)",
              lineHeight: 1.35,
            }}
          >
            {summary.detail}
          </span>
        )}
      </div>

      {/* Raw JSON — hidden behind a per-card disclosure (default collapsed). */}
      <div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          aria-expanded={showRaw}
          title={showRaw ? "Hide raw envelope JSON" : "Show raw envelope JSON"}
          style={textBtnStyle}
        >
          {showRaw ? "Hide raw ▴" : "Raw ▾"}
        </button>
        {showRaw && (
          <div
            style={{
              marginTop: 8,
              background: "color-mix(in srgb, var(--muted) 60%, var(--card))",
              borderRadius: 8,
              padding: 10,
              maxHeight: 220,
              overflowY: "auto",
              fontFamily: "var(--font-code)",
              fontSize: "0.72rem",
            }}
          >
            <JsonView
              src={env.body}
              collapsed={1}
              enableClipboard={false}
              displaySize={false}
              dark={isDark}
              theme="vscode"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--muted-foreground)",
  cursor: "pointer",
  padding: 0,
};

/** Text-label sibling of `iconBtnStyle` (e.g. the per-card "Raw ▾" toggle). */
const textBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--muted-foreground)",
  cursor: "pointer",
  padding: "0 8px",
  fontFamily: "var(--font-code)",
  fontSize: "0.68rem",
};

/** The main inspector — renders as the default right-rail chrome. */
export function EnvelopeInspector() {
  const { theme } = useTheme();
  const { envelopes, bySurface, isDemo } = useEnvelopeStream();
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Detect dark mode at runtime — the `theme` from useTheme can be "system".
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const compute = () => {
      if (typeof document === "undefined") return false;
      return document.documentElement.classList.contains("dark");
    };
    setIsDark(compute());
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setIsDark(compute());
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // Auto-scroll to bottom on new envelope.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [envelopes.length]);

  const total = envelopes.length;
  const surfaceCount = bySurface.size;

  return (
    <div
      role="region"
      aria-label="A2UI envelope inspector"
      data-component="envelope-inspector"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        borderLeft: "1px solid var(--border)",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <Layers size={16} style={{ color: "var(--cpk-lilac-400)" }} />
            <div
              style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                A2UI envelopes
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.2,
                }}
              >
                {total} envelope{total === 1 ? "" : "s"} ·{" "}
                {surfaceCount} surface{surfaceCount === 1 ? "" : "s"}
                {isDemo ? " · demo" : ""}
              </span>
            </div>
          </div>
          {isDemo && (
            <span
              title="No live envelopes captured yet — showing canned demo envelopes. They'll be replaced the moment a real envelope streams in."
              style={{
                fontSize: "0.65rem",
                color: "var(--muted-foreground)",
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px dashed var(--border)",
                background:
                  "color-mix(in srgb, var(--cpk-lilac-400) 12%, var(--card))",
                fontFamily: "var(--font-code)",
              }}
            >
              DEMO
            </span>
          )}
        </div>

        {/* Lifecycle legend — teaches create → components → bind. */}
        <div
          aria-label="A2UI envelope lifecycle"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            fontSize: "0.66rem",
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-code)",
          }}
        >
          {LIFECYCLE_LEGEND.map((step, i) => (
            <span
              key={step.kind}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                title={kindMeta(step.kind).tooltip}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "help",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: kindMeta(step.kind).color,
                    display: "inline-block",
                  }}
                />
                {step.label}
              </span>
              {i < LIFECYCLE_LEGEND.length - 1 && (
                <span aria-hidden style={{ opacity: 0.6 }}>
                  →
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Timeline strip — one dot per envelope, newest emphasized. */}
        <EnvelopeTimeline envelopes={envelopes} />
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {bySurface.size === 0 ? (
          <EmptyState />
        ) : (
          Array.from(bySurface.entries()).map(([surfaceId, surfaceEnvs]) => (
            <SurfaceGroup
              key={surfaceId ?? "__no_surface__"}
              surfaceId={surfaceId}
              envelopes={surfaceEnvs}
              onToast={setToast}
              isDark={isDark}
            />
          ))
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function SurfaceGroup({
  surfaceId,
  envelopes,
  onToast,
  isDark,
}: {
  surfaceId: string | null;
  envelopes: CapturedEnvelope[];
  onToast: (msg: string) => void;
  isDark: boolean;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.72rem",
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-code)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <Boxes size={12} />
        <span>
          {surfaceId ?? "no-surface"} · {envelopes.length}
        </span>
      </header>
      {envelopes.map((env) => (
        <EnvelopeCard
          key={env.id}
          env={env}
          onToast={onToast}
          isDark={isDark}
        />
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        margin: "auto",
        textAlign: "center",
        color: "var(--muted-foreground)",
        fontSize: "0.85rem",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Inbox size={28} style={{ opacity: 0.6 }} />
      <div style={{ fontWeight: 500, color: "var(--foreground)" }}>
        No A2UI envelopes yet
      </div>
      <div style={{ maxWidth: 260, lineHeight: 1.5 }}>
        Ask the chat{" "}
        <span style={{ fontFamily: "var(--font-code)" }}>
          &quot;What&apos;s going on this week?&quot;
        </span>{" "}
        — every <code>createSurface</code>, <code>updateComponents</code>, and{" "}
        <code>updateDataModel</code> will appear here in order.
      </div>
    </div>
  );
}

export default EnvelopeInspector;
