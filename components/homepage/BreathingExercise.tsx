'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

type Technique = '4-4-4' | '4-7-8';

const TECHNIQUE_TIMINGS: Record<Technique, { inhale: number; hold: number; exhale: number }> = {
    '4-4-4': { inhale: 4, hold: 4, exhale: 4 },
    '4-7-8': { inhale: 4, hold: 7, exhale: 8 },
};

export default function BreathingExercise() {
    const [isActive, setIsActive] = useState(false);
    const [technique, setTechnique] = useState<Technique>('4-4-4');
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [cycles, setCycles] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        const currentTimings = TECHNIQUE_TIMINGS[technique];

        const duration =
            phase === 'inhale'
                ? currentTimings.inhale
                : phase === 'hold'
                    ? currentTimings.hold
                    : currentTimings.exhale;

        const timer = setTimeout(() => {
            if (phase === 'inhale') {
                setPhase('hold');
            } else if (phase === 'hold') {
                setPhase('exhale');
            } else {
                setPhase('inhale');
                setCycles((prev) => prev + 1);
            }
        }, duration * 1000);

        return () => clearTimeout(timer);
    }, [isActive, phase, technique]);

    const getCircleScale = () => {
        if (phase === 'inhale') return 1.5;
        if (phase === 'hold') return 1.5;
        return 0.8;
    };

    const getPhaseText = () => {
        if (phase === 'inhale') return 'Breathe in...';
        if (phase === 'hold') return 'Hold...';
        return 'Breathe out...';
    };

    const toggleActive = () => {
        setIsActive(!isActive);
        if (!isActive) {
            setCycles(0);
            setPhase('inhale');
        }
    };

    return (
        <section className="py-20 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
            <div className="max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                        Take a Moment for Yourself
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Stress management is key during hormonal transitions. Try this guided breathing exercise.
                    </p>
                </motion.div>

                <div className="bg-white rounded-2xl shadow-xl p-12">
                    {/* Breathing Circle */}
                    <div className="flex items-center justify-center h-80 mb-8">
                        <div className="relative">
                            <motion.div
                                className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-2xl flex items-center justify-center"
                                animate={{
                                    scale: isActive ? getCircleScale() : 1,
                                }}
                                transition={{
                                    duration: phase === 'inhale' ? TECHNIQUE_TIMINGS[technique].inhale : phase === 'hold' ? TECHNIQUE_TIMINGS[technique].hold : TECHNIQUE_TIMINGS[technique].exhale,
                                    ease: 'easeInOut',
                                }}
                            >
                                <p className="text-white text-2xl font-bold font-serif">
                                    {isActive ? getPhaseText() : 'Ready?'}
                                </p>
                            </motion.div>

                            {/* Pulse rings */}
                            {isActive && (
                                <>
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-4 border-purple-400"
                                        animate={{
                                            scale: [1, 1.4, 1],
                                            opacity: [0.5, 0, 0.5],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                        }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-4 border-pink-400"
                                        animate={{
                                            scale: [1, 1.6, 1],
                                            opacity: [0.5, 0, 0.5],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            delay: 1,
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="text-center space-y-6">
                        <button
                            onClick={toggleActive}
                            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            {isActive ? (
                                <>
                                    <Pause className="w-6 h-6" />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6" />
                                    Start Breathing
                                </>
                            )}
                        </button>

                        {/* Technique Selector */}
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-sm text-gray-600 font-medium">Technique:</span>
                            <button
                                onClick={() => setTechnique('4-4-4')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${technique === '4-4-4'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                4-4-4 (Balanced)
                            </button>
                            <button
                                onClick={() => setTechnique('4-7-8')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${technique === '4-7-8'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                4-7-8 (Calming)
                            </button>
                        </div>

                        {/* Stats */}
                        {cycles > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4"
                            >
                                <p className="text-sm text-gray-700">
                                    <strong>Cycles completed:</strong> {cycles}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Research shows just 5 cycles can reduce cortisol and improve vagal tone.
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
