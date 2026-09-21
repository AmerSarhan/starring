import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobView } from "@/components/job-view";
import { siteOrigin } from "@/lib/device";
import { getJob, publicJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id).catch(() => null);
  if (!job) return { title: "Not found" };
  const title = `Starring in “${job.sceneLabel}”`;
  const description = "Made from one selfie with Seedance 2.5 on Starring. Make yours in a minute.";
  const video = job.status === "completed" && job.videoUrl ? job.videoUrl : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: video ? "video.other" : "website",
      ...(video
        ? {
            videos: [{ url: video, type: "video/mp4", width: job.aspectRatio === "9:16" ? 720 : 1280, height: job.aspectRatio === "9:16" ? 1280 : 720 }],
          }
        : {}),
    },
    twitter: { card: video ? "player" : "summary_large_image", title, description },
    robots: job.isPublic ? undefined : { index: false },
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  return <JobView initial={publicJob(job)} siteUrl={await siteOrigin()} />;
}
