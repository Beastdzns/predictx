'use client';

import { Nfc, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface PhantomCardProps {
  showDetails: boolean;
}

export function PhantomCard({ showDetails }: PhantomCardProps) {
    return (
        <div className="relative w-full aspect-[1.58/1]" style={{ perspective: '1000px' }}>
            <motion.div
                className="relative w-full h-full"
                initial={false}
                animate={{ rotateY: showDetails ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front Side - Masked Details */}
                <div
                    className="absolute w-full h-full rounded-xl bg-white border border-solana-purple/60 p-6 flex flex-col justify-between overflow-hidden shadow-solana-purple/30 shadow-lg"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Solana Logo Background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-25">
                        <Image 
                            src="/solana-sol-logo.svg" 
                            alt="Solana Logo" 
                            width={200} 
                            height={200}
                            className="object-contain"
                        />
                    </div>
                    
                    <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent"></div>
                    <div className="absolute -left-10 bottom-0 w-48 h-48 bg-solana-purple/60 blur-[80px] rounded-full"></div>
                    <div className="absolute -right-10 top-0 w-40 h-40 bg-neon-green/60 blur-[70px] rounded-full"></div>

                    {/* Card Top Row */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-2 text-white/90">
                            <p className="text-solana-purple">Solana</p>
                        </div>
                        <div className="text-right">
                            <p className="text-solana-purple font-bold text-lg tracking-widest italic drop-shadow-[0_0_8px_rgba(153,69,255,0.6)]">
                                PHANTOM
                            </p>
                        </div>
                    </div>

                    {/* Card Number */}
                    <div className="relative justify-between flex items-center z-10 mt-2">
                        <p className="text-black text-xl sm:text-2xl md:text-3xl font-mono font-medium tracking-widest drop-shadow-[0_0_5px_rgba(19,241,149,0.5)]">
                            XXXX XXXX XXXX 0402
                        </p>
                        <div className="w-10 h-8 rounded bg-linear-to-br from-yellow-200 to-yellow-600 ml-1 border border-white/20 opacity-90 relative overflow-hidden">
                            <div className="absolute inset-0 border-[0.5px] border-black/20 grid grid-cols-2">
                                <div className="border-r border-black/20 h-full"></div>
                                <div className="h-full"></div>
                            </div>
                            <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-black/20"></div>
                        </div>
                    </div>

                    {/* Card Bottom Row */}
                    <div className="relative z-10 flex justify-between items-end">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-[8px] text-black/50 font-mono mb-0.5">VALID THRU</p>
                                <p className="text-sm text-black font-mono tracking-wider">12/28</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-black/50 font-mono mb-0.5">CVV</p>
                                <p className="text-sm text-black font-mono tracking-wider">**9</p>
                            </div>
                        </div>
                        <div>
                            <Nfc className="w-6 h-6 text-black/70" />
                        </div>
                    </div>
                </div>

                {/* Back Side - Full Details */}
                <div
                    className="absolute w-full h-full rounded-xl bg-white border border-solana-purple/60 p-6 flex flex-col justify-between overflow-hidden shadow-[0_0_25px_rgba(153,69,255,0.3)]"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    {/* Solana Logo Background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-25">
                        <Image 
                            src="/solana-sol-logo.svg" 
                            alt="Solana Logo" 
                            width={200} 
                            height={200}
                            className="object-contain"
                        />
                    </div>
                    
                    {/* Card Background Effects */}
                    <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent"></div>
                    <div className="absolute -left-10 bottom-0 w-48 h-48 bg-solana-purple/60 blur-[80px] rounded-full"></div>
                    <div className="absolute -right-10 top-0 w-40 h-40 bg-neon-green/60 blur-[70px] rounded-full"></div>

                    {/* Card Top Row */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-2 text-black/90">
                            <p className="text-solana-purple">Solana</p>
                        </div>
                        <div className="text-right">
                            <p className="text-solana-purple font-bold text-lg tracking-widest italic drop-shadow-[0_0_8px_rgba(153,69,255,0.6)]">
                                PHANTOM
                            </p>
                        </div>
                    </div>

                    {/* Card Number - Full */}
                    <div className="relative justify-between flex items-center z-10 mt-2">
                        <p className="text-black text-xl sm:text-2xl md:text-3xl font-mono font-medium tracking-widest drop-shadow-[0_0_5px_rgba(19,241,149,0.5)]">
                            4782 9156 3421 0402
                        </p>
                        <div className="w-10 h-8 rounded bg-linear-to-br from-yellow-200 to-yellow-600 ml-1 border border-white/20 opacity-90 relative overflow-hidden">
                            <div className="absolute inset-0 border-[0.5px] border-black/20 grid grid-cols-2">
                                <div className="border-r border-black/20 h-full"></div>
                                <div className="h-full"></div>
                            </div>
                            <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-black/20"></div>
                        </div>
                    </div>

                    {/* Card Bottom Row - Full Details */}
                    <div className="relative z-10 flex justify-between items-end">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-[8px] text-black/50 font-mono mb-0.5">VALID THRU</p>
                                <p className="text-sm text-black font-mono tracking-wider">12/28</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-black/50 font-mono mb-0.5">CVV</p>
                                <p className="text-sm text-black font-mono tracking-wider">429</p>
                            </div>
                        </div>
                        <div>
                            <Nfc className="w-6 h-6 text-black/70" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
