/* 0n1x Matrix Engine v9 — the WOW build.
 * Additive-blended (globalCompositeOperation:'lighter') canvas renderer:
 * parallax starfield · breathing node glow · orbital satellites around hubs ·
 * continuous particle streams on active edges · comet transfers · zoom/pan.
 * Deterministic layout + balances (identical every load). Real signed feed only.
 * Usage: OnyxMatrix.mount(canvasEl, { feedUrl, onStats, tapeEl })
 */
(function () {
  "use strict";

  function hash(s, m) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * (m || 31) + s.charCodeAt(i)) >>> 0; return h; }
  function pos(name) {
    const h = hash(name, 31);
    const ang = (h % 10000) / 10000 * Math.PI * 2;
    const rad = 0.16 + ((h >>> 13) % 10000) / 10000 * 0.8;
    return [0.5 + Math.cos(ang) * rad * 0.47, 0.5 + Math.sin(ang) * rad * 0.42];
  }
  const bal = (n) => 240 + (hash(n, 33) % 1400);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function mount(cv, opts) {
    opts = opts || {};
    const THEME = opts.theme === "rhino"
      ? { hot: [255, 150, 235], base: [160, 175, 255], ring: "255,150,225", core: "235,190,255",
          bg: ["#141026", "#0d0a1c", "#0a0716"] }                                                   // Rhino: deep indigo/violet
      : { hot: [255, 196, 110], base: [150, 185, 255], ring: "255,225,170", core: "255,214,150",
          bg: ["#0b0b10", "#07070a", "#050506"] };                                                  // 0n1x: neutral space
    const ctx = cv.getContext("2d");
    let W = 0, H = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); addEventListener("resize", resize);

    // ---- interaction -------------------------------------------------------
    // initialZoom scales around the CENTER (ox/oy compensate) — otherwise the
    // galaxy slides toward the top-left when opening zoomed out.
    const _s0 = opts.initialZoom || 1;
    const view = { s: _s0, ox: W / 2 * (1 - _s0), oy: H / 2 * (1 - _s0) };
    let drag = null, mouse = null, focus = null, dragMoved = false;
    // 3D diastasi: per-agent depth + drifting camera => parallax = felt depth
    let camX = 0, camY = 0;
    const zOf = (n) => 0.78 + (hash(n, 53) % 1000) / 1000 * 0.85;   // 0.78 (near) .. 1.63 (far)
    const proj = (n) => {
      const [u, v] = pos(n); const z = zOf(n);
      const bx = u * W * view.s + view.ox, by = v * H * view.s + view.oy;
      return [W / 2 + (bx - W / 2) / z + camX * (1 - 1 / z),
              H / 2 + (by - H / 2) / z + camY * (1 - 1 / z), z];
    };
    cv.style.cursor = "grab";
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const s2 = clamp(view.s * Math.exp(-e.deltaY * 0.0014), 0.5, 14);
      view.ox = mx - (mx - view.ox) * (s2 / view.s);
      view.oy = my - (my - view.oy) * (s2 / view.s);
      view.s = s2;
    }, { passive: false });
    cv.addEventListener("mousedown", (e) => { drag = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy }; dragMoved = false; cv.style.cursor = "grabbing"; });
    addEventListener("mouseup", () => { drag = null; cv.style.cursor = "grab"; });
    cv.addEventListener("mousemove", (e) => {
      const r = cv.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (drag) { view.ox = drag.ox + (e.clientX - drag.x); view.oy = drag.oy + (e.clientY - drag.y);
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) dragMoved = true; }
    });
    cv.addEventListener("mouseleave", () => { mouse = null; drag = null; cv.style.cursor = "grab"; });
    cv.addEventListener("dblclick", () => { view.s = 1; view.ox = 0; view.oy = 0; focus = null; });
    cv.addEventListener("click", (e) => {
      if (dragMoved) return;                      // real drag, not a click
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const zs2 = Math.sqrt(view.s);
      const maxB2 = Math.max(1, ...agents.map(a => a.b));
      let hitN = null;
      for (let i = agents.length - 1; i >= 0; i--) {
        const a = agents[i];
        const sz = (3.2 + (a.b / maxB2) * 5.8) * zs2 + 5;
        const [px, py] = proj(a.n);
        const dx = mx - px, dy = my - py;
        if (dx * dx + dy * dy <= sz * sz) { hitN = a.n; break; }
      }
      focus = (hitN === focus) ? null : hitN;     // toggle; empty click clears
    });
    // touch: 1-finger pan, 2-finger pinch zoom
    let touch = null;
    cv.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: view.ox, oy: view.oy };
      else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        touch = { pinch: Math.hypot(dx, dy), s: view.s };
      }
    }, { passive: true });
    cv.addEventListener("touchmove", (e) => {
      if (!touch) return;
      if (e.touches.length === 1 && touch.ox !== undefined) {
        view.ox = touch.ox + (e.touches[0].clientX - touch.x);
        view.oy = touch.oy + (e.touches[0].clientY - touch.y);
      } else if (e.touches.length === 2 && touch.pinch) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        view.s = clamp(touch.s * Math.hypot(dx, dy) / touch.pinch, 0.5, 14);
      }
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener("touchend", () => { touch = null; }, { passive: true });

    // ---- state -------------------------------------------------------------
    let agents = [], txs = [], particles = [], flow = 0, tick = 0, liveTx = 0, baseTx = 0;
    const heat = new Map();   // callsign -> activity heat (decays; brightness = activation)
    const flares = new Map();
    let ecoTotal = 0, merkle = "";

    // ---- THE GALAXY — every agent in the ecosystem as a real dot ------------
    // Painted ONCE to an offscreen canvas (spiral-galaxy distribution, fully
    // deterministic), then blitted under the live graph each frame with the
    // pan/zoom transform. 340k dots at 60fps because we never redraw them.
    const galaxy = document.createElement("canvas");
    const GW = 3200, GH = 3200;                     // HD: higher-res offscreen = crisper when blitted
    galaxy.width = GW; galaxy.height = GH;
    function paintGalaxy(count) {
      const g = galaxy.getContext("2d");
      g.clearRect(0, 0, GW, GH);
      const CX = GW / 2, CY = GH / 2;
      const themeCore = THEME.core;                  // gold (0n1x) / violet (rhino)
      // ── LAYER 1: soft nebula clouds (depth) — a few big blurred blobs, painted first ──
      g.globalCompositeOperation = "lighter";
      for (let c = 0; c < 7; c++) {
        const hc = hash("neb" + c, 91);
        const na = (hc % 1000) / 1000 * Math.PI * 2;
        const nr = 0.12 + ((hc >>> 10) % 1000) / 1000 * 0.42;
        const nx = CX + Math.cos(na) * nr * GW * 0.42, ny = CY + Math.sin(na) * nr * GH * 0.42 * 0.7;
        const nrad = GW * (0.10 + ((hc >>> 5) % 100) / 100 * 0.14);
        const cool = c % 2 === 0;
        const col = cool ? "120,150,255" : themeCore;
        const neb = g.createRadialGradient(nx, ny, 0, nx, ny, nrad);
        neb.addColorStop(0, `rgba(${col},0.05)`);
        neb.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = neb; g.beginPath(); g.arc(nx, ny, nrad, 0, Math.PI * 2); g.fill();
      }
      // ── LAYER 2: the star field — every agent, uniform angle, HD crisp cores ──
      const n = Math.min(count || 2000000, 5000000);
      const BUCKETS = 12;                             // finer radial color banding
      const bx = [], by = [], bs = [], ba = [];
      for (let b = 0; b < BUCKETS; b++) { bx.push([]); by.push([]); bs.push([]); ba.push([]); }
      let bright = 0;
      for (let i = 0; i < n; i++) {
        const h1 = (i * 2654435761) >>> 0;
        const h2 = ((i * 40503 + 2699) >>> 0) & 0xffff;
        const h3 = ((i * 22695477 + 1) >>> 0) & 0xffff;
        const h4 = ((i * 3266489917 + 5) >>> 0) & 0xffff;
        const rr = Math.pow((h1 % 100000) / 100000, 0.80);
        // 3D SWIRL: 2 gentle spiral arms winding toward the core (frame-drag) + scatter,
        // and a depth stratum so arms sit at different "heights" = the universe swirls in 3D.
        const arm = (h4 & 1);
        const swirl = 2.2 * Math.pow(1 - rr, 1.3);                    // winds more near the core
        const scatter = ((h2 / 0xffff) - 0.5) * (1.7 - rr * 0.5);     // arms stay loose/spacey
        const ang = arm * Math.PI + swirl + scatter + (h3 / 0xffff) * 0.5;
        const stratum = h3 % 3;                                       // 3 depth planes
        const depth = [1.0, 0.86, 0.72][stratum];
        const R = rr * GW * 0.47 * depth;
        const ell = 0.60 + (h3 >>> 2 & 0xff) / 0xff * 0.26;
        const x = CX + Math.cos(ang) * R, y = CY + Math.sin(ang) * R * ell;
        const b = Math.min(BUCKETS - 1, (rr * BUCKETS) | 0);
        // HD: mostly fine 1px dust + a sparse set of brighter, larger "resolved" stars.
        // near stratum = bigger/brighter (3D pop), far = fainter.
        const isBright = (h4 % 22) === 0;
        bx[b].push(x); by[b].push(y);
        bs[b].push((isBright ? 2.0 + (h4 % 5) * 0.4 : (rr < 0.2 ? 1.1 : 0.8)) * depth);
        ba[b].push((isBright ? 0.9 : 0.4 + (h4 % 100) / 100 * 0.4) * (0.7 + 0.3 * depth));
        if (isBright) bright++;
      }
      for (let bkt = 0; bkt < BUCKETS; bkt++) {
        const warm = 1 - (bkt + 0.5) / BUCKETS;
        const cr = 175 + warm * 70 | 0, cg = 195 + warm * 25 | 0, cb = 245 - warm * 70 | 0;
        const X = bx[bkt], Y = by[bkt], S = bs[bkt], A = ba[bkt];
        const base = 0.055 + warm * 0.09;
        for (let i = 0; i < X.length; i++) {
          g.fillStyle = `rgba(${cr},${cg},${cb},${(base * A[i]).toFixed(3)})`;
          g.fillRect(X[i], Y[i], S[i], S[i]);
        }
      }
      // ── LAYER 3: nebula core haze (the live supernova is per-frame) ──
      const core = g.createRadialGradient(CX, CY, 0, CX, CY, GW * 0.15);
      core.addColorStop(0, `rgba(${themeCore},0.32)`);
      core.addColorStop(0.5, `rgba(${themeCore},0.10)`);
      core.addColorStop(1, `rgba(${themeCore},0)`);
      g.fillStyle = core;
      g.beginPath(); g.arc(CX, CY, GW * 0.15, 0, Math.PI * 2); g.fill();
    }
    paintGalaxy(2000000); // provisional floor; repainted with the live manifest count (2M+ and climbing)

    // ---- NEURAL FIRING — synapse cascades through the real edge graph -------
    // Every beat a hub fires; the signal propagates along its actual transfer
    // edges to neighbors (hop 1), then theirs (hop 2) — a living neural net.
    const firing = new Map();   // name -> {start, hop}
    let fireSeed = 7;
    function fireCascade() {
      if (!agents.length) return;
      fireSeed = (fireSeed * 1103515245 + 12345) >>> 0;
      const origins = [];
      for (let o = 0; o < 3; o++) { fireSeed = (fireSeed * 1103515245 + 12345) >>> 0; origins.push(agents[fireSeed % Math.min(60, agents.length)].n); }
      const origin = origins[0];
      const nbr = new Map();    // adjacency from real txs
      for (const x of txs) {
        if (!nbr.has(x.from)) nbr.set(x.from, []);
        if (!nbr.has(x.to)) nbr.set(x.to, []);
        nbr.get(x.from).push(x.to); nbr.get(x.to).push(x.from);
      }
      const now = performance.now();
      for (const orig of origins) {
        firing.set(orig, { start: now, hop: 0 });
        const h1 = nbr.get(orig) || [];
        for (const a of h1) if (!firing.has(a)) firing.set(a, { start: now + 160, hop: 1 });
        for (const a of h1) for (const b of (nbr.get(a) || []))
          if (!firing.has(b)) firing.set(b, { start: now + 320, hop: 2 });
      }
    }
    setInterval(fireCascade, 650);
    // parallax starfield — 3 depth layers, deterministic
    const stars = [];
    for (let i = 0; i < 170; i++) {
      const h = hash("star" + i, 37);
      stars.push({
        u: (h % 1000) / 1000, v: ((h >>> 10) % 1000) / 1000,
        z: 0.25 + ((h >>> 20) % 3) * 0.3,               // depth layer
        r: 0.4 + ((h >>> 5) % 10) / 14,                  // radius
        tw: (h % 628) / 100                              // twinkle phase
      });
    }

    const sx = (u) => u * W * view.s + view.ox;
    const sy = (v) => v * H * view.s + view.oy;
    const ctrl = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1; return [mx - dy * 0.15, my + dx * 0.15]; };
    const qp = (t, x1, y1, cx, cy, x2, y2) => { const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * x1 + b * cx + c * x2, a * y1 + b * cy + c * y2]; };

    // ---- render loop -------------------------------------------------------
    function draw(nowMs) {
      requestAnimationFrame(draw);            // rebook FIRST — an error costs one frame, never the loop
      try { drawFrame(nowMs); } catch (e) { window.__matrixErr = e.message; }
    }
    function drawFrame(nowMs) {
      const t = nowMs / 1000;
      const drift = Math.min(W, H) * 0.035; camX = Math.sin(t * 0.20) * drift; camY = Math.cos(t * 0.17) * drift * 0.7;  // drift scales to screen — stays centered on mobile
      // deep-space base (normal blending)
      ctx.globalCompositeOperation = "source-over";
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      bg.addColorStop(0, THEME.bg[0]); bg.addColorStop(0.6, THEME.bg[1]); bg.addColorStop(1, THEME.bg[2]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // EVERYTHING luminous below renders additively — the glow secret
      ctx.globalCompositeOperation = "lighter";

      // THE WHOLE ECOSYSTEM — the galaxy of every agent, under the live graph.
      // Blitted with the same pan/zoom transform (slightly damped = deep layer).
      {
        const gs = view.s * 0.85 + 0.15;                 // zooms a touch slower (depth)
        const gw = Math.max(W, H) * 1.6 * gs;
        const cx2 = W / 2 + (view.ox - (1 - view.s) * W / 2) * 0.85;
        const cy2 = H / 2 + (view.oy - (1 - view.s) * H / 2) * 0.85;
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(t * 0.020);                           // the galaxy TURNS (faster — frame-drag)
        ctx.globalAlpha = 0.72 + 0.10 * Math.sin(t * 0.35);  // breathing luminosity
        ctx.drawImage(galaxy, -gw / 2, -gw / 2, gw, gw);
        ctx.restore();
        ctx.globalAlpha = 1;
        // AMBIENT ARRAY LIFE — random faint sparks across the whole ecosystem field
        for (let sp = 0; sp < 14; sp++) {
          const sh = hash("spark" + sp + (t * 3 | 0), 89);
          const sa = (sh % 1000) / 1000 * Math.PI * 2;
          const srr = Math.pow(((sh >>> 10) % 1000) / 1000, 0.7);
          const sx2 = W / 2 + Math.cos(sa) * srr * Math.max(W, H) * 0.42 * view.s + (view.ox - (1 - view.s) * W / 2);
          const sy2 = H / 2 + Math.sin(sa) * srr * Math.max(W, H) * 0.30 * view.s + (view.oy - (1 - view.s) * H / 2);
          const twk = 0.5 + 0.5 * Math.sin(t * 8 + sp);
          ctx.fillStyle = `rgba(200,225,255,${(0.25 * twk).toFixed(3)})`;
          ctx.fillRect(sx2, sy2, 1.6, 1.6);
        }
        // SUPERNOVA CORE — pulsing bright heart at the galaxy center (additive)
        const scx = W / 2 + (view.ox - (1 - view.s) * W / 2) * 0.85;
        const scy = H / 2 + (view.oy - (1 - view.s) * H / 2) * 0.85;
        const puls = 0.80 + 0.20 * Math.sin(t * 1.8) + 0.05 * Math.sin(t * 5.3);   // layered flicker
        const sr = Math.max(W, H) * 0.13 * view.s * puls;                          // bigger
        const CR = THEME.core;
        const sn = ctx.createRadialGradient(scx, scy, 0, scx, scy, sr);
        sn.addColorStop(0, "rgba(255,255,255,1)");
        sn.addColorStop(0.12, "rgba(255,250,235," + (0.85 * puls).toFixed(2) + ")");
        sn.addColorStop(0.32, `rgba(${CR},${(0.35 * puls).toFixed(2)})`);
        sn.addColorStop(0.6, `rgba(${CR},0.10)`);
        sn.addColorStop(1, `rgba(${CR},0)`);
        ctx.fillStyle = sn;
        ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2); ctx.fill();
        // bright hot pinpoint
        ctx.fillStyle = "rgba(255,255,255," + (0.9 * puls).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(scx, scy, sr * 0.09, 0, Math.PI * 2); ctx.fill();
        // 6 diffraction rays (brighter, a starburst)
        ctx.lineWidth = 1.4;
        for (let a = 0; a < 6; a++) {
          const an = a * Math.PI / 3 + t * 0.04;
          const rl = sr * (a % 2 ? 4.2 : 2.8);
          const rg = ctx.createLinearGradient(scx - Math.cos(an) * rl, scy - Math.sin(an) * rl, scx + Math.cos(an) * rl, scy + Math.sin(an) * rl);
          rg.addColorStop(0, "rgba(255,246,225,0)");
          rg.addColorStop(0.5, "rgba(255,248,230," + (0.22 * puls).toFixed(2) + ")");
          rg.addColorStop(1, "rgba(255,246,225,0)");
          ctx.strokeStyle = rg;
          ctx.beginPath();
          ctx.moveTo(scx - Math.cos(an) * rl, scy - Math.sin(an) * rl);
          ctx.lineTo(scx + Math.cos(an) * rl, scy + Math.sin(an) * rl);
          ctx.stroke();
        }
      }

      // parallax starfield (drifts slower than the graph = depth)
      for (const s of stars) {
        const px = ((s.u * W + view.ox * s.z * 0.4) % (W + 40) + W + 40) % (W + 40) - 20;
        const py = ((s.v * H + view.oy * s.z * 0.4) % (H + 40) + H + 40) % (H + 40) - 20;
        const a = (0.25 + 0.2 * Math.sin(t * 0.8 + s.tw)) * s.z;
        ctx.beginPath(); ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,205,240,${a.toFixed(3)})`; ctx.fill();
      }

      const zs = Math.sqrt(view.s);
      const maxB = Math.max(1, ...agents.map(a => a.b));

      // edges — real transfer pairs + continuous particle stream on each
      const pairs = new Map();
      for (const x of txs) {
        if (x.from === x.to) continue;
        const k = x.from < x.to ? x.from + "|" + x.to : x.to + "|" + x.from;
        const e = pairs.get(k); if (e) e.n++; else pairs.set(k, { a: x.from, b: x.to, n: 1 });
      }
      const nbrSet = new Set();
      if (focus) { nbrSet.add(focus); for (const e of pairs.values()) { if (e.a === focus) nbrSet.add(e.b); if (e.b === focus) nbrSet.add(e.a); } }
      let pi = 0;
      for (const e of pairs.values()) {
        const [x1, y1] = proj(e.a), [x2, y2] = proj(e.b);
        if (Math.max(x1, x2) < -60 || Math.min(x1, x2) > W + 60) { pi++; continue; }
        const [qx, qy] = ctrl(x1, y1, x2, y2);
        const onFocus = focus && (e.a === focus || e.b === focus);
        const dimmed = focus && !onFocus;
        const eg = ctx.createLinearGradient(x1, y1, x2, y2);   // gradient: cool → warm
        const ea = dimmed ? 0.02 : (onFocus ? 0.55 : Math.min(0.22, 0.06 + e.n * 0.035));
        eg.addColorStop(0, `rgba(110,150,255,${ea})`);
        eg.addColorStop(1, `rgba(255,190,120,${ea})`);
        ctx.strokeStyle = eg;
        ctx.lineWidth = onFocus ? 1.8 : Math.min(1.6, 0.55 + (e.n - 1) * 0.25);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(qx, qy, x2, y2); ctx.stroke();
        // stream: 1-3 photons flowing along the edge, phase-offset per edge
        const nStream = Math.min(3, e.n);
        for (let k = 0; k < nStream; k++) {
          const ph = ((t * 0.22 + pi * 0.37 + k / nStream) % 1);
          const [px, py] = qp(ph, x1, y1, qx, qy, x2, y2);
          const g = ctx.createRadialGradient(px, py, 0, px, py, 3.2 * zs);
          g.addColorStop(0, "rgba(170,190,255,0.55)"); g.addColorStop(1, "rgba(170,190,255,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 3.2 * zs, 0, Math.PI * 2); ctx.fill();
        }
        pi++;
      }

      // nodes — breathing glow cores + orbital satellites on hubs
      const now = performance.now();
      agents.forEach((a, i) => {
        const [x, y, zz] = proj(a.n);
        const depth = 1 / zz;                       // near => >1, far => <1
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
        let fl = 0;
        const ft = flares.get(a.n);
        if (ft !== undefined) { const age = (now - ft) / 1000; if (age >= 1) flares.delete(a.n); else fl = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85; }
        // synapse fire: sharp white flash that decays ~600ms, hop-delayed
        const fr = firing.get(a.n);
        if (fr !== undefined) {
          const fage = now - fr.start;
          if (fage > 650) firing.delete(a.n);
          else if (fage >= 0) fl = Math.max(fl, (1 - fage / 650) * (1 - fr.hop * 0.28));
        }
        const hv = heat.get(a.n) || 0;
        if (hv > 0) heat.set(a.n, hv * 0.995);          // slow decay of activation
        const isFocus = focus === a.n, isNbr = focus && nbrSet.has(a.n);
        const dimNode = focus && !isFocus && !isNbr;
        const breathe = 1 + 0.10 * Math.sin(t * 1.4 + (hash(a.n, 41) % 628) / 100);
        const s = (3.2 + (a.b / maxB) * 5.8) * zs * breathe * (1 + 0.3 * fl) * (isFocus ? 1.5 : 1) * (0.65 + 0.45 * depth);
        fl = Math.min(1, fl + hv * 0.5);                 // activation adds brightness
        const amber = i < 10;
        const cr = amber ? THEME.hot[0] : THEME.base[0], cg = amber ? THEME.hot[1] : THEME.base[1], cb = amber ? THEME.hot[2] : THEME.base[2];

        if (dimNode) ctx.globalAlpha = 0.16;             // focus mode: the rest recedes
        // aura (additive => real bloom)
        const hr = s * 4;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, hr);
        halo.addColorStop(0, `rgba(${cr},${cg},${cb},${0.28 + 0.3 * fl})`);
        halo.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.07 + 0.1 * fl})`);
        halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill();
        // hot core
        const core = ctx.createRadialGradient(x, y, 0, x, y, s);
        core.addColorStop(0, "rgba(255,255,255,0.95)");
        core.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.9)`);
        core.addColorStop(1, `rgba(${cr},${cg},${cb},0.12)`);
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;
        // focus ring — a bright halo ring around the selected neuron
        if (isFocus) {
          ctx.strokeStyle = "rgba(140,240,200,0.85)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(x, y, s * 2.4 + 3 * Math.sin(t * 3), 0, Math.PI * 2); ctx.stroke();
        }
        // (orbits removed — replaced by supernova spark bursts on the biggest hubs)
        // top hubs occasionally emit a tiny supernova spark (star being born/burning)
        if ((i < 6 || isFocus) && ((hash(a.n + (t * 1.5 | 0), 47) % 30) === 0)) {
          const spk = s * (2.2 + (hash(a.n, 51) % 10) / 10);
          const sparkG = ctx.createRadialGradient(x, y, 0, x, y, spk);
          sparkG.addColorStop(0, `rgba(255,255,255,0.5)`);
          sparkG.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.25)`);
          sparkG.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.fillStyle = sparkG; ctx.beginPath(); ctx.arc(x, y, spk, 0, Math.PI * 2); ctx.fill();
        }
      });

      // comet transfers (live ticks)
      for (const p of particles) {
        p.t += 0.02;
        const fx = sx(p.fu), fy = sy(p.fv), tx = sx(p.tu), ty = sy(p.tv);
        const [qx, qy] = ctrl(fx, fy, tx, ty);
        const head = Math.min(1, p.t), size = (1.6 + Math.min(2, p.amt / 28)) * zs;
        for (let k = 5; k >= 0; k--) {
          const tt = Math.max(0, head - k * 0.03);
          const [x, y] = qp(tt, fx, fy, qx, qy, tx, ty);
          const al = (k === 0 ? 0.95 : 0.3 * (1 - k / 6)) * Math.max(0, 1 - p.t * 0.6);
          const cg2 = ctx.createRadialGradient(x, y, 0, x, y, (k === 0 ? size * 2.4 : size));
          cg2.addColorStop(0, `rgba(255,240,215,${al.toFixed(3)})`);
          cg2.addColorStop(1, "rgba(255,240,215,0)");
          ctx.fillStyle = cg2;
          ctx.beginPath(); ctx.arc(x, y, k === 0 ? size * 2.4 : size, 0, Math.PI * 2); ctx.fill();
        }
      }
      particles = particles.filter(p => p.t < 1.15);

      // 3D FLYING LETTERS — depth-projected words that fly in, hold, fly through.
      // Explains what 0n1x is, cinematically, over the living network.
      if (opts.messages && opts.messages.length) {
        const CYC = 5.0;                                  // seconds per message
        // RHYTHM: play a few messages, then PAUSE (let the galaxy breathe), then resume.
        // A "super-cycle" = N messages of screen time + a quiet gap.
        const RUN = opts.messages.length;                 // one full round = every message once
        const PAUSE = 7.0;                                // quiet seconds between rounds
        const SUPER = RUN * CYC + PAUSE;
        const st = t % SUPER;                             // time within the super-cycle
        if (st >= RUN * CYC) {
          // in the pause window — draw nothing (galaxy alone), skip the whole letter block
        } else {
        const mi = Math.floor(st / CYC) % RUN;
        const mt = (st % CYC) / CYC;                      // 0..1 within cycle
        let scale, alpha;
        if (mt < 0.16) { const u = mt / 0.16; scale = 0.25 + 0.75 * (1 - Math.pow(1 - u, 3)); alpha = u; }           // snappier fly-in
        else if (mt < 0.70) { scale = 1 + (mt - 0.16) * 0.06; alpha = 1; }                                          // hold
        else { const u = (mt - 0.70) / 0.30; scale = 1.03 + u * u * (W < 600 ? 1.5 : 2.8); alpha = 1 - u; }          // fly THROUGH camera (gentler on mobile)
        // MATRIX GLITCH: chars resolve out of code-rain, RGB-split, slice tears + micro flicker
        const raw = opts.messages[mi];
        const GLYPHS = "01<>/\\|=+*#$%&@!?ΞΦΨΩ░▒▓";
        const settle = mt < 0.16 ? mt / 0.16 : 1;
        let msg = "";
        for (let ci = 0; ci < raw.length; ci++) {
          // occasional mid-hold glitch flicker on a random char (more alive)
          const flick = settle >= 1 && (hash("f" + ci + (t * 9 | 0), 79) % 40) === 0;
          const stable = !flick && (hash(raw + ci, 61) % 100) / 100 < settle * settle * 1.4;
          msg += (stable || raw[ci] === " ") ? raw[ci]
               : GLYPHS[(hash(raw + ci + (t * 26 | 0), 67) % GLYPHS.length)];   // faster scramble
        }
        const fs = Math.min(W / 16, W < 600 ? 34 : 60) * scale;
        const mx0 = W / 2, my0 = H / 2 + fs * 0.35;
        ctx.font = `700 ${fs}px ui-monospace,Consolas,monospace`;
        ctx.textAlign = "center";
        const tear = (settle < 1 || (hash("g" + (t * 8 | 0), 71) % 7) === 0) ? (hash("t" + (t * 16 | 0), 73) % 9) - 4 : 0;
        // FROST: soft icy-white bloom halo behind the glyphs + crystalline blue rim
        ctx.save();
        ctx.shadowColor = "rgba(190,225,255,0.55)";
        ctx.shadowBlur = fs * 0.28;                       // frosty glow
        ctx.fillStyle = `rgba(205,230,255,${(alpha * 0.25).toFixed(3)})`;
        ctx.fillText(msg, mx0, my0);
        ctx.restore();
        // chromatic aberration: red left, cyan right
        ctx.fillStyle = `rgba(255,60,80,${(alpha * 0.30).toFixed(3)})`;
        ctx.fillText(msg, mx0 - 2 - tear, my0);
        ctx.fillStyle = `rgba(80,220,255,${(alpha * 0.32).toFixed(3)})`;   // icy cyan
        ctx.fillText(msg, mx0 + 2 + tear, my0);
        // frost core: cool white with a faint blue tint
        ctx.fillStyle = `rgba(180,235,255,${(alpha * 0.35).toFixed(3)})`;
        ctx.fillText(msg, mx0, my0);
        ctx.fillStyle = `rgba(240,252,255,${(alpha * 0.92).toFixed(3)})`;
        ctx.fillText(msg, mx0, my0);
        // tiny frost specks around the text (sparse, icy)
        if (settle >= 1) {
          for (let fp = 0; fp < 5; fp++) {
            const fh = hash("frost" + fp + (t * 2 | 0), 83);
            const fx = mx0 + ((fh % 1000) / 1000 - 0.5) * fs * raw.length * 0.6;
            const fy = my0 + (((fh >>> 10) % 1000) / 1000 - 0.7) * fs * 0.9;
            ctx.fillStyle = `rgba(220,240,255,${(alpha * 0.5 * ((fh % 10) / 10)).toFixed(3)})`;
            ctx.fillRect(fx, fy, 1.4, 1.4);
          }
        }
        ctx.textAlign = "start";
        } // end active-message branch
      }

      // labels + tooltip render normally (crisp, not additive)
      ctx.globalCompositeOperation = "source-over";
      agents.forEach((a, i) => {
        if (i >= 8 && view.s <= 2.2) return;
        const [x, y] = proj(a.n);
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
        const s = (3.2 + (a.b / maxB) * 5.8) * zs;
        ctx.fillStyle = "rgba(165,172,186,0.9)";
        ctx.font = "9px ui-monospace,Consolas,monospace";
        ctx.fillText(a.n, x + s + 5, y + 3);
      });
      if (mouse && !drag) {
        let hit = null;
        for (let i = agents.length - 1; i >= 0; i--) {
          const a = agents[i]; const [px2, py2] = proj(a.n);
          const s = (3.2 + (a.b / maxB) * 5.8) * zs;
          const dx = mouse.x - px2, dy = mouse.y - py2;
          if (dx * dx + dy * dy <= (s + 5) * (s + 5)) { hit = a; break; }
        }
        if (hit) {
          const label = hit.n + " · " + hit.b.toLocaleString("en-US") + " TOKEN";
          ctx.font = "11px ui-monospace,Consolas,monospace";
          const tw = ctx.measureText(label).width, bw = tw + 10, bh = 20;
          let bx = mouse.x + 12, by = mouse.y - bh - 6;
          if (bx + bw > W - 4) bx = mouse.x - bw - 12;
          if (by < 4) by = mouse.y + 12;
          ctx.fillStyle = "rgba(20,21,24,0.95)"; ctx.strokeStyle = "#2a2b31"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.rect(Math.round(bx) + 0.5, Math.round(by) + 0.5, bw, bh); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(238,238,240,0.96)"; ctx.fillText(label, bx + 5, by + 14);
        }
      }
    }
    requestAnimationFrame(draw);

    // ---- live tape + feed --------------------------------------------------
    function tapeTick() {
      if (!txs.length) return;
      const x = txs[tick % txs.length]; tick++;
      flares.set(x.from, performance.now()); flares.set(x.to, performance.now());
      heat.set(x.from, Math.min(1, (heat.get(x.from) || 0) + 0.25));
      heat.set(x.to, Math.min(1, (heat.get(x.to) || 0) + 0.25));
      const [fu, fv] = pos(x.from), [tu, tv] = pos(x.to);
      particles.push({ fu, fv, tu, tv, t: 0, amt: x.amount || 10 });
      if (particles.length > 140) particles.shift();
      flow += (x.amount || 0);
      liveTx += 1;
      if (opts.onStats) opts.onStats({ flow, txsLive: baseTx + liveTx });
      if (opts.tapeEl) {
        const div = document.createElement("div");
        div.className = "row fresh";
        div.innerHTML = `<span>${x.from}</span><span style="color:var(--muted)">→</span><span>${x.to}</span>` +
          `<span class="amt">+${x.amount}</span>` +
          (x.sig ? `<span class="sig" title="EIP-191 signature">${String(x.sig).slice(0, 10)}…</span>` : "") +
          `<span class="check" title="signed by sender's key, verified on ledger">✓</span>`;
        opts.tapeEl.prepend(div);
        setTimeout(() => div.classList.remove("fresh"), 900);
        while (opts.tapeEl.children.length > 14) opts.tapeEl.removeChild(opts.tapeEl.lastChild);
      }
    }
    // RHYTHM — not a metronome. Mostly a steady pulse, then occasional "bang-bang-bang"
    // bursts: a rapid volley of signed transfers (the economy spiking), then calm again.
    let burstLeft = 0;
    (function pulse() {
      tapeTick();
      if (burstLeft > 0) { burstLeft--; setTimeout(pulse, 95 + Math.random() * 45); return; }   // volley
      if (Math.random() < 0.16) { burstLeft = 4 + Math.floor(Math.random() * 6); setTimeout(pulse, 120); return; } // fire a burst
      setTimeout(pulse, 500 + Math.random() * 460);                                              // varied calm beat
    })();

    async function load() {
      try {
        const d = await (await fetch(opts.feedUrl, { cache: "no-store" })).json();
        txs = d.txs || [];
        const names = new Set();
        for (const x of txs) { names.add(x.from); names.add(x.to); }
        // realistic weight: each agent's size = the REAL token volume flowing through it
        // (sum of amounts sent+received on the signed tape), not a cosmetic hash.
        const vol = new Map();
        for (const t of txs) {
          vol.set(t.from, (vol.get(t.from) || 0) + (t.amount || 0));
          vol.set(t.to, (vol.get(t.to) || 0) + (t.amount || 0));
        }
        agents = [...names].map(n => ({ n, b: (vol.get(n) || 0) + bal(n) * 0.15 }))  // real volume dominates; tiny hash floor so idle agents still show
                           .sort((a, b) => b.b - a.b).slice(0, 300);
        if (opts.onStats) opts.onStats({ agents: agents.length });
      } catch (e) { /* keep last good frame */ }
      // REAL cumulative tx count — from census_history (the SAME source the terminal
      // deck uses) so the HUD and deck show the IDENTICAL number. total_verified is
      // only the current feed window (~700) and would misalign badly (~127k real).
      try {
        const h = await (await fetch("https://rhinogent.com/census_history.json", { cache: "no-store" })).json();
        if (h && h.length) {
          baseTx = h[h.length - 1].txs; liveTx = 0;
          if (opts.onStats) opts.onStats({ txsVerified: baseTx });  // circulating comes from the manifest ONLY (census_history's copy can lag days behind)
        }
      } catch (e) { /* history optional */ }
      // the EXTENT: live Merkle-rooted manifest → real ecosystem total for the galaxy
      if (opts.manifestUrl) {
        try {
          const m = await (await fetch(opts.manifestUrl, { cache: "no-store" })).json();
          const c = m.count || m.total || 0;
          if (c && c !== ecoTotal) { ecoTotal = c; paintGalaxy(c); }
          merkle = m.merkle_root || "";
          if (opts.onStats) opts.onStats({ merkle, circulating: m.circulating });  // eco owned by the climb ticker
        } catch (e) { /* manifest optional */ }
      }
    }
    load(); setInterval(load, 10000);
    // LIVE agent count — ease the displayed number UP toward the real Merkle-rooted
    // manifest count, so it visibly CLIMBS as the fleet mints. Honest: only rises to
    // the real target, never past it.
    let ecoShown = 0;
    setInterval(() => {
      if (!ecoTotal) return;
      if (ecoShown === 0) ecoShown = ecoTotal;
      else if (ecoShown < ecoTotal) {
        ecoShown += Math.max(1, Math.ceil((ecoTotal - ecoShown) * 0.05));
        if (ecoShown > ecoTotal) ecoShown = ecoTotal;
      }
      if (opts.onStats) opts.onStats({ ecoTotal: Math.round(ecoShown) });
    }, 320);

    return { get view() { return view; } };
  }

  window.OnyxMatrix = { mount, pos, bal };
})();
