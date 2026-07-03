import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Mailient",
  description: "What shipped in Mailient — new capabilities, fixes, and improvements to your inbox employee.",
  alternates: { canonical: "https://mailient.xyz/changelog" },
  openGraph: {
    title: "Changelog | Mailient",
    description: "What shipped in Mailient — new capabilities, fixes, and improvements.",
    url: "https://mailient.xyz/changelog",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mailient changelog" }],
  },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
