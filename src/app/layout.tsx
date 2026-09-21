import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Starring — put yourself in the movie", template: "%s · Starring" },
  description:
    "Upload one selfie, pick a scene, and get a cinematic video of you in it. Powered by Seedance 2.5 on the Higgsfield API.",
  openGraph: {
    siteName: "Starring",
    type: "website",
    title: "Starring — put yourself in the movie",
    description: "One selfie. Any scene. A cinematic video of you, with audio, in about a minute.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
            <Link href="/" className="font-display text-2xl leading-none">
              Starring<span className="text-accent">.</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-fg-muted">
              <Link href="/feed" className="hover:text-fg">Wall</Link>
              <a href="https://github.com/AmerSarhan/starring" target="_blank" rel="noreferrer" className="hover:text-fg">
                GitHub
              </a>
              <Link href="/#make" className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-accent-ink hover:brightness-110">
                Make yours
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-fg-faint sm:flex-row sm:items-center sm:justify-between">
            <p>
              Open source. Video by ByteDance Seedance 2.5 through the{" "}
              <a className="underline hover:text-fg" href="https://open.higgsfield.ai" target="_blank" rel="noreferrer">
                Higgsfield API
              </a>
              .
            </p>
            <p>Only upload photos of yourself or people who said yes. Renders are deleted on request.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
