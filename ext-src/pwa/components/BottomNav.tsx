'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconWallet } from '@tabler/icons-react';
import { Plus, Download, Coins } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/private-payments/create', label: 'Create', icon: <Plus size={20} /> },
    { href: '/private-payments/deposit', label: 'Deposit', icon: <Download size={20} /> },
    { href: '/private-payments/claim', label: 'Claim', icon: <Coins size={20} /> },
    { href: '/wallet', label: 'Wallet', icon: <IconWallet size={20} /> },
  ];

  return (
    <nav className="fixed bottom-2 left-0 right-0 bg-slate-950 rounded-4xl shadow-xs shadow-zinc-700 z-50 mx-4">
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/wallet' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 transition-colors duration-200 ${
                isActive ? 'text-neon-green border-b-2 border-neon-green' : 'text-gray-200 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] uppercase tracking-wider font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
