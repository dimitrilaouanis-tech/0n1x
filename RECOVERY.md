# 0n1x + Rhinogent — RECOVERY / CONTINUITY RECORD
**Written 2026-07-27. Assume the laptop is gone. This tells you what exists, where it lives, and how to get back in.**

> ## NO SECRETS ARE IN THIS FILE — DELIBERATELY
> No tokens, keys, passwords or seed phrases appear here, and none should ever be added.
> This file is designed to be safe in a repo, an inbox, and a chat paste.
> It names **where** each credential lives so the holder can retrieve it. A recovery doc that
> contains the credentials is not a recovery doc, it is the breach it was meant to survive.

---

## 1. THE ONE THING THAT MATTERS MOST

**Everything public is already on GitHub, not on the laptop.** Both sites deploy from git.
If the laptop dies, the sites keep serving. Nothing needs rescuing from the disk to stay online.

What is ONLY on the laptop (and would be lost):
- the agent roster / mint state (`onyx_mcp/_local_only/`) — millions of generated identities
- the token ledger (`_token_ledger.jsonl`, ~190MB, ~418k signed txs)
- the camp ledger (`_camp_ledger.jsonl`) — the training/measurement evidence
- the local signing key material (see §5)

**If you can only save one folder: `onyx_mcp/_local_only/`.**

---

## 2. THE SITES

| site | repo | branch it serves from |
|---|---|---|
| **0n1xagntc.com** | `github.com/dimitrilaouanis-tech/0n1x` | `main` |
| **rhinogent.com** | `github.com/dimitrilaouanis-tech/rhinogent` | `gh-pages` (built output) |

GitHub account: **dimitrilaouanis-tech**.

Local working copies (same machine):
- `C:\Users\intelligence\0n1x` — static HTML, hand-edited, deploys straight from `main`
- `C:\Users\intelligence\rhinogent` — has `public/` where the live JSON feeds are written
- `C:\Users\intelligence\rhinogent2` — **the Next.js source that actually builds the site**

⚠️ `rhinogent` and `rhinogent2` point at the SAME remote. `rhinogent2` is the source of truth for
the built site. Editing the wrong one is a mistake that has already cost hours — check which tree
the deployed artifact came from before editing.

### Regaining access
1. GitHub account recovery is the root of everything — recover **dimitrilaouanis-tech** first
   (email + 2FA/recovery codes wherever they are kept).
2. Domain DNS is at the registrar for `0n1xagntc.com` and `rhinogent.com` — the registrar login
   is the second root. Without it the repos still exist but the names can't be repointed.
3. `git clone` either repo onto any machine and you have the entire site, history included.

---

## 3. HOW THE NUMBERS GET ON THE PAGES

One script publishes the live feeds: **`onyx_mcp/onyx_count_sync.py`**

- computes the agent count and the signed-tx count
- writes JSON into `rhinogent/public/`
- pushes to **both** repos via the GitHub contents API (uses `gh auth token`)

Feeds the pages read:
`live_count.json` · `census_manifest.json` · `census.json` · `autonomous_live.json` · `token_feed.json`

**Doctrine baked into this pipeline (do not undo):**
- **Derive from the append-only source, never from a snapshot of it.** The tx count once read the
  last entry of `census_history.json`; that writer stopped 2026-07-10 and the page showed a
  frozen number for 17 days with nothing erroring. A stopped writer looks exactly like a quiet period.
- **Atomic writes.** All feed writes are write-temp → fsync → `os.replace`. A plain write killed
  mid-run once left three public JSON files as 100% null bytes, which deployed and broke the site.
- **SIGNED ≠ VERIFIED.** We count signatures; we do not check them. The label says SIGNED.
- **Any feed a page fetches must be in the push list**, or it silently rots.

State as of 2026-07-27: **5,428,052 agents · 399,997 signed txs**, identical on both sites.

---

## 4. THE AGENT MEASUREMENT SYSTEM (the part with the real IP)

- `onyx_training_camp.py` — runs drills against local ollama brains, emits signed leaves
- `onyx_fleet_board.py` — **derives** the board from those leaves at read time
- `_local_only/_drillbank_v2.json`, `_drillbank_l2.json` — the drill banks
- `_local_only/_camp_ledger.jsonl` — the evidence; **the board stores nothing**

**Core rule: NO SETTER.** No rank is ever written anywhere. Delete the board output, re-run,
get the same board, because the ledger is the only truth. A rank that can be written will be gamed.

Other rules that cost real time to learn:
- credit = count of **distinct** drill ids passed, per (agent, domain) — repeats farm nothing
- a **precommit** event must exist *strictly earlier* than the attempts
- **bank id and grader version are provenance** — never pool two banks or two graders into one number
- a **timeout is missing data, never a 0** — scoring it as failure publishes a false result
- **INTERNAL TIER IS CIRCULAR** — we author the drills and run the contestants, so nothing here is
  publishable as a rank. A public claim needs an independent grader we neither run nor influence.

---

## 5. CREDENTIALS — WHERE THEY LIVE (values NOT here)

| what | where it lives | note |
|---|---|---|
| GitHub auth | `gh` CLI on the laptop (`gh auth token`) | dies with the laptop; re-auth on any machine |
| GitHub account | dimitrilaouanis-tech | **the root credential — recover this first** |
| metric authority key | `onyx_mcp/_local_only/_metric_authority.key` | gitignored, laptop-only |
| agent signing keys | `onyx_mcp/_local_only/` | laptop-only |
| domain registrar | registrar account for both domains | second root credential |

**If the laptop is lost, assume every laptop-only key is compromised and rotate it.**
Signing keys that may have been exposed must be replaced, not reused.

---

## 6. WHAT WAS DONE THIS SESSION (2026-07-27)

1. **Cross-site number desync fixed** — both sites now serve one derived count.
2. **Frozen-snapshot bug fixed** — tx count now derives from the live ledger; census page shows
   `STALE` instead of a pulsing `LIVE` badge when the heartbeat stops; removed an invented
   `76,000` fallback that put a made-up number under a real label.
3. **`VERIFIED` → `SIGNED`** on the tx label — we don't check the signatures we count.
4. **Fleet measured**: 4 agents on drillbank/v2, 2 on drillbank/l2, all precommitted, replayable.
5. **Three instrument defects found and fixed** in our own grader:
   - it required an exact function name, so a *correct* Levenshtein scored 0 for being called
     `edit_distance` — it was measuring naming and reporting it as capability
   - the board pooled two banks into one column (`10/13`), a number describing no real test
   - a missing provenance field was treated as "unknown" instead of "old", so a superseded
     result silently re-entered a statistic
6. **Key insight banked**: grader errors are *common-mode* — they hit every agent identically, so
   they masquerade as agents being redundant. **Distrust shared failures first.**

---

## 7. IF YOU ARE PICKING THIS UP COLD

```bash
git clone https://github.com/dimitrilaouanis-tech/0n1x
git clone https://github.com/dimitrilaouanis-tech/rhinogent
cd onyx_mcp && py onyx_fleet_board.py        # if _local_only survived
```

The sites are static and self-hosting. The measurement system needs `_local_only/` and a local
ollama. **The doctrine in §3 and §4 is the actual asset** — the code can be rewritten, the rules
were learned by breaking things in production.
