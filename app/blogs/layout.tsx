import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Insights // Mailient Blog",
  description: "Essays and guides on AI email agents, inbox triage, replies in your own voice, and email encryption — written by the founder building Mailient.",
  metadataBase: new URL("https://mailient.xyz"),
  openGraph: {
    title: "Platform Insights // Mailient Blog",
    description: "Essays and guides on AI email agents, inbox triage, replies in your own voice, and email encryption — written by the founder building Mailient.",
    url: "https://mailient.xyz/blogs",
    siteName: "Mailient",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mailient Blog — Platform Insights",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Platform Insights // Mailient Blog",
    description: "Explore technical deep dives, engineering essays, and guides on autonomous AI email agents.",
    images: ["/og-image.png"],
  },
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
