import { ImageResponse } from "next/og";

import { getJob } from "@/lib/jobs";

export const alt = "Starring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id).catch(() => null);
  const label = job?.sceneLabel ?? "Put yourself in the movie";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(60% 60% at 50% 0%, rgba(245,197,66,0.25), #09090b 70%)",
          color: "#f4f4f5",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 40, display: "flex" }}>
          Starring<span style={{ color: "#f5c542" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 28, color: "#a1a1aa" }}>Now showing</div>
          <div style={{ fontSize: 88, lineHeight: 1, fontStyle: "italic" }}>“{label}”</div>
          <div style={{ fontSize: 28, color: "#a1a1aa", marginTop: 12 }}>One selfie → cinematic video · Seedance 2.5 via Higgsfield API</div>
        </div>
      </div>
    ),
    size,
  );
}
