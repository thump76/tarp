import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarp",
  description: "Booking, invoicing and calendar for market organisers.",
};

/**
 * Display face: Fraunces (soft axis) stands in for Recoleta.
 * When the Recoleta licence is in hand, drop the woff2 files in src/fonts, replace the link
 * below with next/font/local, and point --font-fraunces in globals.css at it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,500..700,100&display=swap" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
