"use client";

import NextImage from "next/image";
import { motion } from "framer-motion";

export interface BlinkCardData {
  cardTitle: string;
  cardDescription: string;
  cardImageUrl?: string;
  cardType: 'tip' | 'donation' | 'payment' | 'custom';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  requestedAmount: string;
}

interface BlinkCardProps {
  data: BlinkCardData;
  className?: string;
  animate?: boolean;
}

export default function BlinkCard({ data, className = "", animate = true }: BlinkCardProps) {
  const {
    cardTitle,
    cardDescription,
    cardImageUrl,
    cardType,
    primaryColor,
    secondaryColor,
    textColor,
    requestedAmount,
  } = data;

  // Get emoji based on card type
  const getTypeEmoji = () => {
    switch (cardType) {
      case 'tip':
        return '💰';
      case 'donation':
        return '❤️';
      case 'payment':
        return '💳';
      default:
        return '✨';
    }
  };

  const cardContent = (
    <div 
      className={`relative rounded-2xl overflow-hidden shadow-2xl ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${secondaryColor}44 100%)`,
      }}
    >
      {/* Animated gradient background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={animate ? {
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          } : {}}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: secondaryColor }}
        />
        <motion.div
          animate={animate ? {
            x: [0, -30, 0],
            y: [0, 20, 0],
            scale: [1, 1.2, 1],
          } : {}}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8">
        {/* Header with type badge */}
        <div className="flex items-center justify-between mb-6">
          <div 
            className="px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border"
            style={{
              backgroundColor: `${textColor}22`,
              borderColor: `${textColor}44`,
              color: textColor,
            }}
          >
            {getTypeEmoji()} {cardType.charAt(0).toUpperCase() + cardType.slice(1)}
          </div>
          <div className="w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center"
            style={{
              backgroundColor: `${textColor}22`,
              borderColor: `${textColor}44`,
            }}
          >
            <span className="text-2xl">⚡</span>
          </div>
        </div>

        {/* Image Section */}
        {cardImageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border-2 border-white/20 backdrop-blur-sm bg-white/10">
            <div className="relative w-full aspect-video">
              <NextImage
                src={cardImageUrl}
                alt={cardTitle}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Title and Description */}
        <div className="mb-6">
          <h2 
            className="text-3xl font-bold mb-3 leading-tight"
            style={{ color: textColor }}
          >
            {cardTitle}
          </h2>
          <p 
            className="text-base leading-relaxed opacity-90"
            style={{ color: textColor }}
          >
            {cardDescription}
          </p>
        </div>

        {/* Amount Section */}
        <div 
          className="backdrop-blur-md rounded-xl p-6 border"
          style={{
            backgroundColor: `${textColor}11`,
            borderColor: `${textColor}33`,
          }}
        >
          <p 
            className="text-sm font-semibold mb-2 opacity-80"
            style={{ color: textColor }}
          >
            AMOUNT
          </p>
          <div className="flex items-baseline gap-2">
            <span 
              className="text-5xl font-bold tracking-tight"
              style={{ 
                color: textColor,
                textShadow: `0 0 20px ${secondaryColor}88`,
              }}
            >
              {requestedAmount}
            </span>
            <span 
              className="text-2xl font-bold opacity-70"
              style={{ color: textColor }}
            >
              SOL
            </span>
          </div>
          <p 
            className="text-sm mt-2 opacity-70"
            style={{ color: textColor }}
          >
            ≈ ${(parseFloat(requestedAmount || '0') * 150).toFixed(2)} USD
          </p>
        </div>

        {/* Solana Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 opacity-60">
          <span 
            className="text-xs font-mono tracking-wider"
            style={{ color: textColor }}
          >
            POWERED BY Privacy Cash
          </span>
        </div>
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
