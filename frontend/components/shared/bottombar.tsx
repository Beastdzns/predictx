'use client';

import { useEffect } from 'react';
import { Wallet, User, Users, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore } from '@/lib/store';

const navItems = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/' },
  { id: 'social', label: 'Social', icon: Users, href: '/social' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, href: '/wallet' },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];

export default function Bottombar() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedBottomNav, setSelectedBottomNav } = useNavigationStore();

  useEffect(() => {
    const currentItem = navItems.find(item => item.href === pathname);
    if (currentItem) {
      setSelectedBottomNav(currentItem.id);
    }
  }, [pathname, setSelectedBottomNav]);

  const handleNavigation = (item: typeof navItems[0]) => {
    setSelectedBottomNav(item.id);
    router.push(item.href);
  };

  return (
    <div className="fixed -bottom-0.5 left-0 right-0 bg-black border-t border-yellow-500/20 backdrop-blur-sm z-10">
      <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = selectedBottomNav === item.id;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.23, 1, 0.32, 1]
              }}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation(item)}
              className="group flex flex-col items-center gap-1 px-4 py-2 rounded-xl relative"
            >
              {/* Background glow for selected item */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0 rounded-xl"
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                className="relative"
                animate={{
                  scale: isSelected ? 1.1 : 1,
                  color: isSelected ? '#facc15' : '#ffffff'
                }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <Icon className="w-6 h-6" strokeWidth={isSelected ? 2.5 : 2} />
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  color: isSelected ? '#facc15' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: isSelected ? 600 : 500
                }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="text-xs relative z-10"
              >
                {item.label}
              </motion.span>

              {/* Bottom indicator line */}
              {isSelected && (
                <motion.div
                  layoutId="bottomBarIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-full"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
