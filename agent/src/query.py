from langchain.tools import tool
from pathlib import Path
import json
import os

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #3 — Swap demo data
# See HACKATHON.md §3 for the full recipe.
# Pattern to copy: this file (query_data + data/projectops.json).
#
# Two ways to swap:
#   (a) Replace data/projectops.json with your own dataset — keeps the
#       same code path. Override the file location with DATA_PATH=... in
#       your .env to point anywhere on disk.
#   (b) Replace this whole file with a Python literal / API call /
#       SQL connector. Update the docstring on query_data so the
#       agent knows when to call it with your domain's language.
# After swapping, edit the system prompt in agent/main.py so the agent
# is grounded in your domain.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Read data at module load time to avoid file I/O issues in
# LangGraph Cloud's sandboxed tool execution environment.
_data_path = Path(os.getenv(
    "DATA_PATH",
    str(Path(__file__).parent.parent.parent / "data" / "projectops.json"),
))

with open(_data_path) as _f:
    cached_data: dict = json.load(_f)

# Back-compat alias for any importer that still uses the private name.
_cached_data = cached_data


@tool
def query_data(query: str) -> dict:
    """
    Free-form query against the project ops dataset. Returns the full dataset
    by default — let the LLM filter to what it needs. The dataset contains:
      people[], projects[], sprints[], tasks[], risks[], updates[].
    Use this for analytics that don't map to a rich-UI tool.
    """
    import time

    print(
        f"[A2UI-DEBUG] query_data called: query='{query[:60]}' at {time.strftime('%H:%M:%S')}"
    )
    return cached_data
