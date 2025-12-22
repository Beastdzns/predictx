'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther } from 'viem';
import { mainnet } from 'viem/chains';

export default function LoadAssetsPage() {
  const { connectWallet } = usePrivy();
  const { wallets } = useWallets();
  
  const embeddedWallet = wallets.find(
    (wallet) => (wallet as any).walletClientType === 'privy'
  );
  const externalWallet = wallets.find(
    (wallet) => (wallet as any).walletClientType !== 'privy'
  );

  const [txIsLoading, setTxIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();

  const onTransfer = async () => {
    if (!externalWallet || !embeddedWallet) return;
    try {
      const provider = await externalWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: externalWallet.address as `0x${string}`,
        chain: mainnet,
        transport: custom(provider),
      });

      setTxIsLoading(true);
      const _txHash = await walletClient.sendTransaction({
        account: externalWallet.address as `0x${string}`,
        to: embeddedWallet.address as `0x${string}`,
        value: parseEther('0.005'),
      });
      setTxHash(_txHash);
    } catch (e) {
      console.error('Transfer failed with error', e);
    }
    setTxIsLoading(false);
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">
          Load Assets
        </h1>

        {/* Instructions */}
        <section className="mt-6">
          <p className="text-md font-bold uppercase text-gray-400 mb-2">
            Fund Your Embedded Wallet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            First, connect an external wallet to send assets to your embedded wallet.
            We recommend MetaMask or any WalletConnect-compatible wallet.
          </p>
          
          <button
            onClick={connectWallet}
            className="w-full rounded-md bg-yellow-400 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 transition-all"
          >
            {externalWallet ? 'External Wallet Connected ✓' : 'Connect External Wallet'}
          </button>

          {externalWallet && (
            <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-sm text-gray-400 mb-1">External Wallet Address</p>
              <p className="text-yellow-400 font-mono text-xs break-all">
                {externalWallet.address}
              </p>
            </div>
          )}
        </section>

        {/* Transfer Section */}
        {externalWallet && embeddedWallet && (
          <section className="mt-8">
            <p className="text-md font-bold uppercase text-gray-400 mb-2">
              Transfer Assets
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Click the button below to transfer 0.005 ETH from your external wallet
              to your embedded wallet.
            </p>

            <div className="mb-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-sm text-gray-400 mb-1">Embedded Wallet Address</p>
              <p className="text-yellow-400 font-mono text-xs break-all">
                {embeddedWallet.address}
              </p>
            </div>

            <button
              onClick={onTransfer}
              disabled={txIsLoading}
              className="w-full rounded-md bg-yellow-400 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
            >
              {txIsLoading ? 'Transferring...' : 'Transfer 0.005 ETH'}
            </button>

            {txHash && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 mb-1">Transfer successful!</p>
                <p className="text-xs text-gray-400 mb-2">Transaction Hash:</p>
                <p className="text-xs text-gray-400 break-all font-mono">{txHash}</p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-yellow-400 hover:underline mt-2 inline-block"
                >
                  View on Etherscan →
                </a>
              </div>
            )}
          </section>
        )}

        {/* Wallet Status */}
        <section className="mt-8">
          <p className="text-md font-bold uppercase text-gray-400 mb-2">
            Wallet Status
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-sm text-gray-400 mb-1">Embedded Wallet</p>
              <p className="text-yellow-400 font-semibold">
                {embeddedWallet ? 'Connected ✓' : 'Not Found'}
              </p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-sm text-gray-400 mb-1">External Wallet</p>
              <p className="text-yellow-400 font-semibold">
                {externalWallet ? 'Connected ✓' : 'Not Connected'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
