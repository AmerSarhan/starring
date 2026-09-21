import { NextResponse } from "next/server";

import { cookieOptions, encodeUserKey, KEY_COOKIE } from "@/lib/device";
import { createClient } from "@/lib/higgsfield";
import { SEEDANCE_R2V } from "@/lib/jobs";

/** Bring-your-own Higgsfield key. Stored httpOnly, never sent to the browser. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { key?: unknown };
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!/^[^\s:]{6,}:[^\s:]{6,}$/.test(key)) {
    return NextResponse.json({ error: "Paste your key as  KEY_ID:KEY_SECRET  from console.higgsfield.ai" }, { status: 400 });
  }
  const estimate = await createClient(key).estimate(SEEDANCE_R2V, {
    prompt: "test",
    image_urls: ["https://example.com/a.jpg"],
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "720p",
  });
  const res = NextResponse.json({ ok: true, estimate });
  res.cookies.set(KEY_COOKIE, encodeUserKey(key), cookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KEY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
