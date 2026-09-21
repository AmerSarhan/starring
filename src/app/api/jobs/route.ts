import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { db, schema } from "@/lib/db";
import { clientIp, cookieOptions, DEVICE_COOKIE, getDevice, getUserKey, siteOrigin } from "@/lib/device";
import { createClient, HiggsfieldError } from "@/lib/higgsfield";
import { publicJob, recentJobsForDevice, resolveServerKey, SEEDANCE_R2V, usageToday } from "@/lib/jobs";
import { buildPrompt } from "@/lib/scenes";

const ASPECTS = new Set(["9:16", "16:9", "1:1"]);
const DURATIONS = new Set([4, 5, 6, 8]);
const RESOLUTIONS = new Set(["480p", "720p"]);

export async function GET() {
  const device = await getDevice();
  const ip = await clientIp();
  const [mine, usage] = await Promise.all([
    device.minted ? Promise.resolve([]) : recentJobsForDevice(device.id),
    usageToday(device.id, ip),
  ]);
  const res = NextResponse.json({ jobs: mine.map(publicJob), usage, byok: !!(await getUserKey()) });
  if (device.minted) res.cookies.set(DEVICE_COOKIE, device.id, cookieOptions);
  return res;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const selfieUrl = typeof body.selfieUrl === "string" ? body.selfieUrl : "";
  if (!isOurBlob(selfieUrl)) return NextResponse.json({ error: "Upload a selfie first." }, { status: 400 });

  const built = buildPrompt(String(body.sceneId ?? ""), typeof body.customPrompt === "string" ? body.customPrompt : undefined);
  if (!built) return NextResponse.json({ error: "Pick a scene, or describe your own in a sentence." }, { status: 400 });

  const aspectRatio = ASPECTS.has(String(body.aspectRatio)) ? String(body.aspectRatio) : "16:9";
  const duration = DURATIONS.has(Number(body.duration)) ? Number(body.duration) : 5;
  const resolution = RESOLUTIONS.has(String(body.resolution)) ? String(body.resolution) : "720p";
  const isPublic = body.isPublic !== false;

  const device = await getDevice();
  const ip = await clientIp();
  const userKey = await getUserKey();
  const byok = !!userKey;

  if (!byok) {
    const usage = await usageToday(device.id, ip);
    if (usage.remaining <= 0) {
      return NextResponse.json(
        { error: `You've used your ${usage.limit} free videos for today. Add your own Higgsfield key for unlimited.`, code: "quota" },
        { status: 429 },
      );
    }
  }

  let key: string;
  try {
    key = userKey ?? resolveServerKey();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Not configured" }, { status: 503 });
  }

  const id = nanoid(12);
  const origin = await siteOrigin();
  const secret = process.env.WEBHOOK_SECRET;
  const webhook =
    secret && origin.startsWith("https://")
      ? `${origin}/api/webhooks/higgsfield?job=${id}&token=${encodeURIComponent(secret)}`
      : undefined;

  const input = {
    prompt: built.prompt,
    image_urls: [selfieUrl],
    aspect_ratio: aspectRatio,
    duration,
    resolution,
    generate_audio: true,
    output_format: "mp4",
  };

  try {
    const submitted = await createClient(key).submit(SEEDANCE_R2V, input, webhook);
    const [row] = await db
      .insert(schema.jobs)
      .values({
        id,
        deviceId: device.id,
        ip,
        sceneId: String(body.sceneId),
        sceneLabel: built.label,
        prompt: built.prompt,
        selfieUrl,
        aspectRatio,
        duration,
        resolution,
        status: submitted.status || "queued",
        requestId: submitted.requestId,
        statusUrl: submitted.statusUrl,
        isPublic,
        byok,
      })
      .returning();
    const res = NextResponse.json({ job: publicJob(row) }, { status: 201 });
    if (device.minted) res.cookies.set(DEVICE_COOKIE, device.id, cookieOptions);
    return res;
  } catch (err) {
    if (err instanceof HiggsfieldError) {
      console.error("[jobs] submit failed", err.status, err.message, err.correlationId);
      if (err.isConcurrencyLimit) {
        return NextResponse.json({ error: "The render queue is full right now. Try again in about a minute.", code: "busy" }, { status: 429 });
      }
      if (err.isInsufficientCredits) {
        return NextResponse.json({ error: byok ? "Your Higgsfield account is out of credits." : "We're out of render credits for now. Add your own key to keep going.", code: "credits" }, { status: 402 });
      }
      if (err.status === 401) {
        return NextResponse.json({ error: byok ? "That Higgsfield key was rejected." : "Server credentials rejected.", code: "auth" }, { status: 401 });
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[jobs] submit error", err);
    return NextResponse.json({ error: "Something went wrong submitting your render." }, { status: 500 });
  }
}

function isOurBlob(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
