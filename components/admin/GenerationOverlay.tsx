'use client';

import React, { useEffect, useState } from 'react';

interface GenerationOverlayProps {
    stage: number;
}

const stages = [
    'Analyzing your text...',
    'Structuring content...',
    'Generating comments...',
    'Finalizing article...',
];

export default function GenerationOverlay({ stage }: GenerationOverlayProps) {
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; speed: number }[]>([]);

    useEffect(() => {
        // Generate floating particles
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            speed: Math.random() * 2 + 1,
        }));
        setParticles(newParticles);
    }, []);

    const progress = ((stage + 1) / stages.length) * 100;

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Animated gradient background */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(-45deg, #0f172a, #1e3a5f, #0f172a, #1e293b)',
                    backgroundSize: '400% 400%',
                    animation: 'gradientShift 15s ease infinite',
                }}
            />

            {/* Floating particles */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full bg-white/10"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        animation: `float ${particle.speed + 3}s ease-in-out infinite`,
                        animationDelay: `${particle.id * 0.1}s`,
                    }}
                />
            ))}

            {/* Pulsing orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
                {/* Logo / Branding */}
                <div className="mb-12">
                    <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
                        <span className="text-3xl font-bold text-white">T</span>
                    </div>
                </div>

                {/* Custom spinner */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                    <div 
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-blue-500"
                        style={{ animation: 'spin 1s linear infinite' }}
                    />
                    <div 
                        className="absolute inset-2 rounded-full border-4 border-transparent border-b-white/30"
                        style={{ animation: 'spin 1.5s linear infinite reverse' }}
                    />
                </div>

                {/* Current stage text */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
                    {stages[stage] || stages[0]}
                </h2>

                {/* Progress bar */}
                <div className="w-full max-w-md mb-8">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stage indicators */}
                <div className="flex items-center gap-3">
                    {stages.map((_, index) => (
                        <div
                            key={index}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                                index <= stage 
                                    ? 'bg-cyan-400 scale-110' 
                                    : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>

                {/* Subtitle */}
                <p className="mt-8 text-white/50 text-sm font-medium tracking-wide">
                    Creating something beautiful...
                </p>
            </div>

            {/* CSS animations */}
            <style jsx>{`
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

