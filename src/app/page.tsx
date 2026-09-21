import Link from "next/link";

import { Composer } from "@/components/composer";
import { completedCount, publicFeed } from "@/lib/jobs";
import { SCENES } from "@/lib/scenes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [count, latest] = await Promise.all([safe(completedCount, 0), safe(() => publicFeed(6), [])]);

  return (
    <>
      <section className="glow">
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-bg-elev px-3 py-1 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Seedance 2.5 · face reference · audio on
          </p>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">
            Put yourself <em className="text-accent">in the movie.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-fg-muted">
            One selfie. Pick a scene. About a minute later you get a cinematic clip of <span className="text-fg">you</span>, with sound,
            ready to post.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-fg-faint">
            <span>
              <span className="text-fg">{count.toLocaleString()}</span> videos made
            </span>
            <span>·</span>
            <span>3 free a day</span>
            <span>·</span>
            <Link href="/feed" className="underline hover:text-fg">
              see the wall
            </Link>
          </div>
        </div>
      </section>

      <Composer scenes={SCENES} />

      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-3xl">Fresh off the wall</h2>
            <Link href="/feed" className="text-sm text-fg-muted hover:text-fg">
              All →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((j) => (
              <Link key={j.id} href={`/v/${j.id}`} className="group overflow-hidden rounded-xl border border-line bg-bg-card">
                <div className={`${j.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"} bg-black`}>
                  <video src={j.videoUrl!} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover" />
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-fg-muted group-hover:text-fg">{j.sceneLabel}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[home] query failed", err instanceof Error ? err.message : err);
    return fallback;
  }
}
