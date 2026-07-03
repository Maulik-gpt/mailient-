import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Mailient",
  description: "Talk to Maulik directly — mailient.xyz@gmail.com or @maulik_5 on X. Real founder, real replies.",
  alternates: { canonical: "https://mailient.xyz/contact" },
  openGraph: {
    title: "Contact | Mailient",
    description: "Talk to Maulik directly — mailient.xyz@gmail.com or @maulik_5 on X.",
    url: "https://mailient.xyz/contact",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Contact Mailient" }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
