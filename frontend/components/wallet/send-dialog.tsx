'use client';

import { useState } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embeddedWallet: any;
}

export function SendDialog({ open, onOpenChange, embeddedWallet }: SendDialogProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [txIsLoading, setTxIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();

  const onTransfer = async () => {
    if (!embeddedWallet || !recipientAddress || !amount) return;
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: embeddedWallet.address as `0x${string}`,
        chain: mainnet,
        transport: custom(provider),
      });

      setTxIsLoading(true);
      const _txHash = await walletClient.sendTransaction({
        account: embeddedWallet.address as `0x${string}`,
        to: recipientAddress as `0x${string}`,
        value: parseEther(amount),
      });
      setTxHash(_txHash);
      setRecipientAddress('');
      setAmount('0.001');
    } catch (e) {
      console.error('Transfer failed with error', e);
    }
    setTxIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-yellow-400">
            Send Assets
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Send ETH from your embedded wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {txHash ? (
            <div className="space-y-4">
              <div className="p-6 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-lg text-green-400 font-semibold mb-2">
                  Transaction Successful!
                </p>
                <p className="text-xs text-gray-400 break-all font-mono mb-3">
                  {txHash}
                </p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-yellow-400 hover:underline"
                >
                  View on Etherscan →
                </a>
              </div>
              <button
                onClick={() => {
                  setTxHash(undefined);
                  onOpenChange(false);
                }}
                className="w-full py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none transition-all font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none transition-all"
                />
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <p className="text-xs text-gray-400">
                  Double-check the recipient address before sending. Transactions
                  cannot be reversed.
                </p>
              </div>

              <button
                onClick={onTransfer}
                disabled={!recipientAddress || !amount || txIsLoading}
                className="w-full py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              >
                {txIsLoading ? 'Sending...' : `Send ${amount} ETH`}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
