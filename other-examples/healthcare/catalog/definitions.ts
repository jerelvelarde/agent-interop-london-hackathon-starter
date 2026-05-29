/**
 * Healthcare Catalog — Component Definitions
 *
 * Custom A2UI catalog for the RoundsAI Ward Rounds Copilot example.
 * Models a clinical "ward console" surface: a patient roster, a patient
 * detail (vitals + meds + risks), and a shift handoff draft. Mirrors the
 * legal-paper catalog's shape so renderers can stay type-checked via
 * `CatalogRenderers<typeof healthcareCatalogDefinitions>`.
 *
 * Anti-pattern reminder: every prop the agent might want to bind to a
 * data-model path (`{ path: "/patients/0/name" }`) MUST use the DynString
 * (or DynNumber / DynArray) union. Declaring a path-bindable field as
 * `z.string()` forces the agent to inline literal text, which means
 * `update_data_model` can't patch it post-render.
 */

import { z } from "zod";

/** DynString: literal string OR `{ path: "..." }` path binding. */
const DynString = z.union([z.string(), z.object({ path: z.string() })]);

/** DynNumber: literal number OR path binding (resolved as number). */
const DynNumber = z.union([
  z.number(),
  z.string(),
  z.object({ path: z.string() }),
]);

/** DynArray: literal array OR `{ componentId, path }` template binding. */
const DynArray = z.union([
  z.array(z.unknown()),
  z.object({ componentId: z.string(), path: z.string() }),
]);

/** Action: named event the renderer dispatches on user interaction. */
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

export const healthcareCatalogDefinitions = {
  /**
   * Root shell for the RoundsAI surface. Renders the clinical teal frame
   * with a top vitals-strip (census + alerts) and slots a body collection
   * — typically a PatientRoster, a PatientDetail, or a HandoffNoteDraft.
   * Use at the root of every healthcare surface.
   */
  WardShell: {
    description:
      "Root clinical container for the RoundsAI surface. Renders a top vitals-strip (census + alerts) and slots a body collection (PatientRoster, PatientDetail, or HandoffNoteDraft). Apply at the root.",
    props: z.object({
      title: DynString.optional(),
      censusTotal: DynNumber.optional(),
      censusAlerts: DynNumber.optional(),
      stableCount: DynNumber.optional(),
      watchCount: DynNumber.optional(),
      criticalCount: DynNumber.optional(),
      children: DynArray,
    }),
  },

  /**
   * Grid container of patient cards on today's roster. Iterates `patients`
   * as a template-bound child collection.
   */
  PatientRoster: {
    description:
      "Grid of PatientCard items for the ward roster. `patients` MUST be path-bound (e.g. `{ componentId: 'patient-card', path: '/patients' }`) so the agent can patch the roster via `update_data_model` without resending `update_components`. Renders 1-3 cards per row depending on viewport.",
    props: z.object({
      title: DynString.optional(),
      patients: DynArray,
    }),
  },

  /**
   * One patient summary card in the roster grid. Surfaces name + room +
   * meta line + status pill + primary issue + last-vitals timestamp.
   */
  PatientCard: {
    description:
      "Single-patient summary card. `status` drives the color of the pill (stable / watch / critical). All textual fields MUST be DynString so the agent can patch them in place. Includes an 'Open chart' action that dispatches `drill_into_patient` with the patientId.",
    props: z.object({
      patientId: DynString,
      name: DynString,
      room: DynString.optional(),
      meta: DynString.optional(),
      status: DynString.optional(),
      statusLabel: DynString.optional(),
      primaryIssue: DynString.optional(),
      attending: DynString.optional(),
      lastVitalsAt: DynString.optional(),
      action: ActionSchema,
    }),
  },

  /**
   * Detail view for one patient: header card + vitals chart (24h) +
   * meds list + risk flags. Composed of sub-children for each section.
   */
  PatientDetail: {
    description:
      "Patient detail panel. Slots a header (name + room + status), a vitals chart, a meds list, and a risk-flags list as sub-component children. Use when the user drills into a single patient.",
    props: z.object({
      patientName: DynString,
      patientMeta: DynString.optional(),
      status: DynString.optional(),
      statusLabel: DynString.optional(),
      primaryIssue: DynString.optional(),
      attending: DynString.optional(),
      allergies: DynString.optional(),
      vitalsChild: z.string().optional(),
      medsChild: z.string().optional(),
      risksChild: z.string().optional(),
    }),
  },

  /**
   * 24-hour vitals time-series chart. `readings` is a path-bound array
   * of reading objects (each with ts/heartRate/systolicBp/tempC/o2Sat).
   */
  VitalsChart: {
    description:
      "Line chart of vital signs over the last 24 hours. `readings` MUST be a path-bound array (e.g. `{ componentId: 'vitals-reading', path: '/vitals/readings' }`). Renders heart rate, BP, temp, and O2 sat as separate lines on a shared time axis. Numerals are rendered in JetBrains Mono with tabular figures.",
    props: z.object({
      title: DynString.optional(),
      windowHours: DynNumber.optional(),
      readings: DynArray,
      latestHr: DynNumber.optional(),
      latestBpLabel: DynString.optional(),
      latestTemp: DynNumber.optional(),
      latestO2: DynNumber.optional(),
    }),
  },

  /**
   * Single reading row (used as the template child of VitalsChart for
   * a tabular fallback). Not rendered in the chart path itself.
   */
  VitalsReading: {
    description:
      "Single vitals reading row (heart rate, BP, resp rate, temp, O2 sat, note). Rendered as a row in the fallback table when the chart can't render.",
    props: z.object({
      timeLabel: DynString,
      heartRate: DynNumber.optional(),
      bpLabel: DynString.optional(),
      respRate: DynNumber.optional(),
      tempC: DynNumber.optional(),
      o2Sat: DynNumber.optional(),
      note: DynString.optional(),
    }),
  },

  /**
   * List of active meds. `meds` is a path-bound array of med objects
   * (each with name/dose/indication).
   */
  MedsList: {
    description:
      "Bullet list of active medications. `meds` MUST be a path-bound array (e.g. `{ componentId: 'med-row', path: '/meds' }`).",
    props: z.object({
      title: DynString.optional(),
      meds: DynArray,
    }),
  },

  /** Single medication row used by MedsList. */
  MedRow: {
    description:
      "One med row: name, dose, indication. Used as the template child of MedsList.",
    props: z.object({
      name: DynString,
      dose: DynString.optional(),
      indication: DynString.optional(),
    }),
  },

  /**
   * List of risk flags for the active patient. `flags` is a path-bound
   * array; each child renders as a RiskFlag pill.
   */
  RiskFlagList: {
    description:
      "List of risk flags. `flags` MUST be a path-bound array (e.g. `{ componentId: 'risk-flag', path: '/riskFlags' }`).",
    props: z.object({
      title: DynString.optional(),
      flags: DynArray,
    }),
  },

  /** One risk flag — severity-colored pill + label + optional detail. */
  RiskFlag: {
    description:
      "Single risk flag. `severity` colors the pill (low / medium / high). Includes an optional `detail` body line under the label.",
    props: z.object({
      severity: z.enum(["low", "medium", "high"]),
      label: DynString,
      detail: DynString.optional(),
    }),
  },

  /**
   * Editable shift-handoff draft. Renders the body in a multi-line text
   * area with Send / Edit / Discard actions. Each action dispatches a
   * named event back to the agent.
   */
  HandoffNoteDraft: {
    description:
      "Editable shift-handoff draft. `body` is path-bound so the agent can patch the text post-render. Three buttons dispatch `handoff_sent`, `handoff_edit`, and `handoff_discarded`.",
    props: z.object({
      title: DynString.optional(),
      subtitle: DynString.optional(),
      body: DynString,
      status: DynString.optional(),
      sendAction: ActionSchema,
      editAction: ActionSchema,
      discardAction: ActionSchema,
    }),
  },

  /** Hairline divider in the clinical palette. */
  WardDivider: {
    description:
      "Hairline divider in the clinical palette. No props — use to visually segment surface sections.",
    props: z.object({}),
  },
};

/** Type helper for renderers — enables `CatalogRenderers<typeof ...>` checks. */
export type HealthcareCatalogDefinitions = typeof healthcareCatalogDefinitions;
