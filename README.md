# Equity Research Report — Taiwan Semiconductor Manufacturing Company (TSMC)

An in-depth, single-company equity research report covering TSMC's business model, financials, peer benchmarking, quantitative risk profile, and — the part most retail-style dashboards skip — political, geopolitical, and environmental risk. Built as a static webpage (not a downloadable PDF) so it can be hosted live on GitHub Pages and linked directly. Styled as an institutional research note rather than a consumer dashboard.

**Live report:** enable GitHub Pages (Settings → Pages → source: `main` branch, `/docs` folder) and it'll be served at `https://<your-username>.github.io/equity-research-report/`.

## What's in the report (12 numbered sections)

1. **Executive summary** — the investment case in one page
2. **Company overview** — founding, leadership, the pure-play foundry model, live ownership/short-interest data
3. **Business model & structure** — manufacturing footprint, node roadmap, revenue mix by platform, the ASML supply-chain chokepoint, capacity utilization
4. **Financial analysis** — 5-year revenue/net income/capex trend, quarterly 2026 momentum, balance sheet, live valuation multiples
5. **Peer comparison** — live table benchmarking TSMC against Intel, Samsung Electronics, GlobalFoundries, UMC, and ASML on valuation, margins, growth, and beta
6. **Quantitative & risk profile** — dual-methodology beta (1Y daily vs. Yahoo's standard window) against both the S&P 500 and the semiconductor sector (SOXX), volatility, Sharpe ratio, max drawdown, and a correlation bar chart vs. benchmarks and every peer
7. **Industry & competitive landscape** — foundry market share and the structural barriers keeping the leading edge to essentially two-and-a-half players
8. **Geopolitical & political risk** — the "silicon shield" thesis and a full 2026 policy timeline (CHIPS Act, Section 232 tariffs, the US-Taiwan trade deal, export controls)
9. **Environmental & operational risk** — Taiwan's water-scarcity exposure and TSMC's own consumption/mitigation data
10. **Risk factors** — explicit bull case / bear case framing
11. **Live news & sources** — an auto-refreshing, topic-grouped news feed (TSMC-specific / policy & geopolitics / peers & industry), sourced live from NewsAPI.org
12. **Valuation & street view** — trailing/forward P/E, EV/EBITDA, and third-party analyst consensus (clearly labeled as consensus data, not this report's own recommendation)

Plus a **hover glossary** (21 terms — Pure-Play Foundry, CoWoS, GAA, Beta, Sharpe Ratio, Short Ratio, Silicon Shield, VEU, Section 232, CHIPS Act, etc.) that shows a plain-language definition on hover anywhere a dotted-underline term appears.

## What's live vs. static

- **Live** (refreshed every 4 hours via GitHub Actions): price, market cap, 52-week range, trailing/forward P/E, margins, ROE, growth rates, cash/debt, dividend yield, analyst consensus rating/target, ownership/short-interest, beta/volatility/Sharpe/drawdown/correlation, the full peer comparison table, and the live news feed.
- **Static** (hand-researched, cited in Sources): the written analysis, historical annual revenue/net income/capex (2021–2025), quarterly 2026 results, node/platform revenue mix, market share figures, and all geopolitical/environmental/policy content. These don't change quarter to quarter and are sourced from SEC filings, company disclosures, and financial press.

## Data sources & limitations

- **Live market, peer, and risk data** — Yahoo Finance via [`yfinance`](https://github.com/ranaroussi/yfinance), free, no API key.
- **Live news** — [NewsAPI.org](https://newsapi.org) free tier (100 requests/day). Requires your own free key — see setup below; the fetch script falls back to previously cached headlines on a rate limit or transient failure rather than blanking the feed out.
- **Financial reports** — TSMC's SEC 6-K filings (EDGAR) and investor relations disclosures.
- **EV/EBITDA**: yfinance's own `enterpriseToEbitda` field returned an implausible value for TSM, so it's shown as a static, third-party-sourced estimate (~18.5x) rather than a live figure — flagged directly in the code.
- **Cross-currency peer data**: Samsung Electronics (005930.KS) trades in KRW. Its price is shown in native currency; its market cap is converted to an *approximate* USD equivalent at an illustrative (non-live) FX rate, clearly marked "approx." — same treatment as TSMC's own TWD balance-sheet figures. Non-US filer forward estimates can be less reliable via free data feeds.
- **Beta methodology**: two figures are shown deliberately — a 1-year daily-return beta computed directly from price history (more responsive, noisier) and Yahoo Finance's own longer-window beta (smoother, more conventional). They can diverge meaningfully during unusually volatile periods; that divergence is itself informative and is called out in the report text rather than hidden.
- **Cross-market correlation**: computed by normalizing each ticker's price-history index to a timezone-naive calendar date before joining, since different exchanges (e.g. NYSE vs. KRX) report timestamps in different timezones — without this, cross-market joins silently return no overlapping dates.
- Not investment advice. The rating tag and analyst price target are aggregated third-party consensus data, not this report's own recommendation, and none of this is personalized to any individual's financial situation.

## Project layout

```
scripts/
  fetch_tsmc_data.py   pulls live price/valuation/margin/peer/risk data from Yahoo Finance -> docs/data/tsmc_data.json
  fetch_news.py         pulls topic-grouped headlines from NewsAPI.org -> docs/data/news.json
docs/                   the static site (GitHub Pages root)
  index.html / app.js / styles.css
  glossary.json          term -> plain-language definition, powers the hover tooltips
  data/tsmc_data.json    generated live market/peer/risk data consumed by the frontend
  data/news.json         generated live news data consumed by the frontend
.github/workflows/update-data.yml   refresh every 4 hours + on-demand via workflow_dispatch
```

## Local development

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python3 scripts/fetch_tsmc_data.py
NEWSAPI_KEY=your_key_here python3 scripts/fetch_news.py   # omit NEWSAPI_KEY to run without news

python3 -m http.server 8000 --directory docs
# open http://localhost:8000
```

## Enabling live news

1. Get a free key at [newsapi.org](https://newsapi.org/register).
2. In this repo: **Settings → Secrets and variables → Actions → New repository secret**, name it `NEWSAPI_KEY`, paste the key.
3. Re-run the "Refresh TSMC market data & news" workflow (or wait for the next scheduled run) — the Live News & Sources section will start populating.

---
Not investment advice. Independently produced for educational purposes; not affiliated with or endorsed by TSMC.
