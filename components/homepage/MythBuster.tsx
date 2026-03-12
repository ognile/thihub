'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/utils/animations';

interface MythCard {
    myth: string;
    reality: string;
}

const myths: MythCard[] = [
    {
        myth: "It's just hot flashes",
        reality: "Menopause involves 34+ documented symptoms affecting brain, heart, bones, metabolism, skin, and mental health—far beyond temperature regulation.",
    },
    {
        myth: 'Hormone therapy is dangerous',
        reality: 'Modern bioidentical HRT, when started early and properly dosed, has been shown to reduce cardiovascular risk, bone loss, and cognitive decline for many women.',
    },
    {
        myth: "It's a natural process, just deal with it",
        reality: "While natural, menopause is a hormone deficiency state. We don't tell diabetics to 'just deal with' low insulin. Treatment is valid and evidence-based.",
    },
    {
        myth: 'Weight gain is inevitable',
        reality: 'Hormonal shifts affect metabolism, but targeted strength training, protein intake, and managing stress can prevent or reverse menopausal weight gain.',
    },
];

export default function MythBuster() {
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

    const toggleCard = (index: number) => {
        setFlippedCards((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    return (
        <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="text-center mb-12"
                >
                    <motion.h2
                        variants={staggerItem}
                        className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4"
                    >
                        Myth vs. Reality
                    </motion.h2>
                    <motion.p variants={staggerItem} className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Hover (or tap) to flip these cards and uncover the medical truth behind common misconceptions.
                    </motion.p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {myths.map((card, index) => {
                        const isFlipped = flippedCards.has(index);

                        return (
                            <motion.div
                                key={index}
                                variants={staggerItem}
                                className="h-64 perspective-1000"
                                onHoverStart={() => toggleCard(index)}
                                onHoverEnd={() => toggleCard(index)}
                                onClick={() => toggleCard(index)}
                            >
                                <motion.div
                                    className="relative w-full h-full cursor-pointer"
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                    transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    {/* Front - Myth */}
                                    <div
                                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <div className="mb-4 text-white/80 text-sm font-bold uppercase tracking-wider">
                                            Common Myth
                                        </div>
                                        <p className="text-2xl md:text-3xl font-serif font-bold text-white leading-tight">
                                            &ldquo;{card.myth}&rdquo;
                                        </p>
                                        <div className="mt-6 text-white/70 text-sm flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4" />
                                            Hover to reveal truth
                                        </div>
                                    </div>

                                    {/* Back - Reality */}
                                    <div
                                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)'
                                        }}
                                    >
                                        <div className="mb-4 text-white/80 text-sm font-bold uppercase tracking-wider">
                                            Medical Reality
                                        </div>
                                        <p className="text-base md:text-lg text-white leading-relaxed">
                                            {card.reality}
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
