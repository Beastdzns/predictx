"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { Buffer } from "buffer";
import process from "process";

import "@solana/wallet-adapter-react-ui/styles.css";

// Ensure common Node globals exist for browser-bundled deps.
// (PrivacyCash SDK uses Buffer and sometimes checks process.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer ??= Buffer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process ??= process;

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const endpoint =
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
