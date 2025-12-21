import type { Metadata } from "next";
import "./globals.css";
import { Varela_Round, Roboto_Slab } from 'next/font/google';
import Appbar from '@/components/shared/appbar';
import Bottombar from '@/components/shared/bottombar';

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

export const metadata: Metadata = {
  title: "x402PM",
  description: "x402 Predictions Market",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${varelaRound.variable} ${robotoSlab.variable} bg-zinc-950 min-h-screen scrollbar-hide`}>
        <Appbar />
        <main className="pb-20">
          {children}
        </main>
        <Bottombar />
      </body>
    </html>
  )
}