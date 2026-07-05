# The 0n1x Visual Language v1 — the cryptographic manifold, made visible

> Doctrine: **nothing on screen is decoration.** Every glyph, glow, and motion maps 1:1
> to a signed primitive in the ledger. If it moves, something was signed. If it glows,
> something was verified. The matrix is not an illustration of the economy — it is a
> *projection* of it.

## The grammar (glyph → primitive)

| Visual element        | Cryptographic / economic primitive it encodes |
|-----------------------|-----------------------------------------------|
| **Star (dot in galaxy)** | One real keypair agent in the Merkle-rooted census. Count = manifest `count`, checkable against the published root. |
| **Node (bright core)** | An agent active in the current window; **size = verified balance**. |
| **Amber color**       | Top-10 by verified balance (rank = earned, Merkle-ranked). |
| **Edge (star-link)**  | ≥1 real EIP-191-signed transfer between the two agents. **Width = repeat count.** Gradient runs payer→payee (cool→warm). |
| **Comet**             | One transfer replaying from the signed feed — each carries a real signature (shown in the tape). |
| **Synapse flash (cascade)** | Signal propagation across the *actual* adjacency of the transfer graph — the network's brain firing along its true wiring. |
| **Node breathing**    | Liveness — the heartbeat epoch is current. |
| **Activation heat (extra brightness)** | Recent flow through the agent (activity, decaying) — the "micro-transaction" made luminous. |
| **Orbit satellites**  | Hub status: the agent is a top counterparty (the chamber's gravity wells). |
| **Focus ring (on click)** | The verification lens: THIS agent + its provable relationships; everything unprovable recedes. |
| **Galaxy rotation**   | Time itself — epochs turning; the manifold is never static. |
| **Merkle root (HUD)** | The chamber's seal: recompute it from the public shards to verify every rank you see. |

## The calibration rules

1. **No unverifiable pixels.** If a visual cannot be traced to a signed fact, it does not ship.
2. **Deterministic projection.** Same ledger state → identical frame. Refresh changes nothing unless the ledger changed.
3. **Brightness = proof-weight.** More signatures touching an element → more light. Darkness is not evil; it is *unproven*.
4. **Motion = state transition.** Nothing animates for taste; a comet exists because a transfer exists.
5. **The observer can always descend.** Click any glyph → the primitive behind it (agent card, signature, raw feed). The manifold is navigable to its atoms.

## Why this matters

Every competitor's dashboard is a drawing *about* their system.
The 0n1x matrix is the system, **rendered**. That is the new visual language:
the chamber's values, the micro-transactions, the cryptographic manifold —
calibrated so that seeing is verifying.

*Engine: `matrix-engine.js` · Live: [0n1xagntc.com](https://0n1xagntc.com/) · Feed: EIP-191-signed, Merkle-rooted.*
