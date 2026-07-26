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

async function init() {
  try {
    const [glossary, data] = await Promise.all([
      fetch("glossary.json").then(r => r.json()).catch(() => ({})),
      fetch("data/tsmc_data.json").then(r => r.json()),
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
