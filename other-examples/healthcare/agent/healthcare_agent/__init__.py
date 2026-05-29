# Package marker for the healthcare_agent package.
#
# The directory name matches the package name, so setuptools auto-discovery
# picks it up without any package-dir remapping. langgraph loads
# `graph.py` via the `./healthcare_agent/graph.py:graph` entry in
# `agent/langgraph.json` — package machinery stays intact, so `from
# .tools import ...` inside graph.py works without sys.path manipulation.
