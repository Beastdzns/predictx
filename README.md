# 🎯 X402PM

> **x402-Powered Prediction Market on Movement M1**

A revolutionary prediction market where every action is unlocked only after a real MOVE payment on Movement M1, enforced via HTTP 402 and invisible wallets.

[![Built on Movement M1](https://img.shields.io/badge/Built%20on-Movement%20M1-000000?style=flat-square)](https://movementnetwork.xyz)
[![Payments via x402](https://img.shields.io/badge/Payments-x402-FF6B6B?style=flat-square)](https://github.com/anton-io/x402-utils)
[![Wallet UX by Privy](https://img.shields.io/badge/Wallet%20UX-Privy-6366F1?style=flat-square)](https://privy.io)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

---

## 🚨 What's Broken Today

### Traditional Prediction Platforms Charge:
- ❌ **Subscriptions** - Pay monthly/yearly regardless of usage
- ❌ **Platform Fees** - Hidden costs on every transaction
- ❌ **Upfront Costs** - Pay before you know if you'll use it

### The Problems:
- 💸 Users pay even if they don't consume data
- 🔐 Wallets, keys, and gas confuse non-crypto users
- 🤖 AI agents cannot pay for data autonomously

### Result:
- ❌ High friction
- ❌ Poor monetization
- ❌ Bad UX for humans & agents

---

## ✨ What Our App Actually Does

### **Pay for Data, Not the App**

The app itself is **free**. Payments unlock specific data and insights.

#### ✅ What Users Pay For:
- 📊 **Live prediction charts** - Real-time market visualization
- 🤖 **AI confidence signals** - Machine learning insights
- 👥 **Crowd sentiment & trends** - Community-driven analytics
- 🔁 **Prediction updates / early exits** - Real-time market data
- 📈 **Order book access** - Deep market liquidity data
- 💬 **Social features** - Community posts and comments

#### ❌ What Users Do NOT Pay For:
- 🆓 App access
- 🆓 Subscriptions
- 🆓 Platform fees
- 🆓 Basic browsing

---

## 🏗️ How It Works

### Protocol-Level Payments (x402 + Movement M1)

```
1. User requests data (chart / signal / sentiment)
   ↓
2. Backend responds: HTTP 402 Payment Required
   ↓
3. Privy embedded wallet sends real MOVE transaction
   ↓
4. Same request is automatically retried
   ↓
5. Backend verifies payment on Movement M1 blockchain
   ↓
6. Data is returned to user
```

**Key Point:** The MOVE payment is the **price of the data**, not a transaction fee.

### Why This Matters

| Feature | Benefit |
|---------|---------|
| 💸 **Micro-payments** | Pay-per-insight (₹-level pricing) |
| 🤖 **AI-Compatible** | Works for humans and AI agents |
| 🔐 **No Seed Phrases** | Privy embedded wallets handle everything |
| ⚡ **Fast Settlement** | Cheap, fast transactions on Movement M1 |
| 🎯 **Pay-Per-Use** | Only pay for what you consume |

### Revenue Model

- 💰 **Pay-per-chart** - Unlock historical price data
- 💰 **Pay-per-signal** - Access AI predictions
- 💰 **Pay-per-resolution** - Get early market insights
- 💰 **Pay-per-social** - Community features

> **Note:** Payments are signed and sent using Privy embedded wallets — no Nightly, no seed phrases. Privy is not our auth layer — it's our **invisible payment engine**.

---

## 🎯 Features

### Market Features

| Feature | Price | Description |
|---------|-------|-------------|
| 📊 Market Data | `0.001 MOVE` | Real-time market data access |
| 📈 Charts | `0.002 MOVE` | Historical price charts |
| 🤖 Sentiment Analysis | `0.003 MOVE` | AI-powered market insights |
| 📋 Order Book | `0.0015 MOVE` | Real-time order data |
| 🧮 Trade Calculator | `0.001 MOVE` | Profit/loss calculations |
| 📊 Recent Activity | `0.0015 MOVE` | Trade history |

### Social Features

| Feature | Price | Duration |
|---------|-------|----------|
| 👀 View Feed | `0.002 MOVE` | 24 hours |
| ✍️ Create Post | `0.005 MOVE` | 24 hours |
| 💬 Post Comment | `0.001 MOVE` | 24 hours |

### Core Features

- 🔍 **Event Discovery** - Browse prediction markets by category
- 📊 **Real-time Data** - Live market updates
- 💳 **Invisible Payments** - Seamless wallet integration
- 📱 **Mobile-First** - Responsive design with PWA support
- 🎨 **Modern UI** - Beautiful, intuitive interface
- 🔐 **Secure** - On-chain transaction verification

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 16.1](https://nextjs.org) with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, Lucide Icons
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Charts:** Recharts

### Blockchain & Payments
- **Network:** Movement Bedrock Testnet (Aptos-compatible)
- **Payment Protocol:** [x402](https://github.com/anton-io/x402-utils)
- **Wallet Provider:** [Privy](https://privy.io) (Embedded Wallets)
- **SDK:** Aptos TypeScript SDK

### Backend
- **API:** Next.js API Routes
- **Database:** MongoDB (via Mongoose)
- **Payment Verification:** On-chain transaction verification

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm 9+ (or npm/yarn)
- MongoDB (for backend features)
- Privy App ID and Secret

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   pnpm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` in the `frontend` directory:
   ```env
   # Privy Configuration
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   PRIVY_APP_SECRET=your_privy_app_secret

   # x402 Backend (optional, for full backend integration)
   NEXT_PUBLIC_X402_API_URL=http://localhost:8990

   # MongoDB (optional, for social features)
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Get Privy Credentials**
   - Go to [Privy Dashboard](https://dashboard.privy.io/)
   - Create a new app or use existing
   - Copy App ID and App Secret to `.env.local`
   - Privy automatically supports Aptos/Movement chains

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Getting Testnet MOVE

1. Visit [Movement Faucet](https://faucet.movementnetwork.xyz/)
2. Connect your wallet (or use Privy embedded wallet)
3. Request testnet MOVE tokens
4. Start using the app!

---


## 🏛️ Architecture

### Payment Flow

```
┌──────────────┐
│   User       │
│   Request    │
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│  Frontend       │
│  (Next.js)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      HTTP 402      ┌──────────────┐
│  Backend API    │◄───────────────────│     x402     │
│  (Next.js API)  │   Payment Required │    Backend   │
└──────┬──────────┘                    └──────────────┘
       │
       ▼
┌─────────────────┐
│  Privy Wallet   │
│  (Embedded)     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Movement M1    │
│  Blockchain     │
└─────────────────┘
```

### Key Components

- **`lib/store-access.ts`** - Access control store with payment integration
- **`lib/x402-server-payment.ts`** - Server-side payment utilities
- **`lib/x402-fetch.ts`** - HTTP 402-aware fetch wrapper
- **`components/x402-protected-content.tsx`** - React component for protected content
- **`app/api/x402/`** - Backend API routes for payment verification

---

## 🔧 Configuration

### Movement Bedrock Testnet

- **RPC URL:** `https://testnet.movementnetwork.xyz/v1`
- **Chain ID:** `250` (Aptos-compatible)
- **Explorer:** `https://explorer.movementnetwork.xyz/?network=testnet`
- **Faucet:** `https://faucet.movementnetwork.xyz/`
- **Native Currency:** MOVE (8 decimals)

### x402 Pricing

Configured in `lib/movement-bedrock-config.ts`:

```typescript
export const x402Config = {
  recipientAddress: "0x1c3aee2b139c069bac975c7f87c4dce8143285f1ec7df2889f5ae1c08ae1ba53",
  pricing: {
    marketData: "100000",    // 0.001 MOVE
    charts: "200000",        // 0.002 MOVE
    sentiment: "300000",     // 0.003 MOVE
    orderbook: "150000",     // 0.0015 MOVE
    // ... more pricing
  },
};
```

---

## 🔗 Resources

- [Movement Network](https://movementnetwork.xyz/) - Official Movement docs
- [x402 Protocol](https://github.com/anton-io/x402-utils) - x402 payment protocol
- [Privy Docs](https://docs.privy.io/) - Privy wallet documentation
- [Aptos SDK](https://aptos.dev/) - Aptos TypeScript SDK (Movement-compatible)

---

## 🙏 Acknowledgments

- Built on [Movement M1](https://movementnetwork.xyz/)
- Payments powered by [x402](https://github.com/anton-io/x402-utils)
- Wallet UX by [Privy](https://privy.io)

---

<div align="center">

**Built with ❤️ using Movement M1 + Privy + x402 for Movement Ecosystem**

</div>