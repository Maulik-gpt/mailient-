import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Mailient",
  description: "Intelligent email management with AI-powered relationship tracking",
  metadataBase: new URL('https://mailient.xyz'),
  icons: {
    icon: [
      { url: "/favicon.png?v=8", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=8",
    apple: "/apple-touch-icon.png?v=8",
  },
  openGraph: {
    title: "Mailient",
    description: "Never Miss Revenue Again. AI assistant for founders.",
    url: "https://mailient.xyz",
    siteName: "Mailient",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mailient - Email That Thinks Like You Do",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mailient",
    description: "Never Miss Revenue Again. AI assistant for founders.",
    images: ["/og-image.png"],
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
        <Script
          defer
          data-website-id="dfid_CFPVRrMW5ckOyKogWqzo9"
          data-domain="mailient.xyz"
          src="https://datafa.st/js/script.js"
        />
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
