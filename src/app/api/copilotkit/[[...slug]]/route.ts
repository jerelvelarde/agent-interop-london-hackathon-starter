import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { handle } from "hono/vercel";

const defaultAgent = new LangGraphAgent({
  deploymentUrl:
    process.env.AGENT_URL ||
    process.env.LANGGRAPH_DEPLOYMENT_URL ||
    "http://localhost:8123",
  graphId: "sample_agent",
  langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Legal Contract Review agent (graph: legal_review_agent)
//
// Sibling agent that powers the /other-examples/legal-contract-review
// surface. Points at the same LangGraph deployment as `defaultAgent` —
// both graphs (`sample_agent`, `legal_review_agent`) are registered in
// `agent/langgraph.json`.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const legalAgent = new LangGraphAgent({
  deploymentUrl:
    process.env.AGENT_URL ||
    process.env.LANGGRAPH_DEPLOYMENT_URL ||
    "http://localhost:8123",
  graphId: "legal_review_agent",
  langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMIZATION SEAM #6 — Optional A2A bolt-on (Track 1 interop)
//
// Dormant unless A2A_AGENT_URL is set. When set, wraps the LangGraph
// orchestrator with @ag-ui/a2a-middleware so the orchestrator can
// delegate to remote A2A agents via a `send_message_to_a2a_agent`
// tool. Comma-separate the env var to point at multiple A2A agents.
//
// BEFORE plugging in a partner agent: run `pnpm check-a2a <url>` to
// verify it emits A2UI v0.9 envelopes. See a2a/README.md for the
// envelope-shape contract and a2a/sample-subagent/ for a toy
// A2A server you can boot locally to try the seam.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const a2aAgentUrls = (process.env.A2A_AGENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Resolve the orchestration agent: bare LangGraph in the dormant path,
// A2A-wrapped LangGraph when A2A_AGENT_URL is set. Top-level await is
// supported in Next.js ESM route handlers; it runs once at module init.
// The cast is needed because @ag-ui/a2a-middleware ships its own
// @ag-ui/client peer dep that may version-skew from @copilotkit/runtime's.
const orchestrationAgent =
  a2aAgentUrls.length === 0
    ? defaultAgent
    : await (async () => {
        const { A2AMiddlewareAgent } = await import("@ag-ui/a2a-middleware");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapped = new A2AMiddlewareAgent({
          agentUrls: a2aAgentUrls,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orchestrationAgent: defaultAgent as any,
          description:
            "A2UI hackathon orchestrator with optional A2A subagent delegation",
          instructions: process.env.A2A_INSTRUCTIONS,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return wrapped as unknown as typeof defaultAgent;
      })();

const runtime = new CopilotRuntime({
  agents: { default: orchestrationAgent, legal: legalAgent },
  runner: new InMemoryAgentRunner(),
  openGenerativeUI: true,
  a2ui: {
    injectA2UITool: false,
  },
  mcpApps: {
    servers: [
      {
        type: "http",
        url: process.env.MCP_SERVER_URL || "https://mcp.excalidraw.com",
        serverId: "example_mcp_app",
      },
    ],
  },
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
