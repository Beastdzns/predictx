/**
 * Monad Testnet Configuration
 * EVM-compatible chain, chainId 10143
 */

export const monadTestnetConfig = {
  chainId: 10143,
  name: "Monad Testnet",
  network: "testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  blockExplorer: "https://testnet.monadexplorer.com",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
};

// Viem chain definition (compatible with Privy)
export const monadTestnet = {
  id: monadTestnetConfig.chainId,
  name: monadTestnetConfig.name,
  nativeCurrency: monadTestnetConfig.nativeCurrency,
  rpcUrls: {
    default: { http: [monadTestnetConfig.rpcUrl] },
    public: { http: [monadTestnetConfig.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: monadTestnetConfig.blockExplorer },
  },
  testnet: true,
} as const;

export const x402Config = {
  // Treasury address — EVM 0x address (40 hex chars = 20 bytes)
  recipientAddress: (() => {
    const envAddr = process.env.NEXT_PUBLIC_X402_RECIPIENT;
    // Only use env var if it's a valid 40-char EVM address
    if (envAddr && envAddr.length === 42 && envAddr.startsWith('0x')) {
      return envAddr;
    }
    return "0x04274c7bE78c3A0e7493122E12A97edC11c2eA9e";
  })(),

  // Pricing in MON (18 decimals — values in wei)
  pricing: {
    marketData:    "1000000000000000",  // 0.001 MON
    charts:        "2000000000000000",  // 0.002 MON
    sentiment:     "3000000000000000",  // 0.003 MON
    orderbook:     "1500000000000000",  // 0.0015 MON
    calculator:    "1000000000000000",  // 0.001 MON
    activity:      "1500000000000000",  // 0.0015 MON
    socialPost:    "5000000000000000",  // 0.005 MON
    socialView:    "2000000000000000",  // 0.002 MON
    socialComment: "1000000000000000",  // 0.001 MON
  },

  // Backend API
  apiUrl: process.env.NEXT_PUBLIC_X402_API_URL || "http://localhost:8990",
};
