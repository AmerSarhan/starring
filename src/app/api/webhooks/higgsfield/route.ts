import { NextResponse } from "next/server";

import { getJob, syncJob } from "@/lib/jobs";

/**
 * Higgsfield POSTs here on completed / failed / nsfw. We answer 2xx fast and
 * re-read the authoritative status for site-key jobs. Duplicate deliveries are
 * harmless: syncJob is idempotent on terminal states.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || url.searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const jobId = url.searchParams.get("job");
  if (!jobId) return NextResponse.json({ error: "Missing job" }, { status: 400 });

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const envelope = payload as { request_id?: unknown; status?: unknown } | null;
  if (!envelope || typeof envelope.request_id !== "string" || typeof envelope.status !== "string") {
    return NextResponse.json({ error: "Unexpected envelope" }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ ok: true, ignored: "unknown job" });
  if (job.requestId !== envelope.request_id) return NextResponse.json({ ok: true, ignored: "request mismatch" });

  try {
    await syncJob(job, { webhookPayload: payload });
  } catch (err) {
    console.error("[webhook] sync failed", jobId, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
