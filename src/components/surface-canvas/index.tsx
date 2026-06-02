"use client";

import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useAgent, createA2UIMessageRenderer } from "@copilotkit/react-core/v2";
import { viewerTheme, type Theme } from "@copilotkit/a2ui-renderer";
import { demonstrationCatalog } from "@/app/declarative-generative-ui/renderers";
import { useLatestSurface } from "@/lib/surface-bus";
import { A2UI_OPERATIONS_KEY } from "@/types/a2ui";

/**
 * Generative canvas (Phase 4 — mirror-to-canvas) with streaming-style paint-in.
 *
 * Renders the latest A2UI surface full-size, outside the chat transcript, reusing
 * CopilotKit's *own* A2UI renderer with the exact theme (viewerTheme) and catalog
 * (demonstrationCatalog) the inline path uses — so the surface looks identical.
 *
 * Paint-in: the frozen `copilotkit.a2ui` API emits the whole component tree in a
 * single `updateComponents` op (one-shot — see FROZEN.md), so we can't stream
 * components off the wire. Instead we reveal the *real* tree progressively on the
 * client: starting from `root`, we feed the renderer a growing slice of the actual
 * components (parents → children, BFS, ~90ms/step). The data model is bound from
 * the first frame, so each component paints in fully-formed rather than empty.
 * If the renderer rejects a partial tree, the error boundary falls back to the
 * full surface — the user always sees the finished result.
 */

type SurfaceContent = Record<string, unknown>;

/** ms between each component reveal step. */
const STEP_MS = 90;
/** Below this many components, paint-in isn't worth it — render whole. */
const MIN_COMPONENTS_TO_ANIMATE = 3;

interface A2UIComponent {
  id: string;
  children?: unknown;
  child?: unknown;
  [k: string]: unknown;
}

interface RevealPlan {
  /** Component ids in reveal order (root first, BFS to leaves). */
  order: string[];
  /** Rebuild the surface content exposing only the first `n` components. */
  materialize: (n: number) => SurfaceContent;
}

/** Pull the child component ids a component references (string[], single string, or {componentId}). */
function childIdsOf(c: A2UIComponent): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object" && typeof (v as { componentId?: unknown }).componentId === "string") {
      out.push((v as { componentId: string }).componentId);
    }
  };
  if (Array.isArray(c.children)) c.children.forEach(push);
  else if (c.children) push(c.children);
  if (c.child) push(c.child);
  return out;
}

/**
 * Parse the surface's operations into a reveal plan. Returns null when the
 * content can't be parsed or is too small to animate — caller renders it whole.
 */
function buildRevealPlan(content: SurfaceContent | null): RevealPlan | null {
  if (!content) return null;
  const ops = content[A2UI_OPERATIONS_KEY];
  if (!Array.isArray(ops)) return null;

  const components: A2UIComponent[] = [];
  for (const op of ops) {
    const bag =
      (op as { updateComponents?: { components?: unknown } })?.updateComponents
        ?.components ??
      (op as { appendComponents?: { components?: unknown } })?.appendComponents
        ?.components;
    if (Array.isArray(bag)) {
      for (const c of bag) {
        if (c && typeof c === "object" && typeof (c as A2UIComponent).id === "string") {
          components.push(c as A2UIComponent);
        }
      }
    }
  }
  if (components.length < MIN_COMPONENTS_TO_ANIMATE) return null;

  const byId = new Map(components.map((c) => [c.id, c]));

  // BFS from root (or first component) so the revealed set is always a connected
  // subtree — a revealed parent may point at a not-yet-revealed child (empty slot
  // until it arrives), which is exactly the paint-in effect.
  const start = byId.has("root") ? "root" : components[0].id;
  const order: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [start];
  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const cid of childIdsOf(byId.get(id) as A2UIComponent)) {
      if (!seen.has(cid) && byId.has(cid)) queue.push(cid);
    }
  }
  // Any components unreachable from root still get revealed (at the end).
  for (const c of components) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      order.push(c.id);
    }
  }

  const materialize = (n: number): SurfaceContent => {
    const revealed = new Set(order.slice(0, Math.max(1, n)));
    const filter = (arr: unknown) =>
      Array.isArray(arr)
        ? arr.filter((c) => revealed.has((c as A2UIComponent)?.id))
        : arr;
    const newOps = (ops as Array<Record<string, unknown>>).map((op) => {
      const uc = (op as { updateComponents?: { components?: unknown } })
        ?.updateComponents;
      if (uc?.components) {
        return { ...op, updateComponents: { ...uc, components: filter(uc.components) } };
      }
      const ac = (op as { appendComponents?: { components?: unknown } })
        ?.appendComponents;
      if (ac?.components) {
        return { ...op, appendComponents: { ...ac, components: filter(ac.components) } };
      }
      return op;
    });
    return { ...content, [A2UI_OPERATIONS_KEY]: newOps };
  };

  return { order, materialize };
}

/** Reveal the surface's components over time; returns null when not animatable. */
function useProgressiveSurface(content: SurfaceContent | null): SurfaceContent | null {
  const plan = useMemo(() => buildRevealPlan(content), [content]);
  const [n, setN] = useState(1);

  useEffect(() => {
    if (!plan) return;
    const total = plan.order.length;
    let i = 1;
    setN(1);
    if (total <= 1) {
      setN(total);
      return;
    }
    const timer = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= total) window.clearInterval(timer);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [plan]);

  return useMemo(() => (plan ? plan.materialize(n) : null), [plan, n]);
}

/** A stable-ish key so the error boundary remounts (and paint-in retries) per surface. */
function surfaceKey(content: SurfaceContent | null): string {
  if (!content) return "none";
  const ops = content[A2UI_OPERATIONS_KEY];
  const create = Array.isArray(ops)
    ? ops.find((o) => (o as { createSurface?: unknown })?.createSurface)
    : undefined;
  const sid = (create as { createSurface?: { surfaceId?: string } })?.createSurface
    ?.surfaceId;
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

  const progressive = useProgressiveSurface(content);

  if (!content) {
    return <CanvasEmptyState />;
  }

  return (
    <div className="flex h-full flex-col px-6 max-lg:px-4">
      <PartialRenderBoundary
        key={surfaceKey(content)}
        fallback={<SurfaceRender content={content} agent={agent} />}
      >
        <SurfaceRender content={progressive ?? content} agent={agent} />
      </PartialRenderBoundary>
    </div>
  );
}

/**
 * If progressively revealing a partial component tree makes the A2UI renderer
 * throw (e.g. it can't tolerate a dangling child ref mid-stream), fall back to
 * rendering the full surface so the user always sees the finished result.
 */
class PartialRenderBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
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
