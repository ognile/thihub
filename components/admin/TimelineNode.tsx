'use client';

import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Check, Clock, Plus, Trash2 } from 'lucide-react';

interface TimelineWeek {
    week: number;
    title: string;
    description: string;
}

export default function TimelineNode(props: any) {
    const { node, updateAttributes } = props;
    const weeks: TimelineWeek[] = node.attrs.weeks || [];
    const title: string = node.attrs.title || 'Your Journey';

    const updateWeek = (index: number, field: keyof TimelineWeek, value: any) => {
        const newWeeks = [...weeks];
        newWeeks[index] = { ...newWeeks[index], [field]: value };
        updateAttributes({ weeks: newWeeks });
    };

    const addWeek = () => {
        const nextWeek = weeks.length > 0 ? Math.max(...weeks.map(w => w.week)) + 1 : 1;
        updateAttributes({
            weeks: [...weeks, { week: nextWeek, title: 'New Milestone', description: 'Description...' }]
        });
    };

    const removeWeek = (index: number) => {
        const newWeeks = weeks.filter((_, i) => i !== index);
        updateAttributes({ weeks: newWeeks });
    };

    return (
        <NodeViewWrapper className="my-10">
            <div className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-emerald-600" />
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => updateAttributes({ title: e.target.value })}
                        className="text-xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                        placeholder="Timeline Title..."
                    />
                </div>

                {/* Timeline Container */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-emerald-100" />

                    {/* Timeline Items */}
                    <div className="space-y-6">
                        {weeks.map((item, index) => (
                            <div key={index} className="relative pl-14 group">
                                {/* Timeline Node */}
                                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 z-10">
                                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>

                                {/* Content Card */}
                                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all relative">
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => removeWeek(index)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {/* Week Badge */}
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                                        <span>Week</span>
                                        <input
                                            type="number"
                                            value={item.week}
                                            onChange={(e) => updateWeek(index, 'week', parseInt(e.target.value) || 1)}
                                            className="w-8 text-center bg-transparent border-none focus:ring-0 focus:outline-none"
                                            min={1}
                                        />
                                    </div>

                                    {/* Title */}
                                    <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => updateWeek(index, 'title', e.target.value)}
                                        className="w-full text-base font-bold text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none mb-2"
                                        placeholder="Milestone title..."
                                    />

                                    {/* Description */}
                                    <textarea
                                        value={item.description}
                                        onChange={(e) => {
                                            updateWeek(index, 'description', e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        className="w-full text-sm text-gray-600 leading-relaxed bg-transparent border-none focus:ring-0 focus:outline-none resize-none overflow-hidden"
                                        rows={2}
                                        placeholder="Description..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Week Button */}
                <button
                    onClick={addWeek}
                    className="w-full p-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-emerald-600 border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-xl transition-colors ml-14"
                    style={{ width: 'calc(100% - 3.5rem)' }}
                >
                    <Plus className="w-4 h-4" />
                    Add Week
                </button>
            </div>
        </NodeViewWrapper>
    );
}

