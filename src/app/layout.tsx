import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuroraBackground } from "@/components/AuroraBackground";

export const metadata: Metadata = {
  title: "Albo AI - Smart Link Intelligence & Glass Curation",
  description:
    "Curate categories, store links via sharing, and automatically extract, summarize, and synthesize webpage knowledge with AI.",
  icons: {
    icon: "/favicon.ico",
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
        <AuroraBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
