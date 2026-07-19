// cert_rotation_7d_v2 — capture a REAL, signed, per-domain TLS baseline at registration time.
// Persists the checkable ground truth (domain + notBefore), not just an aggregate. That's the fix.
//   node scan_cert_baseline.mjs 2026-07-19T17:55:40Z
import tls from "node:tls";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as edSign, verify as edVerify } from "node:crypto";

const DOMAINS = ["2checkout.com","adidas.com","adyen.com","affirm.com","afterpay.com","aliexpress.com","amazon.com","apple.com","authorize.net","bestbuy.com","braintreepayments.com","chargebee.com","checkout.com","chewy.com","ebay.com","etsy.com","gocardless.com","gucci.com","klarna.com","mastercard.com","mollie.com","newegg.com","nike.com","paddle.com","payoneer.com","paypal.com","rayban.com","razorpay.com","recurly.com","samsung.com","shein.com","shopify.com","square.com","stripe.com","target.com","temu.com","visa.com","walmart.com","wayfair.com","wise.com","worldpay.com"];
const captured = process.argv[2] || "2026-07-19T00:00:00Z";

function getCert(host) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 8000, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate();
      resolve(c && c.valid_from ? { domain: host, notBefore: c.valid_from, notAfter: c.valid_to, issuer: (c.issuer && (c.issuer.O || c.issuer.CN)) || "" } : { domain: host, notBefore: null, error: "no cert" });
      s.end();
    });
    s.on("error", (e) => resolve({ domain: host, notBefore: null, error: String(e.code || e.message).slice(0, 40) }));
    s.on("timeout", () => { resolve({ domain: host, notBefore: null, error: "timeout" }); s.destroy(); });
  });
}

const rows = (await Promise.all(DOMAINS.map(getCert))).sort((a, b) => a.domain.localeCompare(b.domain));
const ok = rows.filter(r => r.notBefore).length;

// canonical serialization + Ed25519 sign (dedicated cert key, private stays out of repo)
function canon(v){if(Array.isArray(v))return "["+v.map(canon).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canon(v[k])).join(",")+"}";return JSON.stringify(v);}
const KEYDIR="../onyx_mcp/_local_only", KEYFILE=`${KEYDIR}/cert_baseline_ed25519.jwk.json`;
let priv,pub;
if(existsSync(KEYFILE)){priv=createPrivateKey({key:JSON.parse(readFileSync(KEYFILE,"utf8")),format:"jwk"});pub=createPublicKey(priv);}
else{const kp=generateKeyPairSync("ed25519");priv=kp.privateKey;pub=kp.publicKey;if(!existsSync(KEYDIR))mkdirSync(KEYDIR,{recursive:true});writeFileSync(KEYFILE,JSON.stringify(priv.export({format:"jwk"})),"utf8");}
const pubJwk=pub.export({format:"jwk"});

const payload = {
  experiment: "cert_rotation_7d_v2",
  what: "per-domain TLS certificate notBefore, frozen at capture — the baseline v1 failed to persist",
  domain_set: "0n1x registry verified-merchant apexes (public.facts, verdict-verified)",
  captured, resolves: "2026-07-26",
  band: [0.07, 0.14], threshold: "admit iff persistence<0.95 AND rate in [0.03,0.50]; else reject; unmeasurable=void",
  n: rows.length, n_with_cert: ok,
  baseline: rows,
};
const sig = edSign(null, Buffer.from(canon(payload)), priv).toString("base64");
const out = { ...payload, signature: { alg:"Ed25519", public_key_jwk:{kty:"OKP",crv:"Ed25519",x:pubJwk.x}, value_b64:sig,
  note:"On 2026-07-26, re-scan these domains, diff notBefore against this signed baseline, compute rotation rate = rotations/n_with_cert. Verify: this object minus signature, canonicalize (sort keys), Ed25519-verify." } };
writeFileSync("cert-baseline-v2.json", JSON.stringify(out, null, 2), "utf8");
console.log(`baseline: ${ok}/${rows.length} domains got a cert · self-verify: ${edVerify(null,Buffer.from(canon(payload)),pub,Buffer.from(sig,"base64"))?"OK":"FAIL"}`);
rows.filter(r=>!r.notBefore).forEach(r=>console.log("  no cert:",r.domain,r.error));
