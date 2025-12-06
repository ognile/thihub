'use client';

import React, { useEffect, useState } from 'react';

interface GenerationOverlayProps {
    stage: number; // 0-3 for different stages
}

const STAGES = [
    { label: 'Analyzing your text', icon: '🔍' },
    { label: 'Structuring content', icon: '📐' },
    { label: 'Generating comments', icon: '💬' },
    { label: 'Finalizing article', icon: '✨' },
];

export default function GenerationOverlay({ stage }: GenerationOverlayProps) {
    const [dots, setDots] = useState('');
    const [particleKey, setParticleKey] = useState(0);

    // Animated dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    // Regenerate particles periodically for continuous effect
    useEffect(() => {
        const interval = setInterval(() => {
            setParticleKey(prev => prev + 1);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 animate-gradient-shift" />
            
            {/* Animated mesh gradient overlay */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent animate-pulse-slow" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-600/30 via-transparent to-transparent animate-pulse-slower" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent animate-breathe" />
            </div>

            {/* Floating particles */}
            <div key={particleKey} className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full animate-float-up"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${100 + Math.random() * 20}%`,
                            backgroundColor: ['#60A5FA', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'][i % 5],
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${6 + Math.random() * 4}s`,
                            opacity: 0.6 + Math.random() * 0.4,
                            boxShadow: `0 0 ${6 + Math.random() * 6}px currentColor`,
                        }}
                    />
                ))}
            </div>

            {/* Glowing orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-orb-1" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-orb-2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-orb-3" />

            {/* Content */}
            <div className="relative z-10 text-center px-6">
                {/* Main spinner */}
                <div className="relative w-32 h-32 mx-auto mb-10">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                    
                    {/* Spinning gradient ring */}
                    <div className="absolute inset-0 rounded-full animate-spin-slow">
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-purple-400" />
                    </div>
                    
                    {/* Inner spinning ring */}
                    <div className="absolute inset-3 rounded-full animate-spin-reverse">
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-b-cyan-400 border-l-pink-400" />
                    </div>

                    {/* Center glow */}
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 animate-pulse backdrop-blur-sm" />
                    
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl animate-bounce-subtle">{STAGES[stage]?.icon || '✨'}</span>
                    </div>
                </div>

                {/* Stage text with typewriter effect */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                        {STAGES[stage]?.label || 'Processing'}<span className="text-blue-400">{dots}</span>
                    </h2>
                    <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
                        Our AI is crafting your article with precision and care
                    </p>
                </div>

                {/* Progress bar */}
                <div className="max-w-xs mx-auto">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out animate-shimmer"
                            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-3">
                        {STAGES.map((s, i) => (
                            <div
                                key={i}
                                className={`flex flex-col items-center transition-all duration-500 ${i <= stage ? 'opacity-100' : 'opacity-30'}`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full mb-1 transition-all duration-500 ${
                                    i < stage 
                                        ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                                        : i === stage 
                                            ? 'bg-blue-400 shadow-lg shadow-blue-400/50 animate-pulse' 
                                            : 'bg-white/20'
                                }`} />
                                <span className="text-[10px] text-white/50 hidden sm:block">{s.icon}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subtle tip */}
                <p className="mt-10 text-white/30 text-xs">
                    This usually takes 10-15 seconds
                </p>
            </div>

            {/* Styles */}
            <style jsx>{`
                @keyframes gradient-shift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-shift {
                    background-size: 200% 200%;
                    animation: gradient-shift 8s ease infinite;
                }
                
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
                
                @keyframes pulse-slower {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                .animate-pulse-slower {
                    animation: pulse-slower 6s ease-in-out infinite;
                }
                
                @keyframes breathe {
                    0%, 100% { opacity: 0.1; transform: scale(0.95); }
                    50% { opacity: 0.3; transform: scale(1.05); }
                }
                .animate-breathe {
                    animation: breathe 5s ease-in-out infinite;
                }
                
                @keyframes float-up {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
                }
                .animate-float-up {
                    animation: float-up linear forwards;
                }
                
                @keyframes orb-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-orb-1 {
                    animation: orb-1 10s ease-in-out infinite;
                }
                
                @keyframes orb-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-40px, 20px) scale(1.15); }
                    66% { transform: translate(30px, -30px) scale(0.85); }
                }
                .animate-orb-2 {
                    animation: orb-2 12s ease-in-out infinite;
                }
                
                @keyframes orb-3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.2; }
                }
                .animate-orb-3 {
                    animation: orb-3 8s ease-in-out infinite;
                }
                
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
                
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-spin-reverse {
                    animation: spin-reverse 2s linear infinite;
                }
                
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    background-size: 200% 100%;
                    animation: shimmer 2s linear infinite;
                }
            `}</style>
        </div>
    );
}
