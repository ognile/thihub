'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyCTAProps {
    productName: string;
    ctaLink: string;
    price?: string;
    originalPrice?: string;
    enabled?: boolean;
    ctaText?: string;
}

export default function StickyCTA({
    productName,
    ctaLink,
    price,
    originalPrice,
    enabled = true,
    ctaText = 'Try Risk-Free'
}: StickyCTAProps) {
    if (!enabled) return null;

    return (
        <>
            {/* Desktop Sticky Sidebar */}
            <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 z-50">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-72 transform transition-all hover:scale-[1.02] hover:shadow-3xl">
                    {/* Trust Badge */}
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Verified & Secure</span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{productName}</h3>

                    {/* Price Display */}
                    {price && (
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-2xl font-bold text-emerald-600">{price}</span>
                            {originalPrice && (
                                <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
                            )}
                        </div>
                    )}

                    {/* CTA Button */}
                    <Link
                        href={ctaLink}
                        className="group flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all hover:from-emerald-600 hover:to-teal-700"
                    >
                        {ctaText}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Guarantee Text */}
                    <p className="text-xs text-center text-gray-500 mt-3">
                        60-Day Money-Back Guarantee
                    </p>
                </div>
            </div>

            {/* Mobile Sticky Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 safe-area-bottom">
                <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                    {/* Left: Price & Product */}
                    <div className="flex-shrink-0">
                        {price && (
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-emerald-600">{price}</span>
                                {originalPrice && (
                                    <span className="text-xs text-gray-400 line-through">{originalPrice}</span>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">{productName}</p>
                    </div>

                    {/* Right: CTA Button */}
                    <Link
                        href={ctaLink}
                        className="flex-1 max-w-[200px] flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg"
                    >
                        {ctaText}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Spacer for mobile to prevent content overlap */}
            <div className="lg:hidden h-20" />
        </>
    );
}

