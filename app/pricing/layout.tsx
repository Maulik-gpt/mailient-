import type { Metadata } from "next";

// Server-side metadata for the pricing page. The page itself is a client
// component (document.title only works after hydration) — this layout is what
// social cards and non-JS crawlers actually see.
export const metadata: Metadata = {
  title: "Pricing — Your next hire costs $29 a month | Mailient",
  description:
    "One plan, everything included. Monthly $29, Annual $199/year, or Lifetime Founder $499 once. Mailient removes email from your to-do list entirely. 3-day free trial.",
  alternates: { canonical: "https://mailient.xyz/pricing" },
  openGraph: {
    title: "Pricing — Your next hire costs $29 a month | Mailient",
    description:
      "One plan, everything included. Monthly $29, Annual $199/year, or Lifetime Founder $499 once. 3-day free trial.",
    url: "https://mailient.xyz/pricing",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mailient pricing" }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
