/**
 * Legal Paper Catalog — Component Definitions
 *
 * Custom A2UI catalog for the legal-contract-review example. Models a
 * "paper" surface: a numbered document with clauses, redlines, margin
 * notes, citations, and a verdict. Mirrors the dashboard catalog's shape
 * (`src/app/declarative-generative-ui/definitions.ts`) so renderers can
 * stay type-checked via `CatalogRenderers<typeof legalPaperCatalogDefinitions>`.
 *
 * Anti-pattern reminder: every prop the agent might want to bind to a
 * data-model path (`{ path: "/clauses/0/body" }`) MUST use the DynString
 * union. Declaring a path-bindable field as `z.string()` forces the agent
 * to inline literal text, which means `update_data_model` can't patch it
 * post-render — the redline round-trip would freeze.
 */

import { z } from "zod";

/**
 * Dynamic string: accepts either a literal string or a data-model path
 * binding like `{ path: "/clauses/0/body" }`. The GenericBinder resolves
 * path bindings to the actual value at render time.
 *
 * Pattern lifted verbatim from
 * `src/app/declarative-generative-ui/definitions.ts:19`.
 */
const DynString = z.union([z.string(), z.object({ path: z.string() })]);

/**
 * Action union: lets the agent declare a named event that the renderer
 * dispatches on user interaction (e.g. Accept / Reject button click).
 * Pattern lifted from
 * `src/app/declarative-generative-ui/definitions.ts:137-148`.
 */
const ActionSchema = z
  .union([
    z.object({
      event: z.object({
        name: z.string(),
        context: z.record(z.any()).optional(),
      }),
    }),
    z.null(),
  ])
  .optional();

export const legalPaperCatalogDefinitions = {
  LegalDocumentShell: {
    description:
      "Root paper container for a legal document. Renders a warm off-white paper background with a hard-coded 'Demo only — not legal advice.' disclaimer strip at the top. Slots an optional `verdictChild` (typically a Verdict component ID) above the clause body, then iterates `children` as the clause body. Apply at the root of any legal-paper surface.",
    props: z.object({
      title: DynString,
      // parties is not a template-bound child collection — it's a flat
      // string array displayed in the header, so a plain string array is
      // sufficient. The agent can still bind individual entries via a
      // higher-order { path } if needed, but the renderer expects strings.
      parties: z.array(z.string()).optional(),
      effectiveDate: DynString.optional(),
      // ComponentId for an optional Verdict mounted above the clause body.
      // Single-slot child (literal componentId), so a plain string suffices.
      verdictChild: z.string().optional(),
      // Same union as Row/Column in the dashboard catalog — required for
      // GenericBinder to treat this as a template-bound child collection.
      children: z.union([
        z.array(z.string()),
        z.object({ componentId: z.string(), path: z.string() }),
      ]),
    }),
  },

  Verdict: {
    description:
      "Top-line outcome banner. Use to summarize the document's risk posture before the clause body. `tone` colors the strip (positive / neutral / negative).",
    props: z.object({
      headline: DynString,
      summary: DynString.optional(),
      tone: z.enum(["positive", "neutral", "negative"]).optional(),
    }),
  },

  Clause: {
    description:
      "Numbered clause body. `body` MUST be path-bound (e.g. `{ path: 'body' }`) so the agent can patch clause text via `update_data_model` without resending `update_components`. `risk` shows a corner badge; `marginChild` slots a MarginNote on the right; `redlineChildren` slot Redline rows under the body.",
    props: z.object({
      number: DynString,
      heading: DynString.optional(),
      // CRITICAL: must be DynString. Declaring this as z.string() breaks
      // the redline round-trip per the plan's §4.2 anti-pattern callout.
      body: DynString,
      risk: z.enum(["none", "low", "medium", "high", "critical"]).optional(),
      // Either a literal MarginNote ComponentId OR a `{ componentId, path }`
      // template binding. The GenericBinder resolves the template into the
      // actual child reference at render time; the renderer handles both
      // shapes defensively.
      marginChild: z
        .union([
          z.string(),
          z.object({ componentId: z.string(), path: z.string() }),
        ])
        .optional(),
      // Either a literal ComponentId list OR a `{ componentId, path }`
      // template binding. Same union as Row/Column children — required for
      // GenericBinder to treat this as a template-bound child collection
      // (so the agent can vary the redline count via `update_data_model`
      // without resending `update_components`).
      redlineChildren: z
        .union([
          z.array(z.string()),
          z.object({ componentId: z.string(), path: z.string() }),
        ])
        .optional(),
    }),
  },

  Redline: {
    description:
      "Inline diff showing an original phrase, a suggested replacement, and an optional rationale. `status` is path-bound (typically `/redlines/<id>/status`) so the renderer can collapse to a green checkmark when the status flips to 'accepted' via `update_data_model`. `action` dispatches a named event on the (optional) inline action button.",
    props: z.object({
      redlineId: DynString,
      original: DynString,
      suggested: DynString,
      rationale: DynString.optional(),
      // Path-bound; default rendering assumes "pending".
      status: DynString.optional(),
      action: ActionSchema,
    }),
  },

  MarginNote: {
    description:
      "Right-margin annotation attached to a Clause. `severity` colors the bullet (info / warning / critical). `citation` is an optional ComponentId for an inline Citation rendered beneath the note body.",
    props: z.object({
      body: DynString,
      severity: z.enum(["info", "warning", "critical"]),
      citation: z.string().optional(),
    }),
  },

  Citation: {
    description:
      "Inline authority reference. `label` is the case / statute / clause name; `url` is the canonical link; `pinpoint` is the specific section (e.g. '§ 5(b)').",
    props: z.object({
      label: DynString,
      url: DynString.optional(),
      pinpoint: DynString.optional(),
    }),
  },

  RiskBadge: {
    description:
      "Severity tag rendered inline (e.g. next to a clause heading). `aria-label` always spells out the severity so screen readers don't rely on color.",
    props: z.object({
      level: z.enum(["low", "medium", "high", "critical"]),
      label: DynString.optional(),
    }),
  },

  AcceptRejectBar: {
    description:
      "Pair of Accept / Reject buttons for a single redline. Each button dispatches a named event back to the agent (e.g. `apply_redline` / `reject_redline`) carrying the `redlineId`. Wraps the buttons in `role='group'` with an aria-label.",
    props: z.object({
      redlineId: DynString,
      acceptAction: ActionSchema,
      rejectAction: ActionSchema,
    }),
  },

  LegalDivider: {
    description:
      "Hairline divider in the paper color palette. No props — use to visually segment clauses or sections.",
    props: z.object({}),
  },
};

/** Type helper for renderers — enables `CatalogRenderers<typeof ...>` checks. */
export type LegalPaperCatalogDefinitions = typeof legalPaperCatalogDefinitions;
