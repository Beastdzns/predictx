'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useState, useEffect, useRef } from 'react';
import { Lock, Download, Coins, Plus, Shield, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion, useInView } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const connectWallet = useAppStore((state) => state.connectWallet);
  const setSolanaWallet = useAppStore((state) => state.setSolanaWallet);
  const setIsAuthenticated = useAppStore((state) => state.setIsAuthenticated);
  const setWalletAddress = useAppStore((state) => state.setWalletAddress);
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Feature carousel state - MUST be before any conditional returns
  const [currentFeature, setCurrentFeature] = useState(0);
  const featuresRef = useRef(null);
  const isInView = useInView(featuresRef, { once: true });

  const features = [
    {
      icon: <Plus size={24} />,
      title: 'Create Payment Links',
      description: 'Generate secure, private payment requests with custom amounts',
      color: 'from-green-400 to-emerald-500',
    },
    {
      icon: <Download size={24} />,
      title: 'Private Deposits',
      description: 'Shield your assets with zero-knowledge proofs on Solana',
      color: 'from-blue-400 to-cyan-500',
    },
    {
      icon: <Coins size={24} />,
      title: 'Claim Payments',
      description: 'Receive funds anonymously using secret keys',
      color: 'from-purple-400 to-pink-500',
    },
    {
      icon: <Shield size={24} />,
      title: 'Zero Tracking',
      description: 'Your transactions are private, untraceable, and secure',
      color: 'from-orange-400 to-red-500',
    },
  ];

  // Sync Solana wallet state with Zustand store and localStorage
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      setSolanaWallet(address, true);
      setIsAuthenticated(true);
      setWalletAddress(address);
      
      // Store in localStorage for routing restrictions
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('walletAddress', address);
      }
    } else {
      setSolanaWallet(null, false);
    }
  }, [connected, publicKey, setSolanaWallet, setIsAuthenticated, setWalletAddress]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push('/private-payments/create');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Auto-redirect when wallet connects
  useEffect(() => {
    if (connected && publicKey && isHydrated) {
      router.push('/private-payments/create');
    }
  }, [connected, publicKey, isHydrated, router]);

  // Feature carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  // PWA Install prompt handling
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleConnectWallet = () => {
    if (connected && publicKey) {
      // Already connected, just navigate
      router.push('/private-payments/create');
    } else {
      // Open wallet selection modal
      setVisible(true);
    }
  };

  // Show loading or nothing while checking auth
  if (!isHydrated) {
    return (
      <div className="bg-white text-black font-mono min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse"></div>
          <span className="text-neon-green">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render the landing page if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-linear-to-b from-black via-gray-900 to-black text-white antialiased selection:bg-neon-green selection:text-black min-h-screen flex flex-col overflow-hidden">
      <div className="relative flex-1 flex flex-col w-full max-w-md mx-auto py-8">
        {/* Header */}
        <header className="flex px-4 items-center justify-between mb-12 opacity-0 animate-fade-in border-b border-neon-green/20 pb-4" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2">
            <Lock className="text-neon-green" size={20} />
            <span className="text-neon-green font-bold text-lg tracking-tight">P-Links</span>
          </div>
          <div className="flex items-center gap-3">
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-green/50 bg-neon-green/10 hover:bg-neon-green/20 transition-all text-neon-green text-xs font-bold"
              >
                <Download size={14} />
                Install
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse"></div>
              <p className='text-xs text-gray-400'>v1.0.0</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center text-center gap-8 px-6">
          {/* Hero Section */}
          <div className="flex flex-col gap-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
              <span className="text-neon-green">Private Payments</span>
              <span className="block text-white mt-2">on Solana</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
              Send and receive crypto with complete privacy using zero-knowledge proofs and payment links.
            </p>
          </div>

          {/* Sliding Feature Cards */}
          <div ref={featuresRef} className="w-full opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative h-48 mb-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{
                    opacity: currentFeature === index ? 1 : 0,
                    x: currentFeature === index ? 0 : currentFeature > index ? -100 : 100,
                    scale: currentFeature === index ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className={`w-full bg-linear-to-br ${feature.color} rounded-2xl p-6 text-left shadow-2xl`}>
                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                        <p className="text-sm text-white/90">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentFeature === index ? 'w-8 bg-neon-green' : 'w-2 bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="w-full grid grid-cols-2 gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="bg-gray-800/50 border border-neon-green/20 rounded-xl p-4 text-left hover:border-neon-green/50 transition-colors">
              <Zap className="text-neon-green mb-2" size={20} />
              <div className="text-xs font-bold text-white mb-1">Instant Transfers</div>
              <div className="text-[10px] text-gray-400">Fast Solana blockchain</div>
            </div>
            <div className="bg-gray-800/50 border border-neon-green/20 rounded-xl p-4 text-left hover:border-neon-green/50 transition-colors">
              <Shield className="text-neon-green mb-2" size={20} />
              <div className="text-xs font-bold text-white mb-1">ZK Proofs</div>
              <div className="text-[10px] text-gray-400">Complete anonymity</div>
            </div>
            <div className="bg-gray-800/50 border border-neon-green/20 rounded-xl p-4 text-left hover:border-neon-green/50 transition-colors">
              <Lock className="text-neon-green mb-2" size={20} />
              <div className="text-xs font-bold text-white mb-1">Secure</div>
              <div className="text-[10px] text-gray-400">End-to-end encrypted</div>
            </div>
            <div className="bg-gray-800/50 border border-neon-green/20 rounded-xl p-4 text-left hover:border-neon-green/50 transition-colors">
              <Coins className="text-neon-green mb-2" size={20} />
              <div className="text-xs font-bold text-white mb-1">Low Fees</div>
              <div className="text-[10px] text-gray-400">Minimal gas costs</div>
            </div>
          </div>

          <div className="flex-1"></div>

          {/* CTA Buttons */}
          <div className="w-full flex flex-col gap-4 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <button 
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full h-14 rounded-full bg-neon-green text-black font-bold text-base tracking-wide uppercase hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neon-green/30"
            >
              {connected ? 'Enter App' : 'Connect Wallet'}
            </button>
            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Connect your Solana wallet to start making private payments with P-Links
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-6 text-[10px] text-gray-500 uppercase tracking-widest opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-purple-500"></span>
              Solana
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-neon-green"></span>
              Online
            </span>
            <span>ZK-Powered</span>
            <span>v1.0.0</span>
          </div>
        </main>
      </div>
    </div>
  );
}
