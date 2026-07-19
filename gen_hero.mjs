// Generate a stylized editorial concept-art hero for a story via OpenRouter image models.
// Owned (no licensing), tagged as illustration downstream. Not photoreal fakes.
//   node gen_hero.mjs <model> <outfile> "<prompt>"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const KEY = process.env.OPENROUTER_API_KEY;
const [model, outfile, prompt] = [process.argv[2], process.argv[3], process.argv[4]];
if (!KEY) { console.log("no OPENROUTER key"); process.exit(1); }

const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json", "HTTP-Referer": "https://0n1xagntc.com", "X-Title": "0n1x AI News" },
  body: JSON.stringify({ model, modalities: ["image", "text"], messages: [{ role: "user", content: prompt }] }),
});
const j = await r.json();
if (j.error) { console.log("ERROR", JSON.stringify(j.error).slice(0, 300)); process.exit(1); }
const m = j.choices?.[0]?.message;
// image can come as message.images[].image_url.url (data URI) or inside content
let dataUri = m?.images?.[0]?.image_url?.url || m?.images?.[0]?.url;
if (!dataUri && typeof m?.content === "string") { const mm = m.content.match(/data:image\/[^)"'\s]+/); dataUri = mm && mm[0]; }
if (!dataUri) { console.log("no image in response. msg keys:", m && Object.keys(m), "content:", (m?.content || "").slice(0, 200)); process.exit(1); }
const b64 = dataUri.split(",")[1];
if (!existsSync("img")) mkdirSync("img");
writeFileSync(`img/${outfile}`, Buffer.from(b64, "base64"));
console.log(`saved img/${outfile} · ${Math.round(Buffer.from(b64, "base64").length / 1024)} KB · model ${model}`);
