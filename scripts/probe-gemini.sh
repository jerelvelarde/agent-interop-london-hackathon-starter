#!/usr/bin/env bash
# scripts/probe-gemini.sh — Empirically verify which Gemini model IDs 200 with
# *multi-turn* tool-calling against the OpenAI-compat endpoint. Workstream A
# done-criterion. Tests TWO turns because Gemini 3.x requires thought_signature
# replay and silently 400s on the second turn — see FROZEN.md.
#
# Usage:  GEMINI_API_KEY=... ./scripts/probe-gemini.sh
# Output: one line per candidate: <model-id>  <single-turn>  <multi-turn>  <latency-ms>

set -euo pipefail

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "ERROR: GEMINI_API_KEY not set" >&2
  echo "Get a free-tier key: https://aistudio.google.com/apikey" >&2
  exit 1
fi

ENDPOINT="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

# Candidates in priority order — latest first.
CANDIDATES=(
  "gemini-3.5-flash"      # Notion v3.1 default; may not exist yet
  "gemini-3.0-flash"
  "gemini-2.5-flash"      # likely current stable as of May 2026
  "gemini-2.5-flash-latest"
  "gemini-2.0-flash"
  "gemini-2.0-flash-001"
  "gemini-1.5-flash"
  "gemini-1.5-flash-latest"
)

TURN1_BODY=$(cat <<'JSON'
{
  "model": "__MODEL__",
  "messages": [
    {"role": "user", "content": "What's the weather in London? Use the tool."}
  ],
  "tools": [{"type":"function","function":{"name":"get_weather","description":"Get current weather","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}],
  "tool_choice": "auto",
  "max_tokens": 200
}
JSON
)

# Turn 2: assistant called the tool, here's the tool response; expect another LLM reply.
TURN2_BODY=$(cat <<'JSON'
{
  "model": "__MODEL__",
  "messages": [
    {"role": "user", "content": "What's the weather in London? Use the tool."},
    {"role": "assistant", "tool_calls": [{"id":"c1","type":"function","function":{"name":"get_weather","arguments":"{\"city\":\"London\"}"}}]},
    {"role": "tool", "tool_call_id": "c1", "content": "{\"temp\":15,\"condition\":\"cloudy\"}"}
  ],
  "tools": [{"type":"function","function":{"name":"get_weather","description":"Get current weather","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}],
  "max_tokens": 200
}
JSON
)

probe_one() {
  local model="$1" body_template="$2"
  local body=$(printf '%s' "$body_template" | sed "s/__MODEL__/$model/")
  local start=$(python3 -c 'import time; print(int(time.time()*1000))')
  local resp=$(curl -sS -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body" 2>&1 || echo -e "\nERR")
  local end=$(python3 -c 'import time; print(int(time.time()*1000))')
  local status=$(printf '%s' "$resp" | tail -n1)
  local body_out=$(printf '%s' "$resp" | sed '$d')
  local latency=$((end - start))

  if [[ "$status" == "200" ]]; then
    if printf '%s' "$body_out" | python3 -c 'import json,sys
d=json.load(sys.stdin)
msg=d.get("choices",[{}])[0].get("message",{})
# turn1: expect tool_calls; turn2: expect content (reply) and no error
sys.exit(0 if (msg.get("tool_calls") or msg.get("content")) else 1)' 2>/dev/null; then
      echo "200:$latency:"
    else
      echo "200:$latency:empty-response"
    fi
  else
    local err=$(printf '%s' "$body_out" | python3 -c 'import json,sys
try:
  d=json.load(sys.stdin); print(d.get("error",{}).get("message","")[:60])
except: pass' 2>/dev/null || true)
    echo "$status:$latency:$err"
  fi
}

printf "%-28s %-22s %-22s %s\n" "MODEL" "SINGLE-TURN" "MULTI-TURN" "NOTES"
printf "%-28s %-22s %-22s %s\n" "----------------------------" "----------------------" "----------------------" "-----"

best=""
for model in "${CANDIDATES[@]}"; do
  r1=$(probe_one "$model" "$TURN1_BODY")
  s1=${r1%%:*}; rest=${r1#*:}; l1=${rest%%:*}; n1=${rest#*:}

  if [[ "$s1" == "200" ]]; then
    r2=$(probe_one "$model" "$TURN2_BODY")
    s2=${r2%%:*}; rest=${r2#*:}; l2=${rest%%:*}; n2=${rest#*:}
    notes="$n2"
    [[ "$s2" == "200" && -z "$best" ]] && best="$model"
    printf "%-28s %-22s %-22s %s\n" "$model" "200 (${l1}ms)" "${s2} (${l2}ms)" "$notes"
  else
    printf "%-28s %-22s %-22s %s\n" "$model" "${s1} (${l1}ms)" "—" "$n1"
  fi
done

echo
if [[ -n "$best" ]]; then
  echo "VERDICT: use $best (highest-priority candidate that passed BOTH single- and multi-turn)."
  echo "Write that ID into agent/main.py, agent/src/a2ui_dynamic_schema.py, .env.example, and FROZEN.md."
else
  echo "VERDICT: NO candidate passed multi-turn. The base starter cannot run agentic loops on Gemini today."
  echo "Investigate: thought_signature passthrough in langchain-openai, or switch to langchain-google-genai."
fi
