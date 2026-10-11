import { h, fmt, compact } from "../ui.js";
import { loadSite } from "../store.js";

// GoatCounter API token (read-only "statistics" permission). Kept on this device only.
const GC_KEY = "cl_gc_token";
export const getGcToken = () => { try { return localStorage.getItem(GC_KEY) || ""; } catch { return ""; } };
export const setGcToken = (t) => { try { t ? localStorage.setItem(GC_KEY, t) : localStorage.removeItem(GC_KEY); } catch {} };

const isoDay = (d) => d.toISOString().slice(0, 10);
const countOf = (x) => Number(x?.count ?? x?.count_unique ?? 0) || 0;
const dayValue = (s) => Number(s?.daily ?? (Array.isArray(s?.hourly) ? s.hourly.reduce((a, b) => a + b, 0) : 0)) || 0;

async function gc(code, token, path, params) {
  const q = new URLSearchParams(params);
  const res = await fetch(`https://${code}.goatcounter.com/api/v0${path}?${q}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error(res.status === 401 || res.status === 403 ? "GoatCounter rejected the API token." : `GoatCounter error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Returns { total, days: [{day, value}], pages, events, refs, browsers, systems, locations, sizes }.
export async function fetchStats(code, token, days) {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - (days - 1)));
  const range = { start: start.toISOString(), end: end.toISOString() };
  const [hits, refs, browsers, systems, locations, sizes] = await Promise.all([
    gc(code, token, "/stats/hits", { ...range, limit: 50, daily: true }),
    ...["toprefs", "browsers", "systems", "locations", "sizes"].map((p) => gc(code, token, `/stats/${p}`, { ...range, limit: 8 }).catch(() => ({ stats: [] }))),
  ]);

  const byDay = new Map();
  for (let i = 0; i < days; i++) byDay.set(isoDay(new Date(start.getTime() + i * 864e5)), 0);
  const all = hits.hits || [];
  const pages = all.filter((x) => !x.event);
  for (const p of pages) for (const s of p.stats || []) if (byDay.has(s.day)) byDay.set(s.day, byDay.get(s.day) + dayValue(s));

  const list = (r) => (r.stats || []).map((x) => ({ name: x.name || "(unknown)", value: countOf(x) })).filter((x) => x.value > 0);
  return {
    total: pages.reduce((a, p) => a + countOf(p), 0),
    days: [...byDay].map(([day, value]) => ({ day, value })),
    pages: pages.map((p) => ({ name: p.path, title: p.title, value: countOf(p) })).sort((a, b) => b.value - a.value).slice(0, 10),
    events: all.filter((x) => x.event).map((e) => ({ name: e.path, value: countOf(e) })).sort((a, b) => b.value - a.value),
    refs: list(refs).map((r) => ({ ...r, name: r.name === "(unknown)" ? "Direct / unknown" : r.name })),
    browsers: list(browsers),
    systems: list(systems),
    locations: list(locations),
    sizes: list(sizes),
  };
}

// Public all-time counter (works without a token if "Allow adding visitor counts" is enabled in GoatCounter).
export async function fetchPublicTotal(code) {
  const res = await fetch(`https://${code}.goatcounter.com/counter/TOTAL.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Counter unavailable (${res.status})`);
  const digits = String((await res.json()).count ?? "").replace(/[^\d]/g, "");
  if (!digits) throw new Error("Counter returned no number");
  return Number(digits);
}

/* ---------------- Charts ---------------- */

const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = [1, 2, 2.5, 5, 10].find((m) => m * p >= v);
  return n * p;
};
const dayLabel = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Single-series column chart with hover tooltip and a table fallback.
export function dailyChart(days) {
  const W = 720, H = 220, padL = 36, padB = 26, padT = 12;
  const max = niceMax(Math.max(...days.map((d) => d.value), 0));
  const plotW = W - padL - 8, plotH = H - padT - padB;
  const slot = plotW / days.length;
  const bw = Math.min(24, Math.max(2, slot - 2));
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "chart");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Daily visitors, ${days.length} days, peak ${fmt(Math.max(...days.map((d) => d.value)))}`);
  const el = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    svg.append(n);
    return n;
  };
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    const y = padT + plotH - (v / max) * plotH;
    el("line", { x1: padL, x2: W - 8, y1: y, y2: y, class: "grid" });
    el("text", { x: padL - 8, y: y + 4, class: "tick", "text-anchor": "end" }, compact(v));
  }
  const tip = h("div.chart-tip", { hidden: true });
  const labelEvery = Math.ceil(days.length / 6);
  days.forEach((d, i) => {
    const x = padL + i * slot + (slot - bw) / 2;
    const bh = d.value ? Math.max(2, (d.value / max) * plotH) : 0;
    const y = padT + plotH - bh;
    const r = Math.min(4, bw / 2, bh);
    if (bh) el("path", { class: "bar", d: `M${x},${y + bh} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + bh} Z` });
    if (i % labelEvery === 0 || i === days.length - 1) el("text", { x: x + bw / 2, y: H - 8, class: "tick", "text-anchor": "middle" }, dayLabel(d.day));
    const hit = el("rect", { x: padL + i * slot, y: padT, width: slot, height: plotH, class: "hit", tabindex: 0, "aria-label": `${dayLabel(d.day)}: ${fmt(d.value)}` });
    const show = () => {
      tip.hidden = false;
      tip.replaceChildren(h("strong", fmt(d.value)), h("span", dayLabel(d.day)));
      tip.style.left = `${((padL + i * slot + slot / 2) / W) * 100}%`;
      tip.style.top = `${(y / H) * 100}%`;
      hit.classList.add("on");
    };
    const hide = () => { tip.hidden = true; hit.classList.remove("on"); };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", show);
    hit.addEventListener("blur", hide);
  });
  el("line", { x1: padL, x2: W - 8, y1: padT + plotH, y2: padT + plotH, class: "axis" });

  const table = h("details.table-view", h("summary", "Show as table"),
    h("div.table-wrap", h("table.table.compact", h("thead", h("tr", h("th", "Day"), h("th.num", "Visitors"))),
      h("tbody", days.map((d) => h("tr", h("td", dayLabel(d.day)), h("td.num", fmt(d.value))))))));
  return h("div.chart-wrap", h("div.chart-box", svg, tip), table);
}

// Width is set through CSSOM: the admin CSP blocks inline style attributes.
const bar = (pct) => {
  const el = h("div.rank-bar");
  el.style.width = `${pct}%`;
  return el;
};

// Ranked list with proportional bars (single series, labels in text color).
export function rankList(title, rows, { empty = "No data yet", label = (r) => r.name } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h("div.panel.rank",
    h("h3", title),
    rows.length
      ? h("ol.rank-list", rows.map((r) => h("li",
          h("div.rank-row", h("span.rank-name", { title: r.name }, label(r)), h("span.rank-val", fmt(r.value))),
          h("div.rank-track", bar((r.value / max) * 100)))))
      : h("p.muted", empty));
}

const EVENT_NAMES = {
  "newsletter-signup": "Newsletter signups",
  "share-linkedin": "Shared to LinkedIn",
  "share-x": "Shared to X",
  "share-facebook": "Shared to Facebook",
  "share-email": "Shared by email",
  "share-copy-link": "Link copied",
};

/* ---------------- View ---------------- */

export async function render(ctx, view, _params, { setActions }) {
  const { data: site } = await loadSite(ctx);
  const code = site.settings?.goatcounterCode;

  if (!code) {
    view.replaceChildren(setupPanel());
    return;
  }

  let days = 30;
  const seg = h("div.seg", { role: "group", "aria-label": "Date range" },
    [7, 30, 90].map((n) => h("button", { type: "button", class: n === days ? "active" : "", onclick: (e) => { days = n; seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === e.currentTarget)); load(); } }, `${n} days`)));
  setActions(seg, h("a.btn.btn-ghost", { href: `https://${code}.goatcounter.com`, target: "_blank", rel: "noopener" }, "GoatCounter ↗"));

  const body = h("div.stats-body");
  view.replaceChildren(body);

  async function load() {
    const token = getGcToken();
    body.replaceChildren(h("div.loading", h("span.spinner"), "Loading stats…"));
    if (!token) return body.replaceChildren(await fallback("Add a GoatCounter API token in Settings to see detailed stats here."));
    try {
      const s = await fetchStats(code, token, days);
      const signups = s.events.find((e) => e.name === "newsletter-signup")?.value || 0;
      const shares = s.events.filter((e) => e.name.startsWith("share-")).reduce((a, e) => a + e.value, 0);
      const peak = s.days.reduce((a, d) => (d.value > a.value ? d : a), { value: 0 });
      body.replaceChildren(
        h("div.kpis",
          kpi("Visitors", fmt(s.total), `last ${days} days`),
          kpi("Daily average", fmt(Math.round(s.total / days)), peak.value ? `peak ${fmt(peak.value)} on ${dayLabel(peak.day)}` : ""),
          kpi("Newsletter signups", fmt(signups), s.total ? `${((signups / s.total) * 100).toFixed(1)}% of visitors` : ""),
          kpi("Shares", fmt(shares), "share buttons + copy link")),
        h("div.panel", h("h3", "Visitors per day"), dailyChart(s.days)),
        h("div.grid-2",
          rankList("Top pages", s.pages, { label: (r) => r.title && r.title !== r.name ? `${r.name} · ${r.title}` : r.name }),
          rankList("Top referrers", s.refs, { empty: "No referrers yet" })),
        h("div.grid-2",
          rankList("Countries", s.locations),
          rankList("Actions", s.events.map((e) => ({ ...e, name: EVENT_NAMES[e.name] || e.name })), { empty: "No signups or shares yet" })),
        h("div.grid-3",
          rankList("Browsers", s.browsers),
          rankList("Operating systems", s.systems),
          rankList("Screen sizes", s.sizes)));
    } catch (err) {
      console.warn(err);
      body.replaceChildren(await fallback(err.status ? err.message : "Couldn't reach the GoatCounter API from the browser."));
    }
  }

  async function fallback(reason) {
    let total = null;
    try { total = await fetchPublicTotal(code); } catch {}
    return h("div",
      total !== null ? h("div.kpis", kpi("All-time visitors", fmt(total), "from GoatCounter's public counter")) : null,
      h("div.notice", h("strong", "Detailed stats unavailable. "), reason, " ",
        h("a", { href: `https://${code}.goatcounter.com`, target: "_blank", rel: "noopener" }, "Open your GoatCounter dashboard ↗"), " for the full picture."));
  }

  load();
}

export function kpi(label, value, sub) {
  return h("div.kpi", h("span.kpi-label", label), h("strong.kpi-value", value), sub ? h("span.kpi-sub", sub) : null);
}

function setupPanel() {
  return h("div.panel.setup",
    h("h2", "Turn on visitor stats"),
    h("p", "Stats use GoatCounter: free for small sites, privacy-friendly, and no cookie banner needed."),
    h("ol.steps",
      h("li", "Create a free account at ", h("a", { href: "https://www.goatcounter.com/signup", target: "_blank", rel: "noopener" }, "goatcounter.com/signup ↗"), ". Pick a code, e.g. ", h("code", "collettilabs"), "."),
      h("li", "In this admin, go to ", h("a", { href: "#/settings" }, "Settings"), ", enter the code under ", h("b", "GoatCounter code"), ", and save. Tracking starts on the live site about a minute later."),
      h("li", "For charts here: in GoatCounter open ", h("b", "Settings → API"), ", create a token with ", h("b", "Read statistics"), " only, and paste it in Settings.")));
}

