# Starring

**Put yourself in the movie.** Upload one selfie, pick a scene, and about a minute later you have a cinematic clip of *you* in it, with audio, ready to post.

Built for the Higgsfield API launch challenge ("build something people actually use"). Video comes from **ByteDance Seedance 2.5** through the [Higgsfield API](https://open.higgsfield.ai), using its reference‑to‑video endpoint with your selfie as the face reference.

Live: https://starring.vercel.app · Source: https://github.com/AmerSarhan/starring

## What it does

- **One workflow, not a studio.** Selfie → scene → video. Fifteen curated scenes (blockbuster trailer, F1 podium, spacewalk, anime opening, 90s sitcom, perfume ad…) plus a free‑text scene. Wide 16:9 or vertical 9:16, 4–8 seconds, 720p, audio on.
- **Share pages that pull people in.** Every render gets `/v/<id>` with Open Graph video tags, a one‑tap "Post on X", download, and a "Make yours" call to action. Public renders land on the [wall](https://starring.vercel.app/feed).
- **Free tier that can't be trivially drained.** Three renders per browser per day and a per‑IP cap, using the site's key. Bring your own Higgsfield key (stored in an httpOnly cookie, never sent to the browser) for unlimited renders billed to your account.
- **Built for the API's actual failure modes.**
  - Submits with `hf_webhook` so completion is pushed; the client polls with backoff as the recovery path, and the server dedupes so a webhook and a poll can't double‑process.
  - Webhook deliveries are verified with a per‑deployment secret and, for site‑key jobs, re‑read from the authoritative status endpoint instead of trusting the body.
  - Higgsfield keeps outputs for ~7 days, so finished videos are copied into Vercel Blob for permanent share links.
  - Concurrency‑limit (`400 … concurrent requests`), insufficient‑credits (`403`), `nsfw` and `failed` states each get a specific, honest message. Failed renders aren't charged and don't count against your quota.
  - The `request_id` is stored the moment the API accepts a job, so nothing is lost if the process dies mid‑poll.

## Stack

Next.js 16 (App Router, Route Handlers on Fluid Compute) · React 19 · Tailwind v4 · Postgres via Drizzle · Vercel Blob for selfies and permanent video copies · Higgsfield REST API (no SDK, ~150 lines in `src/lib/higgsfield.ts`).

```
src/
  app/
    page.tsx                   landing + composer
    v/[id]/                    share page, live poller, OG image
    feed/                      public wall
    api/upload                 Blob client-token handler (browser → Blob direct)
    api/jobs                   create job (quota, prompt build, submit w/ webhook), list mine
    api/jobs/[id]              status; refreshes from Higgsfield when stale
    api/webhooks/higgsfield    completion webhook (secret-checked, idempotent)
    api/key                    bring-your-own-key cookie
  lib/
    higgsfield.ts              API client + mock mode
    jobs.ts                    sync/persist logic, quota, feed queries
    scenes.ts                  scene prompts
    db/                        Drizzle schema
components/
    composer.tsx, job-view.tsx
scripts/e2e.mjs                end-to-end test: upload → submit → poll → pages
```

## Run it

```bash
pnpm install
cp .env.example .env.local     # fill in HF_KEY, DATABASE_URL, BLOB_READ_WRITE_TOKEN, WEBHOOK_SECRET
pnpm db:push
pnpm dev
```

- `HF_KEY` is `KEY_ID:KEY_SECRET` from [console.higgsfield.ai](https://console.higgsfield.ai).
- No credits yet? Set `HIGGSFIELD_MOCK=1` and the app renders a sample clip after ~9s so you can work on the product.
- Any Postgres works (`DATABASE_URL`). On Vercel: `vercel integration add neon` and `vercel blob create-store <name> --access public`.
- Webhooks are only registered when the site runs on `https`; locally the poller does the job.
- `node scripts/e2e.mjs` drives the whole flow against `http://localhost:3000`.

## Cost

Seedance 2.5 on Higgsfield is listed at about **$0.144 per second** of 720p video at the launch discount, so a 5‑second render is roughly $0.72. The free tier is funded by the site key; the daily limits are `FREE_DAILY_LIMIT` and `IP_DAILY_LIMIT`.

## Responsible use

Only upload photos of yourself or people who have agreed. Selfies are used only as the model's reference and are never shown on the wall. Renders that end in `nsfw` are blocked by Higgsfield's moderation. Anyone can ask for a render to be removed.

MIT © Amer Sarhan
