import type { Metadata } from "next";
import Link from "next/link";

import { publicFeed } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The wall", description: "Latest videos people made with Starring." };

export default async function FeedPage() {
  const items = await publicFeed(60).catch(() => []);
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">The wall</h1>
          <p className="mt-1 text-sm text-fg-muted">Everything people chose to share, newest first.</p>
        </div>
        <Link href="/#make" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          Make yours
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-bg-elev p-10 text-center text-fg-muted">Nothing here yet. Be the first.</p>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid">
          {items.map((j) => (
            <Link key={j.id} href={`/v/${j.id}`} className="group block overflow-hidden rounded-xl border border-line bg-bg-card">
              <video src={j.videoUrl!} muted loop playsInline autoPlay preload="metadata" className="w-full" />
              <div className="flex items-center justify-between px-2.5 py-2 text-xs text-fg-muted group-hover:text-fg">
                <span className="truncate">{j.sceneLabel}</span>
                <span className="text-fg-faint">{j.duration}s</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
