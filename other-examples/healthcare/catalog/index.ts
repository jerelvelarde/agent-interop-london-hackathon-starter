/**
 * Healthcare Catalog — public entry point.
 *
 * Wires the catalog definitions (Zod schemas) to their React renderers via
 * `createCatalog`. Consumers import `healthcareCatalog` and pass it to the
 * A2UI renderer's catalog prop. The string id (`copilotkit://healthcare-catalog`)
 * is what the agent references when it emits an envelope that should be
 * rendered against this catalog instead of the default dashboard catalog.
 *
 * Pattern mirrors `other-examples/legal-contract-review/catalog/index.ts`.
 */

import { createCatalog } from "@copilotkit/a2ui-renderer";
import { healthcareCatalogDefinitions } from "./definitions";
import { healthcareCatalogRenderers } from "./renderers";

export const healthcareCatalog = createCatalog(
  healthcareCatalogDefinitions,
  healthcareCatalogRenderers,
  { catalogId: "copilotkit://healthcare-catalog" },
);

export { healthcareCatalogDefinitions } from "./definitions";
export type { HealthcareCatalogDefinitions } from "./definitions";
