from langchain.tools import tool
from pathlib import Path
import csv

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #3 — Swap demo data
# See HACKATHON.md §3 for the full recipe.
# Pattern to copy: this file (query_data + db.csv).
#
# Two ways to swap:
#   (a) Replace db.csv with your own rows — keeps the same code path.
#   (b) Replace this whole file with a Python literal / API call /
#       SQL connector. Update the docstring on query_data so the
#       agent knows when to call it with your domain's language.
# After swapping, edit the system prompt in
# agent/src/domains/<active-domain>/prompts.py (SYSTEM_PROMPT) so the
# agent is grounded in your domain.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Read data at module load time to avoid file I/O issues in
# LangGraph Cloud's sandboxed tool execution environment.
_csv_path = Path(__file__).parent / "db.csv"
with open(_csv_path) as _f:
    _cached_data = list(csv.DictReader(_f))


@tool
def query_data(query: str):
    """
    Query the database, takes natural language. Always call before showing a chart or graph.
    """
    import time

    print(
        f"[A2UI-DEBUG] query_data called: query='{query[:60]}' at {time.strftime('%H:%M:%S')}"
    )
    return _cached_data
