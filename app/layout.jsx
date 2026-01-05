import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Mailient",
  description: "Intelligent email management with AI-powered relationship tracking",
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
