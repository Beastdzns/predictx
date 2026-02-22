import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Varela_Round, Roboto_Slab } from 'next/font/google';
import Providers from './providers';

const varelaRound = Varela_Round({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-varela-round',
})

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-roboto-slab',
})

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "x402PM",
  description: "x402 Predictions Market",
  other: {
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://cloudflare-eth.com https://mainnet.infura.io https://rpc.ankr.com; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scrollbar-hide" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/android-launchericon-192-192.png" />
      </head>
      <body className={`${varelaRound.variable} ${robotoSlab.variable} bg-zinc-950 min-h-screen scrollbar-hide`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <div id="privy-portal" />
      </body>
    </html>
  )
}