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
        <div className={cn('my-10', className)}>
            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr,100px,100px] sm:grid-cols-[1fr,140px,140px] bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                    <div className="p-4 sm:p-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Feature</span>
                    </div>
                    <div className="p-4 sm:p-5 text-center border-l border-gray-200 bg-emerald-50/50">
                        <span className="text-xs sm:text-sm font-bold text-emerald-700">{ourBrand}</span>
                    </div>
                    <div className="p-4 sm:p-5 text-center border-l border-gray-200">
                        <span className="text-xs sm:text-sm font-bold text-gray-500">{theirBrand}</span>
                    </div>
                </div>

                {/* Rows */}
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className={cn(
                            'grid grid-cols-[1fr,100px,100px] sm:grid-cols-[1fr,140px,140px]',
                            index !== features.length - 1 && 'border-b border-gray-100'
                        )}
                    >
                        {/* Feature Name */}
                        <div className="p-4 sm:p-5 flex items-center">
                            <span className="text-sm sm:text-base text-gray-800 font-medium">{feature.name}</span>
                        </div>

                        {/* Our Brand */}
                        <div className="p-4 sm:p-5 flex items-center justify-center border-l border-gray-100 bg-emerald-50/30">
                            {feature.us ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <X className="w-5 h-5 text-gray-400" strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {/* Their Brand */}
                        <div className="p-4 sm:p-5 flex items-center justify-center border-l border-gray-100">
                            {feature.them ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                    <X className="w-5 h-5 text-red-400" strokeWidth={3} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

