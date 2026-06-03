/**
 * /debug — orchestrator + envelope + A2A status panel.
 *
 * Sections:
 *   1. Orchestrator state (current thread, run status, agent id)
 *   2. Last 20 envelopes per surface (table)
 *   3. A2A subagent status (dormant unless A2A_AGENT_URL is set)
 *   4. Latency (per-envelope inter-arrival times)
 *
 * Plain JSX — this is a debug page, not a polished UI.
 */
"use client";

// Lives inside the (default) route group so it shares the <CopilotKit> provider
// mounted in (default)/layout.tsx — useAgent() needs that context at render time.
// Also opt out of static prerender as defence-in-depth.
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import "react18-json-view/src/dark.css";
import {
  Activity,
  Database,
  Network,
  Timer,
  AlertCircle,
} from "lucide-react";

import { useEnvelopeStream } from "@/hooks/use-envelope-stream";
import type { CapturedEnvelope } from "@/types/a2ui";

const MAX_PER_SURFACE = 20;

export default function DebugPage() {
  const { agent } = useAgent();
  const { envelopes, bySurface, isDemo } = useEnvelopeStream({ maxEnvelopes: 500 });

  // The agent object exposes a few useful runtime fields; read defensively.
  const agentMeta = useMemo(() => {
    if (!agent) return null;
    const a = agent as unknown as {
      agentId?: string;
      threadId?: string;
      isRunning?: boolean;
      state?: unknown;
      messages?: ReadonlyArray<unknown>;
    };
    return {
      agentId: a.agentId ?? "default",
      threadId: a.threadId ?? "(none)",
      isRunning: !!a.isRunning,
      messageCount: a.messages?.length ?? 0,
      state: a.state ?? {},
    };
  }, [agent]);

  // Latency: inter-arrival times between envelopes (rough proxy for TTFT).
  const latencies = useMemo(() => computeLatencies(envelopes), [envelopes]);

  // A2A subagent status — Workstream B1 owns the proxy URL. Read it from a
  // tiny global hint (set by api/copilotkit/route.ts if available); otherwise
  // the panel reports dormant.
  const a2aUrl = useA2AHint();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        padding: 24,
        fontFamily: "var(--font-body)",
      }}
    >
      <header style={{ maxWidth: 1100, margin: "0 auto 24px" }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>
          /debug
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: "var(--muted-foreground)",
            fontSize: "0.9rem",
          }}
        >
          Orchestrator state, last {MAX_PER_SURFACE} envelopes per surface, A2A
          subagent health, latency.
        </p>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr",
        }}
      >
        <DebugCard
          icon={<Activity size={16} />}
          title="Orchestrator state"
          subtitle="Live from useAgent()"
        >
          {agentMeta ? (
            <div style={{ display: "grid", gap: 8, fontSize: "0.85rem" }}>
              <KV label="agent id" value={agentMeta.agentId} mono />
              <KV label="thread id" value={agentMeta.threadId} mono />
              <KV
                label="run status"
                value={agentMeta.isRunning ? "running" : "idle"}
              />
              <KV label="messages" value={String(agentMeta.messageCount)} />
              <details style={{ marginTop: 8 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    fontSize: "0.8rem",
                  }}
                >
                  Agent state (raw)
                </summary>
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    background: "var(--muted)",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                  }}
                >
                  <JsonView
                    src={agentMeta.state ?? {}}
                    collapsed={1}
                    enableClipboard={false}
                    displaySize={false}
                    theme="vscode"
                  />
                </div>
              </details>
            </div>
          ) : (
            <Note>No agent connected.</Note>
          )}
        </DebugCard>

        <DebugCard
          icon={<Database size={16} />}
          title={`Last ${MAX_PER_SURFACE} envelopes per surface`}
          subtitle={`${envelopes.length} total${isDemo ? " (demo)" : ""}`}
        >
          {bySurface.size === 0 ? (
            <Note>No envelopes captured.</Note>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {Array.from(bySurface.entries()).map(([sid, envs]) => (
                <SurfaceTable
                  key={sid ?? "__no_surface__"}
                  surfaceId={sid}
                  envelopes={envs.slice(-MAX_PER_SURFACE)}
                />
              ))}
            </div>
          )}
        </DebugCard>

        <DebugCard
          icon={<Network size={16} />}
          title="A2A subagent status"
          subtitle="Track 1 bolt-on (dormant by default)"
        >
          {a2aUrl ? (
            <div style={{ display: "grid", gap: 8, fontSize: "0.85rem" }}>
              <KV label="A2A_AGENT_URL" value={a2aUrl} mono />
              <Note>
                A2A status probe is owned by workstream B1 — wire
                `/api/copilotkit` to expose the health endpoint here.
              </Note>
            </div>
          ) : (
            <Note>
              A2A dormant — set <code>A2A_AGENT_URL</code> to activate.
            </Note>
          )}
        </DebugCard>

        <DebugCard
          icon={<Timer size={16} />}
          title="Latency"
          subtitle="Inter-envelope arrival times (rough TTFT proxy)"
        >
          {latencies.length === 0 ? (
            <Note>Not enough envelopes to compute latency.</Note>
          ) : (
            <LatencyTable rows={latencies.slice(-30)} />
          )}
        </DebugCard>
      </div>
    </div>
  );
}

function DebugCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span style={{ color: "var(--cpk-lilac-400)" }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{title}</span>
        {subtitle && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-foreground)",
              marginLeft: 4,
            }}
          >
            · {subtitle}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function KV({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span
        style={{
          color: "var(--muted-foreground)",
          fontSize: "0.75rem",
          minWidth: 110,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: mono ? "var(--font-code)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        background: "color-mix(in srgb, var(--muted) 60%, var(--card))",
        border: "1px dashed var(--border)",
        borderRadius: 8,
        padding: 10,
        fontSize: "0.85rem",
        color: "var(--muted-foreground)",
      }}
    >
      <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

function SurfaceTable({
  surfaceId,
  envelopes,
}: {
  surfaceId: string | null;
  envelopes: CapturedEnvelope[];
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-code)",
          fontSize: "0.75rem",
          color: "var(--muted-foreground)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {surfaceId ?? "(no surface)"} · {envelopes.length} envelopes
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.78rem",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted-foreground)" }}>
              <th style={th}>#</th>
              <th style={th}>kind</th>
              <th style={th}>captured at</th>
              <th style={th}>id</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((env, i) => (
              <tr
                key={env.id}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td style={td}>{i + 1}</td>
                <td style={{ ...td, fontFamily: "var(--font-code)" }}>
                  {env.kind}
                </td>
                <td style={{ ...td, color: "var(--muted-foreground)" }}>
                  {new Date(env.capturedAt).toLocaleTimeString()}
                </td>
                <td
                  style={{
                    ...td,
                    fontFamily: "var(--font-code)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {env.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "6px 8px",
  fontWeight: 500,
  textTransform: "uppercase",
  fontSize: "0.65rem",
  letterSpacing: "0.05em",
};
const td: React.CSSProperties = { padding: "6px 8px", verticalAlign: "top" };

interface LatencyRow {
  id: string;
  kind: string;
  surfaceId: string | null;
  deltaMs: number;
}

function computeLatencies(envs: CapturedEnvelope[]): LatencyRow[] {
  const rows: LatencyRow[] = [];
  for (let i = 1; i < envs.length; i++) {
    const prev = envs[i - 1];
    const cur = envs[i];
    const prevMs = new Date(prev.capturedAt).getTime();
    const curMs = new Date(cur.capturedAt).getTime();
    rows.push({
      id: cur.id,
      kind: cur.kind,
      surfaceId: cur.surfaceId,
      deltaMs: Math.max(0, curMs - prevMs),
    });
  }
  return rows;
}

function LatencyTable({ rows }: { rows: LatencyRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.78rem",
        }}
      >
        <thead>
          <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
            <th style={th}>kind</th>
            <th style={th}>surface</th>
            <th style={th}>Δ since prev</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <td style={{ ...td, fontFamily: "var(--font-code)" }}>
                {row.kind}
              </td>
              <td style={{ ...td, fontFamily: "var(--font-code)" }}>
                {row.surfaceId ?? "(none)"}
              </td>
              <td style={td}>{row.deltaMs} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Read the A2A url from a window-injected hint. We don't have a server
 * action set up here, so this is a best-effort read.
 */
function useA2AHint(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __A2A_AGENT_URL__?: string };
    if (w.__A2A_AGENT_URL__) setUrl(w.__A2A_AGENT_URL__);
  }, []);
  return url;
}
