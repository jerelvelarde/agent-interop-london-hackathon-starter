/**
 * Legal Paper Catalog — React Renderers
 *
 * Each renderer maps a component name from definitions.ts to a React
 * implementation. Props are type-checked against the Zod schemas via
 * `CatalogRenderers<LegalPaperCatalogDefinitions>`.
 *
 * All visual styling is owned by `./theme.css` (scoped under
 * `[data-catalog-style="legal-paper"]`) so this file stays focused on
 * markup, semantics, and a11y. Pattern mirrors
 * `src/app/declarative-generative-ui/renderers.tsx`.
 */
"use client";

import React, { useState } from "react";
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import type { LegalPaperCatalogDefinitions } from "./definitions";

// ─── Shared helpers ──────────────────────────────────────────────────

/**
 * Some props arrive as either a literal value or a resolved path-binding
 * value. The GenericBinder resolves bindings to strings/values at runtime
 * but the upstream type still includes the `{ path }` shape. Coerce to
 * a renderable primitive defensively.
 */
function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // Unresolved path binding fallback — render nothing visible rather than
  // dumping `[object Object]`.
  if (typeof value === "object" && value !== null && "path" in (value as object)) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * Render helper for a single child slot. Accepts either a literal
 * ComponentId string or a binder-resolved `{ id, basePath }` reference
 * (what a `{ componentId, path }` template binding becomes after the
 * GenericBinder runs). Returns `null` for anything unrecognized so a
 * stale binding does not crash the surface.
 */
function renderChildRef(
  ref: unknown,
  children: (id: string, basePath?: string) => React.ReactNode,
): React.ReactNode {
  if (typeof ref === "string") {
    return children(ref);
  }
  if (
    ref &&
    typeof ref === "object" &&
    "id" in (ref as object) &&
    typeof (ref as { id: unknown }).id === "string"
  ) {
    const r = ref as { id: string; basePath?: string };
    return children(r.id, r.basePath);
  }
  return null;
}

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  critical: "Critical risk",
};

const MARGIN_SEVERITY_LABELS: Record<string, string> = {
  info: "Informational note",
  warning: "Warning",
  critical: "Critical note",
};

// ─── Renderers (type-checked against schema definitions) ─────────────

export const legalPaperCatalogRenderers: CatalogRenderers<LegalPaperCatalogDefinitions> =
  {
    LegalDocumentShell: ({ props, children }) => {
      const items = Array.isArray(props.children) ? props.children : [];
      const title = asText(props.title);
      const effective = asText(props.effectiveDate);
      const parties = Array.isArray(props.parties) ? props.parties : [];
      const verdictChildId =
        typeof props.verdictChild === "string" ? props.verdictChild : null;
      const renderChild = children as unknown as (
        id: string,
        basePath?: string,
      ) => React.ReactNode;

      return (
        <div data-catalog-style="legal-paper">
          <div
            className="lp-disclaimer"
            role="alert"
            aria-live="polite"
          >
            Demo only — not legal advice.
          </div>

          <article className="lp-shell">
            <header className="lp-header">
              {title && <h1 className="lp-title">{title}</h1>}
              {parties.length > 0 && (
                <p className="lp-parties">
                  <strong>Between:</strong> {parties.join(" and ")}
                </p>
              )}
              {effective && (
                <p className="lp-effective-date">
                  Effective: {effective}
                </p>
              )}
            </header>

            {verdictChildId && (
              <div className="lp-verdict-slot">
                {renderChild(verdictChildId)}
              </div>
            )}

            <div className="lp-body">
              {items.map((item: unknown, i: number) => {
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
                      {renderChild(ref.id, ref.basePath)}
                    </React.Fragment>
                  );
                }
                return null;
              })}
            </div>
          </article>
        </div>
      );
    },

    Verdict: ({ props }) => {
      const tone = props.tone ?? "neutral";
      const headline = asText(props.headline);
      const summary = asText(props.summary);
      return (
        <section className="lp-verdict" data-tone={tone}>
          {headline && (
            <p className="lp-verdict-headline">{headline}</p>
          )}
          {summary && <p className="lp-verdict-summary">{summary}</p>}
        </section>
      );
    },

    Clause: ({ props, children }) => {
      const number = asText(props.number);
      const heading = asText(props.heading);
      const body = asText(props.body);
      const risk = props.risk;
      // redlineChildren resolves to either a literal string[] (catalog
      // declared an array of ComponentIds) or an array of `{ id, basePath }`
      // refs (template binding expanded by the GenericBinder). Anything
      // else (unresolved binding, missing prop) renders nothing.
      const redlines: unknown[] = Array.isArray(props.redlineChildren)
        ? (props.redlineChildren as unknown[])
        : [];
      const showBadge = risk && risk !== "none";
      const renderChild = children as unknown as (
        id: string,
        basePath?: string,
      ) => React.ReactNode;

      return (
        <section className="lp-clause" data-clause-number={number}>
          <div className="lp-clause-main">
            <div className="lp-clause-header">
              {number && (
                <span className="lp-clause-number">{number}</span>
              )}
              {heading && (
                <span className="lp-clause-heading">{heading}</span>
              )}
              {showBadge && (
                <span
                  className="lp-risk-badge"
                  data-level={risk}
                  aria-label={SEVERITY_LABELS[risk as string] ?? `${risk} risk`}
                >
                  {risk}
                </span>
              )}
            </div>
            {body && <p className="lp-clause-body">{body}</p>}
            {redlines.length > 0 && (
              <div className="lp-clause-redlines">
                {redlines.map((ref, i) => {
                  const key =
                    typeof ref === "string"
                      ? `${ref}-${i}`
                      : ref &&
                          typeof ref === "object" &&
                          "id" in (ref as object)
                        ? `${(ref as { id: string }).id}-${i}`
                        : `redline-${i}`;
                  return (
                    <React.Fragment key={key}>
                      {renderChildRef(ref, renderChild)}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {props.marginChild != null && renderChildRef(props.marginChild, renderChild) && (
            <aside
              className="lp-clause-margin"
              aria-label={`Annotation for clause ${number || "section"}`}
            >
              {renderChildRef(props.marginChild, renderChild)}
            </aside>
          )}
        </section>
      );
    },

    Redline: ({ props }) => {
      const redlineId = asText(props.redlineId);
      const original = asText(props.original);
      const suggested = asText(props.suggested);
      const rationale = asText(props.rationale);
      const status = asText(props.status) || "pending";

      const isAccepted = status === "accepted";
      const isRejected = status === "rejected";

      return (
        <div
          className="lp-redline"
          data-redline-id={redlineId}
          data-status={status}
        >
          <span className="lp-sr-only">
            Suggested change. Original: {original}. Suggested: {suggested}.
            {rationale ? ` ${rationale}.` : ""}
          </span>

          <div aria-hidden="true">
            {!isAccepted && (
              <>
                <span className="lp-redline-original">{original}</span>{" "}
                <span>→</span>{" "}
              </>
            )}
            <span className="lp-redline-suggested">{suggested}</span>
            {isAccepted && (
              <>
                {" "}
                <span className="lp-redline-status-accepted">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Accepted
                </span>
              </>
            )}
            {isRejected && (
              <>
                {" "}
                <span style={{ fontSize: "0.8rem", color: "var(--paper-muted)" }}>
                  (rejected)
                </span>
              </>
            )}
          </div>

          {rationale && (
            <p className="lp-redline-rationale">{rationale}</p>
          )}
        </div>
      );
    },

    MarginNote: ({ props, children }) => {
      const body = asText(props.body);
      const severity = props.severity ?? "info";
      const ariaLabel = MARGIN_SEVERITY_LABELS[severity] ?? "Annotation";
      return (
        <div
          className="lp-margin-note"
          data-severity={severity}
          aria-label={ariaLabel}
        >
          {body && <p className="lp-margin-note-body">{body}</p>}
          {props.citation && (
            <div className="lp-margin-note-citation">
              {children(props.citation)}
            </div>
          )}
        </div>
      );
    },

    Citation: ({ props }) => {
      const label = asText(props.label);
      const url = asText(props.url);
      const pinpoint = asText(props.pinpoint);

      const body = (
        <>
          {label}
          {pinpoint && (
            <span className="lp-citation-pinpoint">{pinpoint}</span>
          )}
        </>
      );

      if (url) {
        return (
          <a
            className="lp-citation"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {body}
          </a>
        );
      }
      return <cite className="lp-citation">{body}</cite>;
    },

    RiskBadge: ({ props }) => {
      const level = props.level;
      const label = asText(props.label);
      const display = label || level;
      const ariaLabel = SEVERITY_LABELS[level] ?? `${level} risk`;
      return (
        <span
          className="lp-risk-badge"
          data-level={level}
          aria-label={ariaLabel}
        >
          {display}
        </span>
      );
    },

    AcceptRejectBar: ({ props, dispatch }) => {
      const redlineId = asText(props.redlineId);
      const [done, setDone] = useState<null | "accepted" | "rejected">(null);

      const onAccept = () => {
        if (done) return;
        if (props.acceptAction && dispatch) {
          dispatch(props.acceptAction);
        }
        setDone("accepted");
      };
      const onReject = () => {
        if (done) return;
        if (props.rejectAction && dispatch) {
          dispatch(props.rejectAction);
        }
        setDone("rejected");
      };

      return (
        <div
          className="lp-accept-reject-bar"
          role="group"
          aria-label={`Redline ${redlineId} actions`}
        >
          <button
            type="button"
            className="lp-accept-btn"
            onClick={onAccept}
            disabled={done !== null}
            aria-pressed={done === "accepted"}
          >
            {done === "accepted" ? "Accepted" : "Accept"}
          </button>
          <button
            type="button"
            className="lp-reject-btn"
            onClick={onReject}
            disabled={done !== null}
            aria-pressed={done === "rejected"}
          >
            {done === "rejected" ? "Rejected" : "Reject"}
          </button>
        </div>
      );
    },

    LegalDivider: () => (
      <hr className="lp-divider" role="separator" />
    ),
  };
