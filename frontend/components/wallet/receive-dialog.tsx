'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embeddedWalletAddress: string | undefined;
}

export function ReceiveDialog({
  open,
  onOpenChange,
  embeddedWalletAddress,
}: ReceiveDialogProps) {
  const { connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'external'>('qr');
  const [txIsLoading, setTxIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [transferAmount, setTransferAmount] = useState('0.005');
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>('');

  const embeddedWallet = wallets.find(
    (wallet) => (wallet as any).walletClientType === 'privy'
  );
  const externalWallets = wallets.filter(
    (wallet) => (wallet as any).walletClientType !== 'privy'
  );

  // Set initial selected wallet when external wallets change
  useEffect(() => {
    if (externalWallets.length > 0 && !selectedWalletAddress) {
      setSelectedWalletAddress(externalWallets[0].address);
    }
  }, [externalWallets, selectedWalletAddress]);

  const copyToClipboard = () => {
    if (embeddedWalletAddress) {
      navigator.clipboard.writeText(embeddedWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectWallet = async () => {
    // Close dialog for Privy interaction
    onOpenChange(false);
    await connectWallet();
    // Don't reopen - user can manually open it again
  };

  const onTransfer = async () => {
    if (!embeddedWallet || !selectedWalletAddress || !transferAmount) return;
    
    const selectedWallet = externalWallets.find(
      (w) => w.address === selectedWalletAddress
    );
    if (!selectedWallet) return;

    try {
      const provider = await selectedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: selectedWallet.address as `0x${string}`,
        chain: mainnet,
        transport: custom(provider),
      });

      setTxIsLoading(true);
      const _txHash = await walletClient.sendTransaction({
        account: selectedWallet.address as `0x${string}`,
        to: embeddedWallet.address as `0x${string}`,
        value: parseEther(transferAmount),
      });
      setTxHash(_txHash);
    } catch (e) {
      console.error('Transfer failed with error', e);
    }
    setTxIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-bold text-yellow-400">
            Receive Assets
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Receive crypto to your embedded wallet
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'qr'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'external'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            External Wallet
          </button>
        </div>

        {/* QR Code Tab */}
        {activeTab === 'qr' && embeddedWalletAddress && (
          <div className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div className="flex justify-center p-6 bg-white rounded-lg">
              <QRCodeSVG value={embeddedWalletAddress} size={200} />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Your Wallet Address</p>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-zinc-900 rounded-lg border border-zinc-800 font-mono text-xs break-all">
                  {embeddedWalletAddress}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-4 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-all"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <p className="text-xs text-gray-400">
                Scan this QR code with your mobile wallet to send assets to your
                embedded wallet.
              </p>
            </div>
          </div>
        )}

        {/* External Wallet Tab */}
        {activeTab === 'external' && (
          <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1">
            {/* Connected Wallets List */}
            {externalWallets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Connected Wallets</p>
                  <button
                    onClick={handleConnectWallet}
                    className="text-xs text-yellow-400 hover:underline"
                  >
                    + Add Wallet
                  </button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                  {externalWallets.map((wallet) => (
                    <div
                      key={wallet.address}
                      onClick={() => setSelectedWalletAddress(wallet.address)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedWalletAddress === wallet.address
                          ? 'bg-yellow-400/10 border-yellow-400'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">
                            Wallet {externalWallets.indexOf(wallet) + 1}
                          </p>
                          <p className="text-yellow-400 font-mono text-xs truncate">
                            {wallet.address}
                          </p>
                        </div>
                        {selectedWalletAddress === wallet.address && (
                          <div className="ml-2 text-yellow-400">✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add First Wallet */}
            {externalWallets.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Connect an external wallet to transfer funds to your embedded wallet.
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="w-full py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-all"
                >
                  Connect External Wallet
                </button>
              </div>
            )}

            {/* Transfer Section */}
            {externalWallets.length > 0 && !txHash && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p className="text-xs text-gray-400 mb-1">Embedded Wallet</p>
                  <p className="text-yellow-400 font-mono text-xs break-all">
                    {embeddedWalletAddress}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Transfer Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.005"
                    className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={onTransfer}
                  disabled={txIsLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                  className="w-full py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
                >
                  {txIsLoading ? 'Transferring...' : `Transfer ${transferAmount} ETH`}
                </button>
              </div>
            )}

            {/* Success Message */}
            {txHash && (
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400 mb-1">Transfer successful!</p>
                  <p className="text-xs text-gray-400 break-all font-mono mb-2">
                    {txHash}
                  </p>
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-yellow-400 hover:underline"
                  >
                    View on Etherscan →
                  </a>
                </div>
                <button
                  onClick={() => {
                    setTxHash(undefined);
                    setTransferAmount('0.005');
                  }}
                  className="w-full py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-all"
                >
                  Send Another Transfer
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
