# Equity Research Report — Taiwan Semiconductor Manufacturing Company (TSMC)

An in-depth, single-company equity research report covering TSMC's business model, financials, competitive position, and — the part most retail-style dashboards skip — political and geopolitical risk. Built as a static webpage (not a downloadable PDF) so it can be hosted live on GitHub Pages and linked directly.

**Live report:** enable GitHub Pages (Settings → Pages → source: `main` branch, `/docs` folder) and it'll be served at `https://<your-username>.github.io/equity-research-report/`.

## What's in the report

- **Executive summary** — the investment case in one page
- **Company overview** — founding, leadership, the pure-play foundry model
- **Business model & structure** — manufacturing footprint, technology/node roadmap, revenue mix by platform (HPC/smartphone/IoT/automotive), and the 2026 shift of Nvidia overtaking Apple as TSMC's largest customer
- **Financial analysis** — 5-year revenue/net income trend, recent quarterly momentum, margins, capex, balance sheet, live valuation multiples
- **Industry & competitive landscape** — foundry market share vs. Samsung Foundry, Intel Foundry, GlobalFoundries, SMIC, and the structural barriers that keep the leading edge to essentially two-and-a-half players
- **Geopolitical & political risk** — the "silicon shield" thesis, the 2026 US-Taiwan trade deal, CHIPS Act, Section 232 tariffs, and the export-control regime toward China, with a 2026 policy timeline
- **Risk factors** — explicit bull case / bear case framing
- **Valuation & street view** — trailing/forward P/E, EV/EBITDA, and third-party analyst consensus (clearly labeled as consensus data, not this report's own recommendation)
- **Hover glossary** — dotted-underline terms (Pure-Play Foundry, CoWoS, GAA, P/E, EV/EBITDA, Silicon Shield, VEU, Section 232, CHIPS Act, etc.) show a plain-language definition on hover

## What's live vs. static

- **Live** (refreshed daily via GitHub Actions + `yfinance`): price, market cap, 52-week range, trailing/forward P/E, margins, ROE, growth rates, cash/debt, dividend yield, analyst consensus rating/target.
- **Static** (hand-researched, cited in Sources): the written analysis, historical annual revenue/net income (2021–2025), quarterly 2026 results, node/platform revenue mix, market share figures, and all geopolitical/policy content. These don't change quarter to quarter and are sourced from SEC filings, company disclosures, and financial press — see the Sources section at the bottom of the report itself.

## Data sources & limitations

- **Live market data** — Yahoo Finance via [`yfinance`](https://github.com/ranaroussi/yfinance), free, no API key.
- **Financial reports** — TSMC's SEC 6-K filings (EDGAR) and investor relations disclosures.
- **News/analysis context** — financial press (CNBC, Tom's Hardware, SemiWiki, etc.), fully cited in the Sources section.
- **EV/EBITDA**: yfinance's own `enterpriseToEbitda` field returned an implausible value for TSM (inconsistent with independently computed EV/EBITDA from cash/debt/market cap), so it's shown as a static, third-party-sourced estimate (~18.5x) rather than a live figure — flagged directly in the code.
- **Currency**: TSMC reports its financial statements (cash, debt, revenue in `info`) in TWD; price and market cap trade in USD via the ADR. The report shows both where relevant and approximates TWD→USD at a fixed illustrative rate (~31:1) for balance-sheet figures — not a live FX rate.
- Not investment advice. The rating tag and analyst price target are aggregated third-party consensus data, not this report's own recommendation, and none of this is personalized to any individual's financial situation.

## Project layout

```
scripts/fetch_tsmc_data.py   pulls live price/valuation/margin data from Yahoo Finance -> docs/data/tsmc_data.json
docs/                        the static site (GitHub Pages root)
  index.html / app.js / styles.css
  glossary.json              term -> plain-language definition, powers the hover tooltips
  data/tsmc_data.json         generated live data consumed by the frontend
.github/workflows/update-data.yml   daily refresh + on-demand via workflow_dispatch
```

## Local development

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python3 scripts/fetch_tsmc_data.py
python3 -m http.server 8000 --directory docs
# open http://localhost:8000
```

---
Not investment advice. Independently produced for educational purposes; not affiliated with or endorsed by TSMC.
