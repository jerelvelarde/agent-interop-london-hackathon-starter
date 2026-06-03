#!/bin/bash
cd "$(dirname "$0")/../agent" || exit 1
uv run uvicorn main:app --port 8123 --reload
