# Custom Dockerfile for the ScholarAI (edtech) example.
#
# Why this file exists (GitHub issue #12):
#   `langgraph dockerfile` (langgraph-cli 0.4.21 / langgraph-api 0.7.101)
#   does not yet emit a correct LANGSERVE_GRAPHS path when the
#   `dependencies` array in `langgraph.json` contains more than one entry.
#
#   Concretely: with `dependencies: [".", "../other-examples/edtech/agent"]`,
#   the generated image copies the second dep to `/deps/agent_1/` (uniquified
#   because the basename `agent` collides with the first dep's `/deps/agent/`),
#   but the LANGSERVE_GRAPHS env var still points at
#   `/deps/agent/graph.py:graph`. langgraph-api fails to load the second graph
#   at startup.
#
# What this Dockerfile does differently:
#   - Bases off the same `langchain/langgraph-api` runtime the CLI uses.
#   - Copies the project-root `agent/` (sample_agent) to /deps/sample_agent.
#   - Copies this example's `agent/` (which contains the `edtech_agent/`
#     package) to /deps/edtech_example so the image dir name doesn't
#     collide with the Python import name.
#   - Sets LANGSERVE_GRAPHS to a JSON object pointing each graph at its own
#     directory by name — no name collision, no mis-route.
#
# Pattern reference: the project-root `Dockerfile` handles the single-graph
# Railway-deploy path. This Dockerfile is the multi-graph variant.
#
# To build (from repo root):
#   docker build -f other-examples/edtech/Dockerfile -t scholarai-multigraph .
# To run (replace GEMINI_API_KEY with your own; ports/envs match
# langgraph-api defaults):
#   docker run --rm -p 8000:8000 -e GEMINI_API_KEY=... scholarai-multigraph
#
# Once the upstream CLI fix lands (langgraph-cli >0.4.21 with multi-dep
# uniquification + LANGSERVE_GRAPHS path rewrite), this Dockerfile can be
# deleted in favour of `langgraph dockerfile`. Track in issue #12.

FROM langchain/langgraph-api:3.12

# ---- Project-root agent (sample_agent) -------------------------------------
# Mirrors the langgraph.json entry: "sample_agent": "./main.py:graph".
# Lives at /deps/sample_agent inside the image.
ADD agent /deps/sample_agent
RUN cd /deps/sample_agent && pip install --no-cache-dir -e .

# ---- Second graph (edtech_agent) -------------------------------------
# Copy the example's `agent/` dir (which contains the `edtech_agent/`
# package) to a uniquely-named image dir. The graph lives at
# `edtech_agent/graph.py:graph` relative to this dir — matches the
# canonical entry in this example's own `agent/langgraph.json`.
ADD other-examples/edtech/agent /deps/edtech_example
RUN cd /deps/edtech_example && pip install --no-cache-dir -e .

# Wire both graphs into LANGSERVE_GRAPHS. Each value is `<file>:<symbol>`
# relative to the deps directory; langgraph-api joins these onto /deps/<dir>.
#
# Keep this in sync with this example's `agent/langgraph.json` "graphs" map.
ENV LANGSERVE_GRAPHS='{"sample_agent": "/deps/sample_agent/main.py:graph", "edtech_agent": "/deps/edtech_example/edtech_agent/graph.py:graph"}'

# Standard langgraph-api port.
EXPOSE 8000
