/**
 * ScholarAI / Edtech Catalog — React Renderers
 *
 * Each renderer maps a component name from definitions.ts to a React
 * implementation. Props are type-checked against the Zod schemas via
 * `CatalogRenderers<EdtechCatalogDefinitions>`.
 *
 * All visual styling is owned by `./theme.css` (scoped under
 * `[data-catalog-style="edtech"]`) so this file stays focused on markup,
 * semantics, and a11y. Pattern mirrors
 * `src/app/declarative-generative-ui/renderers.tsx`.
 */
"use client";

import React, { useMemo, useState } from "react";
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import type { EdtechCatalogDefinitions } from "./definitions";

// ─── Shared helpers ──────────────────────────────────────────────────

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "path" in (value as object)) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const RISK_LABELS: Record<string, string> = {
  ok: "On track",
  watch: "Watch",
  urgent: "Urgent",
};

const TREND_LABELS: Record<string, string> = {
  improving: "Improving",
  steady: "Steady",
  declining: "Declining",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  graded: "Graded",
  late: "Late",
  missing: "Missing",
  "not assigned": "—",
};

/** Iterate a children prop that may be either a flat string-id list or
 *  already-resolved `{ id, basePath }` ref list (template-bound). */
function renderTemplatedChildren(
  items: unknown,
  childrenFn: unknown,
): React.ReactNode[] {
  if (!Array.isArray(items)) return [];
  const fn = childrenFn as
    | ((id: string, basePath?: string) => React.ReactNode)
    | undefined;
  if (!fn) return [];
  return items.map((item: unknown, i: number) => {
    if (typeof item === "string") {
      return (
        <React.Fragment key={`${item}-${i}`}>{fn(item)}</React.Fragment>
      );
    }
    if (item && typeof item === "object" && "id" in (item as object)) {
      const ref = item as { id: string; basePath?: string };
      return (
        <React.Fragment key={`${ref.id}-${i}`}>
          {fn(ref.id, ref.basePath)}
        </React.Fragment>
      );
    }
    return null;
  });
}

// ─── Grade-history mini-chart ────────────────────────────────────────

/** Inline SVG line chart for grade history. Domain is 50-100; out-of-band
 *  values are clamped so a stray data point doesn't blow up the plot. */
function GradeHistoryChart({
  points,
  ariaLabel,
}: {
  points: { term: string; grade_pct: number }[];
  ariaLabel: string;
}) {
  const w = 360;
  const h = 120;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 24;

  if (points.length === 0) {
    return (
      <div className="edt-chart-empty" role="img" aria-label={ariaLabel}>
        No grade history yet.
      </div>
    );
  }

  const min = 50;
  const max = 100;
  const stepX =
    points.length > 1 ? (w - padL - padR) / (points.length - 1) : 0;

  const path = points
    .map((p, i) => {
      const x = padL + i * stepX;
      const clamped = Math.max(min, Math.min(max, p.grade_pct));
      const y =
        padT + (1 - (clamped - min) / (max - min)) * (h - padT - padB);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className="edt-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={ariaLabel}
    >
      {[60, 70, 80, 90, 100].map((tick) => {
        const y =
          padT + (1 - (tick - min) / (max - min)) * (h - padT - padB);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              className="edt-chart-grid"
            />
            <text
              x={padL - 6}
              y={y + 3}
              className="edt-chart-tick"
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        );
      })}
      <path d={path} className="edt-chart-line" />
      {points.map((p, i) => {
        const x = padL + i * stepX;
        const clamped = Math.max(min, Math.min(max, p.grade_pct));
        const y =
          padT + (1 - (clamped - min) / (max - min)) * (h - padT - padB);
        return (
          <g key={`${p.term}-${i}`}>
            <circle cx={x} cy={y} r={4} className="edt-chart-point" />
            <text
              x={x}
              y={h - 6}
              className="edt-chart-tick"
              textAnchor="middle"
            >
              {p.term}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Risk pill ───────────────────────────────────────────────────────

function RiskPill({ level }: { level: string }) {
  const safe = (level || "ok") as keyof typeof RISK_LABELS;
  return (
    <span
      className="edt-pill"
      data-risk={safe}
      aria-label={RISK_LABELS[safe] ?? safe}
    >
      <span className="edt-pill-dot" aria-hidden="true" />
      {RISK_LABELS[safe] ?? safe}
    </span>
  );
}

// ─── Renderers ───────────────────────────────────────────────────────

export const edtechCatalogRenderers: CatalogRenderers<EdtechCatalogDefinitions> =
  {
    DashboardSection: ({ props, children }) => {
      const title = asText(props.title);
      const subtitle = asText(props.subtitle);
      const childIds = Array.isArray(props.children) ? props.children : [];
      return (
        <section data-catalog-style="edtech" className="edt-section">
          <header className="edt-section-head">
            {title && <h2 className="edt-section-title">{title}</h2>}
            {subtitle && (
              <p className="edt-section-subtitle">{subtitle}</p>
            )}
            <div className="edt-divider" aria-hidden="true" />
          </header>
          <div className="edt-section-body">
            {childIds.map((id, i) => (
              <React.Fragment key={`${id}-${i}`}>
                {(children as (id: string) => React.ReactNode)(id)}
              </React.Fragment>
            ))}
          </div>
        </section>
      );
    },

    StudentGrid: ({ props, children }) => {
      const items = Array.isArray(props.children) ? props.children : [];
      return (
        <div data-catalog-style="edtech" className="edt-grid">
          {renderTemplatedChildren(items, children)}
        </div>
      );
    },

    StudentCard: ({ props, dispatch }) => {
      const studentId = asText(props.studentId);
      const name = asText(props.name);
      const initials = asText(props.photoInitials);
      const gradeLevel = asText(props.gradeLevel);
      const advisor = asText(props.advisor);
      const currentGrade = asText(props.currentGrade);
      const gpa = asNumber(props.gpa);
      const missing = asNumber(props.missingAssignments);
      const attendance = asNumber(props.attendancePct);
      const trend = asText(props.trend) || "steady";
      const trendArrow = asText(props.trendArrow) || "→";
      const risk = asText(props.riskLevel) || "ok";
      const notes = asText(props.notes);

      const onDrill = () => {
        if (props.drillAction && dispatch) dispatch(props.drillAction);
      };

      return (
        <article
          data-catalog-style="edtech"
          className="edt-card"
          data-risk={risk}
          tabIndex={0}
          role="button"
          aria-label={`Open profile for ${name}`}
          onClick={onDrill}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onDrill();
            }
          }}
        >
          <div className="edt-card-head">
            <div className="edt-avatar" aria-hidden="true">
              {initials || name.slice(0, 2).toUpperCase()}
            </div>
            <div className="edt-card-headtext">
              <h3 className="edt-card-name">{name}</h3>
              <p className="edt-card-meta">
                {[gradeLevel, advisor].filter(Boolean).join(" · ")}
                {studentId && (
                  <span className="edt-card-sid"> · {studentId}</span>
                )}
              </p>
            </div>
            <RiskPill level={risk} />
          </div>

          {currentGrade && (
            <div className="edt-card-grade">
              <span className="edt-card-grade-label">Current</span>
              <span className="edt-card-grade-value">{currentGrade}</span>
              <span
                className="edt-card-trend"
                data-trend={trend}
                aria-label={`Trend: ${TREND_LABELS[trend] ?? trend}`}
              >
                <span aria-hidden="true">{trendArrow}</span>
                <span className="edt-sr-only">
                  {TREND_LABELS[trend] ?? trend}
                </span>
              </span>
            </div>
          )}

          <dl className="edt-card-kpis">
            <div className="edt-kpi">
              <dt>GPA</dt>
              <dd className="edt-num">{gpa != null ? gpa.toFixed(1) : "—"}</dd>
            </div>
            <div className="edt-kpi">
              <dt>Missing</dt>
              <dd className="edt-num">{missing ?? "—"}</dd>
            </div>
            <div className="edt-kpi">
              <dt>Attend.</dt>
              <dd className="edt-num">
                {attendance != null ? `${attendance}%` : "—"}
              </dd>
            </div>
          </dl>

          {notes && <p className="edt-card-notes">{notes}</p>}
        </article>
      );
    },

    StudentProfile: ({ props }) => {
      const studentId = asText(props.studentId);
      const name = asText(props.name);
      const initials = asText(props.photoInitials);
      const gradeLevel = asText(props.gradeLevel);
      const advisor = asText(props.advisor);
      const currentGrade = asText(props.currentGrade);
      const gpa = asNumber(props.gpa);
      const attendance = asNumber(props.attendancePct);
      const missing = asNumber(props.missingAssignments);
      const trend = asText(props.trend) || "steady";
      const trendArrow = asText(props.trendArrow) || "→";
      const risk = asText(props.riskLevel) || "ok";
      const notes = asText(props.notes);
      const lastOutreach = asText(props.lastOutreach);

      const gradeHistory = pickArray<{ term: string; grade_pct: number }>(
        props.gradeHistory,
      );
      const courses = pickArray<{
        name: string;
        instructor: string;
        grade: string;
        gpa: number;
      }>(props.courses);
      const recent = pickArray<{
        title: string;
        status: string;
        due: string;
        points?: number | null;
      }>(props.recentAssignments);

      return (
        <section
          data-catalog-style="edtech"
          className="edt-profile"
          data-risk={risk}
        >
          <header className="edt-profile-head">
            <div className="edt-avatar edt-avatar-lg" aria-hidden="true">
              {initials || name.slice(0, 2).toUpperCase()}
            </div>
            <div className="edt-profile-headtext">
              <h2 className="edt-profile-name">{name}</h2>
              <p className="edt-profile-meta">
                {[gradeLevel, advisor].filter(Boolean).join(" · ")}
                {studentId && (
                  <span className="edt-card-sid"> · {studentId}</span>
                )}
              </p>
            </div>
            <RiskPill level={risk} />
          </header>

          <dl className="edt-profile-kpis">
            <div className="edt-kpi edt-kpi-big">
              <dt>Current</dt>
              <dd className="edt-num edt-num-lg">{currentGrade || "—"}</dd>
            </div>
            <div className="edt-kpi edt-kpi-big">
              <dt>GPA</dt>
              <dd className="edt-num edt-num-lg">
                {gpa != null ? gpa.toFixed(1) : "—"}
              </dd>
            </div>
            <div className="edt-kpi edt-kpi-big">
              <dt>Missing</dt>
              <dd className="edt-num edt-num-lg">{missing ?? "—"}</dd>
            </div>
            <div className="edt-kpi edt-kpi-big">
              <dt>Attendance</dt>
              <dd className="edt-num edt-num-lg">
                {attendance != null ? `${attendance}%` : "—"}
              </dd>
            </div>
            <div className="edt-kpi edt-kpi-big">
              <dt>Trend</dt>
              <dd className="edt-num edt-num-lg" data-trend={trend}>
                <span aria-hidden="true">{trendArrow}</span>{" "}
                <span style={{ fontSize: "1rem", verticalAlign: "middle" }}>
                  {TREND_LABELS[trend] ?? trend}
                </span>
              </dd>
            </div>
          </dl>

          <div className="edt-profile-grid">
            <div className="edt-panel">
              <h3 className="edt-panel-title">Grade history</h3>
              <GradeHistoryChart
                points={gradeHistory}
                ariaLabel={`Grade history line chart for ${name}`}
              />
            </div>

            <div className="edt-panel">
              <h3 className="edt-panel-title">Courses</h3>
              {courses.length === 0 ? (
                <p className="edt-empty">No courses on file.</p>
              ) : (
                <table className="edt-table" aria-label={`Courses for ${name}`}>
                  <thead>
                    <tr>
                      <th scope="col">Course</th>
                      <th scope="col">Instructor</th>
                      <th scope="col" className="edt-num">Grade</th>
                      <th scope="col" className="edt-num">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c, i) => (
                      <tr key={`${c.name}-${i}`}>
                        <td>{c.name}</td>
                        <td>{c.instructor}</td>
                        <td className="edt-num">{c.grade}</td>
                        <td className="edt-num">
                          {typeof c.gpa === "number" ? c.gpa.toFixed(1) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="edt-panel edt-panel-wide">
              <h3 className="edt-panel-title">Recent assignments</h3>
              {recent.length === 0 ? (
                <p className="edt-empty">No recent activity.</p>
              ) : (
                <ul className="edt-assignment-list">
                  {recent.map((a, i) => (
                    <li
                      key={`${a.title}-${i}`}
                      className="edt-assignment-item"
                      data-status={a.status}
                    >
                      <span className="edt-assignment-title">{a.title}</span>
                      <span
                        className="edt-status"
                        data-status={a.status}
                        aria-label={`Status: ${STATUS_LABELS[a.status] ?? a.status}`}
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                      <span className="edt-assignment-meta">
                        {a.due && <span>Due {a.due}</span>}
                        {typeof a.points === "number" && (
                          <span className="edt-num">{a.points} pts</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {notes && (
            <aside
              className="edt-panel edt-panel-notes"
              aria-label={`Notes about ${name}`}
            >
              <h3 className="edt-panel-title">Advisor notes</h3>
              <p>{notes}</p>
              {lastOutreach && (
                <p className="edt-meta">Last outreach: {lastOutreach}</p>
              )}
            </aside>
          )}
        </section>
      );
    },

    AssignmentStatusTable: ({ props }) => {
      const title = asText(props.title);
      const course = asText(props.course);
      const instructor = asText(props.instructor);
      const due = asText(props.due);
      const totalPoints = asNumber(props.totalPoints);

      const rows = pickArray<{
        student_id: string;
        student_name: string;
        status: string;
        points: number | null;
        due: string;
      }>(props.rows);

      const [sort, setSort] = useState<{
        key: "student_name" | "status" | "points" | "due";
        dir: "asc" | "desc";
      }>({ key: "status", dir: "asc" });

      const sorted = useMemo(() => {
        const order = sort.dir === "asc" ? 1 : -1;
        const statusRank: Record<string, number> = {
          missing: 0,
          late: 1,
          submitted: 2,
          graded: 3,
          "not assigned": 4,
        };
        return [...rows].sort((a, b) => {
          if (sort.key === "status") {
            return (
              ((statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)) *
              order
            );
          }
          if (sort.key === "points") {
            const ap = typeof a.points === "number" ? a.points : -1;
            const bp = typeof b.points === "number" ? b.points : -1;
            return (ap - bp) * order;
          }
          const av = String((a as Record<string, unknown>)[sort.key] ?? "");
          const bv = String((b as Record<string, unknown>)[sort.key] ?? "");
          return av.localeCompare(bv) * order;
        });
      }, [rows, sort]);

      const toggle = (key: typeof sort.key) => {
        setSort((prev) =>
          prev.key === key
            ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { key, dir: "asc" },
        );
      };

      const sortLabel = (key: typeof sort.key) =>
        sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

      return (
        <section data-catalog-style="edtech" className="edt-section">
          <header className="edt-section-head">
            {title && <h2 className="edt-section-title">{title}</h2>}
            <p className="edt-section-subtitle">
              {[course, instructor && `with ${instructor}`, due && `due ${due}`]
                .filter(Boolean)
                .join(" · ")}
              {totalPoints != null && ` · ${totalPoints} pts`}
            </p>
            <div className="edt-divider" aria-hidden="true" />
          </header>

          <div className="edt-table-wrap">
            <table
              className="edt-table edt-table-zebra"
              aria-label={`Assignment status for ${title}`}
            >
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="edt-sort-btn"
                      onClick={() => toggle("student_name")}
                    >
                      Student{sortLabel("student_name")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="edt-sort-btn"
                      onClick={() => toggle("status")}
                    >
                      Status{sortLabel("status")}
                    </button>
                  </th>
                  <th scope="col" className="edt-num">
                    <button
                      type="button"
                      className="edt-sort-btn"
                      onClick={() => toggle("points")}
                    >
                      Points{sortLabel("points")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="edt-sort-btn"
                      onClick={() => toggle("due")}
                    >
                      Due{sortLabel("due")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={`${r.student_id}-${i}`} data-status={r.status}>
                    <td>{r.student_name}</td>
                    <td>
                      <span
                        className="edt-status"
                        data-status={r.status}
                        aria-label={`Status: ${STATUS_LABELS[r.status] ?? r.status}`}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="edt-num">
                      {typeof r.points === "number" ? r.points : "—"}
                    </td>
                    <td>{r.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    },

    OutreachBatchDraft: ({ props, children }) => {
      const items = Array.isArray(props.drafts) ? props.drafts : [];
      return (
        <div data-catalog-style="edtech" className="edt-outreach-list">
          {renderTemplatedChildren(items, children)}
        </div>
      );
    },

    OutreachDraftRow: ({ props, dispatch }) => {
      const studentId = asText(props.studentId);
      const studentName = asText(props.studentName);
      const parentName = asText(props.parentName);
      const parentEmail = asText(props.parentEmail);
      const subject = asText(props.subject);
      const body = asText(props.body);
      const risk = asText(props.riskLevel) || "ok";

      const [decision, setDecision] = useState<
        null | "sent" | "edited" | "skipped"
      >(null);

      const click = (
        which: "send" | "edit" | "skip",
        action: unknown,
      ) => {
        if (decision) return;
        if (action && dispatch) {
          dispatch(action as Parameters<typeof dispatch>[0]);
        }
        setDecision(
          which === "send" ? "sent" : which === "edit" ? "edited" : "skipped",
        );
      };

      const stateLabel =
        decision === "sent"
          ? "Sent"
          : decision === "edited"
            ? "Editing"
            : decision === "skipped"
              ? "Skipped"
              : null;

      return (
        <article
          className="edt-outreach-row"
          data-risk={risk}
          data-decision={decision ?? "pending"}
          aria-label={`Outreach draft for ${parentName || studentName}`}
        >
          <header className="edt-outreach-head">
            <div>
              <p className="edt-outreach-to">
                <span className="edt-meta-label">To</span>{" "}
                <strong>{parentName || "Parent"}</strong>{" "}
                {parentEmail && (
                  <span className="edt-meta edt-meta-mono">
                    &lt;{parentEmail}&gt;
                  </span>
                )}
              </p>
              <p className="edt-outreach-re">
                <span className="edt-meta-label">Re</span>{" "}
                <span className="edt-meta">{studentName}</span>
                {studentId && (
                  <span className="edt-card-sid"> · {studentId}</span>
                )}
              </p>
            </div>
            <RiskPill level={risk} />
          </header>

          <h3 className="edt-outreach-subject">{subject}</h3>
          <p className="edt-outreach-body">{body}</p>

          <footer
            className="edt-outreach-actions"
            role="group"
            aria-label={`Actions for ${studentName} outreach`}
          >
            {stateLabel ? (
              <span
                className="edt-outreach-state"
                data-decision={decision ?? "pending"}
              >
                {stateLabel}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="edt-btn edt-btn-primary"
                  onClick={() => click("send", props.sendAction)}
                >
                  Send
                </button>
                <button
                  type="button"
                  className="edt-btn"
                  onClick={() => click("edit", props.editAction)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="edt-btn edt-btn-ghost"
                  onClick={() => click("skip", props.skipAction)}
                >
                  Skip
                </button>
              </>
            )}
          </footer>
        </article>
      );
    },

    PlaceholderText: ({ props }) => (
      <p data-catalog-style="edtech" className="edt-placeholder">
        {asText(props.text)}
      </p>
    ),
  };
