"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { withdraw, getUtxos, getBalanceFromUtxos, getConfig } from "privacycash/utils";
import { encryptionServiceFromSecretBytes, getLightWasm } from "@/lib/privacycashClient";
import { decodeSecretBase58 } from "@/lib/paymentLink";
import { Coins, Lock, Plus, Download } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function ClaimPageContent() {
  const searchParams = useSearchParams();
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [secret58, setSecret58] = useState<string>(searchParams.get("s") || "");
  const [recipient, setRecipient] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [minFeeLamports, setMinFeeLamports] = useState<number | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{
    recipient: string;
    amountReceived: number;
    fee: number;
  } | null>(null);

  useEffect(() => {
    if (publicKey && !recipient) setRecipient(publicKey.toBase58());
  }, [publicKey, recipient]);

  const secretBytes = useMemo(() => {
    if (!secret58) return null;
    try {
      return decodeSecretBase58(secret58);
    } catch {
      return null;
    }
  }, [secret58]);

  async function refreshBalance() {
    if (!publicKey) throw new Error("Connect a wallet");
    if (!secretBytes) throw new Error("Invalid secret");
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.includes("tradeHistory") || key.includes("fetch_offset") || key.includes("encrypted_outputs"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    
    setStatus("Scanning pool for your notes…");
    setWithdrawResult(null);

    const encryptionService = encryptionServiceFromSecretBytes(secretBytes);
    const utxos = await getUtxos({
      publicKey,
      connection,
      encryptionService,
      storage: window.localStorage,
    });

    const bal = getBalanceFromUtxos(utxos);
    setBalanceLamports(bal.lamports);

    try {
      const withdrawRentFee = await getConfig("withdraw_rent_fee");
      const minFee = Math.floor(LAMPORTS_PER_SOL * withdrawRentFee);
      setMinFeeLamports(minFee);
    } catch (e) {
      setMinFeeLamports(Math.floor(0.006 * LAMPORTS_PER_SOL));
    }

    setStatus("");
  }

  async function onWithdrawAll() {
    if (!publicKey) throw new Error("Connect a wallet");
    if (!secretBytes) throw new Error("Invalid secret");
    if (!recipient) throw new Error("Recipient is required");

    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.includes("tradeHistory") || key.includes("fetch_offset") || key.includes("encrypted_outputs"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));

    setTx(null);
    setStatus("Scanning pool…");

    const encryptionService = encryptionServiceFromSecretBytes(secretBytes);
    const utxos = await getUtxos({
      publicKey,
      connection,
      encryptionService,
      storage: window.localStorage,
    });
    const bal = getBalanceFromUtxos(utxos);
    setBalanceLamports(bal.lamports);

    if (!bal.lamports || bal.lamports <= 0) {
      throw new Error("No private balance found for this link");
    }

    let estimatedMinFee = minFeeLamports;
    if (!estimatedMinFee) {
      try {
        const withdrawRentFee = await getConfig("withdraw_rent_fee");
        estimatedMinFee = Math.floor(LAMPORTS_PER_SOL * withdrawRentFee);
      } catch {
        estimatedMinFee = Math.floor(0.006 * LAMPORTS_PER_SOL);
      }
    }

    try {
      const withdrawFeeRate = await getConfig("withdraw_fee_rate");
      const estimatedFee = Math.floor(
        bal.lamports * withdrawFeeRate + estimatedMinFee
      );
      if (estimatedFee >= bal.lamports) {
        throw new Error(
          `Balance too low. Minimum withdrawal: ~${(
            (estimatedMinFee * 1.1) /
            LAMPORTS_PER_SOL
          ).toFixed(4)} SOL (to cover fees). Your balance: ${(
            bal.lamports / LAMPORTS_PER_SOL
          ).toFixed(9)} SOL`
        );
      }
    } catch (e: any) {
      if (e.message?.includes("Balance too low")) {
        throw e;
      }
    }

    setStatus("Generating proof + submitting withdrawal…");

    try {
      const lightWasm = await getLightWasm();
      const res = await withdraw({
        connection,
        encryptionService,
        keyBasePath: "/circuit2/transaction2",
        publicKey,
        storage: window.localStorage,
        recipient: new PublicKey(recipient),
        lightWasm,
        amount_in_lamports: bal.lamports,
      });

      setTx(res.tx);
      setWithdrawResult({
        recipient: res.recipient || recipient,
        amountReceived: res.amount_in_lamports || 0,
        fee: res.fee_in_lamports || 0,
      });
      setStatus(
        `Withdraw successful! ${(res.amount_in_lamports / LAMPORTS_PER_SOL).toFixed(9)} SOL sent to ${res.recipient || recipient}`
      );
    } catch (e: any) {
      const errorMsg =
        e?.message ||
        e?.error?.message ||
        e?.error ||
        String(e) ||
        "Withdrawal failed";
      throw new Error(
        errorMsg.includes("400") || errorMsg.includes("Bad Request")
          ? "Withdrawal rejected: balance may be too low to cover fees, or transaction is invalid."
          : errorMsg
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white"
    >
      {/* Header */}
      <div className="flex items-center py-8 px-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-neon-green">$</span>
          <h1 className="text-3xl font-bold text-black dark:text-white">Claim Funds</h1>
        </div>
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col px-6 pt-6 pb-36">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <label className="text-sm font-bold text-black dark:text-white">Payment Link Secret</label>
            <input
              type="text"
              className="mt-3 w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-mono outline-none focus:border-purple-500 transition-colors"
              value={secret58}
              onChange={(e) => setSecret58(e.target.value.trim())}
              placeholder="Paste secret from payment link"
            />
            {!secret58 ? null : secretBytes ? null : (
              <div className="mt-2 text-xs text-red-500">
                Invalid secret format
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <label className="text-sm font-bold text-black dark:text-white">Recipient Address</label>
            <input
              type="text"
              className="mt-3 w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-mono outline-none focus:border-purple-500 transition-colors"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder="Solana wallet address"
            />
          </div>
        </div>

        <div className="h-10"></div>

        {/* Fixed Bottom Buttons */}
        <div className="flex gap-3 fixed z-10 bottom-20 left-0 right-0 max-w-lg mx-auto px-6">
          <button
            className="flex-1 bg-white dark:bg-gray-900 border-2 border-neon-green/30 text-black dark:text-white font-bold py-4 rounded-xl hover:border-neon-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!publicKey || !secretBytes}
            onClick={() => refreshBalance().catch((e) => setStatus(String(e?.message ?? e)))}
          >
            Check Balance
          </button>
          <button
            className="flex-1 bg-neon-green hover:bg-green-400 active:bg-green-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !publicKey ||
              !secretBytes ||
              !recipient ||
              (balanceLamports != null &&
                minFeeLamports != null &&
                balanceLamports < minFeeLamports * 1.1)
            }
            onClick={() => onWithdrawAll().catch((e) => setStatus(String(e?.message ?? e)))}
          >
            <span>Withdraw All</span>
            <span className="text-xl">→</span>
          </button>
        </div>

        <div className="mt-6 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-5">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-200">Private Balance</div>
          <div className="mt-2 text-3xl font-bold text-black dark:text-white">
            {balanceLamports == null
              ? "—"
              : `${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
          </div>
          {balanceLamports != null &&
          minFeeLamports != null &&
          balanceLamports < minFeeLamports * 1.1 ? (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
              <span className="text-lg">⚠️</span>
              <span>
                Balance too low for withdrawal (minimum: ~
                {((minFeeLamports * 1.1) / LAMPORTS_PER_SOL).toFixed(4)} SOL)
              </span>
            </div>
          ) : null}
        </div>

        {status && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 text-sm text-blue-900 dark:text-blue-200">
            {status}
          </div>
        )}
        
        {withdrawResult && (
          <div className="mt-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✓</span>
              <div className="font-bold text-green-700 dark:text-green-300">Withdrawal Complete</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Received:</span>
                <span className="font-bold text-black dark:text-white">{(withdrawResult.amountReceived / LAMPORTS_PER_SOL).toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fee Paid:</span>
                <span className="font-bold text-black dark:text-white">{(withdrawResult.fee / LAMPORTS_PER_SOL).toFixed(6)} SOL</span>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-900">
                <div className="text-xs text-gray-600 dark:text-gray-400">Sent to:</div>
                <div className="mt-1 break-all font-mono text-xs text-black dark:text-white">{withdrawResult.recipient}</div>
              </div>
              <a
                className="mt-3 inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 underline hover:text-green-700 dark:hover:text-green-300"
                href={`https://solscan.io/address/${withdrawResult.recipient}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}
        
        {tx && (
          <div className="mt-4 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-900 rounded-2xl p-4">
            <div className="text-xs font-bold text-purple-900 dark:text-purple-200 mb-2">Transaction Signature</div>
            <a
              className="text-sm text-purple-600 dark:text-purple-400 underline break-all hover:text-purple-700 dark:hover:text-purple-300"
              href={`https://solscan.io/tx/${tx}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Solscan
            </a>
          </div>
        )}
      </main>
    </motion.div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}
