'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';

export interface TimelineWeek {
    week: number;
    title: string;
    description: string;
}

interface TimelineProps {
    weeks: TimelineWeek[];
    title?: string;
    className?: string;
}

export default function Timeline({ weeks, title = 'Your Journey', className }: TimelineProps) {
    return (
        <div className={cn('my-10', className)}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>

            {/* Timeline Container */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-emerald-100" />

                {/* Timeline Items */}
                <div className="space-y-6">
                    {weeks.map((item, index) => (
                        <div key={index} className="relative pl-14">
                            {/* Timeline Node */}
                            <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 z-10">
                                <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            </div>

                            {/* Content Card */}
                            <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all">
                                {/* Week Badge */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                                    <span>Week {item.week}</span>
                                </div>

                                {/* Title */}
                                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                                    {item.title}
                                </h4>

                                {/* Description */}
                                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

