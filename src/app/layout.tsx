import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuroraBackground } from "@/components/AuroraBackground";

export const metadata: Metadata = {
  title: "Albo AI - Smart Link Intelligence & Glass Curation",
  description:
    "Curate categories, store links via sharing, and automatically extract, summarize, and synthesize webpage knowledge with AI.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Albo AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#060913",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060913] text-slate-100 min-h-screen antialiased selection:bg-purple-500 selection:text-white">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
        <AuroraBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
