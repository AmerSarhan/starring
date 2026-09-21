"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicJob } from "@/lib/jobs";
import type { Scene } from "@/lib/scenes";

type Usage = { used: number; limit: number; remaining: number };

export function Composer({ scenes }: { scenes: readonly Scene[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [selfie, setSelfie] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sceneId, setSceneId] = useState(scenes[0]?.id ?? "trailer");
  const [custom, setCustom] = useState("");
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState(5);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [byok, setByok] = useState(false);
  const [mine, setMine] = useState<PublicJob[]>([]);
  const [keyOpen, setKeyOpen] = useState(false);


  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: PublicJob[]; usage: Usage; byok: boolean };
      setUsage(data.usage);
      setByok(data.byok);
      setMine(data.jobs);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of quota + history
    void refresh();
  }, [refresh]);

  function pickScene(s: Scene) {
    setSceneId(s.id);
    setAspect(s.aspect);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Use a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("That photo is over 12 MB. Try a smaller one.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
      setSelfie({ url: blob.url, preview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!selfie) {
      setError("Add a selfie first.");
      fileInput.current?.click();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          selfieUrl: selfie.url,
          sceneId,
          customPrompt: sceneId === "custom" ? custom : undefined,
          aspectRatio: aspect,
          duration,
          resolution: "720p",
          isPublic,
        }),
      });
      const data = (await res.json()) as { job?: PublicJob; error?: string; code?: string };
      if (!res.ok || !data.job) {
        setError(data.error ?? "Could not start the render.");
        if (data.code === "quota" || data.code === "credits") setKeyOpen(true);
        return;
      }
      router.push(`/v/${data.job.id}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!selfie && !uploading && !submitting && (sceneId !== "custom" || custom.trim().length >= 8);
  const cents = (duration * 0.144).toFixed(2);

  return (
    <section id="make" className="mx-auto w-full max-w-6xl px-4 pb-16">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Selfie */}
        <div className="rounded-2xl border border-line bg-bg-elev p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg-muted">1 · Your face</h2>
            {selfie && (
              <button className="text-xs text-fg-faint hover:text-fg" onClick={() => setSelfie(null)}>
                Change
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-bg-card text-center hover:border-fg-faint"
          >
            {selfie ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfie.preview} alt="Your selfie" className="h-full w-full object-cover" />
            ) : (
              <div className="px-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elev text-2xl">📸</div>
                <p className="font-medium">{uploading ? "Uploading…" : "Add a selfie"}</p>
                <p className="mt-1 text-xs text-fg-faint">Clear face, good light, no sunglasses. JPG/PNG/WebP up to 12 MB.</p>
              </div>
            )}
            {uploading && <div className="absolute inset-0 shimmer opacity-60" />}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
            Only you, or people who agreed. Your photo is sent to Higgsfield to render and is not shown on the wall.
          </p>
        </div>

        {/* Scene + settings */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-bg-elev p-4">
            <h2 className="mb-3 text-sm font-medium text-fg-muted">2 · Pick a scene</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === sceneId}
                  onClick={() => pickScene(s)}
                  className="scene-btn rounded-xl border border-line bg-bg-card p-3 text-left transition hover:border-fg-faint"
                >
                  <div className="text-xl">{s.emoji}</div>
                  <div className="mt-1.5 text-sm font-medium leading-tight">{s.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-fg-faint">{s.blurb}</div>
                </button>
              ))}
            </div>
            {sceneId === "custom" && (
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value.slice(0, 600))}
                rows={3}
                placeholder="…is riding a motorcycle through Tokyo at night, neon everywhere, camera tracking alongside"
                className="mt-3 w-full rounded-xl border border-line bg-bg-card p-3 text-sm outline-none placeholder:text-fg-faint focus:border-accent"
              />
            )}
          </div>

          <div className="rounded-2xl border border-line bg-bg-elev p-4">
            <h2 className="mb-3 text-sm font-medium text-fg-muted">3 · Shape it</h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Segmented
                label="Format"
                value={aspect}
                onChange={(v) => setAspect(v as "16:9" | "9:16")}
                options={[
                  { value: "16:9", label: "Wide 16:9" },
                  { value: "9:16", label: "Vertical 9:16" },
                ]}
              />
              <Segmented
                label="Length"
                value={String(duration)}
                onChange={(v) => setDuration(Number(v))}
                options={[
                  { value: "4", label: "4s" },
                  { value: "5", label: "5s" },
                  { value: "8", label: "8s" },
                ]}
              />
              <label className="flex items-center gap-2 text-fg-muted">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[var(--accent)]" />
                Show on the wall
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-bg-elev p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-fg-muted">
              {byok ? (
                <>
                  Using <span className="text-fg">your Higgsfield key</span> · ≈ ${cents} per render{" "}
                  <button className="ml-2 text-xs underline hover:text-fg" onClick={() => setKeyOpen(true)}>
                    manage
                  </button>
                </>
              ) : usage ? (
                <>
                  <span className="text-fg">{usage.remaining}</span> of {usage.limit} free renders left today ·{" "}
                  <button className="underline hover:text-fg" onClick={() => setKeyOpen(true)}>
                    use your own key
                  </button>
                </>
              ) : (
                "Free renders, 720p with audio."
              )}
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Sending to set…" : "Roll camera"}
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>

      {mine.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-medium text-fg-muted">Your renders on this device</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {mine.map((j) => (
              <a key={j.id} href={`/v/${j.id}`} className="group overflow-hidden rounded-xl border border-line bg-bg-card">
                <div className={`relative ${j.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"} bg-black`}>
                  {j.videoUrl ? (
                    <video src={j.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-fg-faint">
                      {j.status === "failed" || j.status === "nsfw" ? "Failed" : "Rendering…"}
                    </div>
                  )}
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-fg-muted group-hover:text-fg">{j.sceneLabel}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {keyOpen && <KeyModal byok={byok} onClose={() => setKeyOpen(false)} onChanged={() => void refresh()} />}
    </section>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-fg-faint">{label}</span>
      <div className="flex rounded-full border border-line bg-bg-card p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs ${o.value === value ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KeyModal({ byok, onClose, onChanged }: { byok: boolean; onClose: () => void; onChanged: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    const data = (await res.json()) as { error?: string; estimate?: { usd: string } | null };
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Could not save key");
      return;
    }
    onChanged();
    onClose();
  }
  async function remove() {
    setBusy(true);
    await fetch("/api/key", { method: "DELETE" });
    setBusy(false);
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elev p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl">Use your own Higgsfield key</h3>
        <p className="mt-2 text-sm text-fg-muted">
          Unlimited renders, billed to your account at Higgsfield&apos;s API prices (Seedance 2.5 is about $0.14 per second). Create a key at{" "}
          <a className="underline" href="https://console.higgsfield.ai" target="_blank" rel="noreferrer">
            console.higgsfield.ai
          </a>
          . It&apos;s stored in an httpOnly cookie on this device only and never shown to the browser.
        </p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="KEY_ID:KEY_SECRET"
          className="mt-4 w-full rounded-xl border border-line bg-bg-card px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
        />
        {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
        <div className="mt-4 flex items-center justify-between gap-2">
          {byok ? (
            <button className="text-sm text-fg-muted underline" onClick={() => void remove()} disabled={busy}>
              Remove saved key
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button className="rounded-full px-4 py-2 text-sm text-fg-muted hover:text-fg" onClick={onClose}>
              Cancel
            </button>
            <button
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-40"
              onClick={() => void save()}
              disabled={busy || !key.includes(":")}
            >
              {busy ? "Checking…" : "Save key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
