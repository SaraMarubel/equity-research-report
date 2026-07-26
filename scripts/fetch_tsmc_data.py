#!/usr/bin/env python3
"""
Fetches live market data for TSMC (NYSE: TSM) via Yahoo Finance to power the
"live" stats on the equity research report page. The written analysis itself
is static (hand-researched); this script only refreshes the numbers that
actually move day to day.

Output: docs/data/tsmc_data.json
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "docs" / "data" / "tsmc_data.json"
HISTORY_YEARS = 5


def pct_change(series):
    if series is None or len(series) < 2:
        return None
    first, last = series.iloc[0], series.iloc[-1]
    if first == 0:
        return None
    return round((last - first) / first * 100, 2)


def main():
    t = yf.Ticker("TSM")

    try:
        info = t.info or {}
    except Exception as e:
        print(f"info fetch failed: {e}", file=sys.stderr)
        info = {}

    hist = t.history(period=f"{HISTORY_YEARS}y", interval="1d", auto_adjust=True)
    closes = hist["Close"].dropna() if hist is not None and not hist.empty else None

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ticker": "TSM",
        "currency": info.get("currency", "USD"),
        "price": info.get("currentPrice"),
        "market_cap": info.get("marketCap"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "trailing_pe": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "beta": info.get("beta"),
        "dividend_yield_pct": info.get("dividendYield"),
        "payout_ratio_pct": round(info.get("payoutRatio") * 100, 1) if info.get("payoutRatio") else None,
        "gross_margin_pct": round(info.get("grossMargins") * 100, 1) if info.get("grossMargins") else None,
        "operating_margin_pct": round(info.get("operatingMargins") * 100, 1) if info.get("operatingMargins") else None,
        "profit_margin_pct": round(info.get("profitMargins") * 100, 1) if info.get("profitMargins") else None,
        "roe_pct": round(info.get("returnOnEquity") * 100, 1) if info.get("returnOnEquity") else None,
        "revenue_growth_yoy_pct": round(info.get("revenueGrowth") * 100, 1) if info.get("revenueGrowth") else None,
        "earnings_growth_yoy_pct": round(info.get("earningsGrowth") * 100, 1) if info.get("earningsGrowth") else None,
        "shares_outstanding": info.get("sharesOutstanding"),
        "analyst_target_mean": info.get("targetMeanPrice"),
        "analyst_recommendation": info.get("recommendationKey"),
        "financial_currency": info.get("financialCurrency"),
        "total_cash_local": info.get("totalCash"),
        "total_debt_local": info.get("totalDebt"),
    }
    # Note: yfinance's enterpriseToEbitda field for TSM has been unreliable
    # (implausibly low vs. independently computed EV/EBITDA), so it's
    # deliberately omitted here rather than shown alongside verified metrics.

    if closes is not None:
        result["change_1d_pct"] = pct_change(closes.tail(2))
        result["change_ytd_pct"] = pct_change(closes[closes.index.year == datetime.now().year])
        result["change_1y_pct"] = pct_change(closes.tail(252))
        result["history"] = [
            {"date": idx.strftime("%Y-%m-%d"), "close": round(float(v), 2)}
            for idx, v in closes.items()
        ]
    else:
        result["history"] = []

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(result, indent=2))
    print(f"wrote {OUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
