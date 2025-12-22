'use client';

import { useState } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy } from '@privy-io/react-auth';
import { div, img } from 'framer-motion/client';
import { Copy, Mail, Phone, Wallet } from 'lucide-react';

export default function ProfilePage() {
    const { user, linkEmail, linkPhone, linkGoogle, linkWallet, linkTwitter, linkGithub, linkDiscord } = usePrivy();
    const [hoveredService, setHoveredService] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const socialServices = [
        {
            name: 'Google',
            icon: <img src="/google.png" alt="Google" className="w-10 h-10" />,
            onClick: linkGoogle,
            isLinked: !!user?.google,
            data: user?.google,
        },
        {
            name: 'Twitter',
            icon: <img src="/x.png" alt="Twitter" className="w-10 h-10" />,
            onClick: linkTwitter,
            isLinked: !!user?.twitter,
            data: user?.twitter,
        },
        {
            name: 'GitHub',
            icon: <img src="/github.png" alt="GitHub" className="w-10 h-10" />,
            onClick: linkGithub,
            isLinked: !!user?.github,
            data: user?.github,
        },
        {
            name: 'Discord',
            icon: <img src="/discord.png" alt="Discord" className="w-10 h-10" />,
            onClick: linkDiscord,
            isLinked: !!user?.discord,
            data: user?.discord,
        },
    ];

    const extraServices = [
        {
            name: 'Phone',
            icon: <Phone className='text-white' />,
            onClick: linkPhone,
            isLinked: !!user?.phone,
            data: user?.phone,
        },
        {
            name: 'External Wallet',
            icon: <Wallet className='text-white' />,
            onClick: linkWallet,
            isLinked: !!user?.wallet && (user.wallet as any)?.connectorType !== 'embedded',
            data: user?.wallet,
        },
        {
            name: 'Email',
            icon: <Mail className='text-white' />,
            onClick: linkEmail,
            isLinked: !!user?.email,
            data: user?.email,
        },
    ];

    return (
        <AuthenticatedLayout>
            <div className="px-6 pb-24">
                <h1 className="text-3xl font-bold text-yellow-400 mb-2">Profile</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Manage your account and linked services
                </p>

                {/* User Info Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-linear-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-3xl">
                            {user?.google?.name?.charAt(0) || user?.email?.address?.charAt(0).toUpperCase() || '👤'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {user?.google?.name || 'Anonymous User'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {user?.email?.address || 'No email'}
                            </p>
                        </div>
                    </div>

                    {user?.wallet && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400">Embedded Wallet</p>
                                <button
                                    onClick={() => copyToClipboard(user.wallet?.address || '')}
                                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-xs font-semibold transition-all"
                                >
                                    {copied ? '✓' : <Copy className="inline-block mb-0.5 h-3 w-3" />}
                                </button>
                            </div>
                            <p className="text-yellow-400 font-mono text-xs break-all bg-zinc-950 p-3 rounded-lg">
                                {user.wallet.address}
                            </p>
                        </div>
                    )}
                </div>

                {/* Socials Section */}
                <section className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">Socials</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {socialServices.map((service) => (
                            <div key={service.name} className='flex flex-col justify-center items-center'>
                                <button
                                    key={service.name}
                                    onClick={service.onClick}
                                    disabled={service.isLinked}
                                    onMouseEnter={() => setHoveredService(service.name)}
                                    onMouseLeave={() => setHoveredService(null)}
                                    className={`relative aspect-square rounded-xl flex items-center justify-center text-5xl transition-all ${service.isLinked
                                        ? 'bg-zinc-900/50 opacity-40 cursor-not-allowed'
                                        : 'bg-zinc-900 hover:bg-zinc-800'
                                        }`}
                                >
                                    {service.icon}
                                    {service.isLinked && hoveredService === service.name && (
                                        <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center">
                                            <p className="text-xs text-yellow-400 font-semibold">Already Linked</p>
                                        </div>
                                    )}
                                </button>
                                <p className='text-sm text-white/50 pt-2'>{service.name}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Extras Section */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4">Extras</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {extraServices.map((service) => (
                            <div key={service.name} className='flex flex-col justify-center items-center'>
                                <button
                                    onClick={service.onClick}
                                    disabled={service.isLinked}
                                    onMouseEnter={() => setHoveredService(service.name)}
                                    onMouseLeave={() => setHoveredService(null)}
                                    className={`relative aspect-square rounded-xl flex items-center justify-center text-5xl transition-all ${service.isLinked
                                        ? 'bg-zinc-900/50 opacity-40 cursor-not-allowed'
                                        : 'bg-zinc-900 hover:bg-zinc-800'
                                        }`}
                                >
                                    {service.icon}
                                    {service.isLinked && hoveredService === service.name && (
                                        <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center">
                                            <p className="text-xs text-yellow-400 font-semibold">Already Linked</p>
                                        </div>
                                    )}
                                </button>
                                <p className='text-sm text-white/50 text-center pt-2'>{service.name}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
