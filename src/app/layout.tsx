import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiz Party",
  description: "Host / Client 即時限時問答競賽",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased text-amber-50">
        {children}
      </body>
    </html>
  );
}
