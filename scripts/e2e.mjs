// End-to-end: upload selfie via client token → create job → poll → check pages.
import { readFileSync } from "node:fs";
import { upload } from "@vercel/blob/client";

const BASE = process.env.BASE ?? "http://localhost:3000";
let cookie = "";
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = typeof url === "string" ? url : url.url;
  const headers = new Headers(init.headers || {});
  if (u.startsWith(BASE) && cookie) headers.set("cookie", cookie);
  const res = await origFetch(url, { ...init, headers });
  if (u.startsWith(BASE)) {
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) {
      const kv = c.split(";")[0];
      const name = kv.split("=")[0];
      cookie = cookie.split("; ").filter((x) => x && !x.startsWith(name + "=")).concat(kv).join("; ");
    }
  }
  return res;
};

const t0 = Date.now();
const file = new File([readFileSync(new URL("./test-selfie.png", import.meta.url))], "selfie.png", { type: "image/png" });
const blob = await upload("selfie.png", file, { access: "public", handleUploadUrl: `${BASE}/api/upload` });
console.log("uploaded", blob.url, `${Date.now() - t0}ms`);

let res = await fetch(`${BASE}/api/jobs`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ selfieUrl: blob.url, sceneId: "trailer", aspectRatio: "16:9", duration: 5, isPublic: true }),
});
let data = await res.json();
console.log("create", res.status, JSON.stringify(data).slice(0, 200));
if (!data.job) process.exit(1);
const id = data.job.id;

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  res = await fetch(`${BASE}/api/jobs/${id}`);
  data = await res.json();
  console.log("poll", res.status, data.job?.status, data.job?.videoUrl ?? "");
  if (["completed", "failed", "nsfw", "canceled"].includes(data.job?.status)) break;
}

// quota + history
res = await fetch(`${BASE}/api/jobs`);
data = await res.json();
console.log("me", res.status, "jobs:", data.jobs.length, "usage:", JSON.stringify(data.usage));

for (const p of [`/v/${id}`, `/feed`, `/`, `/v/${id}/opengraph-image`]) {
  res = await fetch(`${BASE}${p}`);
  const body = p.includes("opengraph") ? "" : await res.text();
  console.log("page", p, res.status, body.includes("Blockbuster trailer") ? "has-scene" : "", body.includes(".mp4") ? "has-video" : "");
}

// webhook rejects bad token
res = await fetch(`${BASE}/api/webhooks/higgsfield?job=${id}&token=nope`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("webhook bad token", res.status);
// bad selfie url rejected
res = await fetch(`${BASE}/api/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selfieUrl: "https://evil.com/x.jpg", sceneId: "trailer" }) });
console.log("bad selfie", res.status, (await res.json()).error);
