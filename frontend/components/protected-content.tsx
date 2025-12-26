'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProtectedContentProps {
  children: ReactNode;
  isUnlocked: boolean;
  onUnlock: () => void;
  blurAmount?: string;
  message?: string;
  title?: string;
}

export default function ProtectedContent({
  children,
  isUnlocked,
  onUnlock,
  blurAmount = 'blur-md',
  message = 'Pay to unlock',
  title,
}: ProtectedContentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR and initial hydration, always show locked state
  const shouldShowLocked = !isClient || !isUnlocked;

  return (
    <div className="space-y-3">
      {/* Header with title and unlock button */}
      {shouldShowLocked && title && (
        <div className="flex items-center justify-between">
          <h3 className="text-yellow-400 font-semibold text-lg">{title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnlock();
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg text-sm"
          >
            <Lock className="w-4 h-4" />
            {message}
          </button>
        </div>
      )}

      {/* Content with blur effect */}
      <div className="relative">
        <div className={`${shouldShowLocked ? `${blurAmount} pointer-events-none select-none` : ''}`}>
          {children}
        </div>

        {/* Overlay backdrop when locked */}
        {shouldShowLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}
