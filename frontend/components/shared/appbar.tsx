'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useNavigationStore } from '@/lib/store';

const categories = [
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'new', label: 'New', icon: '✨' },
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'political', label: 'Political', icon: '🏛️' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'culture', label: 'Culture', icon: '🎭' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'forex', label: 'Forex', icon: '💱' },
    { id: 'finance', label: 'Finance', icon: '📈' },
    { id: 'climate', label: 'Climate', icon: '🌍' },
    { id: 'trump', label: 'Trump', icon: '🧑‍💼' },
    { id: 'geopolitics', label: 'Geopolitics', icon: '🌐' },
    { id: 'economics', label: 'Economics', icon: '💹' },
    { id: 'science', label: 'Science', icon: '🔬' },
    { id: 'billionaire', label: 'Billionaire', icon: '🤑' },
    { id: 'health', label: 'Health', icon: '⚕️' },
    { id: 'world', label: 'World', icon: '🌍' },
];

export default function Appbar() {
    const [selectedCategory, setSelectedCategory] = useState('trending');
    const router = useRouter();
    const { ready, authenticated, user } = usePrivy();
    const { logout } = useLogout();
    const { selectedBottomNav } = useNavigationStore();
    const { login } = useLogin({
        onComplete({ user, isNewUser }) {
            console.log('Login successful', { user, isNewUser });
            // Don't auto-redirect, let users stay on current page
        },
    });

    const showCategories = selectedBottomNav === 'explore';

    return (
        <div className="fixed top-0 left-0 right-0 w-full bg-black border-b border-yellow-500/20 z-10 backdrop-blur-sm">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <img
                        src="/logo-yellow.png"
                        alt="Logo"
                        className="relative w-28 h-10 object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    {ready && authenticated ? (
                        <>
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
                                {categories.map((category, index) => (
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
                                            group relative flex items-center gap-2 px-4 py-1 rounded-lg
                                            whitespace-nowrap
                                            ${selectedCategory === category.id
                                                ? 'font-serif text-white shadow-sm shadow-yellow-400/30'
                                                : 'bg-black text-white hover:bg-zinc-800'
                                            }
                                        `}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {selectedCategory === category.id && (
                                                <motion.span
                                                    initial={{ scale: 0, opacity: 0, width: 0 }}
                                                    animate={{ scale: 1, opacity: 1, width: 'auto' }}
                                                    exit={{ scale: 0, opacity: 0, width: 0 }}
                                                    transition={{
                                                        duration: 0.4,
                                                        ease: [0.23, 1, 0.32, 1]
                                                    }}
                                                    className="text-sm"
                                                >
                                                    {category.icon}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                        
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
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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