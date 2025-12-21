'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

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

    return (
        <div className="sticky top-0 w-full bg-black border-b border-yellow-500/20 z-50 backdrop-blur-sm">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                        <img
                            src="/logo-yellow.png"
                            alt="Logo"
                            className="relative w-28 h-10 object-contain transition-transform duration-300 hover:scale-110"
                        />
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all duration-300 border border-yellow-400/30"
                    >
                        Login
                    </Button>
                    <Button className="bg-yellow-400 text-black hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-400/20 font-semibold">
                        Sign Up
                    </Button>
                </div>
            </div>

            {/* Category Slider */}
            <div className="relative overflow-x-auto scrollbar-hide">
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
                                    ? 'text-white shadow-sm shadow-yellow-400/30'
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
            </div>

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