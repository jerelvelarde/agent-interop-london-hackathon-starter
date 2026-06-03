# Stage 1: Build Next.js frontend
FROM node:20-slim AS frontend

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY src/ ./src/
COPY public/ ./public/
COPY next.config.ts tsconfig.json postcss.config.mjs ./
COPY showcase.json ./showcase.json

# pdf-analyst default swap: no route surgery needed. Both copilotkit routes
# (src/app/api/copilotkit/[[...slug]]/route.ts for the legal example and
# src/app/api/copilotkit-pdf/route.ts for the pdf default) are already
# AG-UI HttpAgent based and talk to the FastAPI agent on :8123 — see the
# entrypoint. @ag-ui/client is a normal package.json dependency, so the
# `npm install` above already provides it; the old docker-route-override.ts
# swap is no longer used.

ENV NODE_OPTIONS="--max-old-space-size=4096"
# Next.js 16+ uses Turbopack by default; use --webpack for serverExternalPackages compat
RUN npx next build --webpack

# Stage 2: Production image with Python + Node
FROM python:3.12.10-slim AS runner

# Install Node.js 20 + uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv by copying from the official image (avoids curl|sh pipe-swallow bug
# where a 5xx on astral.sh silently produces an exit-0 layer with no uv binary).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# pdf-analyst default swap: the agent is now the FastAPI app at
# agent/main.py (POST /fixed, /dynamic, /legal), served directly with
# uvicorn — no langgraph-cli, no Docker-in-Docker, no serve.py wrapper. We
# install from the agent's own pyproject.toml + uv.lock via `uv sync`, which
# pulls the FROZEN dependency set (langchain-google-genai, ag-ui-langgraph,
# copilotkit, fastapi, uvicorn, …). The legal example's graph is imported
# cross-package by agent/main.py, so copy other-examples/ too.
COPY agent/ ./agent/
COPY other-examples/ ./other-examples/

# `uv sync` into the agent's own .venv from the locked manifest. --frozen
# fails loudly if uv.lock has drifted from pyproject.toml rather than
# silently re-resolving (matches the repo's FROZEN-pins discipline).
RUN cd agent && uv sync --frozen --no-dev

# Copy Next.js standalone build
COPY --from=frontend /app/.next/standalone ./
COPY --from=frontend /app/.next/static ./.next/static
COPY --from=frontend /app/public ./public

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production

CMD ["./entrypoint.sh"]
