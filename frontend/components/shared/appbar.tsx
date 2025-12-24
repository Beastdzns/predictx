'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useNavigationStore, useFilterStore } from '@/lib/store';
import HowItWorksDialog from './how-it-works-dialog';
import { HelpCircle, Download } from 'lucide-react';

const topCategories = [
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'new', label: 'New', icon: '✨' },
    { id: 'all', label: 'All', icon: '📋' },
];

const allCategories = [
    'Climate and Weather',
    'Companies',
    'Crypto',
    'Economics',
    'Entertainment',
    'Financials',
    'Health',
    'Politics',
    'Science and Technology',
    'Sports',
    'Transportation',
    'World'
];

export default function Appbar() {
    const router = useRouter();
    const { ready, authenticated, user } = usePrivy();
    const { logout } = useLogout();
    const { selectedBottomNav } = useNavigationStore();
    const {
        selectedCategory,
        setSelectedCategory,
        setTagsByCategories,
    } = useFilterStore();
    
    const [howItWorksOpen, setHowItWorksOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    
    const { login } = useLogin({
        onComplete({ user, isNewUser }) {
            console.log('Login successful', { user, isNewUser });
            // Don't auto-redirect, let users stay on current page
        },
    });

    useEffect(() => {
        // Fetch tags from API
        const fetchTags = async () => {
            try {
                const response = await fetch('/api/kalshi/tags', {
                    cache: "no-store",
                });
                const data = await response.json();
                if (data.tags_by_categories) {
                    setTagsByCategories(data.tags_by_categories);
                }
            } catch (error) {
                console.error('Failed to fetch tags:', error);
            }
        };
        fetchTags();
    }, [setTagsByCategories]);

    // Handle PWA install prompt
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    const showCategories = selectedBottomNav === 'explore';

    return (
        <div className="fixed top-0 left-0 right-0 w-full bg-black border-b border-yellow-500/20 z-10 backdrop-blur-sm">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4">
                {/* Logo & How It Works */}
                <div className="flex items-center gap-3">
                    <img
                        src="/logo-yellow.png"
                        alt="Logo"
                        className="relative w-28 h-10 object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                    <button
                        onClick={() => setHowItWorksOpen(true)}
                        className="flex items-center"
                    >
                        <HelpCircle className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    {ready && authenticated ? (
                        <>
                            {showInstallButton && (
                                <Button
                                    onClick={handleInstallClick}
                                    className="bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-all duration-300 border border-yellow-400/30"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            )}
                            <span className="text-yellow-400 text-sm hidden md:block">
                                {user?.email?.address || user?.phone?.number || user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4) || 'User'}
                            </span>
                            <Button
                                variant="ghost"
                                onClick={logout}
                                className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all duration-300 border border-yellow-400/30"
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={login}
                                disabled={!ready}
                                className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all duration-300 border border-yellow-400/30"
                            >
                                Login
                            </Button>
                            <Button
                                onClick={login}
                                disabled={!ready}
                                className="bg-yellow-400 text-black hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-400/20 font-semibold"
                            >
                                Sign Up
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Category Slider */}
            <AnimatePresence mode="wait">
                {showCategories && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                            duration: 0.4,
                            ease: [0.23, 1, 0.32, 1]
                        }}
                        className="relative overflow-hidden"
                    >
                        <motion.div
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            exit={{ y: -20 }}
                            transition={{
                                duration: 0.3,
                                ease: [0.23, 1, 0.32, 1]
                            }}
                            className="overflow-x-auto scrollbar-hide"
                        >
                            <div className="flex items-center gap-2 px-4 pb-4">
                                {topCategories.map((category, index) => (
                                    <motion.button
                                        key={category.id}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        layout
                                        transition={{
                                            duration: 0.4,
                                            delay: index * 0.05,
                                            ease: [0.23, 1, 0.32, 1],
                                            layout: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
                                        }}
                                        whileHover={{ 
                                            scale: 1.05,
                                            transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`
                                            group relative flex items-center px-4 py-1 rounded-lg
                                            whitespace-nowrap
                                            ${selectedCategory === category.id
                                                ? 'font-serif text-white shadow-sm shadow-yellow-400/30'
                                                : 'bg-black text-white hover:bg-zinc-800'
                                            }
                                        `}
                                    >
                                        <motion.span className="text-sm">
                                            {category.icon}
                                        </motion.span>
                                        
                                        <span className="text-sm font-medium">
                                            {category.label}
                                        </span>

                                        {selectedCategory === category.id && (
                                            <motion.div
                                                layoutId="categoryIndicator"
                                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 380,
                                                    damping: 30,
                                                    mass: 0.8
                                                }}
                                            />
                                        )}
                                    </motion.button>
                                ))}
                                
                                {/* Separator */}
                                <div className="w-px h-6" />
                                
                                {/* All other categories */}
                                {allCategories.map((category, index) => (
                                    <motion.button
                                        key={category}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        layout
                                        transition={{
                                            duration: 0.4,
                                            delay: (topCategories.length + index) * 0.05,
                                            ease: [0.23, 1, 0.32, 1],
                                            layout: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
                                        }}
                                        whileHover={{ 
                                            scale: 1.05,
                                            transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`
                                            group relative flex items-center gap-2 px-4 py-1 rounded-lg
                                            whitespace-nowrap
                                            ${selectedCategory === category
                                                ? 'font-serif text-white shadow-sm shadow-yellow-400/30'
                                                : 'bg-black text-white hover:bg-zinc-800'
                                            }
                                        `}
                                    >
                                        <span className="text-sm font-medium">
                                            {category}
                                        </span>

                                        {selectedCategory === category && (
                                            <motion.div
                                                layoutId="categoryIndicator"
                                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 380,
                                                    damping: 30,
                                                    mass: 0.8
                                                }}
                                            />
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* How It Works Dialog */}
            <HowItWorksDialog open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />

            {/* Hide scrollbar */}
            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}