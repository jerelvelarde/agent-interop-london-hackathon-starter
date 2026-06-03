# Domains

A domain bundles **tools + system prompt + sample data**. The active domain is
selected by `DOMAIN=<name>` in `.env`. `agent/main.py` reads the env var and
loads the matching `tools.py` + `prompts.py`.

```
agent/src/domains/
├── default/         # PortKit demo (project ops dashboards + risks + status).
│   ├── prompts.py   # SYSTEM_PROMPT
│   └── tools.py     # default_tools = [query_data, show_project_dashboard, show_project_detail, …]
└── shopping/        # Canonical second domain. Demonstrates both A2UI paths.
    ├── prompts.py
    ├── tools.py     # shopping_tools = [search_products, query_orders]
    └── data/        # Sample product + order data (CSV)
```

## Add a third domain — `<your-domain>`

1. Copy `domains/shopping/` to `domains/<your-domain>/`.
2. Replace `data/*.csv` with your data.
3. Edit `tools.py`:
   - Rename `search_products` → `search_<thing>` (the fixed-schema entry).
   - Re-point the widget schema if you authored a new one in `agent/src/widgets/`.
   - Rename `query_orders` → `query_<your-data>`.
4. Edit `prompts.py` to steer the LLM to your new tool names and explain when
   to call them.
5. Add an `elif DOMAIN == "<your-domain>"` branch in `agent/main.py` (or
   replace the if/elif with a dynamic `importlib` lookup if you prefer).
6. Set `DOMAIN=<your-domain>` in `.env` and boot.

## Why one canonical stub, not two

Two half-finished stubs create more confusion than they solve. `shopping/`
is the deeply-finished example. Treat it as a template.
