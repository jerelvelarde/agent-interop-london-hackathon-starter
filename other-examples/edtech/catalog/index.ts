/**
 * Edtech Catalog — public entry point.
 *
 * Wires the catalog definitions (schemas) to their React renderers via
 * `createCatalog`. Consumers import `edtechCatalog` and pass it to the
 * A2UI renderer's catalog prop. The string id (`copilotkit://edtech-catalog`)
 * is what the agent references when it emits an envelope that should be
 * rendered against this catalog instead of the default dashboard catalog.
 *
 * Pattern mirrors `src/app/declarative-generative-ui/index.ts` (canonical
 * dashboard catalog), with the catalog id swapped for the legal surface.
 */

import { createCatalog } from "@copilotkit/a2ui-renderer";
import { edtechCatalogDefinitions } from "./definitions";
import { edtechCatalogRenderers } from "./renderers";

export const edtechCatalog = createCatalog(
  edtechCatalogDefinitions,
  edtechCatalogRenderers,
  { catalogId: "copilotkit://edtech-catalog" },
);

export { edtechCatalogDefinitions } from "./definitions";
export type { EdtechCatalogDefinitions } from "./definitions";
