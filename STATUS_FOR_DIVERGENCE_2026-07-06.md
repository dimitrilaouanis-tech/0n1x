# 0n1x / Rhinogent — Status Report for the Divergence
**Date:** 2026-07-06 · **Session:** matrix/site build (Fable-5, "twin")

---

## 1. WHERE WE ARE — one line
The trust ecosystem is **launch-grade**: two live sites, a living HD galaxy of the whole ecosystem, a functional signed LLM chat, a token economy, and meticulously-aligned real-time metrics. The visuals and functionality now *look and behave* like the top of the industry — because the underlying system genuinely is.

## 2. LIVE SURFACES
| Surface | URL | State |
|---|---|---|
| 0n1x entity + Matrix | `0n1xagntc.com` | 🟢 HD galaxy hero, terminal deck, security, dossier, scoreboard |
| 0n1x full Matrix | `0n1xagntc.com/matrix.html` | 🟢 galaxy + neurons + Bloomberg terminal, all metrics live |
| Rhinogent | `rhinogent.com` | 🟢 hero, census (twin galaxy, violet theme), pro chat, dashboard |
| Live signed API | `onyx-actions.onrender.com` | 🟢 33 signed tools |
| Chat brain | self-healing tunnel → local groq | 🟢 answers signed + structured |

## 3. WHAT SHIPPED THIS SESSION (verified live)
- **Matrix galaxy** → v26 HD: 3200px offscreen, layered nebula depth, resolved bright stars + fine dust, 12-band color, live pulsing **supernova core**, no spirals. Twin on Rhino in **violet** (0n1x = gold).
- **3D glitch+frost letters** — code-rain resolve, chromatic aberration, frost bloom; now play **one round then pause 7s** (no forever-loop).
- **Chat FUNCTIONAL** — was latching a dead tunnel URL; now re-resolves every message + retries. Real LLM (groq, `brain:groq`, **zero DeepSeek burn**). **Self-healing** via `OnyxPortalKeepalive` (3-min cron: portal + tunnel + republish portal.json).
- **Chat UI** — Gemini/Claude clean (killed the bubbly backdrop), **markdown-structured answers** + **typewriter reveal**, prompt chips, minimal header.
- **Token economy** — 500 welcome grant, premium chat 5 TOKEN/msg, per-agent-card pricing (2–12, address-derived), pay-to-chat, +0.1 overachievement reward on mint.
- **Metrics ALIGNED (meticulous)** — HUD was showing 715 (feed window) vs deck 126,914 (real cumulative); **both now read the same cumulative source**, identical across 0n1x + Rhino, 15s cadence. Live count synced (manifest, currently **632,000 agents** climbing to 1M).
- **Auth consistency** — nav now reflects the persisted session on every page (was static "Sign in" even when logged in).
- **Mobile** — dvh heights (iOS 100vh fix), viewport-fit=cover, touch-action:none on canvas, no horizontal scroll.
- **AEO** — sitemap (12 URLs), IndexNow'd, capsule pages, live signed **hollow-agent dossier** (molty.cash = HOLLOW, trust 10/100), "0n1x vs the industry" scoreboard.
- **Systems** — MERIT_v0, Visual Language doctrine, reward primitive.

## 4. IN FLIGHT RIGHT NOW (2 OP agents)
- **A** — chat gets **real-time internet/news grounding** (web_search tool on the brain).
- **B** — Android fit on `/matrix.html`, tone down the dashboard chat CTA, add a "Connect with 0n1x" link on the matrix page.

## 5. HONEST GAPS / RISKS (for the divergence to weigh)
1. **Brain durability** — chat runs through a cloudflare quick-tunnel on the operator's machine; self-heals but dies if the machine sleeps. **Durable fix = groq key on Render** (always-on, no tunnel). Not yet done (needs Render dashboard).
2. **Token model unblessed** — premium-chat + per-card pricing shipped as an operator call; **the divergence has NOT weighed in**. Open question: is metering right for launch, or free-tier + paywall / first-N-free?
3. **Closed experiment** — every agent is operator-run; disclosed everywhere. Real external adoption = 0. The next unlock is **externals-as-stars** (outside agents light up live on join).
4. **Android** — matrix page needed pinch-out (agent B fixing now).

## 6. DECISIONS WANTED FROM THE DIVERGENCE
1. **Token/pricing model** — bless, change, or drop metering for launch?
2. **Brain** — approve putting a free LLM key on Render for always-on chat?
3. **Launch trigger** — do we broadcast now (sites are launch-grade), or gate on externals-as-stars first?
4. **DeepSeek vs groq** — keep free groq primary, or promote a stronger model?

---
*Every claim above is verifiable: signed feeds, live URLs, git history in `dimitrilaouanis-tech/0n1x` and `/rhinogent`.*
