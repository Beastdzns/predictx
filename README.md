# 🔮 PredictX — Decentralized Prediction Markets on Monad

<p align="center">
  <img src="https://img.shields.io/badge/Monad-Testnet-purple?style=for-the-badge" alt="Monad Testnet" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-blue?style=for-the-badge" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge" alt="Next.js" />
  <img src="https://img.shields.io/badge/x402-Payments-green?style=for-the-badge" alt="x402" />
</p>

<p align="center">
  <strong>Trade on the future. Powered by Monad's blazing-fast L1.</strong>
</p>

---

## 🚀 Overview

**PredictX** is a decentralized prediction market platform built on **Monad Testnet**. Users can create markets, trade YES/NO shares using a constant-product AMM, and resolve outcomes via community voting or Pyth oracle integration.

### ✨ Key Features

- 🎯 **Prediction Markets** — Create and trade on any event outcome
- ⚡ **Monad L1** — Lightning-fast transactions with low fees
- 🔗 **Twitter/X Blinks** — Trade directly from tweets via browser extension
- 💳 **x402 Protocol** — HTTP-native micropayments for premium content
- 🔐 **Privy Embedded Wallets** — Seamless UX with embedded wallet signing
- 📊 **Real-time Data** — Kalshi market data integration

---

## 📍 Deployed Contracts

### Monad Testnet (Chain ID: 10143)

| Contract | Address | Explorer |
|----------|---------|----------|
| **PredictionMarket** | `0x342063473A0e5B1D1b69E3C2b8721490547E1df5` | [View on Explorer](https://testnet.monadexplorer.com/address/0x342063473A0e5B1D1b69E3C2b8721490547E1df5) |

### Active Markets

| ID | Question | Deadline |
|----|----------|----------|
| 0 | Will Bitcoin hit $100K by April 2026? | April 1, 2026 |
| 1 | Will Monad mainnet launch by Q2 2026? | July 1, 2026 |
| 2 | Will ETH surpass $5K by end of 2026? | Jan 1, 2027 |
| 3 | Will AI agents manage $1B in crypto by 2027? | Jan 1, 2027 |
| 4 | Will Solana flip Ethereum by TVL in 2026? | Jan 1, 2027 |

---

## 🏗️ Architecture

```
predictx/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── PredictionMarket.sol    # Main AMM contract
│   ├── script/
│   │   ├── Deploy.s.sol            # Deployment script
│   │   └── CreateMarkets.s.sol     # Market creation script
│   └── test/
│       └── PredictionMarket.t.sol  # Foundry tests
│
├── frontend/           # Next.js 15 web application
│   ├── app/
│   │   ├── api/blink/              # Blink API endpoints
│   │   ├── blink-sign/             # Privy signing popup
│   │   ├── events/                 # Market detail pages
│   │   └── social/                 # Social feed
│   ├── components/
│   │   └── markets/                # Market UI components
│   └── lib/
│       ├── monad-config.ts         # Monad chain config
│       ├── privy-monad-signing.ts  # Privy integration
│       └── x402-*.ts               # x402 payment utils
│
├── ext-src/            # Browser extensions
│   ├── solana-blink-ext/           # Twitter/X blinks extension
│   └── pwa/                        # Progressive web app
│
├── x402-backend/       # Python FastAPI x402 payment server
│   ├── payments/                   # Payment verification
│   └── streaming/                  # WebSocket handlers
│
└── x402-prediction-backend/        # Prediction market backend
```

---

## 🔧 Smart Contract

### PredictionMarket.sol

A constant-product AMM for prediction markets with:

- **1% Platform Fee** — Collected on each trade
- **Community Voting** — Markets resolved by token holder votes
- **Pyth Oracle** (Optional) — Price-based resolution
- **48-hour Vote Window** — After market deadline

```solidity
// Key Functions
function createMarket(string question, uint256 deadline, ...) external payable;
function buyYes(uint256 marketId) external payable;
function buyNo(uint256 marketId) external payable;
function sellYes(uint256 marketId, uint256 shares) external;
function sellNo(uint256 marketId, uint256 shares) external;
function vote(uint256 marketId, bool voteYes) external;
function claimWinnings(uint256 marketId) external;
```

### Function Selectors

| Function | Selector |
|----------|----------|
| `buyYes(uint256)` | `0x061dd98d` |
| `buyNo(uint256)` | `0x58c36e5c` |
| `createMarket(...)` | `0x...` |
| `claimWinnings(uint256)` | `0x...` |

---

## 🐦 Twitter/X Blinks

Trade prediction markets directly from Twitter with our browser extension!

### How It Works

1. **Tweet a Blink URL**: `https://predictx.vercel.app/api/blink/monad/0`
2. **Extension detects it**: Renders an interactive trading card
3. **Click Buy YES/NO**: Opens Privy signing popup
4. **Sign & Trade**: Transaction sent to Monad

### Blink URL Format

```
https://predictx.vercel.app/api/blink/monad/{marketId}
```

### Example Markets

- Market 0: `https://predictx.vercel.app/api/blink/monad/0`
- Market 1: `https://predictx.vercel.app/api/blink/monad/1`
- Market 2: `https://predictx.vercel.app/api/blink/monad/2`

---

## 💳 x402 Protocol Integration

PredictX uses the **x402 HTTP Payment Protocol** for:

- Premium market insights
- Exclusive analysis
- Ad-free experience

### How x402 Works

1. Server returns `402 Payment Required` with payment details
2. Client signs payment with embedded wallet
3. Payment header sent with retry request
4. Server verifies and serves content

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+
- pnpm 8+
- Foundry (for contracts)
- Python 3.10+ (for backend)

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local
# Add your Privy App ID and other keys
pnpm dev
```

### Smart Contracts

```bash
cd contracts
forge install
forge build
forge test

# Deploy to Monad Testnet
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

### Browser Extension

```bash
cd ext-src/solana-blink-ext
pnpm install
pnpm build
# Load dist/ folder in Chrome as unpacked extension
```

### Backend

```bash
cd x402-backend
pip install -r requirements.txt
python main.py
```

---

## 🔑 Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x342063473A0e5B1D1b69E3C2b8721490547E1df5
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### Backend

```env
MONGODB_URI=mongodb://...
PRIVATE_KEY=0x...
```

---

## 🌐 Network Configuration

### Monad Testnet

| Property | Value |
|----------|-------|
| Chain ID | `10143` |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Currency | `MON` |
| Explorer | `https://testnet.monadexplorer.com` |

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🔗 Links

- **Live Demo**: [predictx.vercel.app]
- **Contract Explorer**: [Monad Testnet Explorer](https://testnet.monadexplorer.com/address/0x342063473A0e5B1D1b69E3C2b8721490547E1df5)

---

<p align="center">
  Built with ⚡ on <strong>Monad</strong>
</p>
