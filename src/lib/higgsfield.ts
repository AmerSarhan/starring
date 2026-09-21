/**
 * Thin server-side client for the Higgsfield API.
 * Docs: https://docs.higgsfield.ai/docs/llms.txt
 *
 * Auth header is `Authorization: Key <id>:<secret>`. Generation is async:
 * submit returns a request_id + status_url; poll or take a webhook.
 */

const DEFAULT_BASE_URL = "https://api.higgsfield.ai";

export const TERMINAL_STATUSES = new Set(["completed", "failed", "nsfw", "canceled"]);

export type SubmitResult = {
  status: string;
  requestId: string;
  statusUrl: string;
  cancelUrl: string;
};

export type StatusResult = {
  status: string;
  requestId: string;
  videoUrl?: string;
  imageUrls?: string[];
  error?: string;
};

export class HiggsfieldError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly correlationId: string | null;
  constructor(status: number, body: unknown, correlationId: string | null) {
    super(messageFromBody(status, body));
    this.name = "HiggsfieldError";
    this.status = status;
    this.body = body;
    this.correlationId = correlationId;
  }
  /** "Maximum number of concurrent requests (4) has been reached" comes back as a 400. */
  get isConcurrencyLimit() {
    return this.status === 400 && /concurrent/i.test(this.message);
  }
  get isInsufficientCredits() {
    return this.status === 403;
  }
}

export type HiggsfieldClient = {
  submit(endpoint: string, body: Record<string, unknown>, webhookUrl?: string): Promise<SubmitResult>;
  status(requestIdOrUrl: string): Promise<StatusResult>;
  estimate(endpoint: string, body: Record<string, unknown>): Promise<{ credits: string; usd: string } | null>;
};

/** Server credentials, `id:secret`. Accepts HF_KEY (the SDK convention) or the split pair. */
export function serverKey(): string | null {
  const joined = process.env.HF_KEY ?? process.env.HF_CREDENTIALS;
  if (joined && joined.includes(":")) return joined.trim();
  const id = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  if (id && secret) return `${id.trim()}:${secret.trim()}`;
  return null;
}

export function isMockMode() {
  return process.env.HIGGSFIELD_MOCK === "1";
}

export function createClient(key: string): HiggsfieldClient {
  if (key === "mock") return mockClient();
  const baseUrl = (process.env.HF_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const auth = `Key ${key}`;

  async function send(method: "GET" | "POST", url: string, body?: Record<string, unknown>) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    if (!res.ok) throw new HiggsfieldError(res.status, payload, res.headers.get("x-correlation-id"));
    return payload;
  }

  return {
    async submit(endpoint, body, webhookUrl) {
      const path = endpoint.replace(/^\//, "");
      const url = new URL(`${baseUrl}/${path}`);
      if (webhookUrl) url.searchParams.set("hf_webhook", webhookUrl);
      const data = asRecord(await send("POST", url.toString(), body));
      const requestId = str(data.request_id);
      if (!requestId) throw new HiggsfieldError(502, { detail: "Response missing request_id" }, null);
      return {
        status: str(data.status) ?? "queued",
        requestId,
        statusUrl: str(data.status_url) ?? `${baseUrl}/requests/${requestId}/status`,
        cancelUrl: str(data.cancel_url) ?? `${baseUrl}/requests/${requestId}/cancel`,
      };
    },
    async status(requestIdOrUrl) {
      const url = requestIdOrUrl.startsWith("http")
        ? requestIdOrUrl
        : `${baseUrl}/requests/${encodeURIComponent(requestIdOrUrl)}/status`;
      return mapStatus(await send("GET", url));
    },
    async estimate(endpoint, body) {
      try {
        const data = asRecord(await send("POST", `${baseUrl}/estimate/${endpoint.replace(/^\//, "")}`, body));
        const credits = str(data.credits);
        const usd = str(data.usd);
        return credits && usd ? { credits, usd } : null;
      } catch {
        return null;
      }
    },
  };
}

/** Maps both the status endpoint shape and the webhook envelope shape. */
export function mapStatus(payload: unknown): StatusResult {
  const data = asRecord(payload);
  const inner = data.payload !== undefined ? asRecord(data.payload) : data;
  const video = asRecord(inner.video);
  const images = Array.isArray(inner.images)
    ? inner.images.map((i) => str(asRecord(i).url)).filter((u): u is string => !!u)
    : undefined;
  const error = data.error;
  return {
    status: str(data.status) ?? "unknown",
    requestId: str(data.request_id) ?? "",
    ...(str(video.url) ? { videoUrl: str(video.url) } : {}),
    ...(images?.length ? { imageUrls: images } : {}),
    ...(typeof error === "string" && error ? { error } : {}),
  };
}

/* ---------- mock, for local dev without credits ---------- */

const MOCK_SAMPLE =
  process.env.HIGGSFIELD_MOCK_VIDEO_URL ??
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
const MOCK_DELAY_MS = 9000;

function mockClient(): HiggsfieldClient {
  return {
    async submit() {
      const requestId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return { status: "queued", requestId, statusUrl: `mock://${requestId}`, cancelUrl: "" };
    },
    async status(requestIdOrUrl) {
      const requestId = requestIdOrUrl.replace(/^mock:\/\//, "");
      const started = Number(requestId.split("_")[1] ?? 0);
      const age = Date.now() - started;
      if (age < MOCK_DELAY_MS / 3) return { status: "queued", requestId };
      if (age < MOCK_DELAY_MS) return { status: "in_progress", requestId };
      return { status: "completed", requestId, videoUrl: MOCK_SAMPLE };
    },
    async estimate() {
      return { credits: "0", usd: "0.00" };
    },
  };
}

/* ---------- helpers ---------- */

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}
function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const first = asRecord(detail[0]);
    if (typeof first.msg === "string") return first.msg;
  }
  return `Higgsfield request failed (${status})`;
}
