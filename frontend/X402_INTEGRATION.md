# x402 Payment Integration Guide

This Next.js frontend now supports **x402 payment rails** with **Privy embedded wallets** on **Movement Bedrock Testnet**.

## 🎯 Features

- ✅ Pay-to-unlock premium features with native MOVE tokens
- ✅ Privy embedded wallets (no seed phrase exposure)
- ✅ Movement Bedrock Testnet integration (Aptos-compatible)
- ✅ Server-side transaction signing via Privy Node SDK
- ✅ Real on-chain transaction verification

## 🔐 Unlock Points

All the following features now require on-chain payment:

### Market Features
- **Market Data Access** - `0.001 MOVE` - Real-time market data
- **Charts Access** - `0.002 MOVE` - Historical price charts
- **Sentiment Analysis** - `0.003 MOVE` - AI-powered insights
- **Order Book** - `0.0015 MOVE` - Real-time order data
- **Trade Calculator** - `0.001 MOVE` - Profit calculations
- **Recent Activity** - `0.0015 MOVE` - Trade history

### Social Features
- **View Feed** - `0.002 MOVE` - Access community posts (24h)
- **Create Post** - `0.005 MOVE` - Post to community (24h)
- **Post Comment** - `0.001 MOVE` - Comment on posts (24h)

## ⚙️ Configuration

### 1. Environment Variables

Create/update `.env.local`:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# x402 Backend
NEXT_PUBLIC_X402_API_URL=http://localhost:8990
```

**Important**: Get your `PRIVY_APP_SECRET` from the [Privy Dashboard](https://dashboard.privy.io/) under Settings > API Keys.

### 2. Privy Setup

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Create a new app or use existing
3. Copy your App ID and App Secret to `.env.local`
4. Privy automatically supports Aptos/Movement chains via extended-chains
5. The app uses `useCreateWallet({chainType: 'aptos'})` to create Movement wallets

### 3. Movement Bedrock Testnet

- **RPC URL**: `https://testnet.movementnetwork.xyz/v1`
- **Chain ID**: `250` (conceptual, Aptos-style)
- **Explorer**: `https://explorer.movementnetwork.xyz/?network=testnet`
- **Faucet**: Get testnet MOVE from Movement faucet

## 🔧 Technical Architecture

### Payment Flow

```
1. User clicks "Unlock" → Confirmation dialog with price
2. Privy wallet sends MOVE transaction on Movement M1
3. Wait for transaction confirmation (1 block)
4. Access granted locally via Zustand store
5. Transaction hash logged for verification
```

### Files Created/Modified

#### New Files
- `lib/movement-config.ts` - Movement M1 & x402 configuration
- `lib/x402-payment.ts` - Payment utilities (sendNativePayment, ensureCorrectNetwork, etc.)
- `lib/use-wallet-sync.ts` - Hook to sync Privy wallet with access store

#### Modified Files
- `app/providers.tsx` - Added Movement M1 to Privy config, wallet sync
- `lib/store-access.ts` - Converted to async payment flow with real transactions
- `.env.local` - Added treasury address and API URL

### Key Functions

#### `sendNativePayment(wallet, recipient, amount)`
Sends MOVE tokens using Privy embedded wallet provider.

#### `ensureCorrectNetwork(wallet)`
Auto-switches to Movement M1 or adds it to wallet.

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
4. **Get testnet MOVE** from Movement faucet
5. **Click any "Unlock" button** - should:
   - Show confirmation dialog with price
   - Send transaction to Movement M1
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
- Check Privy config includes Movement M1 in `supportedChains`
- Verify RPC URL is accessible
- Try manually adding network in wallet

### Payment Fails
- Ensure wallet has MOVE balance
- Check console for detailed error logs
- Verify treasury address in `.env.local`

## 📚 Backend Integration

To connect to a real backend with transaction verification:

1. **Clone x402-utils backend**:
   ```bash
   git clone https://github.com/anton-io/x402-utils
   cd x402-utils/prediction-market/backend
   ```

2. **Configure backend** (see x402-utils README)

3. **Update frontend** `.env.local`:
   ```env
   NEXT_PUBLIC_X402_API_URL=http://localhost:8990
   ```

4. **Backend will**:
   - Receive requests with `X-PAYMENT` header
   - Verify tx_hash on Movement M1 RPC
   - Check sender, recipient, amount, chainId
   - Return 200 if valid, 401 if invalid

## 🔗 Resources

- [Privy Docs](https://docs.privy.io/)
- [Movement Network](https://movementnetwork.xyz/)
- [x402 Protocol](https://github.com/anton-io/x402-utils)
- [Movement M1 Explorer](https://explorer.devnet.imola.movementlabs.xyz)

---

**Built with Movement M1 + Privy + x402** 🚀
