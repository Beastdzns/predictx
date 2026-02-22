"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { deposit, getUtxos, getBalanceFromUtxos } from "privacycash/utils";
import { encryptionServiceFromSecretBytes, getLightWasm } from "@/lib/privacycashClient";
import { newPaymentLinkSecret, encodeSecretBase58, decodeSecretBase58 } from "@/lib/paymentLink";
import { Download, Key, Copy, Check, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DepositPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [activeMode, setActiveMode] = useState<'fund' | 'commit'>('fund');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [secret58, setSecret58] = useState<string>("");
  const [amountSol, setAmountSol] = useState<string>("0.1");
  const [status, setStatus] = useState<string>("");
  const [tx, setTx] = useState<string | null>(null);
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const secretBytes = useMemo(() => {
    if (!secret58) return null;
    try {
      return decodeSecretBase58(secret58);
    } catch {
      return null;
    }
  }, [secret58]);

  const canPay = !!secretBytes && !!publicKey && !!signTransaction;

  async function checkBalance() {
    if (!publicKey) return;
    if (!secretBytes) return;
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.includes("tradeHistory") || key.includes("fetch_offset") || key.includes("encrypted_outputs"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    
    setStatus("Scanning pool for balance…");
    setTx(null);

    const encryptionService = encryptionServiceFromSecretBytes(secretBytes);
    const utxos = await getUtxos({
      publicKey,
      connection,
      encryptionService,
      storage: window.localStorage,
    });

    const bal = getBalanceFromUtxos(utxos);
    setBalanceLamports(bal.lamports);
    setStatus("");
  }

  async function onDeposit() {
    if (!publicKey) return;
    if (!signTransaction) return;
    if (!secretBytes) return;

    setTx(null);
    setStatus("Preparing deposit…");
    
    const encryptionService = encryptionServiceFromSecretBytes(secretBytes);
    const lightWasm = await getLightWasm();

    const lamports = Math.floor(Number(amountSol) * LAMPORTS_PER_SOL);
    if (!Number.isFinite(lamports) || lamports <= 0) {
      setStatus("Invalid amount");
      return;
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
    setStatus("Deposit successful!");
    // Refresh balance
    await checkBalance();
  }

  async function generateNewSecret() {
    const secretBytes = newPaymentLinkSecret();
    const secret58 = encodeSecretBase58(secretBytes);
    setSecret58(secret58);
    setBalanceLamports(null);
    setTx(null);
  }

  const handleCopy = async () => {
    if (secret58) {
      await navigator.clipboard.writeText(secret58);
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
      <div className="flex items-center py-8 px-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-neon-green">$</span>
          <h1 className="text-3xl font-bold text-black dark:text-white">Deposit</h1>
        </div>
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col px-6 pb-36">
        {/* Mode Toggle */}
        <div className="flex flex-col gap-1 pt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
          <p className="text-neon-green font-mono tracking-widest uppercase mb-2 text-xs">
            Deposit Type
          </p>
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => {
                setActiveMode('fund');
                setSecret58('');
                setBalanceLamports(null);
                setTx(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                activeMode === 'fund'
                  ? 'bg-neon-green text-black shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key size={16} />
                <span>Fund Secret</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveMode('commit');
                setSecret58('');
                setBalanceLamports(null);
                setTx(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                activeMode === 'commit'
                  ? 'bg-neon-green text-black shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Download size={16} />
                <span>Commit Funds</span>
              </div>
            </button>
          </div>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-neon-green transition-colors flex items-center justify-center gap-1"
          >
            <Info size={12} />
            <span>How {activeMode === 'fund' ? 'Fund Secret' : 'Commit Funds'} works</span>
          </button>
        </div>

        {/* Fund Secret Mode */}
        {activeMode === 'fund' && (
          <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <label className="text-sm font-bold text-black dark:text-white">Payment Secret</label>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-mono outline-none focus:border-purple-500 transition-colors"
                value={secret58}
                onChange={(e) => {
                  setSecret58(e.target.value.trim());
                  setBalanceLamports(null);
                }}
                placeholder="Paste your payment secret here"
              />
            </div>
            {!secret58 ? null : secretBytes ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <Check size={14} />
                <span>Valid secret format</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-red-500">Invalid secret format</div>
            )}
          </div>
        )}

        {/* Commit Funds Mode */}
        {activeMode === 'commit' && !secret58 && (
          <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <label className="text-sm font-bold text-black dark:text-white">Generate Secret</label>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">First, generate a new payment secret to commit funds to</p>
            <button
              className="mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              onClick={() => generateNewSecret()}
            >
              <Key size={18} />
              <span>Generate Payment Secret</span>
            </button>
          </div>
        )}

        {activeMode === 'commit' && secret58 && secretBytes && (
          <div className="mt-6 flex flex-col items-center gap-6 py-6 border rounded-2xl shadow-sm dark:shadow-gray-900 p-6 border-gray-200 dark:border-gray-700">
            <div className="text-center w-full">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Amount to Commit</p>
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 w-52 mx-auto p-4 gap-3 rounded-2xl">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountSol}
                  onChange={(e) => setAmountSol(e.target.value)}
                  className="text-4xl font-bold tracking-tight text-black dark:text-white bg-transparent border-none outline-none w-32 text-center"
                  placeholder="0.1"
                />
                <span className="text-2xl font-bold text-gray-400">SOL</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">≈ ${(parseFloat(amountSol || '0') * 150).toFixed(2)} USD</p>
            </div>
          </div>
        )}

        {/* Balance Display for Fund Secret */}
        {activeMode === 'fund' && balanceLamports !== null && (
          <div className="mt-6 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-5">
            <div className="text-xs font-bold text-blue-900 dark:text-blue-200">Current Balance</div>
            <div className="mt-2 text-3xl font-bold text-black dark:text-white">
              {(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </div>
            {balanceLamports === 0 && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                No funds in this payment secret yet
              </div>
            )}
          </div>
        )}

        {/* Add Funds Section for Fund Secret */}
        {activeMode === 'fund' && secretBytes && balanceLamports !== null && (
          <div className="mt-6 flex flex-col items-center gap-6 py-6 border rounded-2xl shadow-sm dark:shadow-gray-900 p-6 border-gray-200 dark:border-gray-700">
            <div className="text-center w-full">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Amount to Add</p>
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 w-52 mx-auto p-4 gap-3 rounded-2xl">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountSol}
                  onChange={(e) => setAmountSol(e.target.value)}
                  className="text-4xl font-bold tracking-tight text-black dark:text-white bg-transparent border-none outline-none w-32 text-center"
                  placeholder="0.1"
                />
                <span className="text-2xl font-bold text-gray-400">SOL</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">≈ ${(parseFloat(amountSol || '0') * 150).toFixed(2)} USD</p>
            </div>
          </div>
        )}

        <div className="h-10"></div>

        {/* Fixed Bottom Buttons */}
        {activeMode === 'fund' && secretBytes && balanceLamports === null && (
          <div className="flex gap-3 fixed z-10 bottom-20 left-0 right-0 max-w-lg mx-auto px-6">
            <button
              className="w-full bg-neon-green hover:bg-green-400 active:bg-green-500 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!publicKey}
              onClick={() => checkBalance().catch((e) => setStatus(String(e?.message ?? e)))}
            >
              <span>{publicKey ? "Check Balance" : "Connect Wallet"}</span>
              <span className="text-xl">→</span>
            </button>
          </div>
        )}

        {activeMode === 'fund' && secretBytes && balanceLamports !== null && (
          <div className="flex gap-3 fixed z-10 bottom-20 left-0 right-0 max-w-lg mx-auto px-6">
            <button
              className="w-full bg-neon-green hover:bg-green-400 active:bg-green-500 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canPay}
              onClick={() => onDeposit().catch((e) => setStatus(String(e?.message ?? e)))}
            >
              <span>{canPay ? "Add Funds to Secret" : "Connect Wallet"}</span>
              <span className="text-xl">→</span>
            </button>
          </div>
        )}

        {activeMode === 'commit' && secret58 && secretBytes && (
          <div className="flex gap-3 fixed z-10 bottom-20 left-0 right-0 max-w-lg mx-auto px-6">
            <button
              className="w-full bg-neon-green hover:bg-green-400 active:bg-green-500 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!publicKey || !signTransaction}
              onClick={() => onDeposit().catch((e) => setStatus(String(e?.message ?? e)))}
            >
              <span>{publicKey ? "Commit Funds" : "Connect Wallet"}</span>
              <span className="text-xl">→</span>
            </button>
          </div>
        )}

        {status && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 text-sm text-blue-900 dark:text-blue-200">
            {status}
          </div>
        )}

        {secret58 && secretBytes && tx && (
          <div className="mt-6 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key size={20} className="text-purple-600 dark:text-purple-400" />
              <div className="font-bold text-purple-900 dark:text-purple-200">
                {activeMode === 'commit' ? 'Generated Payment Secret' : 'Your Payment Secret'}
              </div>
            </div>
            <div className="rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-black p-3">
              <code className="break-all text-xs font-mono text-black dark:text-white">{secret58}</code>
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
            <div className="mt-3 flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3">
              <span className="text-lg">⚠️</span>
              <span>
                {activeMode === 'commit' 
                  ? 'Share this secret privately with the recipient (via encrypted messaging or in person). They will use it to claim the funds.'
                  : 'Anyone with this secret can claim the funds. Share it only with the intended recipient.'}
              </span>
            </div>
          </div>
        )}
        
        {tx && (
          <div className="mt-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 rounded-2xl p-4">
            <div className="text-xs font-bold text-green-900 dark:text-green-200 mb-2">Transaction</div>
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
      </main>

      {/* How it works dialog */}
      <AnimatePresence>
        {showHowItWorks && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHowItWorks(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            {/* Dialog */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto hide-scrollbar"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-lg text-black dark:text-white">How {activeMode === 'fund' ? 'Fund Secret' : 'Commit Funds'} Works</h3>
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 pb-20">
                {activeMode === 'fund' ? (
                  // Fund Secret content
                  <>
                    <div className="bg-neon-green/10 dark:bg-neon-green/20 border border-neon-green/30 rounded-2xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={16} className="text-neon-green" />
                        <span className="font-bold text-black dark:text-white">Add funds to existing secret</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        If you already have a payment secret or received one, you can add more funds to it using zero-knowledge proofs.
                      </p>
                    </div>

                    <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          1
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Paste or Generate Secret</p>
                          <p className="text-xs">Enter an existing payment secret or generate a new one.</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Check Balance (Optional)</p>
                          <p className="text-xs">View the current balance associated with this secret from the private pool.</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          3
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Add Funds</p>
                          <p className="text-xs">Specify the amount and deposit SOL. Your wallet address stays completely private.</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          4
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Share Secret</p>
                          <p className="text-xs">Keep the secret safe or share it with the intended recipient to let them claim the funds.</p>
                        </div>
                      </li>
                    </ul>

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span className="text-neon-green">🔒</span>
                        <span>Your transaction is shielded using zero-knowledge proofs. No one can trace the funds back to your wallet.</span>
                      </p>
                    </div>
                  </>
                ) : (
                  // Commit Funds content
                  <>
                    <div className="bg-neon-green/10 dark:bg-neon-green/20 border border-neon-green/30 rounded-2xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Download size={16} className="text-neon-green" />
                        <span className="font-bold text-black dark:text-white">Commit funds to a new secret</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Generate a new payment secret, commit funds to it, and share the secret privately with the recipient.
                      </p>
                    </div>

                    <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          1
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Specify Amount</p>
                          <p className="text-xs">Enter the amount of SOL you want to commit to the recipient.</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Commit Funds</p>
                          <p className="text-xs">A new payment secret is automatically generated, and your funds are deposited privately using zero-knowledge proofs.</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          3
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Share Secret Privately</p>
                          <p className="text-xs">Copy the generated secret and share it with the recipient through a secure channel (encrypted messaging, in person, etc.).</p>
                        </div>
                      </li>
                      
                      <li className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xs font-bold">
                          4
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white mb-1">Recipient Claims</p>
                          <p className="text-xs">The recipient uses the secret on the Claim page to withdraw the funds to their wallet.</p>
                        </div>
                      </li>
                    </ul>

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span className="text-neon-green">🔒</span>
                        <span>Your identity and the recipient's identity remain completely private. Only the person with the secret can claim the funds.</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
