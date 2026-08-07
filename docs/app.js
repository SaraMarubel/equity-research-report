/* TSMC equity research report — no build step, no framework, no CDN. */

(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
})();
document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

let GLOSSARY = {};
const hoverTip = document.getElementById("hover-tip");

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function fmtPct(v, decimals = 1) {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}%`;
}
function fmtMoney(v, currency = "USD") {
  if (v === null || v === undefined) return "—";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(v); }
  catch { return `$${v.toFixed(2)}`; }
}
function fmtBig(v, currency = "USD") {
  if (v === null || v === undefined) return "—";
  const prefix = currency === "TWD" ? "NT$" : "$";
  if (v >= 1e12) return `${prefix}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${prefix}${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${prefix}${(v / 1e6).toFixed(1)}M`;
  return `${prefix}${v}`;
}
function wireGlossaryTerms() {
  document.querySelectorAll(".term[data-term]").forEach(el => {
    if (el.dataset.wired) return;
    el.dataset.wired = "1";
    el.addEventListener("mouseenter", (ev) => {
      const def = GLOSSARY[el.dataset.term];
      if (!def) return;
      hoverTip.innerHTML = `<div class="h-title">${el.dataset.term}</div><div>${def}</div>`;
      hoverTip.classList.add("show");
      positionHoverTip(ev);
    });
    el.addEventListener("mousemove", positionHoverTip);
    el.addEventListener("mouseleave", () => hoverTip.classList.remove("show"));
  });
}
function positionHoverTip(ev) {
  const pad = 16;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + 250 > window.innerWidth) x = ev.clientX - 250 - pad;
  if (y + 160 > window.innerHeight) y = ev.clientY - 160;
  hoverTip.style.left = `${x}px`;
  hoverTip.style.top = `${y}px`;
}

function statTile(label, value, cls) {
  return `<div class="stat"><div class="k">${label}</div><div class="v ${cls || ""}">${value}</div></div>`;
}
function termLabel(label, key) {
  return GLOSSARY[key || label] ? `<span class="term" data-term="${key || label}">${label}</span>` : label;
}
function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function pOrNm(v, decimals, suffix) {
  if (v === null || v === undefined || v <= 0) return "n/m";
  return v.toFixed(decimals) + (suffix || "");
}

function renderBarList(containerId, rows, colorFn) {
  const max = Math.max(...rows.map(r => r.value), 1);
  document.getElementById(containerId).innerHTML = rows.map((r, i) => `
    <div class="bar-row">
      <div class="lbl">${r.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.value / max) * 100}%; background:${colorFn(i)}"></div></div>
      <div class="val">${r.value}%</div>
    </div>`).join("");
}

function drawGroupedBarChart(canvas, categories, seriesA, seriesB, labelA, labelB) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  const h = canvas.clientHeight || 220;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const padLeft = 44, padBottom = 26, padTop = 14, padRight = 10;
  const plotW = w - padLeft - padRight, plotH = h - padTop - padBottom;
  const maxVal = Math.max(...seriesA, ...seriesB.filter(v => v != null)) * 1.1;
  const groupW = plotW / categories.length;
  const barW = Math.min(26, groupW * 0.3);

  const colorA = cssVar("--series-1"), colorB = cssVar("--series-6");
  const ink = cssVar("--text-secondary"), muted = cssVar("--text-muted"), grid = cssVar("--gridline");

  // gridlines + y labels
  ctx.strokeStyle = grid; ctx.fillStyle = muted; ctx.font = "10px system-ui"; ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padTop + plotH - (plotH * i / steps);
    ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
    const val = (maxVal * i / steps);
    ctx.fillText(`$${Math.round(val)}B`, 4, y + 3);
  }

  categories.forEach((cat, i) => {
    const groupX = padLeft + i * groupW + groupW / 2;
    const aVal = seriesA[i];
    const aH = (aVal / maxVal) * plotH;
    ctx.fillStyle = colorA;
    roundRectTop(ctx, groupX - barW - 2, padTop + plotH - aH, barW, aH, 3);

    const bVal = seriesB[i];
    if (bVal != null) {
      const bH = (bVal / maxVal) * plotH;
      ctx.fillStyle = colorB;
      roundRectTop(ctx, groupX + 2, padTop + plotH - bH, barW, bH, 3);
    }

    ctx.fillStyle = ink; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    ctx.fillText(cat, groupX, h - 6);
  });
  ctx.textAlign = "left";
}
function roundRectTop(ctx, x, y, width, height, r) {
  if (height <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();
}

function renderOwnershipStrip(data) {
  document.getElementById("ownership-strip").innerHTML =
    statTile("Institutional Ownership", data.held_pct_institutions != null ? data.held_pct_institutions + "%" : "—") +
    statTile("Insider Ownership", data.held_pct_insiders != null ? data.held_pct_insiders + "%" : "—") +
    statTile(termLabel("Short Interest Ratio", "Short Ratio"), data.short_ratio_days != null ? data.short_ratio_days.toFixed(1) + " days" : "—") +
    statTile("Analysts Covering", data.analyst_count ?? "—") +
    statTile("Analyst Recommendation (1=Strong Buy, 5=Sell)", data.recommendation_mean != null ? data.recommendation_mean.toFixed(2) : "—") +
    statTile("Consensus Rating", (data.analyst_recommendation || "—").replace("_", " ").toUpperCase());
}

function renderQuantStrip(data) {
  document.getElementById("quant-strip").innerHTML =
    statTile(termLabel("Beta (1Y daily, vs S&P 500)", "Beta"), data.beta_vs_sp500 ?? "—") +
    statTile("Beta (Yahoo, standard methodology)", data.beta_yf ?? "—") +
    statTile(termLabel("Beta vs Semiconductor Sector (SOXX)", "Beta"), data.beta_vs_soxx ?? "—") +
    statTile(termLabel("Volatility (ann.)", "Volatility"), data.volatility_pct != null ? data.volatility_pct + "%" : "—") +
    statTile(termLabel("Sharpe Ratio", "Sharpe Ratio"), data.sharpe_ratio ?? "—") +
    statTile(termLabel("Max Drawdown (5Y)", "Max Drawdown"), data.max_drawdown_5y_pct != null ? data.max_drawdown_5y_pct + "%" : "—");
}

// Approximate spot rates for cross-currency display only (not live FX) —
// matches the illustrative-conversion approach already used for TSMC's own
// TWD balance-sheet figures elsewhere on this page.
const FX_TO_USD = { KRW: 1 / 1350, TWD: 1 / 31, USD: 1 };

function fmtPeerMoney(v, currency) {
  if (v === null || v === undefined) return "—";
  if (currency && currency !== "USD") {
    // Shown in native currency (not converted) so the price itself isn't
    // misleading — the market-cap column separately shows a USD approximation.
    return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
  }
  return fmtMoney(v, currency);
}

function fmtPeerMarketCap(v, currency) {
  if (v === null || v === undefined) return "—";
  const rate = FX_TO_USD[currency] ?? 1;
  const usdApprox = v * rate;
  const usdStr = fmtBig(usdApprox);
  return currency && currency !== "USD" ? `${usdStr} approx.` : usdStr;
}

function renderPeerTable(data) {
  const rows = [{ sym: "TSM", label: "TSMC", ...data, is_self: true }, ...Object.entries(data.peers).map(([sym, p]) => ({ sym, ...p }))];
  const html = `<div style="overflow-x:auto;"><table class="data-table">
    <thead><tr>
      <th>Company</th><th class="num">Price (native ccy)</th><th class="num">Mkt Cap (USD equiv.)</th>
      <th class="num">${termLabel("Trailing P/E", "P/E Ratio")}</th><th class="num">Fwd P/E</th>
      <th class="num">Gross Margin</th><th class="num">Op. Margin</th>
      <th class="num">Rev. Growth YoY</th><th class="num">1Y Return</th><th class="num">Beta</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr${r.is_self ? ' style="font-weight:700;"' : ""}>
          <td>${r.is_self ? "TSMC" : r.label} <span style="color:var(--text-muted); font-weight:400;">${r.sym}</span></td>
          <td class="num">${r.is_self ? fmtMoney(r.price) : fmtPeerMoney(r.price, r.currency)}</td>
          <td class="num">${fmtPeerMarketCap(r.market_cap, r.currency)}</td>
          <td class="num">${pOrNm(r.trailing_pe, 1, "x")}</td>
          <td class="num">${pOrNm(r.forward_pe, 1, "x")}</td>
          <td class="num">${r.gross_margin_pct != null ? r.gross_margin_pct + "%" : "—"}</td>
          <td class="num">${r.operating_margin_pct != null ? r.operating_margin_pct + "%" : "—"}</td>
          <td class="num ${(r.revenue_growth_yoy_pct ?? 0) >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.revenue_growth_yoy_pct)}</td>
          <td class="num ${(r.change_1y_pct ?? 0) >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.change_1y_pct)}</td>
          <td class="num">${r.beta_yf ?? "—"}</td>
        </tr>`).join("")}
    </tbody>
  </table></div>`;
  document.getElementById("peer-table-wrap").innerHTML = html;
}

function renderCorrelationChart(data) {
  const rows = [
    { label: "S&P 500", value: data.correlation_vs_sp500 },
    { label: "Semiconductor Sector (SOXX)", value: data.correlation_vs_soxx },
    { label: "Intel (INTC)", value: data.peer_correlations?.INTC },
    { label: "Samsung Electronics", value: data.peer_correlations?.["005930.KS"] },
    { label: "GlobalFoundries (GFS)", value: data.peer_correlations?.GFS },
    { label: "UMC", value: data.peer_correlations?.UMC },
    { label: "ASML", value: data.peer_correlations?.ASML },
  ].filter(r => r.value != null);
  const container = document.getElementById("correlation-chart");
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 1);
  container.innerHTML = rows.map((r, i) => `
    <div class="bar-row">
      <div class="lbl">${r.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(Math.abs(r.value) / max) * 100}%; background:var(--series-${(i % 8) + 1})"></div></div>
      <div class="val">${r.value.toFixed(2)}</div>
    </div>`).join("");
}

function renderNewsFeed(containerId, items, hasKey) {
  const el = document.getElementById(containerId);
  if (!hasKey) {
    el.innerHTML = `<div class="empty-note">Live news isn't wired up yet. Add a free API key from <a href="https://newsapi.org" target="_blank" rel="noopener">newsapi.org</a> as the <code>NEWSAPI_KEY</code> secret in this repo's GitHub settings, and the next scheduled refresh will populate headlines here.</div>`;
    return;
  }
  if (!items || items.length === 0) {
    el.innerHTML = `<div class="empty-note">No recent headlines matched this topic in the last fetch.</div>`;
    return;
  }
  el.innerHTML = items.map(a => `
    <div class="news-item">
      <div class="news-date">${timeAgo(a.published_at)}</div>
      <div class="news-body">
        <a href="${a.url}" target="_blank" rel="noopener">${a.title}</a>
        <div class="news-src">${a.source || "Unknown source"}</div>
      </div>
    </div>`).join("");
}

async function init() {
  try {
    // no-store: these are live/frequently-updated data files fetched from a
    // fixed URL, so without this a browser can cache them indefinitely and
    // never see a newer version pushed by the scheduled refresh workflow.
    const noStore = { cache: "no-store" };
    const [glossary, data, news] = await Promise.all([
      fetch("glossary.json", noStore).then(r => r.json()).catch(() => ({})),
      fetch("data/tsmc_data.json", noStore).then(r => r.json()),
      fetch("data/news.json", noStore).then(r => r.json()).catch(() => ({ news: {}, has_key: false })),
    ]);
    GLOSSARY = glossary;

    document.getElementById("report-date").textContent =
      `Equity Research Report · Initiating Coverage · Data as of ${new Date(data.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

    const dayCls = (data.change_1d_pct ?? 0) >= 0 ? "delta-up" : "delta-down";
    document.getElementById("stat-strip").innerHTML =
      statTile("Price (USD)", fmtMoney(data.price)) +
      statTile("1D Change", fmtPct(data.change_1d_pct), dayCls) +
      statTile("Market Cap", fmtBig(data.market_cap)) +
      statTile("Trailing P/E", data.trailing_pe ? data.trailing_pe.toFixed(1) + "x" : "—") +
      statTile("Forward P/E", data.forward_pe ? data.forward_pe.toFixed(1) + "x" : "—") +
      statTile("52-Wk Range", `${fmtMoney(data.fifty_two_week_low)}–${fmtMoney(data.fifty_two_week_high)}`);

    const cash = data.total_cash_local, debt = data.total_debt_local;
    const rate = 31; // approximate TWD/USD spot for display only
    document.getElementById("balance-sheet-strip").innerHTML =
      statTile("Cash (NT$)", fmtBig(cash, "TWD")) +
      statTile("Cash (approx. USD)", cash ? fmtBig(cash / rate) : "—") +
      statTile("Debt (NT$)", fmtBig(debt, "TWD")) +
      statTile("Net Cash (approx. USD)", (cash && debt) ? fmtBig((cash - debt) / rate) : "—") +
      statTile("2026 Capex Guidance", "$60–64B") +
      statTile("Advanced-Node Share of Capex", "70–80%");

    document.getElementById("metrics-strip").innerHTML =
      statTile("Gross Margin", data.gross_margin_pct != null ? data.gross_margin_pct + "%" : "—") +
      statTile("Operating Margin", data.operating_margin_pct != null ? data.operating_margin_pct + "%" : "—") +
      statTile("Net Margin", data.profit_margin_pct != null ? data.profit_margin_pct + "%" : "—") +
      statTile("ROE", data.roe_pct != null ? data.roe_pct + "%" : "—") +
      statTile("Revenue Growth (YoY)", data.revenue_growth_yoy_pct != null ? "+" + data.revenue_growth_yoy_pct + "%" : "—", "delta-up") +
      statTile("Earnings Growth (YoY)", data.earnings_growth_yoy_pct != null ? "+" + data.earnings_growth_yoy_pct + "%" : "—", "delta-up");

    document.getElementById("valuation-strip").innerHTML =
      statTile("Trailing P/E", data.trailing_pe ? data.trailing_pe.toFixed(1) + "x" : "—") +
      statTile("Forward P/E", data.forward_pe ? data.forward_pe.toFixed(1) + "x" : "—") +
      statTile("EV/EBITDA (est.)", "~18.5x") +
      statTile("Dividend Yield", data.dividend_yield_pct != null ? data.dividend_yield_pct.toFixed(2) + "%" : "—") +
      statTile("Analyst Mean Target", fmtMoney(data.analyst_target_mean)) +
      statTile("Analyst Consensus", (data.analyst_recommendation || "—").replace("_", " ").toUpperCase());

    renderBarList("node-chart", [
      { label: "2nm", value: 3 }, { label: "3nm", value: 30 }, { label: "5nm", value: 33 },
      { label: "7nm", value: 11 }, { label: "Older nodes", value: 23 },
    ], i => i < 4 ? `var(--series-${i + 1})` : "var(--text-muted)");

    renderBarList("platform-chart", [
      { label: "HPC", value: 66 }, { label: "Smartphone", value: 22 }, { label: "IoT", value: 5 },
      { label: "Automotive", value: 4 }, { label: "Other", value: 3 },
    ], i => `var(--series-${i + 1})`);

    renderBarList("marketshare-chart", [
      { label: "TSMC", value: 67.6 }, { label: "Samsung Foundry", value: 7.2 },
      { label: "Intel, GF, UMC, SMIC, other", value: 25.2 },
    ], i => `var(--series-${i + 1})`);

    renderOwnershipStrip(data);
    renderQuantStrip(data);
    renderPeerTable(data);
    renderCorrelationChart(data);
    renderNewsFeed("news-tsmc", news.news?.tsmc, news.has_key);
    renderNewsFeed("news-policy", news.news?.policy, news.has_key);
    renderNewsFeed("news-peers", news.news?.peers, news.has_key);

    // Annual revenue/net income figures below are hand-researched (yfinance
    // only exposes price history for free, not historical income statements).
    const drawRevenueChart = () => drawGroupedBarChart(
      document.getElementById("revenue-chart"),
      ["2021", "2022", "2023", "2024", "2025"],
      [57.31, 73.74, 70.35, 89.08, 121.81],
      [null, null, 27.82, 35.33, 54.12],
    );
    // A short delay (rather than requestAnimationFrame alone) ensures layout
    // has actually settled before we measure the canvas's rendered size.
    setTimeout(drawRevenueChart, 0);
    window.addEventListener("resize", drawRevenueChart);

    wireGlossaryTerms();
  } catch (err) {
    console.error(err);
  }
}
init();
