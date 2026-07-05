/* 0n1x TERMINAL DECK — Bloomberg-grade, zero theater, REAL-TIME.
 * Every number from the ecosystem's signed public feeds; repolls every 45s.
 * Sources: census_history (253+ sealed epochs), selfgov (constitution health),
 * forecast_feed (Brier market), token_feed (signed transfers), live_activity (proofs).
 */
(function () {
  "use strict";
  const H = "https://rhinogent.com";
  const $ = (id) => document.getElementById(id);
  const j = async (u) => { try { return await (await fetch(H + u, { cache: "no-store" })).json(); } catch (e) { return null; } };
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round(n).toLocaleString("en-US");

  function lineChart(id, pts, color, fill) {
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
    g.fillStyle = color; g.beginPath(); g.arc(X(pts.length - 1), Y(pts[pts.length - 1]), 2.5, 0, 7); g.fill();
    // min/max scale labels
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
      const y = 4 + i * (bh + 5), w = (x.v / max) * (W - 165);
      g.fillStyle = color + "cc"; g.fillRect(120, y, Math.max(2, w), bh);
      g.fillStyle = "rgba(160,166,178,.95)"; g.font = "10px ui-monospace,monospace";
      g.fillText(x.k.slice(0, 16), 4, y + bh - 3);
      g.fillStyle = "rgba(234,234,234,.9)"; g.fillText("+" + fmt(x.v), 126 + w, y + bh - 3);
    });
  }

  async function refresh() {
    // sealed-epoch history → supply + tx curves + merkle lane
    const hist = await j("/census_history.json");
    if (hist && hist.length) {
      const circ = hist.map(h => h.circulating), txs = hist.map(h => h.txs);
      if ($("m-supply")) $("m-supply").textContent = fmt(circ[circ.length - 1]) + " TOKEN";
      if ($("m-txs")) $("m-txs").textContent = fmt(txs[txs.length - 1]) + " sealed";
      lineChart("ch-supply", circ, "#f5a623", true);
      lineChart("ch-txs", txs, "#7c9aff", true);
      const lane = $("mk-lane");
      if (lane) {
        lane.innerHTML = "";
        hist.slice(-24).reverse().forEach(h => {
          const d = document.createElement("span");
          d.style.cssText = "border:1px solid var(--border);border-radius:5px;padding:3px 7px;color:var(--muted)";
          d.title = h.ts + " · " + h.txs + " txs · " + fmt(h.circulating) + " TOKEN";
          d.textContent = h.merkle_root.slice(0, 8);
          lane.appendChild(d);
        });
      }
    }
    // live constitution health
    const gov = await j("/selfgov.json");
    if (gov && gov.recent && gov.recent.length) {
      const g0 = gov.recent[gov.recent.length - 1];
      if ($("g-trust")) $("g-trust").textContent = g0.health.network_trust_score;
      if ($("g-gini")) $("g-gini").textContent = g0.health.gini.toFixed(3);
      if ($("g-epoch")) $("g-epoch").textContent = g0.epoch;
      if ($("g-rat")) $("g-rat").textContent = g0.ratified ? "RATIFIED" : "pending";
      if ($("g-active")) $("g-active").textContent = (g0.health.active_ratio * 100).toFixed(2) + "%";
    }
    // forecast market — signed commits before resolution, reality judges
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
    // counterparty flow from the same signed feed the graph runs on
    const feed = await j("/token_feed.json");
    if (feed && feed.txs) {
      const flow = new Map();
      for (const t of feed.txs) {
        flow.set(t.from, (flow.get(t.from) || 0) + t.amount);
        flow.set(t.to, (flow.get(t.to) || 0) + t.amount);
      }
      const top = [...flow.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => ({ k, v }));
      barChart("ch-flow", top, "#3fdda0");
    }
    // proof-bearing activity stream
    const act = await j("/live_activity.json");
    if (act && act.events) {
      const el = $("act-stream");
      if (el) {
        el.innerHTML = "";
        act.events.slice(0, 20).forEach(e => {
          const d = document.createElement("div");
          d.innerHTML = '<span style="color:var(--text)">' + e.who + '</span> <span style="color:var(--muted)">' + e.text +
            '</span> <span style="color:#556" title="' + e.proof + '">· ' + e.proof.slice(0, 18) + '…</span>';
          el.appendChild(d);
        });
      }
    }
  }

  refresh();
  setInterval(refresh, 45000);   // REAL-TIME: re-linked to the ecosystem every 45s
})();
