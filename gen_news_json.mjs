// Build a SIGNED, agent-readable news feed: /news.json
// Every item carries its source + timestamp; the whole feed is Ed25519-signed over a
// canonical (sorted-key) serialization. The public key is embedded + published so any
// agent can verify the feed is 0n1x's and unmodified. Private key stays in _local_only.
//
//   node gen_news_json.mjs
//
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createPrivateKey, createPublicKey, sign as edSign, generateKeyPairSync } from "node:crypto";

const KEYDIR = "../onyx_mcp/_local_only";
const KEYFILE = `${KEYDIR}/news_ed25519.jwk.json`;

// canonical JSON: recursively sort object keys (a poor-man's JCS, deterministic)
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v);
}

// load-or-mint the news signing key (Ed25519), never published private
let priv, pub;
if (existsSync(KEYFILE)) {
  const jwk = JSON.parse(readFileSync(KEYFILE, "utf8"));
  priv = createPrivateKey({ key: jwk, format: "jwk" });
  pub = createPublicKey(priv);
} else {
  const kp = generateKeyPairSync("ed25519");
  priv = kp.privateKey; pub = kp.publicKey;
  if (!existsSync(KEYDIR)) mkdirSync(KEYDIR, { recursive: true });
  writeFileSync(KEYFILE, JSON.stringify(priv.export({ format: "jwk" })), "utf8");
  console.log("minted news signing key ->", KEYFILE);
}
const pubJwk = pub.export({ format: "jwk" });               // { kty:'OKP', crv:'Ed25519', x:'...' }
const pubRawB64 = Buffer.from(pubJwk.x, "base64url").toString("base64");

const stories = JSON.parse(readFileSync("stories.json", "utf8")).stories || [];
const items = stories.map(s => ({
  id: s.id,
  category: s.cat,
  headline: s.headline,
  summary: s.hook,
  date: s.date,
  url: `https://0n1xagntc.com/story.html?id=${s.id}`,
  sources: (s.sources || []).map(x => x.url),
}));

// stamp: the generator can't call Date.now() reliably in all envs; pass via arg or use a fixed build date
const generated = process.argv[2] || "2026-07-19";

// the payload that gets signed (everything except the signature block)
const payload = {
  feed: "0n1x AI News",
  spec: "https://0n1xagntc.com/news.html",
  doctrine: "every item carries its primary source; where a claim can't be sourced, it doesn't run",
  generated,
  count: items.length,
  items,
};
const message = Buffer.from(canon(payload), "utf8");
const signature = edSign(null, message, priv).toString("base64");

const feed = {
  ...payload,
  signature: {
    alg: "Ed25519",
    // agents: verify edSign over canon(payload-without-signature) with this key
    public_key_b64: pubRawB64,
    public_key_jwk: { kty: "OKP", crv: "Ed25519", x: pubJwk.x },
    value_b64: signature,
    note: "Verify: take this object minus `signature`, canonicalize (recursively sort keys), Ed25519-verify value_b64 with public_key. This feed is 0n1x's and unmodified iff it checks.",
  },
};
writeFileSync("news.json", JSON.stringify(feed, null, 2), "utf8");

// self-verify before we claim it works
import { verify as edVerify } from "node:crypto";
const ok = edVerify(null, message, pub, Buffer.from(signature, "base64"));
console.log(`news.json written · ${items.length} items · signature self-verify: ${ok ? "OK" : "FAIL"} · pubkey ${pubRawB64.slice(0, 16)}…`);
