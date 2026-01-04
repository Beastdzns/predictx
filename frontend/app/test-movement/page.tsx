'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { movementBedrockConfig, x402Config } from '@/lib/movement-bedrock-config';
import { x402 } from '@/lib/x402-fetch';

// Type for app-owned wallet stored in localStorage
interface AppOwnedWallet {
  walletId: string;
  address: string;
  publicKey: string;
}

export default function TestMovementPage() {
  const { user, ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  
  // Find Aptos wallet from user's linked accounts (user-owned)
  const aptosAccount = user?.linkedAccounts?.find(
    (account) => {
      const acc = account as unknown as Record<string, unknown>;
      return acc.type === 'aptos_wallet' || acc.chainType === 'aptos';
    }
  ) as unknown as { 
    address?: string;
    walletId?: string;
    publicKey?: string;
    id?: string;
    public_key?: string;
    wallet_id?: string;
  } | undefined;
  
  // Also check wallets array for any Aptos-like wallet
  const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
  
  // App-owned wallet (server-controlled, for x402 payments)
  const [appWallet, setAppWallet] = useState<AppOwnedWallet | null>(null);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [balance, setBalance] = useState<string | null>(null);
  const [appWalletBalance, setAppWalletBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [creatingAppWallet, setCreatingAppWallet] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [testRecipient, setTestRecipient] = useState(x402Config.recipientAddress);
  const [testAmount, setTestAmount] = useState('100000'); // 0.001 MOVE
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Load app-owned wallet from localStorage
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`appWallet_${user.id}`);
      if (stored) {
        try {
          setAppWallet(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored wallet:', e);
        }
      }
    }
  }, [user?.id]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Create user-owned Aptos wallet (via Privy client-side)
  const handleCreateAptosWallet = async () => {
    setCreatingWallet(true);
    addLog('🔄 Creating user-owned Aptos wallet...');
    
    try {
      const result = await createWallet({ chainType: 'aptos' });
      addLog('✅ User wallet created successfully!');
      addLog(`   Address: ${result.wallet.address}`);
      addLog('   ⚠️ Note: User wallets cannot be signed server-side');
      addLog('   Refresh the page to see updated wallet info.');
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      addLog(`❌ Failed to create wallet: ${error}`);
    }
    
    setCreatingWallet(false);
  };

  // Create app-owned wallet (server-side, for x402 payments)
  const handleCreateAppWallet = async () => {
    if (!user?.id) {
      addLog('❌ Must be logged in to create app wallet');
      return;
    }

    setCreatingAppWallet(true);
    addLog('🔄 Creating app-owned wallet (server-controlled)...');
    
    try {
      const response = await fetch('/api/movement/sign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create wallet');
      }
      
      const wallet: AppOwnedWallet = {
        walletId: result.walletId,
        address: result.address,
        publicKey: result.publicKey,
      };
      
      // Store in localStorage
      localStorage.setItem(`appWallet_${user.id}`, JSON.stringify(wallet));
      setAppWallet(wallet);
      
      addLog('✅ App-owned wallet created!');
      addLog(`   Address: ${wallet.address}`);
      addLog(`   Wallet ID: ${wallet.walletId}`);
      addLog('   ✅ This wallet CAN be signed server-side for x402 payments');
      addLog('   💡 Fund this wallet with testnet MOVE to test payments');
      
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      addLog(`❌ Failed to create app wallet: ${error}`);
    }
    
    setCreatingAppWallet(false);
  };

  // Test payment using app-owned wallet
  const handleTestPayment = async () => {
    if (!appWallet) {
      addLog('❌ No app-owned wallet found. Create one first!');
      return;
    }

    setSendingPayment(true);
    addLog('=== STARTING TEST PAYMENT (App-Owned Wallet) ===');
    addLog(`From: ${appWallet.address}`);
    addLog(`To: ${testRecipient}`);
    addLog(`Amount: ${testAmount} octas (${(parseInt(testAmount) / 1e8).toFixed(8)} MOVE)`);
    addLog(`🔐 Wallet ID: ${appWallet.walletId}`);
    addLog(`🔑 Public Key: ${appWallet.publicKey.slice(0, 20)}...`);

    try {
      // Call backend API to sign and submit
      addLog('📡 Calling backend API for signing...');
      const response = await fetch('/api/movement/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderAddress: appWallet.address,
          recipientAddress: testRecipient,
          amountOctas: testAmount,
          walletId: appWallet.walletId,
          publicKey: appWallet.publicKey,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        addLog(`❌ API Error: ${result.error || response.statusText}`);
        if (result.stack) {
          console.error('Stack trace:', result.stack);
        }
        setSendingPayment(false);
        return;
      }

      addLog(`✅ Transaction successful!`);
      addLog(`📝 TX Hash: ${result.txHash}`);
      setLastTxHash(result.txHash);
      
      // Refresh balance
      setTimeout(() => handleCheckAppWalletBalance(), 2000);

    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      addLog(`❌ Payment failed: ${error}`);
      console.error('Payment error:', e);
    }

    setSendingPayment(false);
  };

  // Debug: Show all wallet info
  const handleDebugWallets = () => {
    addLog('=== DEBUG WALLET INFO ===');
    addLog(`User ID: ${user?.id || 'N/A'}`);
    addLog(`Linked Accounts: ${user?.linkedAccounts?.length || 0}`);
    
    user?.linkedAccounts?.forEach((account, i) => {
      addLog(`  [${i}] Type: ${account.type}`);
      addLog(`      Full: ${JSON.stringify(account)}`);
    });
    
    addLog(`Wallets from useWallets(): ${wallets.length}`);
    wallets.forEach((wallet, i) => {
      const w = wallet as unknown as Record<string, unknown>;
      addLog(`  [${i}] Type: ${wallet.walletClientType}, Chain: ${w.chainType || 'unknown'}`);
      addLog(`      Address: ${wallet.address}`);
    });
    
    if (aptosAccount) {
      addLog(`✅ Found user-owned Aptos wallet`);
      addLog(`   Address: ${aptosAccount.address || 'N/A'}`);
    }
    
    if (appWallet) {
      addLog(`✅ Found app-owned wallet (for x402)`);
      addLog(`   Address: ${appWallet.address}`);
      addLog(`   WalletId: ${appWallet.walletId}`);
    }
    
    if (!aptosAccount && !appWallet) {
      addLog(`❌ No wallets found`);
      addLog(`💡 Create an app-owned wallet for x402 payments!`);
    }
  };

  // Check balance for user wallet
  const handleCheckBalance = async () => {
    const walletAddress = aptosAccount?.address || privyWallet?.address;
    if (!walletAddress) {
      addLog('❌ No user wallet address found');
      return;
    }
    
    setBalanceLoading(true);
    addLog(`📊 Checking user wallet balance for ${walletAddress.slice(0, 10)}...`);
    
    try {
      const response = await fetch(
        `${movementBedrockConfig.rpcUrl}/accounts/${walletAddress}/resources`
      );
      
      if (!response.ok) {
        addLog(`❌ RPC Error: ${response.status} ${response.statusText}`);
        setBalanceLoading(false);
        return;
      }
      
      const resources = await response.json();
      const coinResource = resources.find(
        (r: { type: string }) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      
      if (coinResource) {
        const balanceOctas = BigInt(coinResource.data.coin.value);
        const balanceMove = (Number(balanceOctas) / 1e8).toFixed(8);
        setBalance(balanceMove);
        addLog(`✅ User wallet balance: ${balanceMove} MOVE`);
      } else {
        addLog(`⚠️ No coin resource found - account may not be funded`);
        setBalance('0');
      }
    } catch (e) {
      addLog(`❌ Error: ${e}`);
    }
    setBalanceLoading(false);
  };

  // Check balance for app-owned wallet
  const handleCheckAppWalletBalance = async () => {
    if (!appWallet) {
      addLog('❌ No app-owned wallet found');
      return;
    }
    
    addLog(`📊 Checking app wallet balance for ${appWallet.address.slice(0, 10)}...`);
    
    try {
      const response = await fetch(
        `${movementBedrockConfig.rpcUrl}/accounts/${appWallet.address}/resources`
      );
      
      if (!response.ok) {
        addLog(`❌ RPC Error: ${response.status} ${response.statusText}`);
        return;
      }
      
      const resources = await response.json();
      const coinResource = resources.find(
        (r: { type: string }) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      
      if (coinResource) {
        const balanceOctas = BigInt(coinResource.data.coin.value);
        const balanceMove = (Number(balanceOctas) / 1e8).toFixed(8);
        setAppWalletBalance(balanceMove);
        addLog(`✅ App wallet balance: ${balanceMove} MOVE`);
      } else {
        addLog(`⚠️ App wallet not funded yet`);
        setAppWalletBalance('0');
      }
    } catch (e) {
      addLog(`❌ Error: ${e}`);
    }
  };

  const address = aptosAccount?.address || privyWallet?.address;
  const hasUserWallet = !!aptosAccount;
  const hasAppWallet = !!appWallet;

  return (
    <AuthenticatedLayout>
      <div className="px-6 pb-24 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">🧪 Movement Integration Test</h1>
        <p className="text-gray-400 text-sm mb-6">
          Test the Privy + Movement chain integration for x402 payments
        </p>

        {/* Status Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Connection Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Privy Ready:</span>
              <span className={ready ? 'text-green-400' : 'text-red-400'}>
                {ready ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Authenticated:</span>
              <span className={authenticated ? 'text-green-400' : 'text-red-400'}>
                {authenticated ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Aptos/Movement Wallet:</span>
              <span className={aptosAccount ? 'text-green-400' : 'text-yellow-400'}>
                {aptosAccount ? '✅ Found' : '⚠️ Not Created'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono text-xs">
                {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance:</span>
              <span className="text-yellow-400">
                {balance ? `${balance} MOVE` : 'Not checked'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">App-Owned Wallet:</span>
              <span className={appWallet ? 'text-green-400' : 'text-yellow-400'}>
                {appWallet ? '✅ Ready for x402' : '⚠️ Not Created'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-blue-400">{movementBedrockConfig.name}</span>
            </div>
          </div>
        </div>

        {/* Create Wallet Section */}
        {!aptosAccount && (
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Aptos Wallet Required</h2>
            <p className="text-gray-300 text-sm mb-4">
              You need to create an Aptos wallet to use Movement chain features.
              This will create an embedded wallet managed by Privy.
            </p>
            <button
              onClick={handleCreateAptosWallet}
              disabled={creatingWallet}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-700 text-black rounded-lg p-3 font-bold transition-all"
            >
              {creatingWallet ? '⏳ Creating Wallet...' : '🔐 Create Aptos Wallet'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Wallet Actions</h2>
          
          <button
            onClick={handleDebugWallets}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-3 mb-3 font-medium transition-all"
          >
            🔍 Debug: Show All Wallet Info
          </button>

          <button
            onClick={handleCheckBalance}
            disabled={!hasUserWallet || balanceLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded-lg p-3 mb-3 font-medium transition-all"
          >
            {balanceLoading ? '⏳ Checking...' : '📊 Check User Wallet Balance'}
          </button>
        </div>

        {/* App-Owned Wallet Section (for x402 payments) */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-400 mb-2">🔐 App-Owned Wallet (for x402)</h2>
          <p className="text-gray-300 text-sm mb-3">
            App-owned wallets can be signed server-side for automatic x402 micropayments.
          </p>
          
          {appWallet ? (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Address:</span>
                <span className="text-white font-mono text-xs">
                  {appWallet.address.slice(0, 8)}...{appWallet.address.slice(-6)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wallet ID:</span>
                <span className="text-white font-mono text-xs">{appWallet.walletId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Balance:</span>
                <span className="text-yellow-400">
                  {appWalletBalance ? `${appWalletBalance} MOVE` : 'Not checked'}
                </span>
              </div>
              <button
                onClick={handleCheckAppWalletBalance}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 text-sm font-medium transition-all mt-2"
              >
                📊 Check App Wallet Balance
              </button>
              <div className="bg-zinc-800 p-2 rounded-lg mt-2">
                <p className="text-xs text-gray-400">💡 Fund this address with testnet MOVE:</p>
                <code className="text-xs text-yellow-400 break-all">{appWallet.address}</code>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateAppWallet}
              disabled={creatingAppWallet}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white rounded-lg p-3 font-bold transition-all"
            >
              {creatingAppWallet ? '⏳ Creating...' : '🔐 Create App-Owned Wallet'}
            </button>
          )}
        </div>

        {/* Payment Test Section */}
        {hasAppWallet && (
          <div className="bg-green-900/30 border border-green-500 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-green-400 mb-3">💸 Test x402 Payment</h2>
            <p className="text-gray-300 text-sm mb-4">
              Send a test payment using the app-owned wallet (server-side signing).
            </p>
            
            <div className="mb-3">
              <label className="text-gray-400 text-xs block mb-1">Recipient (Treasury):</label>
              <input
                type="text"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono"
              />
            </div>
            
            <div className="mb-3">
              <label className="text-gray-400 text-xs block mb-1">Amount (octas):</label>
              <input
                type="text"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="100000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <span className="text-gray-500 text-xs">
                = {(parseInt(testAmount || '0') / 1e8).toFixed(8)} MOVE
              </span>
            </div>
            
            <button
              onClick={handleTestPayment}
              disabled={sendingPayment || !appWalletBalance || appWalletBalance === '0'}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 text-black rounded-lg p-3 font-bold transition-all"
            >
              {sendingPayment ? '⏳ Sending Payment...' : '💳 Send Test Payment'}
            </button>
            
            {(!appWalletBalance || appWalletBalance === '0') && (
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ Fund the app wallet first before testing payments
              </p>
            )}
            
            {lastTxHash && (
              <div className="mt-3 p-2 bg-zinc-800 rounded-lg">
                <p className="text-xs text-gray-400">Last TX:</p>
                <a 
                  href={`${movementBedrockConfig.blockExplorer}?txn=${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline break-all"
                >
                  {lastTxHash}
                </a>
              </div>
            )}
          </div>
        )}

        {/* x402 Protocol Test Section */}
        {hasAppWallet && (
          <div className="bg-purple-900/30 border border-purple-500 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-purple-400 mb-3">🔮 Test x402 Protocol Flow</h2>
            <p className="text-gray-300 text-sm mb-4">
              This tests the <strong>real x402 flow</strong>: 402 response → payment → X-PAYMENT header → content
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  addLog('=== x402 PROTOCOL TEST: Market Data ===');
                  addLog('📡 Requesting /api/x402/content/market_data/TEST-001...');
                  const result = await x402.getMarketData('TEST-001');
                  if (result.success) {
                    addLog('✅ Content received!');
                    addLog(`   Paid: ${result.paid ? 'Yes' : 'No (cached)'}`);
                    if (result.tx_hash) addLog(`   TX: ${result.tx_hash.slice(0, 20)}...`);
                    addLog(`   Data: ${JSON.stringify(result.data).slice(0, 100)}...`);
                    if (result.tx_hash) setLastTxHash(result.tx_hash);
                  } else {
                    addLog(`❌ Failed: ${result.error}`);
                  }
                }}
                disabled={!appWalletBalance || appWalletBalance === '0'}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white rounded-lg p-2 text-sm font-medium transition-all"
              >
                📊 Market Data
              </button>
              
              <button
                onClick={async () => {
                  addLog('=== x402 PROTOCOL TEST: Chart ===');
                  addLog('📡 Requesting /api/x402/content/chart/TEST-001...');
                  const result = await x402.getChartData('TEST-001');
                  if (result.success) {
                    addLog('✅ Chart data received!');
                    addLog(`   Paid: ${result.paid ? 'Yes' : 'No (cached)'}`);
                    if (result.tx_hash) addLog(`   TX: ${result.tx_hash.slice(0, 20)}...`);
                    if (result.tx_hash) setLastTxHash(result.tx_hash);
                  } else {
                    addLog(`❌ Failed: ${result.error}`);
                  }
                }}
                disabled={!appWalletBalance || appWalletBalance === '0'}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white rounded-lg p-2 text-sm font-medium transition-all"
              >
                📈 Chart
              </button>
              
              <button
                onClick={async () => {
                  addLog('=== x402 PROTOCOL TEST: Sentiment ===');
                  addLog('📡 Requesting /api/x402/content/sentiment/TEST-001...');
                  const result = await x402.getSentiment('TEST-001');
                  if (result.success) {
                    addLog('✅ Sentiment received!');
                    addLog(`   Paid: ${result.paid ? 'Yes' : 'No (cached)'}`);
                    if (result.tx_hash) addLog(`   TX: ${result.tx_hash.slice(0, 20)}...`);
                    if (result.tx_hash) setLastTxHash(result.tx_hash);
                  } else {
                    addLog(`❌ Failed: ${result.error}`);
                  }
                }}
                disabled={!appWalletBalance || appWalletBalance === '0'}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white rounded-lg p-2 text-sm font-medium transition-all"
              >
                🧠 Sentiment
              </button>
              
              <button
                onClick={async () => {
                  addLog('=== x402 PROTOCOL TEST: Orderbook ===');
                  addLog('📡 Requesting /api/x402/content/orderbook/TEST-001...');
                  const result = await x402.getOrderbook('TEST-001');
                  if (result.success) {
                    addLog('✅ Orderbook received!');
                    addLog(`   Paid: ${result.paid ? 'Yes' : 'No (cached)'}`);
                    if (result.tx_hash) addLog(`   TX: ${result.tx_hash.slice(0, 20)}...`);
                    if (result.tx_hash) setLastTxHash(result.tx_hash);
                  } else {
                    addLog(`❌ Failed: ${result.error}`);
                  }
                }}
                disabled={!appWalletBalance || appWalletBalance === '0'}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white rounded-lg p-2 text-sm font-medium transition-all"
              >
                📖 Orderbook
              </button>
            </div>
            
            <div className="mt-3 p-2 bg-zinc-800 rounded-lg">
              <p className="text-xs text-gray-400">
                💡 Each button triggers the full x402 flow:
              </p>
              <ol className="text-xs text-gray-500 ml-4 mt-1 list-decimal">
                <li>Request content → Server returns <code className="text-yellow-400">402</code></li>
                <li>Frontend sends payment via app wallet</li>
                <li>Retry with <code className="text-yellow-400">X-PAYMENT</code> header</li>
                <li>Server verifies on-chain → Returns content</li>
              </ol>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">User Linked Accounts</h2>
          <div className="bg-zinc-950 rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-gray-300">
              {JSON.stringify(user?.linkedAccounts?.map(a => ({
                type: a.type,
                ...('address' in a ? { address: (a as { address: string }).address } : {}),
                ...('email' in a ? { email: (a as { email: string }).email } : {}),
              })), null, 2) || 'No linked accounts'}
            </pre>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black border border-zinc-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-white">Console Logs</h2>
            <button
              onClick={() => setLogs([])}
              className="text-gray-400 hover:text-white text-xs"
            >
              Clear
            </button>
          </div>
          <div className="bg-zinc-950 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <span className="text-gray-500">Click &quot;Check MOVE Balance&quot; to verify your funds.</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-green-400 mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
