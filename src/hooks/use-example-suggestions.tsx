/**
 * Suggestion pills shown in the chat UI. Each suggestion triggers a specific
 * demo feature when clicked.
 *
 * Ordered to match the PortKit on-stage demo script (DEMO.md):
 * dashboard → drill-in → team load → status draft.
 *
 * Showcase mode (showcase.json) controls which pills are visually highlighted.
 * Highlight styling: globals.css (.a2ui-highlight, .opengenui-highlight)
 * A2UI agent tools: agent/src/tools/*.py (canonical: risk_register.py)
 * A2UI catalog: src/app/declarative-generative-ui/
 */
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";
import showcaseConfig from "../../showcase.json";

const showcase = showcaseConfig.showcase;

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      {
        title: "Weekly Overview (A2UI)",
        message: "What's going on this week?",
        className: showcase === "a2ui" ? "a2ui-highlight" : undefined,
      },
      {
        title: "Drill Into a Project (A2UI)",
        message: "Drill into Orion.",
        className: showcase === "a2ui" ? "a2ui-highlight" : undefined,
      },
      {
        title: "Team Load (A2UI)",
        message: "Who's overloaded?",
        className: showcase === "a2ui" ? "a2ui-highlight" : undefined,
      },
      {
        title: "Draft Status Update (A2UI)",
        message: "Draft a status update for Orion.",
        className: showcase === "a2ui" ? "a2ui-highlight" : undefined,
      },
    ],
    available: "always",
  });
};
