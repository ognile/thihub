'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Brain, Activity, Heart } from 'lucide-react';

export default function RootCauseParallax() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end start'],
    });

    // Transform scroll progress for different elements
    const brainY = useTransform(scrollYProgress, [0, 0.5], [100, 0]);
    const gutY = useTransform(scrollYProgress, [0.2, 0.7], [100, 0]);
    const reproductiveY = useTransform(scrollYProgress, [0.4, 0.9], [100, 0]);
    const pathOpacity = useTransform(scrollYProgress, [0.3, 0.7], [0, 1]);

    return (
        <section ref={sectionRef} className="py-32 bg-gradient-to-b from-indigo-50 to-purple-50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                        The Root Cause Connection
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Scroll to see how the gut-vagina-brain axis communicates. It&apos;s not just one organ, it&apos;s a network.
                    </p>
                </div>

                {/* Connection Visualization - Vertical Stack */}
                <div className="relative max-w-3xl mx-auto">
                    {/* Connecting Lines */}
                    <motion.div
                        className="absolute left-1/2 transform -translate-x-1/2 top-32 bottom-32 w-1"
                        style={{ opacity: pathOpacity }}
                    >
                        {/* Animated gradient line */}
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-600 via-green-600 to-pink-600 rounded-full">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-b from-purple-400 via-green-400 to-pink-400 rounded-full"
                                animate={{
                                    opacity: [0.3, 0.8, 0.3],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        </div>
                    </motion.div>

                    {/* Brain */}
                    <motion.div
                        className="relative mb-24"
                        style={{ y: brainY }}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-white rounded-2xl shadow-xl p-8 border-4 border-purple-600">
                            <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full p-6 shadow-lg">
                                <Brain className="w-12 h-12 text-white" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 font-serif">Brain</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Regulates mood, cognition, and stress response. The hypothalamus controls hormone release and communicates via the vagus nerve, your body&apos;s information highway.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Gut Microbiome */}
                    <motion.div
                        className="relative mb-24"
                        style={{ y: gutY }}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-white rounded-2xl shadow-xl p-8 border-4 border-green-600">
                            <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full p-6 shadow-lg">
                                <Activity className="w-12 h-12 text-white" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 font-serif">Gut Microbiome</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Produces 90% of your serotonin and metabolizes estrogen. An imbalanced gut can worsen hot flashes, mood swings, and inflammation during menopause.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Reproductive System */}
                    <motion.div
                        className="relative"
                        style={{ y: reproductiveY }}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-white rounded-2xl shadow-xl p-8 border-4 border-pink-600">
                            <div className="flex-shrink-0 bg-gradient-to-br from-pink-500 to-rose-700 rounded-full p-6 shadow-lg">
                                <Heart className="w-12 h-12 text-white" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 font-serif">Reproductive Organs</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Estrogen receptors exist in every organ. When production drops, the ripple effects touch brain function, bone density, skin health, and cardiovascular risk.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 text-center max-w-3xl mx-auto bg-gradient-to-r from-purple-100 via-green-100 to-pink-100 rounded-xl shadow-lg p-8"
                >
                    <p className="text-lg text-gray-800 leading-relaxed font-medium">
                        This interconnected axis explains why menopause isn&apos;t just about reproduction, it&apos;s systemic.
                        When estrogen drops, the <strong>entire network responds</strong>. Understanding this is the first step to healing.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
