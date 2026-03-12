'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { buildQuizEntryUrl } from '@/lib/quizzes/url';
import { ParticleSystem } from '@/utils/particles';

export default function HeroSection() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const quizEntryUrl = buildQuizEntryUrl({ source: 'homepage-hero' });

    useEffect(() => {
        if (!canvasRef.current) return;

        const particleCount = window.innerWidth < 768 ? 25 : 50;
        const particleSystem = new ParticleSystem(canvasRef.current, particleCount);

        particleSystem.start();

        const handleMouseMove = (e: MouseEvent) => {
            particleSystem.updateMousePosition(e.clientX, e.clientY);
        };

        const handleResize = () => {
            particleSystem.resizeCanvas();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
            particleSystem.destroy();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <section className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-red-50">
            {/* Video Background Placeholder - Abstract Gradient Animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-rose-100/40 via-pink-100/40 to-red-100/40 animate-gradient" />

            {/* Particle Canvas Overlay */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ mixBlendMode: 'multiply' }}
            />

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-full px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-4xl"
                >
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6 leading-tight"
                    >
                        The change nobody talks about.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="text-lg md:text-xl text-gray-700 font-sans max-w-2xl mx-auto"
                    >
                        A billion women. Decades of silence. It&apos;s time we had the conversation.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
                    >
                        <Link
                            href={quizEntryUrl}
                            className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#0f4c81] px-8 py-4 font-sans text-sm font-bold uppercase tracking-[0.24em] text-white shadow-[0_18px_40px_rgba(15,76,129,0.28)] transition hover:translate-y-[-1px] hover:bg-[#0b3a63]"
                        >
                            take the 4-minute profile
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                        <div className="rounded-full border border-white/50 bg-white/70 px-5 py-3 backdrop-blur-sm">
                            <div className="flex items-center justify-center gap-2 text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-gray-700">
                                <Sparkles className="h-3.5 w-3.5 text-[#0f4c81]" />
                                homepage hero entry
                            </div>
                            <p className="mt-1 text-sm text-gray-600">personalized result, education, then offer</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-gray-500"
                >
                    <svg
                        className="w-6 h-6 mx-auto"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                    </svg>
                    <p className="text-xs mt-2">Scroll to explore</p>
                </motion.div>
            </motion.div>
        </section>
    );
}
