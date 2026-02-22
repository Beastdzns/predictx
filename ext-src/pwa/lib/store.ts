import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============== TYPES ==============

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  icon: string;
}

interface WalletState {
  tokens: Token[];
}

interface AppState {
  // Authentication
  isAuthenticated: boolean;
  walletAddress: string | null;
  isHydrated: boolean;
  
  // Solana Wallet Integration
  solanaWalletAddress: string | null;
  isSolanaWalletConnected: boolean;
  
  // Card
  showCardDetails: boolean;
  
  setIsAuthenticated: (value: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setSolanaWallet: (address: string | null, connected: boolean) => void;
  toggleCardDetails: () => void;
  initializeAuth: () => void;
  connectWallet: () => void;
  disconnectWallet: () => void;

  // Wallet Management
  wallet: WalletState;
  getTotalWalletValue: () => number;
}

// ============== INITIAL DATA ==============

const AVAILABLE_TOKENS: Token[] = [
  { symbol: 'SOL', name: 'Solana', balance: 14.24, price: 142.27, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { symbol: 'USDC', name: 'USD Coin', balance: 1200.00, price: 1.00, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
  { symbol: 'USDT', name: 'Tether', balance: 500.00, price: 1.00, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=040' },
  { symbol: 'BTC', name: 'Bitcoin', balance: 0.02, price: 45000.00, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'ETH', name: 'Ethereum', balance: 0.5, price: 2500.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'BNB', name: 'Binance Coin', balance: 2, price: 320.00, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=040' },
  { symbol: 'RAY', name: 'Raydium', balance: 100, price: 1.50, icon: 'https://cryptologos.cc/logos/raydium-ray-logo.png' },
  { symbol: 'SRM', name: 'Serum', balance: 50, price: 0.75, icon: 'https://cryptologos.cc/logos/serum-srm-logo.svg?v=040' },
  { symbol: 'ORCA', name: 'Orca', balance: 30, price: 2.20, icon: 'https://cryptologos.cc/logos/orca-orca-logo.svg?v=040' },
  { symbol: 'MNGO', name: 'Mango', balance: 200, price: 0.30, icon: 'https://cryptologos.cc/logos/mango-markets-mngo-logo.png' },
];

// ============== STORE ==============

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication
      isAuthenticated: false,
      walletAddress: null,
      isHydrated: false,
      
      // Solana Wallet
      solanaWalletAddress: null,
      isSolanaWalletConnected: false,
      
      // Card
      showCardDetails: false,

      // Wallet
      wallet: {
        tokens: AVAILABLE_TOKENS,
      },

      setIsAuthenticated: (value) => set({ isAuthenticated: value }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setSolanaWallet: (address, connected) => set({ 
        solanaWalletAddress: address, 
        isSolanaWalletConnected: connected 
      }),
      toggleCardDetails: () => set((state) => ({ showCardDetails: !state.showCardDetails })),

      initializeAuth: () => {
        if (typeof window === 'undefined') return;
        const savedAuth = localStorage.getItem('isAuthenticated');
        const savedAddress = localStorage.getItem('walletAddress');
        set({
          isAuthenticated: savedAuth === 'true',
          walletAddress: savedAddress,
          isHydrated: true,
        });
      },

      connectWallet: () => {
        const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f44e';
        set({ isAuthenticated: true, walletAddress: mockAddress });
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('walletAddress', mockAddress);
        }
      },

      disconnectWallet: () => {
        set({ isAuthenticated: false, walletAddress: null, solanaWalletAddress: null, isSolanaWalletConnected: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('walletAddress');
        }
      },

      getTotalWalletValue: () => {
        const state = get();
        return state.wallet.tokens.reduce((sum, token) => sum + (token.balance * token.price), 0);
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        walletAddress: state.walletAddress,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
