'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface Voice {
    name: string;
    age: number;
    quote: string;
    image: string;
}

const voices: Voice[] = [
    {
        name: 'Maria',
        age: 52,
        quote: 'For years I thought I was losing my mind. Turns out, I was just losing my estrogen.',
        image: 'https://picsum.photos/seed/maria/400/600',
    },
    {
        name: 'Jennifer',
        age: 48,
        quote: 'My doctor said "it\'s just menopause." But knowing the WHY changed everything.',
        image: 'https://picsum.photos/seed/jennifer/400/600',
    },
    {
        name: 'Aisha',
        age: 55,
        quote: 'I wish someone had told me about vaginal atrophy before I suffered in silence for 3 years.',
        image: 'https://picsum.photos/seed/aisha/400/600',
    },
    {
        name: 'Linda',
        age: 50,
        quote: 'HRT gave me back my energy, my sleep, and my confidence. I only wish I\'d started sooner.',
        image: 'https://picsum.photos/seed/linda/400/600',
    },
    {
        name: 'Sophie',
        age: 46,
        quote: 'Brain fog isn\'t "just aging." It\'s a symptom, and it\'s treatable.',
        image: 'https://picsum.photos/seed/sophie/400/600',
    },
    {
        name: 'Priya',
        age: 53,
        quote: 'Understanding the gut-brain connection transformed my approach to menopause.',
        image: 'https://picsum.photos/seed/priya/400/600',
    },
];

export default function VoicesCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        const scrollSpeed = hoveredIndex !== null ? 0.2 : 1;
        let scrollPosition = scrollContainer.scrollLeft;
        let frameId = 0;

        const animate = () => {
            scrollPosition += scrollSpeed;

            if (scrollPosition >= scrollContainer.scrollWidth / 2) {
                scrollPosition = 0;
            }

            scrollContainer.scrollLeft = scrollPosition;
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameId);
    }, [hoveredIndex]);

    return (
        <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                        Voices of Change
                    </h2>
                    <p className="text-lg text-gray-600">
                        Real women. Real stories. Hover to pause and read their experiences.
                    </p>
                </motion.div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Duplicate array for infinite scroll */}
                {[...voices, ...voices].map((voice, index) => (
                    <div
                        key={index}
                        className="relative flex-shrink-0 w-80"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <motion.div
                            className="relative h-96 rounded-2xl overflow-hidden shadow-xl"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Image
                                unoptimized
                                src={voice.image}
                                alt={voice.name}
                                fill
                                sizes="320px"
                                className="object-cover"
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Name Tag */}
                            <div className="absolute bottom-6 left-6 right-6">
                                <p className="text-white font-bold text-xl font-serif mb-1">
                                    {voice.name}, {voice.age}
                                </p>
                            </div>

                            {/* Quote Bubble */}
                            {hoveredIndex === index && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-6 flex items-center justify-center"
                                >
                                    <div className="bg-white rounded-xl p-6 shadow-2xl max-w-xs">
                                        <Quote className="w-8 h-8 text-pink-600 mb-3" />
                                        <p className="text-gray-800 leading-relaxed text-sm italic">
                                            &ldquo;{voice.quote}&rdquo;
                                        </p>
                                        <p className="text-right text-sm font-bold text-gray-900 mt-3">
                                            — {voice.name}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                ))}
            </div>
        </section>
    );
}
