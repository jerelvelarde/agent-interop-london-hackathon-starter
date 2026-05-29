"""
scripts/load-test-gemini.py — load test against the OpenAI-compat Gemini path.

Fires N concurrent tool-calling requests at Gemini via the OpenAI-compat
endpoint. Reports HTTP status distribution, latency percentiles, and any
retry-after headers. Helps anticipate the free-tier rate-limit cliff
at ~tens-of-teams concurrency.

NOTE: This script intentionally exercises the **OpenAI-compat fallback
path** (langchain-openai → generativelanguage.googleapis.com/v1beta/openai/
on `gemini-2.5-flash`) rather than the current default (native Google Gen
AI SDK on `gemini-3.5-flash`). See FROZEN.md § "If you get rate-limited"
for why 2.5 + OpenAI-compat is the documented fallback.

Usage:  GEMINI_API_KEY=... uv run --with httpx scripts/load-test-gemini.py [N]
Default N is 30.
"""

from __future__ import annotations

import asyncio
import json
import os
import statistics
import sys
import time

import httpx

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MODEL = os.getenv("MODEL", "gemini-2.5-flash")

REQUEST = {
    "model": MODEL,
    "messages": [
        {
            "role": "user",
            "content": "Show me the open-risks register across all projects.",
        }
    ],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "show_risk_register",
                "description": "Show open risks across the org, optionally scoped to one project.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string"},
                    },
                    "required": [],
                },
            },
        }
    ],
    "tool_choice": "auto",
    "max_tokens": 300,
}


async def one_request(client: httpx.AsyncClient, idx: int, api_key: str) -> dict:
    """Fire one request; return status, latency, retry hints."""
    start = time.perf_counter()
    try:
        r = await client.post(
            ENDPOINT,
            json=REQUEST,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=60.0,
        )
        latency_ms = (time.perf_counter() - start) * 1000
        retry_after = r.headers.get("retry-after") or r.headers.get("Retry-After")
        result: dict = {
            "idx": idx,
            "status": r.status_code,
            "latency_ms": latency_ms,
            "retry_after": retry_after,
        }
        if r.status_code != 200:
            try:
                err = r.json().get("error", {}).get("message", "")[:100]
                result["error"] = err
            except Exception:
                result["error"] = r.text[:100]
        else:
            # confirm a tool call came back
            try:
                msg = r.json()["choices"][0]["message"]
                result["tool_called"] = bool(msg.get("tool_calls"))
            except Exception:
                result["tool_called"] = False
        return result
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return {
            "idx": idx,
            "status": 0,
            "latency_ms": latency_ms,
            "error": f"exception: {type(e).__name__}: {e}",
        }


async def main(n: int) -> None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    print(f"Firing {n} concurrent requests against {MODEL} via {ENDPOINT}")
    print()

    start_wall = time.perf_counter()
    async with httpx.AsyncClient(http2=True) as client:
        tasks = [one_request(client, i, api_key) for i in range(n)]
        results = await asyncio.gather(*tasks)
    wall_ms = (time.perf_counter() - start_wall) * 1000

    # status distribution
    by_status: dict[int, int] = {}
    for r in results:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1

    successes = [r for r in results if r["status"] == 200]
    failures = [r for r in results if r["status"] != 200]

    latencies = [r["latency_ms"] for r in successes]
    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95)] if len(latencies) >= 20 else latencies[-1]
        p99 = latencies[int(len(latencies) * 0.99)] if len(latencies) >= 100 else latencies[-1]
        mean = statistics.mean(latencies)
    else:
        p50 = p95 = p99 = mean = 0

    tool_calls = sum(1 for r in successes if r.get("tool_called"))

    print(f"WALL TIME:           {wall_ms:.0f} ms")
    print(f"REQUESTS:            {n}")
    print(f"SUCCESSES (200):     {len(successes)}")
    print(f"  with tool_calls:   {tool_calls}/{len(successes)}")
    print(f"FAILURES:            {len(failures)}")
    print()
    print("STATUS DISTRIBUTION:")
    for status, count in sorted(by_status.items()):
        print(f"  {status:>4}: {count}")
    print()
    if successes:
        print("SUCCESS LATENCY (ms):")
        print(f"  mean: {mean:.0f}   p50: {p50:.0f}   p95: {p95:.0f}   p99: {p99:.0f}")
        print(f"  min:  {min(latencies):.0f}   max: {max(latencies):.0f}")
        print()
    retry_afters = [r["retry_after"] for r in results if r.get("retry_after")]
    if retry_afters:
        print(f"RETRY-AFTER HEADERS SEEN: {set(retry_afters)}")
        print()
    if failures:
        print("FIRST 5 FAILURES:")
        for r in failures[:5]:
            print(f"  [{r['idx']}] status={r['status']} latency={r['latency_ms']:.0f}ms err={r.get('error','')}")

    # JSON sidecar for FROZEN.md
    summary = {
        "model": MODEL,
        "concurrency": n,
        "wall_ms": round(wall_ms),
        "successes": len(successes),
        "failures": len(failures),
        "tool_calls": tool_calls,
        "status_distribution": by_status,
        "latency_ms": {
            "mean": round(mean),
            "p50": round(p50),
            "p95": round(p95),
            "p99": round(p99),
            "min": round(min(latencies)) if latencies else 0,
            "max": round(max(latencies)) if latencies else 0,
        },
        "retry_after_seen": list(set(retry_afters)) if retry_afters else [],
    }
    print()
    print("JSON SUMMARY (paste into FROZEN.md):")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    asyncio.run(main(n))
