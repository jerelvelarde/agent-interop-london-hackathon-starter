// @ts-nocheck — Docker-only route override. Not part of the dev/local
// typecheck graph; copied into place by the Dockerfile. Depends on
// `@ag-ui/client`, which is only installed inside the Docker image (see
// docker/Dockerfile.app). Disabling typecheck here is the right move so
// `pnpm typecheck` on a local checkout is exit-0 without forcing
// `@ag-ui/client` into the host devDependencies.
/**
 * Docker-specific route override.
 * In Docker, the agent is served via AG-UI (not LangGraph Platform)
 * because langgraph-cli dev requires Docker-in-Docker.
 * The original route.ts (using LangGraphAgent) is preserved unchanged.
 */
import {
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";
import { handle } from "hono/vercel";

const agentUrl = process.env.AGENT_URL || "http://localhost:8123";

const defaultAgent = new HttpAgent({
  url: `${agentUrl}/`,
});

const runtime = new CopilotRuntime({
  agents: { default: defaultAgent },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
