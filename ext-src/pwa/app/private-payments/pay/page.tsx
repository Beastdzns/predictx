"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { deposit } from "privacycash/utils";
import { encryptionServiceFromSecretBytes, getLightWasm } from "@/lib/privacycashClient";
import { newPaymentLinkSecret, encodeSecretBase58 } from "@/lib/paymentLink";
import { Send, Copy, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BlinkCard from "@/components/BlinkCard";
import Image from "next/image";

function PayPageContent() {
  const searchParams = useSearchParams();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const requestedAmount = searchParams.get("amount");
  const linkId = searchParams.get("id");

  const payload = useMemo(() => {
    if (!requestedAmount || !linkId) return null;
    return { requestedAmount, linkId };
  }, [requestedAmount, linkId]);

  const [amountSol, setAmountSol] = useState<string>(requestedAmount ?? "0.1");
  const [status, setStatus] = useState<string>("");
  const [tx, setTx] = useState<string | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [blinkCardData, setBlinkCardData] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Fetch Blink card if linkId exists
  useEffect(() => {
    async function fetchBlinkCard() {
      if (!linkId) return;

      setLoadingCard(true);
      try {
        const response = await fetch(`/api/blink/${linkId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBlinkCardData(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching blink card:', error);
      } finally {
        setLoadingCard(false);
      }
    }

    fetchBlinkCard();
  }, [linkId]);

  const canPay = !!payload && !!publicKey && !!signTransaction;

  async function onDeposit() {
    if (!payload) throw new Error("Missing link payload");
    if (!publicKey) throw new Error("Connect a wallet");
    if (!signTransaction) throw new Error("Wallet does not support signTransaction");

    setTx(null);
    setGeneratedSecret(null);
    setStatus("Generating secret for this payment…");

    const secretBytes = newPaymentLinkSecret();
    const secret58 = encodeSecretBase58(secretBytes);
    const encryptionService = encryptionServiceFromSecretBytes(secretBytes);

    const lightWasm = await getLightWasm();

    const lamports = Math.floor(Number(amountSol) * LAMPORTS_PER_SOL);
    if (!Number.isFinite(lamports) || lamports <= 0) {
      throw new Error("Invalid amount");
    }

    setStatus("Generating proof + submitting deposit…");
    const res = await deposit({
      lightWasm,
      connection,
      amount_in_lamports: lamports,
      keyBasePath: "/circuit2/transaction2",
      publicKey,
      transactionSigner: async (t: VersionedTransaction) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signed = await (signTransaction as any)(t);
        return signed as VersionedTransaction;
      },
      storage: window.localStorage,
      encryptionService,
    });

    setTx(res.tx);
    setGeneratedSecret(secret58);
    setStatus("Deposit successful! Share the secret below with the recipient.");
  }

  const handleCopy = async () => {
    if (generatedSecret) {
      await navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between py-8 px-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-neon-green">$</span>
          <h1 className="text-3xl font-bold text-black dark:text-white">Pay Request</h1>
        </div>
        <WalletMultiButton style={{ backgroundColor: '#7C3AED', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 500, height: 'auto', minWidth: 0 }} />
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col px-6 pb-36">

        {payload ? (
          <>
            {/* Display Blink Card if available */}
            {blinkCardData && !loadingCard && (
              <div className="mt-6 mb-6">
                <BlinkCard
                  data={{
                    cardTitle: blinkCardData.cardTitle,
                    cardDescription: blinkCardData.cardDescription,
                    cardImageUrl: blinkCardData.cardImageUrl,
                    cardType: blinkCardData.cardType,
                    primaryColor: blinkCardData.primaryColor,
                    secondaryColor: blinkCardData.secondaryColor,
                    textColor: blinkCardData.textColor,
                    requestedAmount: blinkCardData.requestedAmount,
                  }}
                  animate={true}
                />
              </div>
            )}

            {loadingCard && (
              <div className="mt-6 mb-6 bg-gray-100 dark:bg-gray-800 rounded-2xl h-96 flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Show Phantom-style requesting card if no Blink card */}
            {!blinkCardData && !loadingCard && (
              <div className="mt-6 relative rounded-xl bg-linear-to-br from-gray-900 to-black dark:from-black dark:to-gray-950 border border-solana-purple/60 p-6 overflow-hidden shadow-lg shadow-solana-purple/20">
                {/* Solana Logo Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Image
                    src="/solana-sol-logo.svg"
                    alt="Solana Logo"
                    width={150}
                    height={150}
                    className="object-contain"
                  />
                </div>

                {/* Background Blur Effects */}
                <div className="absolute -left-10 top-0 w-40 h-40 bg-solana-purple/40 blur-[60px] rounded-full"></div>
                <div className="absolute -right-10 bottom-0 w-48 h-48 bg-neon-green/30 blur-[70px] rounded-full"></div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  <p className="text-sm text-gray-400 mb-3 font-mono tracking-wide">REQUESTING</p>
                  <div className="flex items-baseline justify-center gap-3">
                    <span className="text-5xl font-bold text-white drop-shadow-[0_0_10px_rgba(19,241,149,0.4)] tracking-tight">{payload.requestedAmount}</span>
                    <span className="text-2xl text-neon-green font-bold tracking-wider drop-shadow-[0_0_8px_rgba(19,241,149,0.5)]">SOL</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-mono">≈ ${(parseFloat(payload.requestedAmount || '0') * 150).toFixed(2)} USD</p>
                  <p className="text-xs text-gray-600 mt-4 font-mono">ID: {payload.linkId.slice(0, 12)}...</p>
                </div>
              </div>
            )}

            <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-bold text-black dark:text-white">Amount to Pay (SOL)</label>
              <input
                type="text"
                inputMode="decimal"
                className="mt-3 w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-green-500 transition-colors"
                value={amountSol}
                onChange={(e) => setAmountSol(e.target.value)}
                placeholder="0.1"
              />
              {/* Amount validation warning */}
              {payload && parseFloat(amountSol) !== parseFloat(payload.requestedAmount) && (
                <div className="mt-3">
                  {parseFloat(amountSol) < parseFloat(payload.requestedAmount) ? (
                    <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                      <span className="text-base">⚠️</span>
                      <span>
                        You're paying <strong>{amountSol} SOL</strong> which is less than the requested amount of <strong>{payload.requestedAmount} SOL</strong>. The recipient might not accept this payment.
                      </span>
                    </div>
                  ) : parseFloat(amountSol) > parseFloat(payload.requestedAmount) ? (
                    <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                      <span className="text-base">ℹ️</span>
                      <span>
                        You're paying <strong>{amountSol} SOL</strong> which is more than the requested amount of <strong>{payload.requestedAmount} SOL</strong>. This will be treated as a tip or overpayment.
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="h-10"></div>

            {/* Fixed Bottom Button */}
            <div className="flex gap-3 fixed z-10 bottom-20 left-0 right-0 max-w-lg mx-auto px-6">
              <button
                className="w-full bg-neon-green hover:bg-green-400 active:bg-green-500 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canPay}
                onClick={() => onDeposit().catch((e) => setStatus(String(e?.message ?? e)))}
              >
                <span>{canPay ? "Make Private Payment" : "Connect Wallet"}</span>
                <span className="text-xl">→</span>
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-2xl p-5">
            <div className="text-sm font-bold text-red-900 dark:text-red-200">Invalid Payment Link</div>
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">
              This payment link is missing required parameters. Please check the link and try again.
            </p>
          </div>
        )}

        {status && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 text-sm text-blue-900 dark:text-blue-200">
            {status}
          </div>
        )}

        {generatedSecret && (
          <div className="mt-6 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🔑</span>
              <div className="font-bold text-purple-900 dark:text-purple-200">Payment Secret Generated</div>
            </div>
            <div className="rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-black p-3">
              <code className="break-all text-xs font-mono text-black dark:text-white">{generatedSecret}</code>
            </div>
            <button
              className="mt-3 w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Secret to Clipboard
                </>
              )}
            </button>
            <div className="mt-3 flex items-start gap-2 text-xs text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3">
              <span className="text-lg">💡</span>
              <span>Share this secret privately with the recipient (via encrypted messaging or in person). They will use it to claim the funds.</span>
            </div>
          </div>
        )}

        {tx && (
          <div className="mt-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 rounded-2xl p-4">
            <div className="text-xs font-bold text-green-900 dark:text-green-200 mb-2">Transaction Signature</div>
            <a
              className="text-sm text-green-600 dark:text-green-400 underline break-all hover:text-green-700 dark:hover:text-green-300"
              href={`https://solscan.io/tx/${tx}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Solscan
            </a>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-yellow-900 dark:text-yellow-200">What happens next?</h3>
          <ol className="mt-2 space-y-1.5 text-xs text-yellow-800 dark:text-yellow-300 list-decimal list-inside">
            <li>Your funds are deposited into a private pool using zero-knowledge proofs</li>
            <li>A unique secret is generated for this payment</li>
            <li>Share the secret with the recipient through a secure channel</li>
            <li>The recipient uses the secret to claim funds to their wallet</li>
          </ol>
        </div>
      </main>
    </motion.div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
