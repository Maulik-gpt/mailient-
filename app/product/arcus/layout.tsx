import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arcus — the AI running your inbox | Mailient",
  description:
    "It reads every thread, drafts replies in your voice, books your meetings, and runs on schedule while you sleep. Nothing sends without your approval.",
  alternates: { canonical: "https://mailient.xyz/product/arcus" },
  openGraph: {
    title: "Arcus — the AI running your inbox | Mailient",
    description:
      "Reads every thread, drafts in your voice, books meetings, runs while you sleep. Nothing sends without your approval.",
    url: "https://mailient.xyz/product/arcus",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Arcus — the AI running your inbox" }],
  },
};

export default function ArcusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
