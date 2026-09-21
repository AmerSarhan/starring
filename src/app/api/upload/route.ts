import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { cookieOptions, DEVICE_COOKIE, getDevice } from "@/lib/device";

const MAX_BYTES = 12 * 1024 * 1024;

/** Issues short-lived client tokens so selfies go browser → Blob directly. */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const device = await getDevice();
  try {
    const json = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        const ext = (pathname.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          pathname: `selfies/${device.id}/selfie.${ext}`,
          tokenPayload: JSON.stringify({ device: device.id }),
        };
      },
    });
    const res = NextResponse.json(json);
    if (device.minted) res.cookies.set(DEVICE_COOKIE, device.id, cookieOptions);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
