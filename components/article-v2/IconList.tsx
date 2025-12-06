'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export interface IconListItem {
    icon: string;
    title: string;
    text: string;
}

interface IconListProps {
    items: IconListItem[];
    columns?: 1 | 2 | 3;
    className?: string;
}

// Map common keywords to lucide icon names
const iconKeywordMap: Record<string, string> = {
    // Health & Body
    'gut': 'Heart',
    'stomach': 'CircleDot',
    'bacteria': 'Bug',
    'probiotic': 'Pill',
    'biofilm': 'Layers',
    'immune': 'Shield',
    'immunity': 'ShieldCheck',
    'heart': 'Heart',
    'brain': 'Brain',
    'sleep': 'Moon',
    'energy': 'Zap',
    'vitamin': 'Pill',
    'mineral': 'Gem',
    'inflammation': 'Flame',
    'digestion': 'CircleDot',
    'hormone': 'Activity',
    'stress': 'CloudLightning',
    'anxiety': 'CloudRain',
    'mood': 'Smile',
    'weight': 'Scale',
    'skin': 'Sparkles',
    'hair': 'Leaf',
    'bone': 'Bone',
    'joint': 'Link',
    'muscle': 'Dumbbell',
    'blood': 'Droplet',
    'liver': 'Bean',
    'kidney': 'Bean',
    
    // Science & Research
    'research': 'FlaskConical',
    'study': 'BookOpen',
    'lab': 'FlaskConical',
    'test': 'TestTube',
    'clinical': 'Stethoscope',
    'doctor': 'Stethoscope',
    'science': 'Atom',
    'formula': 'FlaskRound',
    'ingredient': 'Beaker',
    'compound': 'Hexagon',
    
    // Quality & Trust
    'quality': 'BadgeCheck',
    'certified': 'Award',
    'organic': 'Leaf',
    'natural': 'TreeDeciduous',
    'pure': 'Droplets',
    'safe': 'ShieldCheck',
    'tested': 'ClipboardCheck',
    'verified': 'BadgeCheck',
    'guaranteed': 'Medal',
    
    // Benefits & Results
    'results': 'TrendingUp',
    'benefit': 'Star',
    'improvement': 'ArrowUpRight',
    'effective': 'Target',
    'powerful': 'Zap',
    'fast': 'Timer',
    'lasting': 'Clock',
    
    // Warnings & Concerns
    'warning': 'AlertTriangle',
    'danger': 'AlertOctagon',
    'risk': 'AlertCircle',
    'problem': 'XCircle',
    'issue': 'Info',
    
    // General
    'check': 'Check',
    'star': 'Star',
    'info': 'Info',
    'tip': 'Lightbulb',
    'note': 'StickyNote',
    'important': 'AlertCircle',
    'default': 'CircleDot',
};

function getIconComponent(iconKeyword: string): React.ComponentType<{ className?: string }> {
    const normalizedKeyword = iconKeyword.toLowerCase().trim();
    
    // First check our keyword map
    const mappedIconName = iconKeywordMap[normalizedKeyword] || iconKeywordMap['default'];
    
    // Try to get the icon from lucide
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[mappedIconName];
    
    if (IconComponent) {
        return IconComponent;
    }
    
    // Fallback to CircleDot
    return LucideIcons.CircleDot as React.ComponentType<{ className?: string }>;
}

export default function IconList({ items, columns = 2, className }: IconListProps) {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    };

    return (
        <div className={cn('my-10', className)}>
            <div className={cn('grid gap-4 sm:gap-6', gridCols[columns])}>
                {items.map((item, index) => {
                    const IconComponent = getIconComponent(item.icon);
                    
                    return (
                        <div
                            key={index}
                            className="group bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all"
                        >
                            {/* Icon Container */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <IconComponent className="w-6 h-6 text-emerald-600" />
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                                {item.title}
                            </h4>
                            
                            {/* Text */}
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                {item.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Export the icon mapper for use in other components
export { getIconComponent, iconKeywordMap };

