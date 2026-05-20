import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Mailient",
  description: "Stop dreading your inbox. AI surfaces the deals and urgent replies hiding in the noise. Draft faster in your voice. Know exactly what needs your attention without the Sunday night panic of what did I miss.",
  metadataBase: new URL('https://mailient.xyz'),
  icons: {
    icon: [
      { url: "/favicon.png?v=10", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=10",
    apple: "/apple-touch-icon.png?v=10",
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
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            window.addEventListener('error', function(e) {
              const target = e.target;
              if (target && target.tagName === 'SCRIPT' && target.src && (target.src.indexOf('/_next/static/') !== -1 || target.src.indexOf('/chunks/') !== -1)) {
                console.warn('Chunk loading failed:', target.src);
                window.location.reload();
              }
              if (e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('loading chunk') !== -1)) {
                console.warn('ChunkLoadError caught:', e.message);
                window.location.reload();
              }
            }, true);
            window.addEventListener('unhandledrejection', function(e) {
              if (e.reason && (e.reason.name === 'ChunkLoadError' || (e.reason.message && (e.reason.message.indexOf('ChunkLoadError') !== -1 || e.reason.message.indexOf('loading chunk') !== -1)))) {
                console.warn('Unhandled ChunkLoadError caught:', e.reason);
                window.location.reload();
              }
            });
          })();
        ` }} />
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID || 'G-M03D6M49N8'}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID || 'G-M03D6M49N8'}');
          `}
        </Script>
        <Script
          defer
          data-website-id="dfid_CFPVRrMW5ckOyKogWqzo9"
          data-domain="mailient.xyz"
          src="https://datafa.st/js/script.js"
        />
        {/* Launchit Badge for SEO Authority */}
        <a href="https://www.launchit.site/project/mailient" target="_blank" className="hidden" aria-hidden="true">
          <img src="/badges/featured-dark.svg" alt="Launched on Launchit" width="1" height="1" />
        </a>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300,200,100&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Strichpunkt+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased satoshi-app bg-[#000000] text-foreground" data-new-gr-c-s-check-loaded="14.1258.0" data-gr-ext-installed="">
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
