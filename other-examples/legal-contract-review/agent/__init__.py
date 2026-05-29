# Package marker for the legal-review-agent package.
#
# Setuptools exposes this directory as the `legal_review_agent` package
# (see pyproject.toml — explicit non-colliding name vs. project-root `agent/`).
# In practice langgraph loads graph.py via a path-based loader (see
# graph.py's sys.path injection workaround).
