import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Spectral is a warm transitional serif that pairs with the SC Pronto wordmark.
const serif = Spectral({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "SC Pronto — Employee Portal",
  description: "Internal apps and tools for the SC Pronto team.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
