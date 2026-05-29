/**
 * ScholarAI / Edtech Catalog — Component Definitions
 *
 * Custom A2UI catalog for the ScholarAI example. Models a "academic
 * dashboard" surface: a navy/gold/cream board with KPI pills, a roster of
 * StudentCards, drillable StudentProfile with grade-history chart, a
 * sortable AssignmentStatusTable, and an OutreachBatchDraft list with
 * per-row Send / Edit / Skip actions.
 *
 * Mirrors the dashboard catalog's shape
 * (`src/app/declarative-generative-ui/definitions.ts`) so renderers stay
 * type-checked via `CatalogRenderers<typeof edtechCatalogDefinitions>`.
 *
 * Anti-pattern reminder: every prop the agent might want to bind to a
 * data-model path (`{ path: "/students/0/gpa" }`) MUST use the DynString
 * union (or DynNumber where numeric). Declaring a path-bindable field as
 * `z.string()` forces the agent to inline literal text — `update_data_model`
 * patches stop landing post-render.
 */

import { z } from "zod";

/** Dynamic string: literal or `{ path }` path-binding. */
const DynString = z.union([z.string(), z.object({ path: z.string() })]);

/** Dynamic number: literal or `{ path }` path-binding. */
const DynNumber = z.union([
  z.number(),
  z.string(),
  z.object({ path: z.string() }),
]);

/** Action union mirroring the legal catalog's pattern. */
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

/** Risk band — drives the pill / accent color across all components. */
const RiskLevel = z.enum(["ok", "watch", "urgent"]);

/** Trend band — used in StudentCard + StudentProfile. */
const Trend = z.enum(["improving", "steady", "declining"]);

/** Generic "list of objects" — used for grade history, courses, assignments. */
const ObjectArray = z.union([
  z.array(z.record(z.any())),
  z.object({ path: z.string() }),
]);

export const edtechCatalogDefinitions = {
  /**
   * Section frame for a dashboard region — Spectral header + Inter
   * subtitle + dotted-divider, then a column of `children` ComponentIds.
   * Used as the root of the roster + outreach surfaces.
   */
  DashboardSection: {
    description:
      "Section wrapper with a Spectral headline + Inter subtitle separated by a dotted divider. `children` is a flat array of ComponentIds rendered top-to-bottom. Use as the root of a roster or outreach surface.",
    props: z.object({
      title: DynString,
      subtitle: DynString.optional(),
      children: z.array(z.string()),
    }),
  },

  /**
   * Responsive grid container — used by StudentRoster to lay cards out
   * in a 2/3-column grid depending on viewport width. The agent supplies
   * the per-card componentId via `children: { componentId, path }` so
   * the renderer iterates the data-model array under `path`.
   */
  StudentGrid: {
    description:
      "Responsive 1/2/3-column grid that iterates a data-model array of student records and stamps a StudentCard per row. `children` MUST be the template form `{ componentId, path }`.",
    props: z.object({
      children: z.union([
        z.array(z.string()),
        z.object({ componentId: z.string(), path: z.string() }),
      ]),
    }),
  },

  /**
   * StudentCard — the headline widget. Photo placeholder, name, GPA,
   * missing-assignment count, attendance, trend arrow, gold-leaf risk
   * pill. Clicking the card dispatches `drillAction` so the agent can
   * pull up the matching StudentProfile.
   */
  StudentCard: {
    description:
      "Card for one student. Renders photo initials, name, grade level + advisor, current letter grade, GPA / missing / attendance KPI pills, trend arrow, and a gold-leaf risk pill (ok/watch/urgent). Clicking dispatches `drillAction` with `{ studentId, studentName }`.",
    props: z.object({
      studentId: DynString,
      name: DynString,
      photoInitials: DynString.optional(),
      gradeLevel: DynString.optional(),
      advisor: DynString.optional(),
      currentGrade: DynString.optional(),
      gpa: DynNumber.optional(),
      missingAssignments: DynNumber.optional(),
      attendancePct: DynNumber.optional(),
      trend: z.union([Trend, z.object({ path: z.string() })]).optional(),
      trendArrow: DynString.optional(),
      riskLevel: z
        .union([RiskLevel, z.object({ path: z.string() })])
        .optional(),
      notes: DynString.optional(),
      drillAction: ActionSchema,
    }),
  },

  /**
   * StudentProfile — drill view for a single student. Renders an inline
   * SVG grade-history chart, a courses list, recent-assignment chips,
   * and a free-form notes block.
   */
  StudentProfile: {
    description:
      "Drill-down profile for a single student. Renders the student header (photo, name, advisor, KPI pills), an inline grade-history line chart, a courses table, a recent-assignments list, and notes. `gradeHistory`, `courses`, and `recentAssignments` MUST be path-bound arrays so the agent can patch them via update_data_model.",
    props: z.object({
      studentId: DynString,
      name: DynString,
      photoInitials: DynString.optional(),
      gradeLevel: DynString.optional(),
      advisor: DynString.optional(),
      currentGrade: DynString.optional(),
      gpa: DynNumber.optional(),
      attendancePct: DynNumber.optional(),
      missingAssignments: DynNumber.optional(),
      trend: z.union([Trend, z.object({ path: z.string() })]).optional(),
      trendArrow: DynString.optional(),
      riskLevel: z
        .union([RiskLevel, z.object({ path: z.string() })])
        .optional(),
      notes: DynString.optional(),
      lastOutreach: DynString.optional(),
      gradeHistory: ObjectArray.optional(),
      courses: ObjectArray.optional(),
      recentAssignments: ObjectArray.optional(),
    }),
  },

  /**
   * AssignmentStatusTable — sortable table of (student, status, points,
   * due) for one assignment. The renderer handles the sort + zebra rows.
   */
  AssignmentStatusTable: {
    description:
      "Tabular per-student status for a single assignment. Columns: student name, status badge (submitted / late / missing / not assigned / graded), points, due date. Rows are path-bound so the agent can patch a single row's status with update_data_model.",
    props: z.object({
      title: DynString,
      course: DynString.optional(),
      instructor: DynString.optional(),
      due: DynString.optional(),
      totalPoints: DynNumber.optional(),
      rows: ObjectArray,
    }),
  },

  /**
   * OutreachBatchDraft — list container. Each row is an
   * OutreachDraftRow rendered per draft via the `{componentId, path}`
   * template form.
   */
  OutreachBatchDraft: {
    description:
      "List container for outreach drafts. `drafts` MUST be the template form `{ componentId, path }` so the renderer stamps an OutreachDraftRow per draft.",
    props: z.object({
      drafts: z.union([
        z.array(z.string()),
        z.object({ componentId: z.string(), path: z.string() }),
      ]),
    }),
  },

  /**
   * OutreachDraftRow — one draft email. Renders the parent + subject
   * header, body, risk pill, and three action buttons (Send / Edit /
   * Skip). Each button dispatches an action carrying the studentId.
   */
  OutreachDraftRow: {
    description:
      "One draft outreach email. Renders parent name + email, subject, body, risk pill, and Send / Edit / Skip buttons. Each button dispatches a named action with `{ studentId }` so the agent can wire row state back.",
    props: z.object({
      studentId: DynString,
      studentName: DynString,
      parentName: DynString.optional(),
      parentEmail: DynString.optional(),
      subject: DynString,
      body: DynString,
      riskLevel: z
        .union([RiskLevel, z.object({ path: z.string() })])
        .optional(),
      sendAction: ActionSchema,
      editAction: ActionSchema,
      skipAction: ActionSchema,
    }),
  },

  /**
   * Placeholder text — only used when a schema file fails to load. The
   * fact that this ever paints is a tell that the agent's schema bundle
   * is missing.
   */
  PlaceholderText: {
    description:
      "Diagnostic-only — renders a single line of muted text. Used as a missing-schema tell. Don't ship envelopes that reference this in production.",
    props: z.object({
      text: DynString,
    }),
  },
};

/** Type helper for renderers — enables `CatalogRenderers<typeof ...>` checks. */
export type EdtechCatalogDefinitions = typeof edtechCatalogDefinitions;
