import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sift — only the emails that deserve your attention | Mailient",
  description:
    "Mailient reads everything and surfaces the deals, decisions, and real requests. Newsletters and noise never reach you. You read almost nothing.",
  alternates: { canonical: "https://mailient.xyz/product/sift" },
  openGraph: {
    title: "Sift — only the emails that deserve your attention | Mailient",
    description:
      "It reads everything. You read almost nothing. Deals, decisions, and real requests surface; noise disappears.",
    url: "https://mailient.xyz/product/sift",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Sift — only what needs you" }],
  },
};

export default function SiftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
