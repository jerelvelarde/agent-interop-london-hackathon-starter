#!/bin/bash
set -e

echo "[entrypoint] Starting: pdf-analyst FastAPI agent + Next.js"

# The pdf-analyst agents default to Gemini via langchain-google-genai.
if [ -z "$GEMINI_API_KEY" ]; then
  echo "[entrypoint] WARNING: GEMINI_API_KEY not set! The agent will import but live calls will fail."
else
  echo "[entrypoint] GEMINI_API_KEY: set"
fi

# Start the FastAPI agent (agent/main.py exposes /fixed, /dynamic, /legal).
# Served directly with uvicorn from the agent's uv-managed venv — no
# langgraph-cli, no serve.py wrapper. Bind 0.0.0.0 so the Next.js process
# (and the host) can reach it. The frontend routes default to
# http://localhost:8123/{fixed,dynamic,legal}.
echo "[entrypoint] Starting agent (uvicorn main:app) on port ${AGENT_PORT:-8123}..."
( cd agent && uv run uvicorn main:app --host 0.0.0.0 --port "${AGENT_PORT:-8123}" ) 2>&1 &
AGENT_PID=$!

sleep 3

# Start Next.js standalone
echo "[entrypoint] Starting Next.js on port ${PORT:-3000}..."
HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node server.js 2>&1 &
NEXT_PID=$!

echo "[entrypoint] Agent=$AGENT_PID Next=$NEXT_PID"
wait -n $AGENT_PID $NEXT_PID
exit $?
