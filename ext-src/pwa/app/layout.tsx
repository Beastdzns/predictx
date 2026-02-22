'use client';

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { WalletProviders } from "@/lib/wallet-providers";
import { ThemeProvider } from "next-themes";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Show navbar on wallet and private-payments pages
  const showNavbar = pathname.startsWith('/wallet') || pathname.startsWith('/private-payments');

  return (
    <html lang="en" suppressHydrationWarning className="bg-gray-950 text-white">
      <head>
        <title>P-Links - Privacy Payments on Solana</title>
        <meta name="description" content="Send and receive crypto with complete privacy using zero-knowledge proofs and payment links" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#14F195" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="P-Links" />
      </head>
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <WalletProviders>
            {children}
            {showNavbar && <BottomNav />}
          </WalletProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
