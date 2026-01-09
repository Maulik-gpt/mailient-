import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Mailient | AI-Powered Email Command Center",
  description: "Transform your email workflow with Arcus AI. Intelligent relationship tracking, smart insights, and seamless inbox management for founders.",
  openGraph: {
    title: "Mailient | AI-Powered Email Command Center",
    description: "Transform your email workflow with Arcus AI. Intelligent relationship tracking, smart insights, and seamless inbox management for founders.",
    url: "https://mailient.xyz",
    siteName: "Mailient",
    images: [
      {
        url: "/social-screenshot.png",
        width: 1200,
        height: 630,
        alt: "Mailient App Dashboard Mockup",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mailient | AI-Powered Email Command Center",
    description: "Transform your email workflow with Arcus AI. Intelligent relationship tracking, smart insights, and seamless inbox management for founders.",
    images: ["/social-screenshot.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png?v=8", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=8",
    apple: "/apple-touch-icon.png?v=8",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-M03D6M49N8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-M03D6M49N8');
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap" rel="stylesheet" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&display=swap');
        </style>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" />
      </head>
      <body className="font-sans antialiased satoshi-app" data-new-gr-c-s-check-loaded="14.1258.0" data-gr-ext-installed="">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
