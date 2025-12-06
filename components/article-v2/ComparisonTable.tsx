'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComparisonFeature {
    name: string;
    us: boolean;
    them: boolean;
}

interface ComparisonTableProps {
    features: ComparisonFeature[];
    ourBrand?: string;
    theirBrand?: string;
    className?: string;
}

export default function ComparisonTable({
    features,
    ourBrand = 'Our Formula',
    theirBrand = 'Generic Brands',
    className
}: ComparisonTableProps) {
    return (
        <div className={cn('my-8 not-prose', className)}>
            {/* Table Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ring-1 ring-gray-950/5">
                {/* Header */}
                <div className="grid grid-cols-[1fr,auto,auto] bg-gray-50/50 border-b border-gray-200 divide-x divide-gray-200">
                    <div className="p-3 pl-4 flex items-center">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Feature</span>
                    </div>
                    <div className="p-3 w-24 sm:w-32 text-center bg-emerald-50/30">
                        <span className="text-xs sm:text-sm font-bold text-emerald-800 leading-tight block">{ourBrand}</span>
                    </div>
                    <div className="p-3 w-24 sm:w-32 text-center bg-gray-50/50">
                        <span className="text-xs sm:text-sm font-bold text-gray-500 leading-tight block">{theirBrand}</span>
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-[1fr,auto,auto] divide-x divide-gray-100 transition-colors hover:bg-gray-50/50"
                        >
                            {/* Feature Name */}
                            <div className="p-3 pl-4 flex items-center">
                                <span className="text-xs sm:text-sm text-gray-700 font-medium leading-snug">{feature.name}</span>
                            </div>

                            {/* Our Brand */}
                            <div className="p-3 w-24 sm:w-32 flex items-center justify-center bg-emerald-50/10">
                                {feature.us ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Their Brand */}
                            <div className="p-3 w-24 sm:w-32 flex items-center justify-center">
                                {feature.them ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
