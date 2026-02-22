# x402 Payment Integration Guide

This Next.js frontend now supports **x402 payment rails** with **Privy embedded wallets** on **Monad Testnet**.

## 🎯 Features

- ✅ Pay-to-unlock premium features with native MON tokens
- ✅ Privy embedded wallets (no seed phrase exposure)
- ✅ Monad Testnet integration (EVM-compatible)
- ✅ Server-side transaction signing via Privy Node SDK
- ✅ Real on-chain transaction verification

## 🔐 Unlock Points

All the following features now require on-chain payment:

### Market Features
- **Market Data Access** - `0.001 MON` - Real-time market data
- **Charts Access** - `0.002 MON` - Historical price charts
- **Sentiment Analysis** - `0.003 MON` - AI-powered insights
- **Order Book** - `0.0015 MON` - Real-time order data
- **Trade Calculator** - `0.001 MON` - Profit calculations
- **Recent Activity** - `0.0015 MON` - Trade history

### Social Features
- **View Feed** - `0.002 MON` - Access community posts (24h)
- **Create Post** - `0.005 MON` - Post to community (24h)
- **Post Comment** - `0.001 MON` - Comment on posts (24h)

## ⚙️ Configuration

### 1. Environment Variables

Create/update `.env.local`:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# x402 Backend
NEXT_PUBLIC_X402_API_URL=http://localhost:8990

# Treasury Address (your x402 recipient)
NEXT_PUBLIC_X402_RECIPIENT=0xYourTreasuryAddress
```

**Important**: Get your `PRIVY_APP_SECRET` from the [Privy Dashboard](https://dashboard.privy.io/) under Settings > API Keys.

### 2. Privy Setup

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Create a new app or use existing
3. Copy your App ID and App Secret to `.env.local`
4. Privy automatically supports Monad via wagmi chains
5. The app uses EVM embedded wallets with `monadTestnet` as default chain

### 3. Monad Testnet

- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Chain ID**: `10143`
- **Explorer**: `https://testnet.monadexplorer.com`
- **Faucet**: Get testnet MON from Monad faucet

## 🔧 Technical Architecture

### Payment Flow

```
1. User clicks "Unlock" → Confirmation dialog with price
2. Privy wallet sends MON transaction on Monad Testnet
3. Wait for transaction confirmation (1 block)
4. Access granted locally via Zustand store
5. Transaction hash logged for verification
```

### Files Created/Modified

#### New Files
- `lib/monad-config.ts` - Monad Testnet & x402 configuration
- `lib/x402-evm-payment.ts` - Payment utilities (sendUnlockPayment, payAndUnlock, etc.)
- `lib/privy-monad-signing.ts` - Privy wallet signing for Monad
- `lib/use-wallet-sync.ts` - Hook to sync Privy wallet with access store

#### Modified Files
- `app/providers.tsx` - Added Monad Testnet to Privy config, wallet sync
- `lib/store-access.ts` - Converted to async payment flow with real transactions
- `.env.local` - Added treasury address and API URL

### Key Functions

#### `sendMonPayment(provider, senderAddress, recipientAddress, amountWei)`
Sends MON tokens using Privy embedded wallet provider (viem).

#### `waitForMonTransaction(txHash, timeout)`
Waits for transaction to be mined on Monad.

#### `useWalletSync()`
React hook that syncs Privy wallet to access control store.

#### Store Methods (now async)
- `requestChartAccess(marketId)` - Sends payment, unlocks charts
- `requestSentimentAccess(marketId)` - Sends payment, unlocks sentiment
- `requestSocialViewAccess()` - Sends payment, unlocks feed (24h)
- etc.

## 🚀 Usage Example

```tsx
import { useAccessControlStore } from '@/lib/store-access';
import { useWallets } from '@privy-io/react-auth';

function MyComponent({ marketId }: { marketId: string }) {
  const { wallets } = useWallets();
  const { hasChartAccess, requestChartAccess } = useAccessControlStore();
  
  const unlockCharts = async () => {
    if (!wallets[0]) {
      alert('Connect wallet first');
      return;
    }
    
    const granted = await requestChartAccess(marketId);
    if (granted) {
      console.log('Charts unlocked!');
    }
  };

  return (
    <button onClick={unlockCharts} disabled={hasChartAccess(marketId)}>
      {hasChartAccess(marketId) ? 'Unlocked' : 'Unlock Charts'}
    </button>
  );
}
```

## 🧪 Testing

1. **Enable Developer Mode** (Windows): Settings → For developers → Turn on
2. **Start dev server**:
   ```bash
   npm run dev
   ```
3. **Login with Privy** (email, Google, etc.)
4. **Get testnet MON** from Monad faucet
5. **Click any "Unlock" button** - should:
   - Show confirmation dialog with price
   - Send transaction to Monad Testnet
   - Wait for confirmation
   - Grant access on success

## 🐛 Troubleshooting

### Turbopack Symlink Error (Windows)
If you see "os error 1314":
```bash
# Enable Developer Mode or run as Administrator
# Or disable Turbopack:
$env:NEXT_TURBOPACK = "0"
npm run dev
```

### Network Not Switching
- Check Privy config includes Monad Testnet in `supportedChains`
- Verify RPC URL is accessible
- Try manually adding network in wallet

### Payment Fails
- Ensure wallet has MON balance
- Check console for detailed error logs
- Verify treasury address in `.env.local`

## 📚 Backend Integration

To connect to a real backend with transaction verification:

1. **Start the x402 backend**:
   ```bash
   cd x402-backend
   pip install -r requirements.txt
   python main.py
   ```

2. **Configure backend** environment variables in `.env`:
   ```env
   BASE_RPC=https://testnet-rpc.monad.xyz
   RECIPIENT_ADDRESS=0xYourTreasuryAddress
   ```

3. **Update frontend** `.env.local`:
   ```env
   NEXT_PUBLIC_X402_API_URL=http://localhost:8990
   ```

4. **Backend will**:
   - Receive requests with `X-PAYMENT` header
   - Verify tx_hash on Monad Testnet RPC
   - Check sender, recipient, amount, chainId
   - Return 200 if valid, 402 if payment required

## 🔗 Resources

- [Privy Docs](https://docs.privy.io/)
- [Monad Network](https://monad.xyz/)
- [Monad Testnet Explorer](https://testnet.monadexplorer.com)
- [x402 Protocol](https://github.com/anton-io/x402-utils)

---

**Built with Monad Testnet + Privy + x402** 🚀
