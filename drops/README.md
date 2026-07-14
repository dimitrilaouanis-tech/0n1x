# 0n1x drops channel — protocol

A small, tamper-evident publishing channel. One stable idea: **paste one manifest URL, it fans out to every drop, every drop is hashed.** Hardened by four failures in one night, each investigated instead of explained away — which is the property "verified" actually sells.

## Rules (each earned from a failure)
1. **Absolute URLs** in the manifest — a fetcher only follows URLs literally present in fetched content; assembled/relative URLs are rejected.
2. **Verifier watch-list** — nothing is announced until a verifier confirms the *served* bytes (plain consumer-eye fetch, **no cache-bust** — a cache-busted read hits fresh origin and hides the stale edge a consumer gets).
3. **Immutable content-addressed manifest** — the manifest filename is the sha256 of its own body (`index-<sha16>.txt`). A never-fetched URL can't be stale in any cache. `index.txt` is a human-convenience pointer only.
4. **Immutable drops + supersede-by-append** — signed drop files are never amended in place. A correction is a **new** file carrying `supersedes: sha256:<old>` and a **fresh signature**; the old file stays served forever as history; the manifest lists both leaves.

## Two-hash convention (not a defect — document so it isn't misread as tampering)
A signed receipt drop carries **two** hashes doing **different** jobs:
- **manifest `sha256:`** — covers the **whole served file** (integrity of the exact bytes delivered).
- **internal `body_sha256:`** — covers the **pre-signature body** that the `signature:` line binds to (the signature signs the body, not itself).

They intentionally differ. A third-party verifier: recompute the manifest hash over the whole file; recompute `body_sha256` over everything above the `body_sha256:`/`signature:` lines; recover the EIP-191 signer of the payload `{kind, …, body_sha256, grader}`. Both must match.

## Scope of verification
Our verifier confirms published==committed AND recomputes sha256 (signed receipt). An external fetcher (e.g. Fable) verifies **content** (served==readable) — it cannot recompute hashes or check signatures from its sandbox. The hash lines are our check + a third-party recomputation target; do not claim the fetcher verifies hashes.
