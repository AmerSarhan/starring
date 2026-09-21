import { cookies, headers } from "next/headers";
import { nanoid } from "nanoid";

export const DEVICE_COOKIE = "starring_device";
export const KEY_COOKIE = "starring_hf_key";

const YEAR = 60 * 60 * 24 * 365;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: YEAR,
};

/** Anonymous per-browser id, used for quota and "my videos". */
export async function getDevice(): Promise<{ id: string; minted: boolean }> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{10,40}$/.test(existing)) return { id: existing, minted: false };
  return { id: nanoid(21), minted: true };
}

/** A user's own Higgsfield key, if they chose to bring one. */
export async function getUserKey(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(KEY_COOKIE)?.value;
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    return decoded.includes(":") ? decoded : null;
  } catch {
    return null;
  }
}

export function encodeUserKey(key: string) {
  return Buffer.from(key, "utf8").toString("base64url");
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip"))?.trim() || null;
}

export async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
