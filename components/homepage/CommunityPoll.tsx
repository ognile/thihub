'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface PollOption {
    id: string;
    label: string;
    votes: number;
    color: string;
}

const initialOptions: PollOption[] = [
    { id: 'weight', label: 'Weight Gain', votes: 4230, color: 'bg-red-600' },
    { id: 'insomnia', label: 'Insomnia', votes: 3890, color: 'bg-blue-600' },
    { id: 'dryness', label: 'Vaginal Dryness', votes: 2650, color: 'bg-purple-600' },
    { id: 'mood', label: 'Mood Swings', votes: 4410, color: 'bg-pink-600' },
];

export default function CommunityPoll() {
    const [voted, setVoted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [options, setOptions] = useState(initialOptions);

    const handleVote = (optionId: string) => {
        if (voted) return;

        // Add 1 vote to selected option
        setOptions((prev) =>
            prev.map((opt) =>
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            )
        );

        setSelectedOption(optionId);
        setVoted(true);
    };

    const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);

    return (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                        <span className="text-sm font-bold">Live Community Poll</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                        What&apos;s Your Most Frustrating Symptom Today?
                    </h2>
                    <p className="text-lg text-gray-600">
                        Join {totalVotes.toLocaleString()}+ women who&apos;ve shared their experience.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl shadow-xl p-8"
                >
                    <div className="space-y-4">
                        {options.map((option) => {
                            const percentage = ((option.votes / totalVotes) * 100).toFixed(1);
                            const isSelected = selectedOption === option.id;

                            return (
                                <div key={option.id}>
                                    <button
                                        onClick={() => handleVote(option.id)}
                                        disabled={voted}
                                        className={`w-full text-left transition-all ${voted ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900">{option.label}</span>
                                            <AnimatePresence>
                                                {voted && (
                                                    <motion.span
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="text-sm font-bold text-gray-700"
                                                    >
                                                        {percentage}%
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                                            <motion.div
                                                className={`absolute inset-y-0 left-0 ${option.color}`}
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: voted ? `${percentage}%` : '0%',
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    delay: 0.1,
                                                    ease: 'easeOut',
                                                }}
                                            />

                                            <div className="relative h-full flex items-center justify-between px-4">
                                                <span className={`font-medium ${voted && parseFloat(percentage) > 20 ? 'text-white' : 'text-gray-700'}`}>
                                                    {!voted ? 'Click to vote' : option.label}
                                                </span>
                                                <AnimatePresence>
                                                    {voted && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: 0.8 }}
                                                            className={`flex items-center gap-2 ${parseFloat(percentage) > 20 ? 'text-white' : 'text-gray-700'
                                                                }`}
                                                        >
                                                            <TrendingUp className="w-4 h-4" />
                                                            <span className="text-sm font-bold">
                                                                {option.votes.toLocaleString()} votes
                                                            </span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Selected indicator */}
                                            {isSelected && voted && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                                                >
                                                    <div className="w-3 h-3 bg-green-600 rounded-full" />
                                                </motion.div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {voted && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                            className="mt-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600"
                        >
                            <p className="text-sm text-gray-700">
                                <strong>You&apos;re not alone.</strong> Thousands of women are experiencing the same challenges.
                                Understanding the science behind these symptoms is the first step toward relief.
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
