import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";
import { handle } from "hono/vercel";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Host (v1) runtime endpoint — serves the legal-contract-review example.
//
// The pdf-analyst default at `/` runs on its OWN v2 runtime route
// (src/app/api/copilotkit-pdf/route.ts) against the FastAPI agents on
// :8123. This route hosts only the legal example now; the former PortKit
// `default` agent (graph `sample_agent`, via `LangGraphAgent`) was archived
// to other-examples/portkit/ during the pdf-analyst default swap.
//
// The legal agent is an AG-UI HTTP agent served by the same FastAPI process
// at /legal (see the backend). We talk to it via @ag-ui/client's HttpAgent
// instead of the (now-archived) LangGraph deployment client.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const legalAgent = new HttpAgent({
  url: process.env.LEGAL_AGENT_URL ?? "http://localhost:8123/legal",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMIZATION SEAM #6 — Optional A2A bolt-on (Track 1 interop)
//
// Dormant unless A2A_AGENT_URL is set. When set, wraps the orchestration
// agent with @ag-ui/a2a-middleware so it can delegate to remote A2A agents
// via a `send_message_to_a2a_agent` tool. Comma-separate the env var to
// point at multiple A2A agents.
//
// NOTE: with the pdf-analyst default swap, the former `default` agent this
// seam used to wrap was archived. The seam now wraps the `legal` agent so it
// stays exercised + non-breaking on this host route.
// TODO(S4): re-home the A2A seam to the default pdf agent on
// src/app/api/copilotkit-pdf/route.ts once that becomes the primary surface
// for interop demos.
//
// BEFORE plugging in a partner agent: run `pnpm check-a2a <url>` to verify it
// emits A2UI v0.9 envelopes. See a2a/README.md for the envelope-shape
// contract and a2a/sample-subagent/ for a toy A2A server you can boot.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const a2aAgentUrls = (process.env.A2A_AGENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Resolve the orchestration agent: bare HttpAgent in the dormant path,
// A2A-wrapped agent when A2A_AGENT_URL is set. Top-level await is supported
// in Next.js ESM route handlers; it runs once at module init. The cast is
// needed because @ag-ui/a2a-middleware ships its own @ag-ui/client peer dep
// that may version-skew from @copilotkit/runtime's.
const orchestrationAgent =
  a2aAgentUrls.length === 0
    ? legalAgent
    : await (async () => {
        const { A2AMiddlewareAgent } = await import("@ag-ui/a2a-middleware");
        const wrapped = new A2AMiddlewareAgent({
          agentUrls: a2aAgentUrls,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orchestrationAgent: legalAgent as any,
          description:
            "A2UI hackathon orchestrator with optional A2A subagent delegation",
          instructions: process.env.A2A_INSTRUCTIONS,
        });
        return wrapped as unknown as typeof legalAgent;
      })();

const runtime = new CopilotRuntime({
  agents: { legal: orchestrationAgent },
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
