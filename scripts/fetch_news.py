#!/usr/bin/env python3
"""
Fetches recent news headlines relevant to TSMC and the semiconductor
industry (policy, geopolitics, competitive moves) via NewsAPI.org, so the
report can cite a live, sourced feed rather than only static analysis.

Requires the NEWSAPI_KEY environment variable (free key from
https://newsapi.org). If it isn't set, writes an empty result set instead of
failing, so the rest of the pipeline still runs.

Output: docs/data/news.json
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "docs" / "data" / "news.json"

NEWSAPI_URL = "https://newsapi.org/v2/everything"

# Each query gets its own bucket in the output so the report can group
# headlines by topic (company-specific vs. broader industry/policy).
QUERIES = {
    "tsmc": '"TSMC" OR "Taiwan Semiconductor"',
    "policy": '"chip export controls" OR "semiconductor tariffs" OR "CHIPS Act" OR "Taiwan chip" OR "Section 232 semiconductor" OR "semiconductor export"',
    "peers": '"Intel Foundry" OR "Samsung Foundry" OR "GlobalFoundries" OR "ASML lithography" OR "chip foundry"',
}
ARTICLES_PER_QUERY = 8


class FetchFailed(Exception):
    """Raised for any failed fetch (rate limit, network error, bad response) so
    the caller can fall back to previously cached articles instead of wiping
    them out with an empty result."""


def fetch_news_for(query: str, api_key: str) -> list:
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": ARTICLES_PER_QUERY,
        "apiKey": api_key,
    }
    try:
        resp = requests.get(NEWSAPI_URL, params=params, timeout=15)
        if resp.status_code != 200:
            body = resp.json()
            print(f"  news fetch failed: HTTP {resp.status_code} "
                  f"code={body.get('code')} message={body.get('message')}", file=sys.stderr)
            raise FetchFailed(body.get("code"))
        data = resp.json()
    except FetchFailed:
        raise
    except Exception as e:
        print(f"  news fetch failed: {e}", file=sys.stderr)
        raise FetchFailed(str(e))

    articles = []
    for a in data.get("articles", [])[:ARTICLES_PER_QUERY]:
        articles.append({
            "title": a.get("title"),
            "source": (a.get("source") or {}).get("name"),
            "url": a.get("url"),
            "published_at": a.get("publishedAt"),
            "description": a.get("description"),
        })
    return articles


def main():
    api_key = (os.environ.get("NEWSAPI_KEY") or "").strip()

    previous_news = {}
    if OUT_FILE.exists():
        try:
            previous_news = json.loads(OUT_FILE.read_text()).get("news", {})
        except Exception:
            previous_news = {}

    news = {}
    if not api_key:
        print("NEWSAPI_KEY not set - writing empty news set.", file=sys.stderr)
    else:
        for i, (key, query) in enumerate(QUERIES.items(), 1):
            print(f"[{i}/{len(QUERIES)}] fetching news for '{key}'...", file=sys.stderr)
            try:
                news[key] = fetch_news_for(query, api_key)
            except FetchFailed:
                if key in previous_news:
                    print(f"  falling back to previously cached articles for {key}", file=sys.stderr)
                    news[key] = previous_news[key]
                else:
                    news[key] = []
            time.sleep(1.1)  # stay under free-tier rate limits

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "has_key": bool(api_key),
        "news": news,
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"wrote {OUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
