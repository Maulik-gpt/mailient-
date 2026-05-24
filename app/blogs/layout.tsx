import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Insights // Mailient Blog",
  description: "Explore technical deep dives, engineering essays, and guides on autonomous AI email agents, zero-knowledge encryption, and neural voice style profiling written by the Mailient team.",
  metadataBase: new URL("https://mailient.xyz"),
  openGraph: {
    title: "Platform Insights // Mailient Blog",
    description: "Explore technical deep dives, engineering essays, and guides on autonomous AI email agents, zero-knowledge encryption, and neural voice style profiling written by the Mailient team.",
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
