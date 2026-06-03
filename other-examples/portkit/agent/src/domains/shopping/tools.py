"""
Shopping domain — Python tools.

Two tools that mirror the canonical default-domain pair:
- search_products: fixed-schema A2UI (mirror of agent/src/tools/risk_register.py:show_risk_register).
- query_orders: data tool the dynamic-schema path can call when building dashboards
  (mirror of agent/src/query.py:query_data).

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOMIZATION SEAM #5 — Switch domain (shopping branch)
# Pattern this file mirrors: agent/src/tools/risk_register.py + agent/src/query.py.
# See HACKATHON.md §5 for the recipe to add a third domain.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import TypedDict

from copilotkit import a2ui
from langchain.tools import tool

CATALOG_ID = a2ui.BASIC_CATALOG_ID
SURFACE_ID = "product-search-results"

_WIDGETS_DIR = Path(__file__).parent.parent.parent / "widgets"
_PRODUCT_WIDGET_PATH = _WIDGETS_DIR / "product_card.json"
with open(_PRODUCT_WIDGET_PATH) as _f:
    PRODUCT_SCHEMA = json.load(_f)["schema"]

# Sample data — read at module load so LangGraph Cloud's sandboxed tool
# execution doesn't pay file I/O on every invocation.
_DATA_DIR = Path(__file__).parent / "data"
with open(_DATA_DIR / "products.csv") as _f:
    _products: list[dict] = list(csv.DictReader(_f))
with open(_DATA_DIR / "orders.csv") as _f:
    _orders: list[dict] = list(csv.DictReader(_f))


class Product(TypedDict):
    id: str
    name: str
    price: str
    rating: str
    category: str
    imageUrl: str


def _format_product(row: dict) -> Product:
    return {
        "id": row["id"],
        "name": row["name"],
        "price": f"${row['price']}",
        "rating": f"{row['rating']} stars",
        "category": row["category"],
        "imageUrl": row["imageUrl"],
    }


@tool
def search_products(query: str) -> str:
    """Search the product catalog and display the results as rich product cards.

    Call this whenever the user asks to see, find, browse, or shop for products
    (e.g. "show me running shoes", "what watches do you have", "find me a backpack").
    Pass the user's natural-language query — this tool handles the matching.

    Returns A2UI envelopes that render the matching products as cards with
    image, name, price, rating, category, and an 'Add to cart' button.
    """
    q = (query or "").lower()
    # Naive substring match on name, category, description.
    matches: list[dict] = []
    for row in _products:
        haystack = " ".join(
            [row["name"], row["category"], row.get("description", "")]
        ).lower()
        if not q or any(word in haystack for word in q.split() if word):
            matches.append(row)
    # If nothing matched, fall back to the first 3 so the surface is never empty.
    if not matches:
        matches = _products[:3]
    # Cap at 6 so we don't blow out the UI.
    products = [_format_product(r) for r in matches[:6]]
    return a2ui.render(
        operations=[
            a2ui.create_surface(SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(SURFACE_ID, PRODUCT_SCHEMA),
            a2ui.update_data_model(SURFACE_ID, {"products": products}),
        ],
    )


@tool
def query_orders(query: str):
    """
    Query the shopping orders database, takes natural language. Always call before
    showing a chart or dashboard of sales / category performance.
    """
    return _orders


shopping_tools = [search_products, query_orders]
