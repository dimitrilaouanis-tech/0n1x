/* 0n1x TERMINAL DECK — Wall-Street grade, live-ticking. Zero theater.
 * Numbers animate to every new value, carry ▲/▼ deltas, and micro-drift between
 * polls so the board is never frozen. Real data from the ecosystem's signed
 * public feeds, repolled fast. Charts redraw live with a moving cursor.
 */
(function () {
  "use strict";
  const H = "https://rhinogent.com";
  const $ = (id) => document.getElementById(id);
  const j = async (u) => { try { return await (await fetch(H + u, { cache: "no-store" })).json(); } catch (e) { return null; } };
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round(n).toLocaleString("en-US");

  // ---- animated tickers: each id eases toward its target every frame ----------
  const T = {}; // id -> {cur, target, prev}
  function setTarget(id, val, render) {
    const el = $(id); if (!el) return;
    const s = T[id] || (T[id] = { cur: val, target: val, prev: val, render });
    s.prev = s.target; s.target = val; s.render = render;
  }
  function tickAll() {
    for (const id in T) {
      const s = T[id], el = $(id); if (!el) continue;
      s.cur += (s.target - s.cur) * 0.12;                 // ease
      if (Math.abs(s.target - s.cur) < 0.5) s.cur = s.target;
      el.textContent = s.render(s.cur);
      // delta chip beside it
      const dEl = $(id + "-d");
      if (dEl && s.target !== s.prev) {
        const up = s.target >= s.prev;
        dEl.textContent = (up ? "▲ " : "▼ ") + fmt(Math.abs(s.target - s.prev));
        dEl.style.color = up ? "#3fdda0" : "#e5484d";
      }
    }
    requestAnimationFrame(tickAll);
  }
  requestAnimationFrame(tickAll);

  // live clock + "last update" pulse
  setInterval(() => {
    const c = $("deck-clock"); if (c) c.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
  }, 1000);

  function lineChart(id, pts, color, fill, cursorPhase) {
    const c = $(id); if (!c || !pts.length) return;
    const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, Hh = r.height;
    const min = Math.min(...pts), max = Math.max(...pts), span = Math.max(1, max - min);
    const X = (i) => 4 + (i / Math.max(1, pts.length - 1)) * (W - 8);
    const Y = (v) => Hh - 6 - ((v - min) / span) * (Hh - 16);
    if (fill) {
      g.beginPath(); g.moveTo(X(0), Hh - 4);
      pts.forEach((v, i) => g.lineTo(X(i), Y(v)));
      g.lineTo(X(pts.length - 1), Hh - 4); g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, color + "44"); gr.addColorStop(1, color + "00");
      g.fillStyle = gr; g.fill();
    }
    g.beginPath(); pts.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
    g.strokeStyle = color; g.lineWidth = 1.6; g.stroke();
    // pulsing head cursor
    const hx = X(pts.length - 1), hy = Y(pts[pts.length - 1]);
    const pr = 2.5 + 1.5 * (0.5 + 0.5 * Math.sin(cursorPhase));
    g.fillStyle = color; g.beginPath(); g.arc(hx, hy, pr, 0, 7); g.fill();
    g.strokeStyle = color + "66"; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy, pr + 3, 0, 7); g.stroke();
    g.fillStyle = "rgba(138,143,152,.8)"; g.font = "9px ui-monospace,monospace";
    g.fillText(fmt(max), 4, 10); g.fillText(fmt(min), 4, Hh - 2);
  }

  function barChart(id, items, color) {
    const c = $(id); if (!c || !items.length) return;
    const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, Hh = r.height;
    const max = Math.max(...items.map(x => x.v));
    const bh = Math.min(18, (Hh - 4) / items.length - 5);
    items.forEach((x, i) => {
      const y = 4 + i * (bh + 5), w = (x.v / max) * (W - 165) * (x.anim || 1);
      const gr = g.createLinearGradient(120, 0, 120 + w, 0);
      gr.addColorStop(0, color + "55"); gr.addColorStop(1, color + "dd");
      g.fillStyle = gr; g.fillRect(120, y, Math.max(2, w), bh);
      g.fillStyle = "rgba(160,166,178,.95)"; g.font = "10px ui-monospace,monospace";
      g.fillText(x.k.slice(0, 16), 4, y + bh - 3);
      g.fillStyle = "rgba(234,234,234,.9)"; g.fillText("+" + fmt(x.v), 126 + w, y + bh - 3);
    });
  }

  // keep the two big curves + flow bars redrawing every frame (moving cursor)
  let supplyPts = [], txPts = [], flowItems = [];
  let barAnim = 0;
  (function paint() {
    const ph = performance.now() / 350;
    if (supplyPts.length) lineChart("ch-supply", supplyPts, "#f5a623", true, ph);
    if (txPts.length) lineChart("ch-txs", txPts, "#7c9aff", true, ph + 1);
    if (flowItems.length) { barAnim = Math.min(1, barAnim + 0.04); barChart("ch-flow", flowItems.map(x => ({ ...x, anim: barAnim })), "#3fdda0"); }
    requestAnimationFrame(paint);
  })();

  async function refresh() {
    const hist = await j("/census_history.json");
    if (hist && hist.length) {
      supplyPts = hist.map(h => h.circulating); txPts = hist.map(h => h.txs);
      setTarget("m-supply", supplyPts[supplyPts.length - 1], (v) => fmt(v) + " TOKEN");
      setTarget("m-txs", txPts[txPts.length - 1], (v) => fmt(v) + " sealed");
      const lane = $("mk-lane");
      if (lane) {
        lane.innerHTML = "";
        hist.slice(-24).reverse().forEach((h, i) => {
          const d = document.createElement("span");
          d.style.cssText = "border:1px solid var(--border);border-radius:5px;padding:3px 7px;color:" + (i === 0 ? "#3fdda0" : "var(--muted)") + (i === 0 ? ";border-color:rgba(63,221,160,.4)" : "");
          d.title = h.ts + " · " + h.txs + " txs · " + fmt(h.circulating) + " TOKEN";
          d.textContent = h.merkle_root.slice(0, 8);
          lane.appendChild(d);
        });
      }
    }
    const gov = await j("/selfgov.json");
    if (gov && gov.recent && gov.recent.length) {
      const g0 = gov.recent[gov.recent.length - 1];
      setTarget("g-trust", g0.health.network_trust_score, (v) => Math.round(v));
      if ($("g-gini")) $("g-gini").textContent = g0.health.gini.toFixed(3);
      if ($("g-epoch")) $("g-epoch").textContent = g0.epoch;
      if ($("g-rat")) $("g-rat").textContent = g0.ratified ? "RATIFIED" : "pending";
      if ($("g-active")) $("g-active").textContent = (g0.health.active_ratio * 100).toFixed(2) + "%";
    }
    const fc = await j("/forecast_feed.json");
    if (fc) {
      const o = $("fc-open");
      if (o) {
        o.innerHTML = "";
        (fc.open_questions || []).slice(0, 3).forEach(q => {
          const d = document.createElement("div");
          const mins = Math.max(0, Math.round((q.resolves_at * 1000 - Date.now()) / 60000));
          d.innerHTML = '<span style="color:var(--amber)">[' + q.category + ']</span> <span style="color:var(--text)">' + q.text +
            '</span> <span style="color:var(--muted)">· ' + q.commits + ' signed commits · resolves ' + mins + 'm</span>';
          o.appendChild(d);
        });
      }
      const rr = $("fc-res");
      if (rr) {
        rr.innerHTML = "";
        (fc.recent_resolutions || []).slice(0, 4).forEach(q => {
          const d = document.createElement("div");
          d.innerHTML = (q.outcome ? '<span style="color:var(--green)">✔ YES</span> ' : '<span style="color:#e5484d">✘ NO</span> ') + q.text;
          rr.appendChild(d);
        });
      }
    }
    const feed = await j("/token_feed.json");
    if (feed && feed.txs) {
      const flow = new Map();
      for (const t of feed.txs) {
        flow.set(t.from, (flow.get(t.from) || 0) + t.amount);
        flow.set(t.to, (flow.get(t.to) || 0) + t.amount);
      }
      flowItems = [...flow.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => ({ k, v }));
      barAnim = 0;
    }
    const act = await j("/live_activity.json");
    if (act && act.events) {
      const el = $("act-stream");
      if (el) {
        el.innerHTML = "";
        act.events.slice(0, 20).forEach((e, i) => {
          const d = document.createElement("div");
          if (i === 0) d.style.cssText = "animation:deckflash .9s";
          d.innerHTML = '<span style="color:var(--text)">' + e.who + '</span> <span style="color:var(--muted)">' + e.text +
            '</span> <span style="color:#556" title="' + e.proof + '">· ' + e.proof.slice(0, 18) + '…</span>';
          el.appendChild(d);
        });
      }
    }
    const pl = $("deck-pulse"); if (pl) { pl.style.opacity = "1"; setTimeout(() => { if (pl) pl.style.opacity = ".25"; }, 400); }
  }

  refresh();
  setInterval(refresh, 12000);   // Wall-Street cadence: 12s repoll (was 45s)
})();
