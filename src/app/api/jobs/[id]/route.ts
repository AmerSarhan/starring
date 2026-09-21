import { NextResponse } from "next/server";

import { getUserKey } from "@/lib/device";
import { TERMINAL_STATUSES } from "@/lib/higgsfield";
import { getJob, publicJob, syncJob } from "@/lib/jobs";

/** Skip hitting Higgsfield if we checked very recently (webhook or another tab). */
const MIN_REFRESH_MS = 1500;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!TERMINAL_STATUSES.has(job.status) && Date.now() - job.updatedAt.getTime() > MIN_REFRESH_MS) {
    try {
      job = await syncJob(job, { key: await getUserKey() });
    } catch (err) {
      console.error("[jobs] sync failed", id, err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json({ job: publicJob(job) }, { headers: { "cache-control": "no-store" } });
}
