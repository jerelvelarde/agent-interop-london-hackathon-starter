/**
 * useEnvelopeStream — captures A2UI envelopes flowing over AG-UI.
 *
 * The agent emits envelopes via ActivityMessages with activityType = "a2ui-surface"
 * and the operations array under `content.a2ui_operations`. We monitor those
 * messages on the agent and turn them into a chronological list of captured
 * envelopes the EnvelopeInspector renders.
 *
 * If `OFFLINE=1` (or no envelopes have been observed and `enableDemoFallback`
 * is true), we seed with a small set of canned envelopes so the inspector
 * renders something out of the box during a cold demo. These mirror the
 * canonical PortKit `project-dashboard` surface (see
 * agent/src/tools/project_dashboard.py + its fixture), so the cold-start
 * "wire" matches what the chat demo actually renders. See
 * public/offline-envelopes.json (owned by workstream E) for the full
 * canonical fallback set.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";

import {
  A2UI_ACTIVITY_TYPE,
  A2UI_OPERATIONS_KEY,
  type A2UIEnvelope,
  type CapturedEnvelope,
  extractSurfaceId,
  inferEnvelopeKind,
} from "@/types/a2ui";

/**
 * Built-in demo envelopes — used when no real envelopes have streamed yet.
 *
 * These mirror the canonical PortKit `project-dashboard` surface (the default
 * opening demo) so the inspector's cold-start "wire" matches what the chat
 * demo actually renders. The grammar matches the real envelopes emitted by
 * agent/src/tools/project_dashboard.py:
 *   createSurface → updateComponents (flat component array, path bindings) →
 *   updateDataModel ({ path: "/", value }). Trimmed to a few KPIs + two
 *   projects so it reads coherently in the JSON inspector.
 */
const DEMO_ENVELOPES: A2UIEnvelope[] = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: "project-dashboard",
      catalogId: "copilotkit://app-dashboard-catalog",
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "project-dashboard",
      components: [
        {
          id: "root",
          component: "Column",
          gap: 16,
          children: ["hdr", "kpi-row", "projects-row"],
        },
        {
          id: "hdr",
          component: "Title",
          text: { path: "weekLabel" },
          level: "h1",
        },
        {
          id: "kpi-row",
          component: "Row",
          gap: 16,
          children: ["kpi-active", "kpi-risk", "kpi-tasks"],
        },
        {
          id: "kpi-active",
          component: "DashboardCard",
          title: "Active Projects",
          child: "kpi-active-m",
        },
        {
          id: "kpi-active-m",
          component: "Metric",
          label: "Projects",
          value: { path: "kpi/activeProjects" },
        },
        {
          id: "kpi-risk",
          component: "DashboardCard",
          title: "At Risk",
          child: "kpi-risk-m",
        },
        {
          id: "kpi-risk-m",
          component: "Metric",
          label: "Risk",
          value: { path: "kpi/atRisk" },
        },
        {
          id: "kpi-tasks",
          component: "DashboardCard",
          title: "Open Tasks",
          child: "kpi-tasks-m",
        },
        {
          id: "kpi-tasks-m",
          component: "Metric",
          label: "Tasks",
          value: { path: "kpi/openTasks" },
        },
        {
          id: "projects-row",
          component: "Row",
          gap: 24,
          children: { componentId: "project-card", path: "/projects" },
        },
        {
          id: "project-card",
          component: "ProjectCard",
          name: { path: "name" },
          status: { path: "status" },
          ownerName: { path: "ownerName" },
          sprintLabel: { path: "sprintLabel" },
          percentComplete: { path: "percentComplete" },
          doneCount: { path: "taskCounts/done" },
          inProgressCount: { path: "taskCounts/inProgress" },
          action: {
            event: {
              name: "open_project",
              context: { projectId: { path: "id" } },
            },
          },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: "project-dashboard",
      path: "/",
      value: {
        weekLabel: "Project Operations · Week of May 25",
        kpi: {
          activeProjects: "3",
          atRisk: "1",
          openTasks: "30",
        },
        projects: [
          {
            id: "proj_atlas",
            name: "Atlas: Enterprise Onboarding",
            status: "On Track",
            ownerName: "Lena Ortiz",
            sprintLabel: "Sprint 22",
            percentComplete: 64,
            taskCounts: { inProgress: 5, done: 12 },
          },
          {
            id: "proj_orion",
            name: "Orion: Self-Serve Billing",
            status: "At Risk",
            ownerName: "Mateo Reyes",
            sprintLabel: "Sprint 22",
            percentComplete: 41,
            taskCounts: { inProgress: 3, done: 8 },
          },
        ],
      },
    },
  },
];

export interface UseEnvelopeStreamOptions {
  /**
   * Cap on how many envelopes we keep in memory. Older envelopes are evicted
   * FIFO. Default 200 — plenty for a 5-hour hackathon session, small enough
   * to keep the inspector fast.
   */
  maxEnvelopes?: number;
  /**
   * If true, seed the buffer with DEMO_ENVELOPES when no real envelopes have
   * been observed yet. Lets the inspector show something on cold boot. The
   * canned envelopes are cleared the moment a real one arrives.
   */
  enableDemoFallback?: boolean;
  /** Agent id to subscribe to. Defaults to the default agent. */
  agentId?: string;
}

export interface UseEnvelopeStreamResult {
  /** All captured envelopes, newest last. */
  envelopes: CapturedEnvelope[];
  /** Envelopes grouped by surfaceId (null bucket = no surface). */
  bySurface: Map<string | null, CapturedEnvelope[]>;
  /** Whether we're currently showing demo (canned) envelopes. */
  isDemo: boolean;
  /** Manually clear the captured buffer. */
  clear: () => void;
}

/**
 * Hook: subscribe to the agent's messages and surface A2UI envelopes.
 */
export function useEnvelopeStream(
  options: UseEnvelopeStreamOptions = {},
): UseEnvelopeStreamResult {
  const {
    maxEnvelopes = 200,
    enableDemoFallback = true,
    agentId,
  } = options;

  const { agent } = useAgent(agentId ? { agentId } : undefined);
  const [envelopes, setEnvelopes] = useState<CapturedEnvelope[]>([]);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  // Track which a2ui_operations array length we've already captured per message.
  // Activity messages stream deltas, so the same id can grow.
  const capturedLengthsRef = useRef<Map<string, number>>(new Map());

  // Watch the agent's messages and harvest new a2ui-surface activity messages.
  useEffect(() => {
    if (!agent) return;

    function harvest() {
      const messages = (agent as unknown as { messages?: ReadonlyArray<unknown> })
        .messages;
      if (!messages || !messages.length) return;

      const newCaptures: CapturedEnvelope[] = [];

      for (const raw of messages) {
        const msg = raw as {
          id?: string;
          role?: string;
          activityType?: string;
          content?: Record<string, unknown>;
        };
        if (
          !msg ||
          msg.role !== "activity" ||
          msg.activityType !== A2UI_ACTIVITY_TYPE ||
          !msg.content
        ) {
          continue;
        }
        const ops = msg.content[A2UI_OPERATIONS_KEY];
        if (!Array.isArray(ops)) continue;

        const msgId = msg.id ?? `unknown-${ops.length}`;
        const alreadyCaptured = capturedLengthsRef.current.get(msgId) ?? 0;
        if (ops.length <= alreadyCaptured) continue;

        for (let i = alreadyCaptured; i < ops.length; i++) {
          const env = ops[i] as A2UIEnvelope;
          if (!env || typeof env !== "object") continue;
          newCaptures.push({
            id: `${msgId}:${i}`,
            kind: inferEnvelopeKind(env),
            surfaceId: extractSurfaceId(env),
            capturedAt: new Date().toISOString(),
            agentId: (agent as unknown as { agentId?: string }).agentId,
            body: env,
          });
        }
        capturedLengthsRef.current.set(msgId, ops.length);
        seenMessageIdsRef.current.add(msgId);
      }

      if (newCaptures.length) {
        setEnvelopes((prev) => {
          const next = [...prev, ...newCaptures];
          if (next.length > maxEnvelopes) {
            next.splice(0, next.length - maxEnvelopes);
          }
          return next;
        });
      }
    }

    // Run once now to catch anything already there.
    harvest();

    // Subscribe to agent events. The AbstractAgent has a .subscribe() method
    // that takes an AgentSubscriber. We hook the activity events + general
    // events so we catch deltas as they arrive.
    type SubFn = (sub: Record<string, (...args: unknown[]) => void>) => {
      unsubscribe?: () => void;
    } | (() => void) | void;
    const subscribeFn = (agent as unknown as { subscribe?: SubFn }).subscribe;
    if (typeof subscribeFn !== "function") {
      // No subscribe API — fall back to polling messages every 250ms.
      const poll = window.setInterval(harvest, 250);
      return () => window.clearInterval(poll);
    }

    const result = subscribeFn.call(agent, {
      onActivityDeltaEvent: harvest,
      onActivitySnapshotEvent: harvest,
      onEvent: harvest,
      onRunFinalized: harvest,
    } as unknown as Record<string, (...args: unknown[]) => void>);

    return () => {
      if (typeof result === "function") {
        result();
      } else if (result && typeof (result as { unsubscribe?: () => void }).unsubscribe === "function") {
        (result as { unsubscribe: () => void }).unsubscribe();
      }
    };
  }, [agent, maxEnvelopes]);

  // Effective list: real if any captured, else demo if enabled.
  const effective = useMemo<CapturedEnvelope[]>(() => {
    if (envelopes.length > 0 || !enableDemoFallback) return envelopes;
    const now = new Date().toISOString();
    return DEMO_ENVELOPES.map((env, i) => ({
      id: `demo:${i}`,
      kind: inferEnvelopeKind(env),
      surfaceId: extractSurfaceId(env),
      capturedAt: now,
      agentId: "demo",
      body: env,
    }));
  }, [envelopes, enableDemoFallback]);

  const bySurface = useMemo(() => {
    const map = new Map<string | null, CapturedEnvelope[]>();
    for (const env of effective) {
      const key = env.surfaceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(env);
    }
    return map;
  }, [effective]);

  return {
    envelopes: effective,
    bySurface,
    isDemo: envelopes.length === 0 && enableDemoFallback,
    clear: () => {
      seenMessageIdsRef.current.clear();
      capturedLengthsRef.current.clear();
      setEnvelopes([]);
    },
  };
}
