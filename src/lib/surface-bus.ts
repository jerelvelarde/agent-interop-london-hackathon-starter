"use client";

import { useSyncExternalStore } from "react";

/**
 * Surface bus (Phase 4 — mirror-to-canvas).
 *
 * A tiny pub/sub that bridges A2UI surface content from the chat's mirror
 * renderer (src/lib/mirror-renderer.tsx) to the out-of-chat generative canvas
 * (src/components/surface-canvas). The mirror renderer intercepts each
 * "a2ui-surface" activity message and pushes its content here; the canvas
 * subscribes and renders the latest surface full-size with the same catalog
 * the chat would have used inline.
 *
 * Deliberately framework-light: a module-level value + listener set, surfaced
 * to React via useSyncExternalStore.
 */

type SurfaceContent = Record<string, unknown> | null;

let current: SurfaceContent = null;
const listeners = new Set<() => void>();

/** Push the latest A2UI surface content (called by the mirror renderer). */
export function pushSurface(content: SurfaceContent): void {
  if (content === current) return;
  current = content;
  for (const notify of listeners) notify();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): SurfaceContent {
  return current;
}

/** Latest A2UI surface content pushed by the mirror renderer, or null. */
export function useLatestSurface(): SurfaceContent {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
