#!/usr/bin/env python3
"""
Fetches live market data for TSMC (NYSE: TSM) and its main foundry/equipment
peers via Yahoo Finance, plus risk metrics (beta, volatility, Sharpe, max
drawdown, correlation) vs. the S&P 500 and the semiconductor sector (SOXX).

The written analysis on the report page is static (hand-researched); this
script only refreshes the numbers that actually move day to day.

Output: docs/data/tsmc_data.json
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "docs" / "data" / "tsmc_data.json"
HISTORY_PERIOD = "5y"

PEERS = {
    "INTC": "Intel",
    "005930.KS": "Samsung Electronics",
    "GFS": "GlobalFoundries",
    "UMC": "UMC",
    "ASML": "ASML (equipment)",
}
SECTOR_BENCHMARK = "SOXX"
MARKET_BENCHMARK = "^GSPC"
RISK_FREE_TICKER = "^IRX"


def pct_change(series):
    if series is None or len(series) < 2:
        return None
    first, last = series.iloc[0], series.iloc[-1]
    if first == 0:
        return None
    return round((last - first) / first * 100, 2)


def slice_since(series, **offset_kwargs):
    cutoff = series.index.max() - pd.DateOffset(**offset_kwargs)
    return series[series.index >= cutoff]


def daily_returns(series):
    return series.pct_change().dropna()


def annualized_vol(returns):
    if returns is None or len(returns) < 5:
        return None
    return round(float(returns.std() * (252 ** 0.5) * 100), 2)


def compute_beta(a_returns, b_returns):
    aligned = pd.concat([a_returns, b_returns], axis=1, join="inner").dropna()
    if len(aligned) < 20:
        return None
    aligned.columns = ["a", "b"]
    cov = aligned["a"].cov(aligned["b"])
    var = aligned["b"].var()
    return round(float(cov / var), 2) if var else None


def compute_correlation(a_returns, b_returns):
    aligned = pd.concat([a_returns, b_returns], axis=1, join="inner").dropna()
    if len(aligned) < 20:
        return None
    aligned.columns = ["a", "b"]
    return round(float(aligned["a"].corr(aligned["b"])), 2)


def compute_sharpe(returns, risk_free_annual_pct):
    if returns is None or len(returns) < 20:
        return None
    ann_return = float(returns.mean() * 252)
    ann_vol = float(returns.std() * (252 ** 0.5))
    if ann_vol == 0:
        return None
    rf = (risk_free_annual_pct or 0) / 100
    return round((ann_return - rf) / ann_vol, 2)


def compute_max_drawdown(series):
    if series is None or len(series) < 2:
        return None
    running_max = series.cummax()
    drawdown = (series - running_max) / running_max
    return round(float(drawdown.min() * 100), 2)


def fetch_core_stats(ticker):
    t = yf.Ticker(ticker)
    try:
        info = t.info or {}
    except Exception as e:
        print(f"  info fetch failed for {ticker}: {e}", file=sys.stderr)
        info = {}
    hist = t.history(period=HISTORY_PERIOD, interval="1d", auto_adjust=True)
    closes = hist["Close"].dropna() if hist is not None and not hist.empty else None
    if closes is not None:
        # Different exchanges report timestamps in different timezones (e.g.
        # US Eastern for TSM vs. Asia/Seoul for Samsung); normalize to a
        # tz-naive calendar date so cross-market correlation/beta joins
        # actually align matching trading days instead of silently matching
        # nothing and returning None.
        closes.index = closes.index.tz_localize(None).normalize()
    return info, closes


def main():
    print("fetching TSMC core stats...", file=sys.stderr)
    info, closes = fetch_core_stats("TSM")

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
        "beta_yf": info.get("beta"),
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
        "analyst_count": info.get("numberOfAnalystOpinions"),
        "recommendation_mean": info.get("recommendationMean"),
        "short_ratio_days": info.get("shortRatio"),
        "held_pct_institutions": round(info.get("heldPercentInstitutions") * 100, 2) if info.get("heldPercentInstitutions") else None,
        "held_pct_insiders": round(info.get("heldPercentInsiders") * 100, 3) if info.get("heldPercentInsiders") else None,
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

    # --- Risk profile: beta/correlation vs S&P 500 and the semiconductor
    # sector (SOXX), volatility, Sharpe, max drawdown ---
    print("fetching benchmarks (S&P 500, SOXX, risk-free rate)...", file=sys.stderr)
    # Reuse fetch_core_stats so these benchmark series get the same
    # tz-normalization as every other series joined against them.
    _, market_closes = fetch_core_stats(MARKET_BENCHMARK)
    _, sector_closes = fetch_core_stats(SECTOR_BENCHMARK)
    rf_hist = yf.Ticker(RISK_FREE_TICKER).history(period="5d")
    risk_free_pct = float(rf_hist["Close"].dropna().iloc[-1]) if not rf_hist.empty else 0.0

    if closes is not None:
        etf_returns_1y = daily_returns(slice_since(closes, years=1))
        result["volatility_pct"] = annualized_vol(etf_returns_1y)
        result["sharpe_ratio"] = compute_sharpe(etf_returns_1y, risk_free_pct)
        result["max_drawdown_5y_pct"] = compute_max_drawdown(closes)
        if market_closes is not None:
            mkt_returns_1y = daily_returns(slice_since(market_closes, years=1))
            result["beta_vs_sp500"] = compute_beta(etf_returns_1y, mkt_returns_1y)
            result["correlation_vs_sp500"] = compute_correlation(etf_returns_1y, mkt_returns_1y)
        if sector_closes is not None:
            sec_returns_1y = daily_returns(slice_since(sector_closes, years=1))
            result["beta_vs_soxx"] = compute_beta(etf_returns_1y, sec_returns_1y)
            result["correlation_vs_soxx"] = compute_correlation(etf_returns_1y, sec_returns_1y)

    result["risk_free_rate_pct"] = round(risk_free_pct, 2)

    # --- Peer comparison ---
    print("fetching peer comps...", file=sys.stderr)
    peers = {}
    peer_closes = {"TSM": closes}
    for sym, label in PEERS.items():
        print(f"  {sym} ({label})...", file=sys.stderr)
        p_info, p_closes = fetch_core_stats(sym)
        peer_closes[sym] = p_closes
        peers[sym] = {
            "label": label,
            "currency": p_info.get("currency", "USD"),
            "price": p_info.get("currentPrice"),
            "market_cap": p_info.get("marketCap"),
            "trailing_pe": p_info.get("trailingPE"),
            "forward_pe": p_info.get("forwardPE"),
            "gross_margin_pct": round(p_info.get("grossMargins") * 100, 1) if p_info.get("grossMargins") else None,
            "operating_margin_pct": round(p_info.get("operatingMargins") * 100, 1) if p_info.get("operatingMargins") else None,
            "revenue_growth_yoy_pct": round(p_info.get("revenueGrowth") * 100, 1) if p_info.get("revenueGrowth") else None,
            "beta_yf": p_info.get("beta"),
            "change_1y_pct": pct_change(p_closes.tail(252)) if p_closes is not None else None,
        }
    result["peers"] = peers

    # correlation of TSM vs each peer, 1y daily returns
    peer_correlations = {}
    if closes is not None:
        tsm_returns = daily_returns(slice_since(closes, years=1))
        for sym, p_closes in peer_closes.items():
            if sym == "TSM" or p_closes is None:
                continue
            p_returns = daily_returns(slice_since(p_closes, years=1))
            peer_correlations[sym] = compute_correlation(tsm_returns, p_returns)
    result["peer_correlations"] = peer_correlations

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(result, indent=2))
    print(f"wrote {OUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
