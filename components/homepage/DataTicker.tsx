'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';
import { FileText } from 'lucide-react';

interface StatItem {
    text: string;
    citation: string;
}

const stats: StatItem[] = [
    { text: '34 symptoms', citation: 'Journal of Women\'s Health, 2023 - Average symptom count during perimenopause' },
    { text: '1.2 billion women', citation: 'WHO Global Report, 2024 - Women experiencing menopause worldwide' },
    { text: '7 years average duration', citation: 'NEJM Study, 2022 - Median duration of menopausal transition' },
    { text: '75% experience disruption', citation: 'Mayo Clinic Research, 2023 - Impact on daily life quality' },
    { text: '48 is the average age', citation: 'NIH Data, 2024 - Mean age of menopause onset' },
];

export default function DataTicker() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const tickerCopyRef = useRef<HTMLDivElement | null>(null);
    const loopWidthRef = useRef(0);
    const x = useMotionValue(0);

    useEffect(() => {
        const updateLoopWidth = () => {
            loopWidthRef.current = tickerCopyRef.current?.scrollWidth ?? 0;
        };

        updateLoopWidth();
        window.addEventListener('resize', updateLoopWidth);

        return () => window.removeEventListener('resize', updateLoopWidth);
    }, []);

    useAnimationFrame((_, delta) => {
        if (!isPaused && loopWidthRef.current > 0) {
            const next = x.get() - delta * 0.05;
            x.set(next <= -loopWidthRef.current ? 0 : next);
        }
    });

    return (
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center mb-2">
                    By the Numbers
                </h2>
                <p className="text-gray-300 text-center text-sm">
                    Hover over any stat to see the source
                </p>
            </div>

            <div className="relative">
                <div className="flex gap-8 whitespace-nowrap">
                    {/* Render multiple copies for infinite scroll effect */}
                    {[...Array(3)].map((_, copyIndex) => (
                        <motion.div
                            key={copyIndex}
                            ref={copyIndex === 0 ? tickerCopyRef : undefined}
                            className="flex gap-8"
                            style={{ x }}
                        >
                            {stats.map((stat, index) => {
                                const globalIndex = copyIndex * stats.length + index;
                                const isHovered = hoveredIndex === index;

                                return (
                                    <div
                                        key={globalIndex}
                                        className="relative inline-block"
                                        onMouseEnter={() => {
                                            setHoveredIndex(index);
                                            setIsPaused(true);
                                        }}
                                        onMouseLeave={() => {
                                            setHoveredIndex(null);
                                            setIsPaused(false);
                                        }}
                                    >
                                        <motion.div
                                            className="px-8 py-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <p className="text-2xl md:text-3xl font-bold text-white font-serif">
                                                {stat.text}
                                            </p>
                                        </motion.div>

                                        {/* Citation Card */}
                                        {isHovered && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 z-20 w-80 bg-white rounded-lg shadow-2xl p-4 border-l-4 border-red-600"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <FileText className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 mb-1">Source:</p>
                                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-normal">
                                                            {stat.citation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
