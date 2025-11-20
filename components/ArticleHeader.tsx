import React from 'react';
import Link from 'next/link';

interface ArticleHeaderProps {
    transparent?: boolean;
}

export default function ArticleHeader({ transparent = false }: ArticleHeaderProps) {
    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'bg-white border-b border-gray-200 shadow-sm'}`}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className={`w-8 h-8 flex items-center justify-center font-serif font-bold text-xl rounded-sm transition-colors ${transparent ? 'bg-white text-gray-900' : 'bg-[#0F4C81] text-white'}`}>
                        T
                    </div>
                    <span className={`font-serif font-bold text-lg tracking-tight transition-colors ${transparent ? 'text-white drop-shadow-md' : 'text-gray-900'}`}>
                        Top Health Insider
                    </span>
                </Link>
                <div className={`text-[10px] font-sans font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-colors ${transparent ? 'text-white border-white/30 bg-black/20 backdrop-blur-sm' : 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                    Trending Report
                </div>
            </div>
        </header>
    );
}
