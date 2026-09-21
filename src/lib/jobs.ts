import { put } from "@vercel/blob";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";

import { db, schema } from "./db";
import type { Job } from "./db/schema";
import { createClient, isMockMode, mapStatus, serverKey, TERMINAL_STATUSES, type StatusResult } from "./higgsfield";

const { jobs } = schema;

export const SEEDANCE_R2V = "bytedance/seedance-2.5/reference-to-video";

/** Free generations per browser per rolling 24h, when using the site's key. */
export const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT ?? 3);
/** Hard cap per IP per 24h to blunt cookie-clearing. */
export const IP_DAILY_LIMIT = Number(process.env.IP_DAILY_LIMIT ?? 12);

const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTED = ["queued", "in_progress", "completed"];

export function resolveServerKey(): string {
  const key = serverKey();
  if (key) return key;
  if (isMockMode()) return "mock";
  throw new Error("Higgsfield credentials are not configured (set HF_KEY).");
}

export async function usageToday(deviceId: string, ip: string | null) {
  const since = new Date(Date.now() - DAY_MS);
  const [deviceRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(and(eq(jobs.deviceId, deviceId), eq(jobs.byok, false), gte(jobs.createdAt, since), inArray(jobs.status, COUNTED)));
  let ipCount = 0;
  if (ip) {
    const [ipRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(jobs)
      .where(and(eq(jobs.ip, ip), eq(jobs.byok, false), gte(jobs.createdAt, since), inArray(jobs.status, COUNTED)));
    ipCount = ipRow?.n ?? 0;
  }
  const used = deviceRow?.n ?? 0;
  return {
    used,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, Math.min(FREE_DAILY_LIMIT - used, IP_DAILY_LIMIT - ipCount)),
  };
}

export async function getJob(id: string): Promise<Job | null> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return row ?? null;
}

export async function recentJobsForDevice(deviceId: string, limit = 24) {
  return db.select().from(jobs).where(eq(jobs.deviceId, deviceId)).orderBy(desc(jobs.createdAt)).limit(limit);
}

export async function publicFeed(limit = 48) {
  return db
    .select()
    .from(jobs)
    .where(and(eq(jobs.isPublic, true), eq(jobs.status, "completed"), sql`${jobs.videoUrl} is not null`))
    .orderBy(desc(jobs.completedAt))
    .limit(limit);
}

export async function completedCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.status, "completed"));
  return row?.n ?? 0;
}

/**
 * Bring a job up to date with Higgsfield. Called from the client poller and
 * from the webhook. For site-key jobs we always re-read the authoritative
 * status endpoint rather than trusting the webhook body. For BYOK jobs we have
 * no key on the server, so we accept the webhook payload (the webhook URL
 * carries a per-deployment secret) or a status fetched with the caller's key.
 */
export async function syncJob(job: Job, opts: { key?: string | null; webhookPayload?: unknown } = {}): Promise<Job> {
  if (TERMINAL_STATUSES.has(job.status) || !job.requestId) return job;

  let status: StatusResult | null = null;
  if (opts.webhookPayload && (job.byok || !serverKey())) {
    status = mapStatus(opts.webhookPayload);
    if (status.requestId && status.requestId !== job.requestId) return job;
  } else {
    const key = job.byok ? opts.key : resolveServerKey();
    if (!key) return job;
    status = await createClient(key).status(job.statusUrl ?? job.requestId);
  }

  if (!status || status.status === job.status && !TERMINAL_STATUSES.has(status.status)) {
    await db.update(jobs).set({ updatedAt: new Date() }).where(eq(jobs.id, job.id));
    return { ...job, updatedAt: new Date() };
  }

  if (status.status === "completed" && status.videoUrl) {
    const permanent = await persistVideo(job.id, status.videoUrl);
    const [row] = await db
      .update(jobs)
      .set({
        status: "completed",
        sourceVideoUrl: status.videoUrl,
        videoUrl: permanent,
        completedAt: new Date(),
        updatedAt: new Date(),
        error: null,
      })
      .where(and(eq(jobs.id, job.id), ne(jobs.status, "completed")))
      .returning();
    return row ?? (await getJob(job.id)) ?? job;
  }

  const failed = TERMINAL_STATUSES.has(status.status);
  const [row] = await db
    .update(jobs)
    .set({
      status: status.status,
      updatedAt: new Date(),
      ...(failed ? { completedAt: new Date() } : {}),
      ...(status.error ? { error: status.error } : failed && status.status === "nsfw" ? { error: "Blocked by content moderation." } : {}),
    })
    .where(eq(jobs.id, job.id))
    .returning();
  return row ?? job;
}

/** Higgsfield keeps outputs ~7 days. Copy the mp4 into our Blob store. */
async function persistVideo(jobId: string, sourceUrl: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sourceUrl;
  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok || !res.body) return sourceUrl;
    const blob = await put(`videos/${jobId}.mp4`, res.body, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  } catch (err) {
    console.error("[jobs] persistVideo failed", jobId, err instanceof Error ? err.message : err);
    return sourceUrl;
  }
}

export function publicJob(job: Job) {
  return {
    id: job.id,
    status: job.status,
    sceneId: job.sceneId,
    sceneLabel: job.sceneLabel,
    aspectRatio: job.aspectRatio,
    duration: job.duration,
    resolution: job.resolution,
    videoUrl: job.videoUrl,
    error: job.error,
    isPublic: job.isPublic,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}
export type PublicJob = ReturnType<typeof publicJob>;
