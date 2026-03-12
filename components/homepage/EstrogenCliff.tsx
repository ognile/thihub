'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const estrogenData = Array.from({ length: 31 }, (_, index) => {
    const age = 30 + index;
    let level = 100;

    if (age >= 40 && age < 45) {
        level = 100 - (age - 40) * 5;
    } else if (age >= 45 && age < 52) {
        level = 75 - (age - 45) * 10;
    } else if (age >= 52) {
        level = 5 + ((age - 52) % 3) * 1.5;
    }

    return { age, level: Math.max(5, level) };
});

const ageSymptoms: Record<number, string[]> = {
    35: ['Cycle irregularities beginning', 'Mild mood shifts'],
    40: ['First hot flashes', 'Sleep disruption', 'Brain fog starts'],
    45: ['Intense vasomotor symptoms', 'Anxiety spikes', 'Memory issues'],
    50: ['Vaginal dryness', 'Joint pain', 'Skin changes'],
    55: ['Bone density concerns', 'Cardiovascular shifts', 'Metabolism slows'],
};

export default function EstrogenCliff() {
    const [currentAge, setCurrentAge] = useState(45);
    const [chartReady, setChartReady] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setChartReady(true);
        });

        return () => cancelAnimationFrame(frame);
    }, []);

    const symptoms = ageSymptoms[currentAge as keyof typeof ageSymptoms] ||
        ageSymptoms[Math.round(currentAge / 5) * 5 as keyof typeof ageSymptoms] ||
        ['Transition continues'];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                        The Estrogen Cliff
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Drag the slider to see how estrogen levels change with age and what symptoms emerge at each stage.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-8 shadow-lg"
                >
                    <div className="h-80 mb-8">
                        {chartReady ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={estrogenData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="age"
                                        label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                                        stroke="#6b7280"
                                    />
                                    <YAxis
                                        label={{ value: 'Estrogen Level (relative)', angle: -90, position: 'insideLeft' }}
                                        stroke="#6b7280"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="level"
                                        stroke="#dc2626"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, fill: '#dc2626' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={() => null}
                                        stroke="#9333ea"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full rounded-xl bg-white/60" />
                        )}
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-3 text-center">
                            Current Age: <span className="text-2xl text-red-600 font-serif">{currentAge}</span>
                        </label>
                        <input
                            type="range"
                            min={30}
                            max={60}
                            value={currentAge}
                            onChange={(e) => setCurrentAge(Number(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${((currentAge - 30) / 30) * 100}%, #e5e7eb ${((currentAge - 30) / 30) * 100}%, #e5e7eb 100%)`
                            }}
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900 font-serif text-center mb-4">
                            Common Symptoms at Age {currentAge}:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {symptoms.map((symptom, index) => (
                                <motion.div
                                    key={symptom}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-lg p-4 border-l-4 border-red-600 shadow-sm"
                                >
                                    <p className="text-sm font-medium text-gray-800">{symptom}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
