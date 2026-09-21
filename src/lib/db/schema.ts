import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One generation. A row is written the moment Higgsfield accepts the request,
    so a crashed poller or a lost webhook can always be recovered from the
    stored request id. */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    ip: text("ip"),
    sceneId: text("scene_id").notNull(),
    sceneLabel: text("scene_label").notNull(),
    prompt: text("prompt").notNull(),
    selfieUrl: text("selfie_url").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    duration: integer("duration").notNull(),
    resolution: text("resolution").notNull(),
    /** queued | in_progress | completed | failed | nsfw | canceled */
    status: text("status").notNull().default("queued"),
    requestId: text("request_id"),
    statusUrl: text("status_url"),
    /** Higgsfield CDN url. Expires after ~7 days, so we copy it. */
    sourceVideoUrl: text("source_video_url"),
    /** Our permanent copy in Vercel Blob. */
    videoUrl: text("video_url"),
    error: text("error"),
    isPublic: boolean("is_public").notNull().default(true),
    byok: boolean("byok").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("jobs_device_created_idx").on(t.deviceId, t.createdAt),
    index("jobs_public_completed_idx").on(t.isPublic, t.status, t.completedAt),
    index("jobs_request_idx").on(t.requestId),
  ],
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
