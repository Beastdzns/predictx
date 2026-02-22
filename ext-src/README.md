<div align="center">

# 🔐 Solana Privacy Payments

### Private, Secure, and Anonymous Payments on Solana using Zero-Knowledge Proofs

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-solana--privacy--hack.vercel.app-blue?style=for-the-badge)](https://solana-privacy-hack.vercel.app/)
[![Built with Privacy Cash](https://img.shields.io/badge/Built_with-Privacy_Cash_SDK-purple?style=for-the-badge)](https://privacycash.org)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195?style=for-the-badge&logo=solana)](https://solana.com)

[Live Demo](https://solana-privacy-hack.vercel.app/) • [Documentation](#-documentation) • [Setup Guide](#-local-development-setup)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Privacy Cash Integration](#-privacy-cash-sdk-integration)
- [Project Structure](#-project-structure)
- [Local Development Setup](#-local-development-setup)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🌟 Overview

**Solana Privacy Payments** is a comprehensive privacy-preserving payment platform built on Solana blockchain, leveraging **Privacy Cash SDK** to enable truly anonymous and private transactions using zero-knowledge proofs (ZK-SNARKs).

The platform consists of:
- 🌐 **Progressive Web App (PWA)**: Create, share, and claim private payment links
- 🔌 **Browser Extension**: Detect and pay Blink links directly on Twitter/X with inline payment cards
- 🔒 **Privacy Cash Protocol**: Zero-knowledge proof-based payments ensuring complete transaction privacy

### 🎯 Use Cases

- **Private Payments**: Send and receive SOL without revealing sender/recipient identities
- **Social Tipping**: Pay creators on social media while maintaining privacy
- **Secure Donations**: Accept donations without exposing wallet addresses
- **Anonymous Bounties**: Create payment links for rewards and bounties
- **Privacy-First Transactions**: All transactions use ZK proofs to hide amounts and parties

---

## ✨ Features

### 🌐 Progressive Web App

- ✅ **Create Payment Links**: Generate unique Blink payment links with customizable amounts
- ✅ **Privacy Cash Integration**: All payments use zero-knowledge proofs for privacy
- ✅ **Secret Generation**: Automatic generation of cryptographic secrets for fund claiming
- ✅ **QR Code Sharing**: Share payment links via QR codes
- ✅ **Wallet Integration**: Seamless Phantom wallet connection
- ✅ **Mobile Optimized**: Full PWA with offline capabilities
- ✅ **Beautiful UI**: Gradient cards with smooth animations
- ✅ **Transaction History**: Track deposits and claims

### 🔌 Browser Extension

- ✅ **Auto-Detection**: Automatically scans Twitter/X for Blink payment links
- ✅ **Inline Cards**: Beautiful payment cards appear directly in tweets
- ✅ **One-Click Payments**: Pay with a single click using Phantom wallet
- ✅ **Wallet Bridge**: Custom wallet bridge architecture for content script isolation
- ✅ **Real-time Updates**: MutationObserver watches for dynamic content
- ✅ **ZK Proof Generation**: Client-side zero-knowledge proof creation
- ✅ **Secret Display**: Shows payment secrets for recipient claiming

### 🔒 Privacy Cash Features

- ✅ **Zero-Knowledge Proofs**: Complete transaction privacy using ZK-SNARKs
- ✅ **Hidden Amounts**: Transaction amounts are encrypted
- ✅ **Stealth Addresses**: Recipients remain anonymous
- ✅ **Nullifier Tracking**: Prevents double-spending without revealing identities
- ✅ **Merkle Tree Storage**: Efficient UTXO commitment tracking
- ✅ **Secret-Based Claims**: Only holders of the secret can claim funds

---

## 🔄 How It Works

### Payment Flow

```
┌─────────────────┐
│  1. Create Link │
│  User creates   │
│  payment link   │
│  with amount    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Deposit     │
│  Sender makes   │
│  private deposit│
│  via ZK proof   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Generate    │
│  Secret created │
│  automatically  │
│  for recipient  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Share       │
│  Share link +   │
│  secret with    │
│  recipient      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Claim       │
│  Recipient uses │
│  secret to claim│
│  funds privately│
└─────────────────┘
```

### Privacy Cash ZK Proof Process

1. **Deposit Phase**:
   - User specifies amount to send
   - System generates a 32-byte random secret
   - Creates EncryptionService from secret
   - Loads WASM factory for ZK circuit
   - Generates zero-knowledge proof using circuit (`transaction2.zkey`)
   - Submits transaction with encrypted commitment
   - Stores UTXO in Merkle tree on-chain

2. **Claim Phase**:
   - Recipient receives secret from sender
   - Creates EncryptionService from provided secret
   - Generates ZK proof of secret knowledge
   - Withdraws funds to their wallet
   - Nullifier prevents double-claiming

### Browser Extension Flow

1. **Detection**: MutationObserver watches Twitter/X DOM for new tweets
2. **URL Matching**: Regex patterns detect Blink payment links
3. **Card Injection**: Injects beautiful payment card HTML below tweet
4. **Wallet Bridge**: injected.js accesses `window.solana` in page context
5. **Communication**: CustomEvents bridge content script and injected script
6. **Payment**: Full Privacy Cash deposit flow executed client-side
7. **Secret Display**: Shows generated secret for user to share

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Solana Blockchain                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Merkle Tree│  │ Nullifier PDAs│  │ Global Config   │   │
│  │ (UTXOs)    │  │ (Anti-replay) │  │ (Tree State)    │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                            │
┌───────▼──────────┐                    ┌───────────▼─────────┐
│   PWA Frontend   │                    │  Browser Extension  │
│  (Next.js 15)    │                    │   (Vite + Chrome)   │
├──────────────────┤                    ├─────────────────────┤
│ • Payment Links  │                    │ • Content Script    │
│ • QR Codes       │                    │ • Injected Bridge   │
│ • Wallet Connect │                    │ • Card Injection    │
│ • UI Components  │                    │ • MutationObserver  │
└──────────────────┘                    └─────────────────────┘
        │                                            │
        │                                            │
        └─────────────────┬──────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │  Privacy Cash SDK  │
                ├────────────────────┤
                │ • ZK Proof Gen     │
                │ • Encryption       │
                │ • WASM Circuit     │
                │ • UTXO Management  │
                │ • Secret Handling  │
                └────────────────────┘
                          │
                ┌─────────▼──────────┐
                │   Phantom Wallet   │
                │  (Transaction Sign)│
                └────────────────────┘
```

### Component Breakdown

#### PWA (Progressive Web App)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React hooks + local storage
- **APIs**: 
  - `/api/blink/[linkId]` - Fetch payment link details
  - MongoDB for link storage
- **Features**: Create, deposit, claim payment links

#### Browser Extension
- **Build System**: Vite 7.3.1
- **Architecture**: Wallet bridge pattern
  - `content.tsx`: Content script (isolated context)
  - `injected.js`: Page context script (window.solana access)
  - CustomEvents for cross-context communication
- **Detection**: MutationObserver for dynamic Twitter/X content
- **Rendering**: Plain DOM (no React in injected cards)
- **Bundle**: IIFE format with all deps inlined (5.6MB)

#### Privacy Cash SDK
- **Source**: Vendored from privacycash-dist
- **Circuit**: transaction2.zkey (~100MB ZK circuit)
- **Dependencies**: 
  - snarkjs: ZK proof generation
  - @lightprotocol/hasher.rs: WASM hashing
  - tweetnacl: Cryptography
  - bn.js: BigNumber operations
- **Functions**: deposit(), withdraw(), getUtxos()

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Beautiful UI components |
| **React 19** | UI library |

### Blockchain

| Technology | Purpose |
|------------|---------|
| **Solana Web3.js** | Blockchain interaction |
| **Phantom Wallet** | User wallet integration |
| **Privacy Cash SDK** | ZK proof protocol |
| **@lightprotocol/hasher.rs** | WASM-based hashing |
| **Helius RPC** | Solana RPC provider |

### Extension

| Technology | Purpose |
|------------|---------|
| **Vite** | Build system |
| **Chrome Extension API** | Browser integration |
| **MutationObserver** | DOM watching |
| **CustomEvents** | Cross-context messaging |
| **crypto-browserify** | Node.js crypto polyfill |

### Privacy & Cryptography

| Technology | Purpose |
|------------|---------|
| **snarkjs** | Zero-knowledge proof generation |
| **ffjavascript** | Finite field arithmetic |
| **tweetnacl** | Elliptic curve cryptography |
| **bn.js** | BigNumber operations |
| **@ethersproject/keccak256** | Hashing functions |

### Database & Storage

| Technology | Purpose |
|------------|---------|
| **MongoDB** | Payment link storage |
| **LocalStorage** | Client-side UTXO caching |
| **IndexedDB** | Extension storage |

---

## 🔐 Privacy Cash SDK Integration

### What is Privacy Cash?

Privacy Cash is a privacy-preserving payment protocol on Solana that uses **zero-knowledge proofs (ZK-SNARKs)** to enable completely anonymous transactions. Unlike standard Solana transactions, Privacy Cash transactions hide:

- ✅ **Sender identity**
- ✅ **Recipient identity**
- ✅ **Transaction amounts**
- ✅ **Link between deposits and withdrawals**

### How Privacy Cash Works

1. **UTXO Model**: Uses Unspent Transaction Output model instead of account-based
2. **Commitments**: Each deposit creates a commitment stored in an on-chain Merkle tree
3. **Nullifiers**: Prevents double-spending without revealing which UTXO was spent
4. **ZK Proofs**: Proves knowledge of secret without revealing the secret itself
5. **Encryption**: All sensitive data encrypted with recipient's public key

### SDK Integration

```typescript
// 1. Generate secret for payment
const secretBytes = newPaymentLinkSecret(); // 32 random bytes

// 2. Create encryption service
const encryptionService = encryptionServiceFromSecretBytes(secretBytes);

// 3. Load WASM factory for ZK proofs
const lightWasm = await WasmFactory.getInstance();

// 4. Perform private deposit
const result = await deposit({
  lightWasm,
  connection,
  amount_in_lamports: 100000000, // 0.1 SOL
  keyBasePath: '/circuit2/transaction2.zkey',
  publicKey: wallet.publicKey,
  transactionSigner: wallet,
  storage: localStorage,
  encryptionService
});

// 5. Share secret with recipient
const secretBase58 = bs58.encode(secretBytes);
// Recipient uses this secret to claim funds
```

### Circuit File

The ZK proof circuit (`transaction2.zkey`) is a ~100MB file containing:
- Proving key for ZK-SNARK generation
- Verification parameters
- Constraint system for the payment protocol

This file is loaded at runtime and enables client-side proof generation without a trusted setup ceremony for each transaction.

### Vendor Files

Privacy Cash SDK is vendored in the project at:
- `pwa/vendor/privacycash-dist/`: Complete SDK with all modules
- `solana-blink-ext/vendor/privacycash-dist/`: Copy for extension

This ensures:
- ✅ Version consistency
- ✅ Offline development
- ✅ No npm registry dependency
- ✅ Faster builds

---

## 📁 Project Structure

```
privacy-hack/
├── README.md                          # This file
├── pwa/                               # Progressive Web App
│   ├── app/                           # Next.js App Router
│   │   ├── api/
│   │   │   └── blink/
│   │   │       └── [linkId]/
│   │   │           └── route.ts       # API: Fetch payment link
│   │   ├── private-payments/
│   │   │   ├── create/                # Create payment link
│   │   │   ├── deposit/               # Make payment
│   │   │   ├── claim/                 # Claim payment
│   │   │   └── pay/                   # Pay via link
│   │   ├── wallet/                    # Wallet page
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Homepage
│   ├── components/
│   │   ├── BlinkCard.tsx              # Payment card component
│   │   ├── PhantomCard.tsx            # Wallet card
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── paymentLink.ts             # Payment link logic
│   │   ├── privacycashClient.ts       # Privacy Cash client
│   │   ├── mongodb.ts                 # Database connection
│   │   └── wallet-providers.tsx       # Wallet context
│   ├── models/
│   │   └── BlinkCard.ts               # Data models
│   ├── vendor/
│   │   └── privacycash-dist/          # Privacy Cash SDK
│   │       ├── deposit.js
│   │       ├── withdraw.js
│   │       ├── getUtxos.js
│   │       └── utils/
│   ├── public/
│   │   ├── circuit2/
│   │   │   └── transaction2.zkey      # ZK circuit (100MB)
│   │   └── manifest.json              # PWA manifest
│   ├── package.json
│   └── next.config.ts
│
├── solana-blink-ext/                  # Browser Extension
│   ├── src/
│   │   ├── content/
│   │   │   ├── content.tsx            # Content script
│   │   │   ├── content.css            # Card styling
│   │   │   └── injected.js            # Wallet bridge
│   │   └── popup/
│   │       └── popup.html             # Extension popup
│   ├── public/
│   │   ├── manifest.json              # Extension manifest
│   │   └── circuit2/
│   │       └── transaction2.zkey      # ZK circuit
│   ├── vendor/
│   │   └── privacycash-dist/          # Privacy Cash SDK (copy)
│   ├── dist/                          # Build output
│   ├── vite.config.ts                 # Vite configuration
│   └── package.json
│
└── privacy-payments/                  # Alternative implementation
    └── privacy-payments-links/
```

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: v18+ ([Download](https://nodejs.org/))
- **pnpm**: v8+ ([Install](https://pnpm.io/installation))
- **Phantom Wallet**: Browser extension ([Install](https://phantom.app/))
- **MongoDB**: Local instance or Atlas cluster ([Setup](https://www.mongodb.com/))
- **Git**: For cloning the repository

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/privacy-hack.git
cd privacy-hack
```

### Step 2: Setup PWA

```bash
cd pwa

# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

**Required Environment Variables** (`.env.local`):

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/privacy-payments
# or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Solana RPC endpoint
NEXT_PUBLIC_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Get Helius API Key** (Free):
1. Visit [helius.dev](https://www.helius.dev/)
2. Sign up for free account
3. Create new RPC endpoint
4. Copy API key to `.env.local`

**Start Development Server**:

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Step 3: Setup Browser Extension

```bash
cd ../solana-blink-ext

# Install dependencies
pnpm install

# Build extension
pnpm build
```

**Load Extension in Chrome/Brave**:

1. Open browser and navigate to `chrome://extensions/` (or `brave://extensions/`)
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `dist/` folder: `privacy-hack/solana-blink-ext/dist`
5. Extension will appear in toolbar

**Verify Extension**:
- Should see "Solana Blinks - Privacy Cash Payments" in extensions list
- Navigate to Twitter/X
- Extension will auto-detect Blink links

### Step 4: Copy Circuit Files

The ZK proof circuit file is large (~100MB). Ensure it exists:

```bash
# Check if circuit exists in PWA
ls -lh pwa/public/circuit2/transaction2.zkey

# If missing, download or copy from source
# (This file should be included in the repository)

# Copy to extension
cp pwa/public/circuit2/transaction2.zkey solana-blink-ext/public/circuit2/
```

### Step 5: Setup Phantom Wallet

1. Install [Phantom](https://phantom.app/) browser extension
2. Create or import wallet
3. Switch to **Mainnet** (or Devnet for testing)
4. Fund wallet with SOL for transaction fees

### Step 6: Test the Flow

**Create Payment Link**:
1. Visit [http://localhost:3000](http://localhost:3000)
2. Connect Phantom wallet
3. Click "Create Payment Link"
4. Enter amount (e.g., 0.1 SOL)
5. Click "Create Link"
6. Copy generated link

**Make Payment** (via PWA):
1. Open payment link in browser
2. Click "Pay with Privacy Cash"
3. Approve transaction in Phantom
4. Copy generated secret

**Make Payment** (via Extension):
1. Post payment link on Twitter/X
2. Extension automatically injects payment card
3. Click "Connect Phantom"
4. Click "Pay with Privacy Cash"
5. Approve and copy secret

**Claim Payment**:
1. Share secret with recipient
2. Recipient visits claim page
3. Enters secret
4. Claims funds to their wallet

---

## 🌐 Deployment

### PWA Deployment (Vercel)

The PWA is deployed at: **[https://solana-privacy-hack.vercel.app/](https://solana-privacy-hack.vercel.app/)**

**Deploy Your Own**:

1. **Fork Repository**
2. **Connect to Vercel**:
   - Visit [vercel.com](https://vercel.com/)
   - Import your forked repository
   - Select `pwa/` as root directory

3. **Configure Environment Variables** in Vercel:
   ```
   MONGODB_URI=your_mongodb_connection_string
   NEXT_PUBLIC_RPC_ENDPOINT=your_helius_rpc_url
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

4. **Deploy**: Vercel will auto-deploy on push to main branch

### Extension Distribution

**Chrome Web Store**:
1. Create developer account ($5 one-time fee)
2. Prepare store listing (descriptions, screenshots, icons)
3. Upload `dist/` folder as ZIP
4. Submit for review

**Manual Distribution**:
- Share `dist/` folder as ZIP
- Users load unpacked extension in developer mode

---

## 🧪 Testing

### PWA Testing

```bash
cd pwa

# Run tests (if configured)
pnpm test

# Type checking
pnpm tsc --noEmit

# Lint
pnpm lint
```

### Extension Testing

```bash
cd solana-blink-ext

# Rebuild after changes
pnpm build

# Type checking
pnpm tsc --noEmit

# Lint
pnpm lint
```

**Manual Testing Checklist**:
- [ ] Create payment link with different amounts
- [ ] Make payment via PWA interface
- [ ] Make payment via extension on Twitter/X
- [ ] Verify ZK proof generation succeeds
- [ ] Verify secret is generated and displayed
- [ ] Claim payment with valid secret
- [ ] Verify wallet balance updates
- [ ] Test on different networks (Mainnet/Devnet)

---

## 📚 Documentation

### API Endpoints

#### GET `/api/blink/[linkId]`

Fetch payment link details.

**Response**:
```json
{
  "id": "abc123",
  "amount": "0.1",
  "currency": "SOL",
  "status": "pending",
  "createdAt": "2026-01-30T00:00:00Z"
}
```

### Privacy Cash Functions

#### `deposit(options)`

Make a private deposit using ZK proof.

```typescript
await deposit({
  lightWasm: WasmFactory,
  connection: Connection,
  amount_in_lamports: number,
  keyBasePath: string,
  publicKey: PublicKey,
  transactionSigner: Wallet,
  storage: Storage,
  encryptionService: EncryptionService
})
```

#### `withdraw(options)`

Withdraw funds using secret.

```typescript
await withdraw({
  lightWasm: WasmFactory,
  connection: Connection,
  secret: Uint8Array,
  recipientPublicKey: PublicKey,
  transactionSigner: Wallet,
  storage: Storage
})
```

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 🛡️ Security

### Privacy Considerations

- **No Backend Tracking**: All ZK proofs generated client-side
- **Secret Management**: Secrets never leave user's device unless explicitly shared
- **On-Chain Privacy**: Merkle tree commitments hide transaction details
- **Nullifier Security**: Prevents double-spending without revealing UTXOs

### Responsible Disclosure

Found a security vulnerability? Please email: security@yourproject.com

**Do NOT** open public issues for security vulnerabilities.

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Privacy Cash Team**: For the amazing ZK proof SDK
- **Solana Foundation**: For the robust blockchain infrastructure
- **Phantom**: For seamless wallet integration
- **Light Protocol**: For WASM hashing utilities
- **Helius**: For reliable RPC endpoints

---

## 📞 Support

- **Documentation**: This README
- **Issues**: [GitHub Issues](https://github.com/yourusername/privacy-hack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/privacy-hack/discussions)
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

---

<div align="center">

### Built with ❤️ for privacy-conscious Solana users

**[Live Demo](https://solana-privacy-hack.vercel.app/)** • **[Documentation](#-documentation)** • **[GitHub](https://github.com/yourusername/privacy-hack)**

</div>
