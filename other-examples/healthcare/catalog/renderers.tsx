/**
 * Healthcare Catalog — React Renderers
 *
 * Each renderer maps a component name from definitions.ts to a React
 * implementation. Props are type-checked against the Zod schemas via
 * `CatalogRenderers<HealthcareCatalogDefinitions>`.
 *
 * All visual styling is owned by `./theme.css` (scoped under
 * `[data-catalog-style="healthcare"]`) so this file stays focused on
 * markup, semantics, and a11y. Pattern mirrors the legal-paper renderers.
 *
 * Visual rules (spec):
 *   - Clinical teal primary (#0b8e83), seafoam surface tints, deep
 *     navy text on cream.
 *   - Inter for prose, JetBrains Mono for numerals (vital readings).
 *   - Hairline 1px borders. Soft drop shadow. NO animations.
 */
"use client";

import React from "react";
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import type { HealthcareCatalogDefinitions } from "./definitions";

// ─── Shared helpers ──────────────────────────────────────────────

/**
 * Coerce a prop value (which may be a literal or a `{ path }` binding)
 * to a renderable string. GenericBinder resolves bindings at runtime
 * but the upstream type still includes the `{ path }` shape; render
 * nothing rather than dumping `[object Object]`.
 */
function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "path" in (value as object)
  ) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  stable: "Stable",
  watch: "Watch",
  critical: "Critical",
};

// ─── Tiny inline SVG icons (Lucide-style stroke set) ─────────────

function Icon({ name, size = 14 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": "true" as const,
  };
  switch (name) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Vitals chart (hand-rolled SVG to avoid a Recharts dep blowup) ─

type Reading = {
  timeLabel?: unknown;
  heartRate?: unknown;
  systolicBp?: unknown;
  diastolicBp?: unknown;
  respRate?: unknown;
  tempC?: unknown;
  o2Sat?: unknown;
  bpLabel?: unknown;
  note?: unknown;
};

function VitalsChartSvg({ readings }: { readings: Reading[] }) {
  const w = 640;
  const h = 200;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const labels = readings.map((r, i) => asText(r.timeLabel) || `T${i}`);
  const hr = readings.map((r) => asNumber(r.heartRate));
  const sbp = readings.map((r) => asNumber(r.systolicBp));
  const temp = readings.map((r) => asNumber(r.tempC));
  const o2 = readings.map((r) => asNumber(r.o2Sat));

  // Determine y ranges per series (cap to known reasonable bounds).
  const ranges = {
    hr: { min: 50, max: 130, color: "var(--hc-line-hr)" },
    sbp: { min: 80, max: 160, color: "var(--hc-line-bp)" },
    temp: { min: 36, max: 39, color: "var(--hc-line-temp)" },
    o2: { min: 85, max: 100, color: "var(--hc-line-o2)" },
  };

  function pathFor(values: (number | null)[], range: { min: number; max: number }) {
    const pts: string[] = [];
    const n = values.length;
    values.forEach((v, i) => {
      if (v == null) return;
      const x = padL + (n <= 1 ? 0 : (innerW * i) / (n - 1));
      const clamped = Math.max(range.min, Math.min(range.max, v));
      const y =
        padT + innerH - ((clamped - range.min) / (range.max - range.min)) * innerH;
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
    return pts.join(" ");
  }

  const dotsFor = (values: (number | null)[], range: { min: number; max: number }) => {
    const n = values.length;
    return values
      .map((v, i) => {
        if (v == null) return null;
        const x = padL + (n <= 1 ? 0 : (innerW * i) / (n - 1));
        const clamped = Math.max(range.min, Math.min(range.max, v));
        const y =
          padT + innerH - ((clamped - range.min) / (range.max - range.min)) * innerH;
        return { x, y, i };
      })
      .filter((p): p is { x: number; y: number; i: number } => p !== null);
  };

  // Gridlines: 4 horizontals.
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + innerH * f);

  if (readings.length === 0) {
    return (
      <div className="hc-vitals-empty" role="status">
        No vitals readings in the last 24 hours.
      </div>
    );
  }

  return (
    <div className="hc-vitals-chart-wrap">
      <svg
        className="hc-vitals-chart"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Vitals trend over the last 24 hours: heart rate, systolic blood pressure, temperature, oxygen saturation."
      >
        {grid.map((y, i) => (
          <line
            key={`g-${i}`}
            x1={padL}
            x2={w - padR}
            y1={y}
            y2={y}
            className="hc-vitals-grid"
          />
        ))}
        {/* Series paths */}
        <path d={pathFor(hr, ranges.hr)} className="hc-vitals-line" style={{ stroke: ranges.hr.color }} />
        <path d={pathFor(sbp, ranges.sbp)} className="hc-vitals-line" style={{ stroke: ranges.sbp.color }} />
        <path d={pathFor(temp, ranges.temp)} className="hc-vitals-line" style={{ stroke: ranges.temp.color }} />
        <path d={pathFor(o2, ranges.o2)} className="hc-vitals-line" style={{ stroke: ranges.o2.color }} />
        {/* Dots */}
        {dotsFor(hr, ranges.hr).map((p) => (
          <circle key={`hr-${p.i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: ranges.hr.color }} />
        ))}
        {dotsFor(sbp, ranges.sbp).map((p) => (
          <circle key={`sbp-${p.i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: ranges.sbp.color }} />
        ))}
        {dotsFor(temp, ranges.temp).map((p) => (
          <circle key={`temp-${p.i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: ranges.temp.color }} />
        ))}
        {dotsFor(o2, ranges.o2).map((p) => (
          <circle key={`o2-${p.i}`} cx={p.x} cy={p.y} r={2.5} style={{ fill: ranges.o2.color }} />
        ))}
        {/* X-axis labels (every other tick to avoid crowding) */}
        {labels.map((l, i) => {
          if (i % Math.max(1, Math.ceil(labels.length / 6)) !== 0 && i !== labels.length - 1)
            return null;
          const n = labels.length;
          const x = padL + (n <= 1 ? 0 : (innerW * i) / (n - 1));
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={h - 8}
              className="hc-vitals-axis-label"
              textAnchor="middle"
            >
              {l}
            </text>
          );
        })}
      </svg>
      <ul className="hc-vitals-legend" aria-label="Chart legend">
        <li><span className="hc-legend-swatch" style={{ background: "var(--hc-line-hr)" }} /> HR</li>
        <li><span className="hc-legend-swatch" style={{ background: "var(--hc-line-bp)" }} /> Systolic BP</li>
        <li><span className="hc-legend-swatch" style={{ background: "var(--hc-line-temp)" }} /> Temp (°C)</li>
        <li><span className="hc-legend-swatch" style={{ background: "var(--hc-line-o2)" }} /> O2 sat</li>
      </ul>
    </div>
  );
}

// ─── Renderers (type-checked against schema definitions) ─────────

export const healthcareCatalogRenderers: CatalogRenderers<HealthcareCatalogDefinitions> =
  {
    WardShell: ({ props, children }) => {
      const items: unknown[] = Array.isArray(props.children) ? props.children : [];
      const total = asNumber(props.censusTotal);
      const alerts = asNumber(props.censusAlerts);
      const stable = asNumber(props.stableCount);
      const watch = asNumber(props.watchCount);
      const critical = asNumber(props.criticalCount);
      const title = asText(props.title);

      return (
        <div data-catalog-style="healthcare" className="hc-shell">
          <div className="hc-strip" role="status" aria-live="polite">
            <div className="hc-strip-left">
              {title && <span className="hc-strip-title">{title}</span>}
            </div>
            <div className="hc-strip-right" aria-label="Ward census">
              {total != null && (
                <span className="hc-pill hc-pill--total">
                  <Icon name="clipboard" /> <span className="hc-mono">{total}</span> census
                </span>
              )}
              {stable != null && (
                <span className="hc-pill hc-pill--stable">
                  <span className="hc-mono">{stable}</span> stable
                </span>
              )}
              {watch != null && (
                <span className="hc-pill hc-pill--watch">
                  <span className="hc-mono">{watch}</span> watch
                </span>
              )}
              {critical != null && (
                <span className="hc-pill hc-pill--critical">
                  <span className="hc-mono">{critical}</span> critical
                </span>
              )}
              {alerts != null && (
                <span className="hc-pill hc-pill--alert">
                  <Icon name="alert" /> <span className="hc-mono">{alerts}</span> alerts
                </span>
              )}
            </div>
          </div>
          <div className="hc-body">
            {items.map((item, i) => {
              if (typeof item === "string") {
                return (
                  <React.Fragment key={`${item}-${i}`}>
                    {children(item)}
                  </React.Fragment>
                );
              }
              if (
                item &&
                typeof item === "object" &&
                "id" in (item as object)
              ) {
                const ref = item as { id: string; basePath?: string };
                return (
                  <React.Fragment key={`${ref.id}-${i}`}>
                    {(children as unknown as (
                      id: string,
                      basePath?: string,
                    ) => React.ReactNode)(ref.id, ref.basePath)}
                  </React.Fragment>
                );
              }
              return null;
            })}
          </div>
          <footer className="hc-footer">
            Synthetic data · not for clinical use.
          </footer>
        </div>
      );
    },

    PatientRoster: ({ props, children }) => {
      const items: unknown[] = Array.isArray(props.patients) ? props.patients : [];
      const title = asText(props.title);
      return (
        <section className="hc-roster" aria-label={title || "Patient roster"}>
          {title && <h2 className="hc-roster-title">{title}</h2>}
          <div className="hc-roster-grid">
            {items.map((item, i) => {
              if (typeof item === "string") {
                return (
                  <React.Fragment key={`${item}-${i}`}>
                    {children(item)}
                  </React.Fragment>
                );
              }
              if (
                item &&
                typeof item === "object" &&
                "id" in (item as object)
              ) {
                const ref = item as { id: string; basePath?: string };
                return (
                  <React.Fragment key={`${ref.id}-${i}`}>
                    {(children as unknown as (
                      id: string,
                      basePath?: string,
                    ) => React.ReactNode)(ref.id, ref.basePath)}
                  </React.Fragment>
                );
              }
              return null;
            })}
          </div>
        </section>
      );
    },

    PatientCard: ({ props, dispatch }) => {
      const patientId = asText(props.patientId);
      const name = asText(props.name);
      const room = asText(props.room);
      const meta = asText(props.meta);
      const status = (asText(props.status) || "stable").toLowerCase();
      const statusLabel = asText(props.statusLabel) || STATUS_LABELS[status] || "Stable";
      const issue = asText(props.primaryIssue);
      const attending = asText(props.attending);
      const lastVitals = asText(props.lastVitalsAt);

      const onOpen = () => {
        if (props.action && dispatch) {
          dispatch(props.action);
        }
      };

      return (
        <article
          className="hc-card"
          data-status={status}
          data-patient-id={patientId}
          aria-label={`${name}${room ? `, room ${room}` : ""}, status ${statusLabel}`}
        >
          <header className="hc-card-header">
            <div className="hc-card-name-block">
              <h3 className="hc-card-name">{name}</h3>
              {meta && <p className="hc-card-meta hc-mono">{meta}</p>}
            </div>
            <span
              className="hc-status-pill"
              data-status={status}
              aria-label={`Status: ${statusLabel}`}
            >
              {statusLabel}
            </span>
          </header>
          {issue && <p className="hc-card-issue">{issue}</p>}
          <dl className="hc-card-meta-grid">
            {attending && (
              <>
                <dt>Attending</dt>
                <dd>{attending}</dd>
              </>
            )}
            {lastVitals && (
              <>
                <dt>Last vitals</dt>
                <dd className="hc-mono">{lastVitals.replace("T", " ")}</dd>
              </>
            )}
          </dl>
          {props.action && (
            <button
              type="button"
              className="hc-card-action"
              onClick={onOpen}
              aria-label={`Open chart for ${name}`}
            >
              Open chart <Icon name="chevron-right" />
            </button>
          )}
        </article>
      );
    },

    PatientDetail: ({ props, children }) => {
      const name = asText(props.patientName);
      const meta = asText(props.patientMeta);
      const status = (asText(props.status) || "stable").toLowerCase();
      const statusLabel = asText(props.statusLabel) || STATUS_LABELS[status] || "Stable";
      const issue = asText(props.primaryIssue);
      const attending = asText(props.attending);
      const allergies = asText(props.allergies);

      return (
        <section className="hc-detail" aria-label={`Patient detail: ${name}`}>
          <header className="hc-detail-header">
            <div className="hc-detail-title-block">
              <h2 className="hc-detail-name">{name}</h2>
              {meta && <p className="hc-detail-meta hc-mono">{meta}</p>}
            </div>
            <span
              className="hc-status-pill"
              data-status={status}
              aria-label={`Status: ${statusLabel}`}
            >
              {statusLabel}
            </span>
          </header>
          <dl className="hc-detail-grid">
            {issue && (
              <>
                <dt>Primary issue</dt>
                <dd>{issue}</dd>
              </>
            )}
            {attending && (
              <>
                <dt>Attending</dt>
                <dd>{attending}</dd>
              </>
            )}
            {allergies && (
              <>
                <dt>Allergies</dt>
                <dd>{allergies}</dd>
              </>
            )}
          </dl>
          {props.vitalsChild && (
            <div className="hc-detail-section">
              {children(props.vitalsChild)}
            </div>
          )}
          {props.medsChild && (
            <div className="hc-detail-section">
              {children(props.medsChild)}
            </div>
          )}
          {props.risksChild && (
            <div className="hc-detail-section">
              {children(props.risksChild)}
            </div>
          )}
        </section>
      );
    },

    VitalsChart: ({ props }) => {
      const readings: Reading[] = Array.isArray(props.readings)
        ? (props.readings as Reading[])
        : [];
      const windowHours = asNumber(props.windowHours) ?? 24;
      const latestHr = asNumber(props.latestHr);
      const latestBp = asText(props.latestBpLabel);
      const latestTemp = asNumber(props.latestTemp);
      const latestO2 = asNumber(props.latestO2);
      const title = asText(props.title) || `Vitals — last ${windowHours}h`;

      return (
        <div className="hc-vitals">
          <header className="hc-vitals-header">
            <h3 className="hc-vitals-title">
              <Icon name="activity" /> {title}
            </h3>
            <ul className="hc-vitals-latest" aria-label="Latest vital signs">
              {latestHr != null && (
                <li>
                  <span className="hc-vitals-latest-label">HR</span>
                  <span className="hc-vitals-latest-value hc-mono">{latestHr}</span>
                </li>
              )}
              {latestBp && (
                <li>
                  <span className="hc-vitals-latest-label">BP</span>
                  <span className="hc-vitals-latest-value hc-mono">{latestBp}</span>
                </li>
              )}
              {latestTemp != null && (
                <li>
                  <span className="hc-vitals-latest-label">Temp</span>
                  <span className="hc-vitals-latest-value hc-mono">{latestTemp.toFixed(1)}</span>
                </li>
              )}
              {latestO2 != null && (
                <li>
                  <span className="hc-vitals-latest-label">O2</span>
                  <span className="hc-vitals-latest-value hc-mono">{latestO2}</span>
                </li>
              )}
            </ul>
          </header>
          <VitalsChartSvg readings={readings} />
        </div>
      );
    },

    VitalsReading: ({ props }) => {
      const t = asText(props.timeLabel);
      const hr = asNumber(props.heartRate);
      const bp = asText(props.bpLabel);
      const rr = asNumber(props.respRate);
      const tempC = asNumber(props.tempC);
      const o2 = asNumber(props.o2Sat);
      const note = asText(props.note);
      return (
        <tr className="hc-vitals-row">
          <td className="hc-mono">{t}</td>
          <td className="hc-mono">{hr != null ? hr : "—"}</td>
          <td className="hc-mono">{bp || "—"}</td>
          <td className="hc-mono">{rr != null ? rr : "—"}</td>
          <td className="hc-mono">{tempC != null ? tempC.toFixed(1) : "—"}</td>
          <td className="hc-mono">{o2 != null ? o2 : "—"}</td>
          <td>{note}</td>
        </tr>
      );
    },

    MedsList: ({ props, children }) => {
      const items: unknown[] = Array.isArray(props.meds) ? props.meds : [];
      const title = asText(props.title) || "Active medications";
      return (
        <section className="hc-meds" aria-label={title}>
          <h3 className="hc-meds-title">
            <Icon name="clipboard" /> {title}
          </h3>
          <ul className="hc-meds-list">
            {items.map((item, i) => {
              if (typeof item === "string") {
                return (
                  <li key={`${item}-${i}`}>{children(item)}</li>
                );
              }
              if (
                item &&
                typeof item === "object" &&
                "id" in (item as object)
              ) {
                const ref = item as { id: string; basePath?: string };
                return (
                  <li key={`${ref.id}-${i}`}>
                    {(children as unknown as (
                      id: string,
                      basePath?: string,
                    ) => React.ReactNode)(ref.id, ref.basePath)}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </section>
      );
    },

    MedRow: ({ props }) => {
      const name = asText(props.name);
      const dose = asText(props.dose);
      const indication = asText(props.indication);
      return (
        <div className="hc-med-row">
          <span className="hc-med-name">{name}</span>
          {dose && <span className="hc-med-dose hc-mono">{dose}</span>}
          {indication && <span className="hc-med-indication">— {indication}</span>}
        </div>
      );
    },

    RiskFlagList: ({ props, children }) => {
      const items: unknown[] = Array.isArray(props.flags) ? props.flags : [];
      const title = asText(props.title) || "Risk flags";
      return (
        <section className="hc-risks" aria-label={title}>
          <h3 className="hc-risks-title">
            <Icon name="alert" /> {title}
          </h3>
          {items.length === 0 ? (
            <p className="hc-risks-empty">No active risk flags.</p>
          ) : (
            <ul className="hc-risks-list">
              {items.map((item, i) => {
                if (typeof item === "string") {
                  return (
                    <li key={`${item}-${i}`}>{children(item)}</li>
                  );
                }
                if (
                  item &&
                  typeof item === "object" &&
                  "id" in (item as object)
                ) {
                  const ref = item as { id: string; basePath?: string };
                  return (
                    <li key={`${ref.id}-${i}`}>
                      {(children as unknown as (
                        id: string,
                        basePath?: string,
                      ) => React.ReactNode)(ref.id, ref.basePath)}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          )}
        </section>
      );
    },

    RiskFlag: ({ props }) => {
      const severity = props.severity;
      const label = asText(props.label);
      const detail = asText(props.detail);
      const sevLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
      return (
        <div className="hc-risk" data-severity={severity}>
          <span className="hc-risk-pill" aria-label={`${sevLabel} severity`}>
            {sevLabel}
          </span>
          <div className="hc-risk-body">
            <p className="hc-risk-label">{label}</p>
            {detail && <p className="hc-risk-detail">{detail}</p>}
          </div>
        </div>
      );
    },

    HandoffNoteDraft: ({ props, dispatch }) => {
      const title = asText(props.title) || "Handoff note (draft)";
      const subtitle = asText(props.subtitle);
      const body = asText(props.body);
      const status = asText(props.status) || "draft";

      const onSend = () => {
        if (props.sendAction && dispatch) dispatch(props.sendAction);
      };
      const onEdit = () => {
        if (props.editAction && dispatch) dispatch(props.editAction);
      };
      const onDiscard = () => {
        if (props.discardAction && dispatch) dispatch(props.discardAction);
      };

      return (
        <section
          className="hc-handoff"
          data-status={status}
          aria-label={title}
        >
          <header className="hc-handoff-header">
            <div className="hc-handoff-title-block">
              <h2 className="hc-handoff-title">
                <Icon name="clipboard" /> {title}
              </h2>
              {subtitle && <p className="hc-handoff-subtitle">{subtitle}</p>}
            </div>
            <span className="hc-handoff-badge">{status.toUpperCase()}</span>
          </header>
          <textarea
            className="hc-handoff-body hc-mono"
            defaultValue={body}
            spellCheck={false}
            rows={Math.min(20, Math.max(8, body.split("\n").length))}
            aria-label="Handoff note body"
          />
          <div className="hc-handoff-actions" role="group" aria-label="Handoff actions">
            <button
              type="button"
              className="hc-handoff-btn hc-handoff-btn--send"
              onClick={onSend}
            >
              <Icon name="send" /> Send to night shift
            </button>
            <button
              type="button"
              className="hc-handoff-btn hc-handoff-btn--edit"
              onClick={onEdit}
            >
              <Icon name="edit" /> Edit
            </button>
            <button
              type="button"
              className="hc-handoff-btn hc-handoff-btn--discard"
              onClick={onDiscard}
            >
              <Icon name="trash" /> Discard
            </button>
          </div>
        </section>
      );
    },

    WardDivider: () => <hr className="hc-divider" role="separator" />,
  };
