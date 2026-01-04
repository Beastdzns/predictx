/**
 * Movement Bedrock Testnet Configuration
 * Pure Aptos/Move native, chainId 250
 */

export const movementBedrockConfig = {
  chainId: 250,
  name: "Movement Bedrock Testnet",
  network: "testnet",
  rpcUrl: "https://testnet.movementnetwork.xyz/v1",
  blockExplorer: "https://explorer.movementnetwork.xyz/?network=bardock+testnet",
  nativeCurrency: {
    name: "MOVE",
    symbol: "MOVE",
    decimals: 8, // Movement uses 8 decimals like Aptos
  },
};

export const x402Config = {
  // Treasury address (32-byte Move address)
  recipientAddress: "0x1c3aee2b139c069bac975c7f87c4dce8143285f1ec7df2889f5ae1c08ae1ba53",
  
  // Pricing in MOVE (8 decimals, so 1 MOVE = 100000000)
  pricing: {
    marketData: "100000", // 0.001 MOVE
    charts: "200000", // 0.002 MOVE
    sentiment: "300000", // 0.003 MOVE
    orderbook: "150000", // 0.0015 MOVE
    calculator: "100000", // 0.001 MOVE
    activity: "150000", // 0.0015 MOVE
    socialPost: "500000", // 0.005 MOVE
    socialView: "200000", // 0.002 MOVE (24h)
    socialComment: "100000", // 0.001 MOVE (24h)
  },
  
  // Backend API
  apiUrl: process.env.NEXT_PUBLIC_X402_API_URL || "http://localhost:8990",
};
