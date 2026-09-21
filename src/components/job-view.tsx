"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PublicJob } from "@/lib/jobs";

const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);
const STAGES = ["Casting", "Lighting the set", "Rolling", "Recording audio", "Color grading", "Final cut"];

export function JobView({ initial, siteUrl }: { initial: PublicJob; siteUrl: string }) {
  const [job, setJob] = useState(initial);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const started = useRef(new Date(initial.createdAt).getTime());

  useEffect(() => {
    if (TERMINAL.has(job.status)) return;
    let delay = 2000;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { job: PublicJob };
          setJob(data.job);
          if (TERMINAL.has(data.job.status)) return;
        }
      } catch {}
      if (cancelled) return;
      delay = Math.min(delay * 1.3, 8000);
      timer = setTimeout(tick, delay + Math.random() * 400);
    };
    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job.id, job.status]);

  useEffect(() => {
    if (TERMINAL.has(job.status)) return;
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(i);
  }, [job.status]);

  const shareUrl = `${siteUrl}/v/${job.id}`;
  const tweet = `I'm starring in "${job.sceneLabel}" 🎬 made with one selfie on Starring, powered by @higgsfield Seedance 2.5\n\n${shareUrl}`;
  const vertical = job.aspectRatio === "9:16";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className={`grid gap-8 ${vertical ? "lg:grid-cols-[minmax(0,420px)_1fr]" : "lg:grid-cols-[1fr_320px]"}`}>
        <div className={`overflow-hidden rounded-2xl border border-line bg-black ${vertical ? "aspect-[9/16] max-h-[80vh]" : "aspect-video"}`}>
          {job.status === "completed" && job.videoUrl ? (
            <video src={job.videoUrl} controls autoPlay loop playsInline className="h-full w-full object-contain" />
          ) : job.status === "failed" || job.status === "nsfw" || job.status === "canceled" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-3xl">🎬💥</div>
              <p className="font-medium">That take didn&apos;t make it.</p>
              <p className="max-w-sm text-sm text-fg-muted">{job.error ?? "The model returned an error. You were not charged."}</p>
              <Link href="/#make" className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                Try another scene
              </Link>
            </div>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="absolute inset-0 shimmer opacity-30" />
              <div className="relative">
                <p className="font-display text-3xl">{STAGES[Math.min(STAGES.length - 1, Math.floor(elapsed / 15))]}…</p>
                <p className="mt-2 text-sm text-fg-muted">
                  {job.status === "queued" ? "Waiting for a slot on the render farm." : "Seedance 2.5 is rendering your clip."} Usually 1–3 minutes.
                </p>
                <p className="mt-4 font-mono text-xs text-fg-faint">{elapsed}s</p>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-faint">Scene</p>
            <h1 className="font-display text-3xl leading-tight">{job.sceneLabel}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {job.duration}s · {job.resolution} · {job.aspectRatio} · Seedance 2.5
            </p>
          </div>

          {job.status === "completed" && job.videoUrl && (
            <div className="flex flex-col gap-2">
              <a
                href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-fg px-4 py-2.5 text-center text-sm font-semibold text-bg hover:brightness-90"
              >
                Post on X
              </a>
              <a href={job.videoUrl} download={`starring-${job.id}.mp4`} className="rounded-full border border-line px-4 py-2.5 text-center text-sm hover:border-fg-faint">
                Download MP4
              </a>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-full border border-line px-4 py-2.5 text-sm hover:border-fg-faint"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-bg-elev p-4 text-sm">
            <p className="font-medium">Want one of you?</p>
            <p className="mt-1 text-fg-muted">Upload a selfie, pick a scene, done. Three free a day.</p>
            <Link href="/#make" className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              Make yours
            </Link>
          </div>

          {!job.isPublic && <p className="text-xs text-fg-faint">This render is unlisted. Only people with the link can see it.</p>}
        </aside>
      </div>
    </section>
  );
}
