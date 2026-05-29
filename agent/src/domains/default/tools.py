"""Default-domain tool bundle (PortKit — Project Operations).

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #5 — Switch domain (default branch)
# Pattern to copy: agent/src/domains/shopping/tools.py
# These re-export the inherited base tools so main.py can switch
# the entire tool bundle by changing one env var (DOMAIN=...).
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from src.query import query_data
from src.tools.project_dashboard import show_project_dashboard
from src.tools.project_detail import show_project_detail
from src.tools.sprint_board import show_sprint_board
from src.tools.team_load import show_team_load
from src.tools.risk_register import show_risk_register
from src.tools.status_report import draft_status_report
from src.tools.update_feed import show_update_feed

default_tools = [
    query_data,
    show_project_dashboard,
    show_project_detail,
    show_sprint_board,
    show_team_load,
    show_risk_register,
    draft_status_report,
    show_update_feed,
]
