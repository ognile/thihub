import React from 'react';

interface StatHighlightProps {
    stat: string;
    description: string;
    color?: 'blue' | 'green' | 'purple';
}

export default function StatHighlight({ stat, description, color = 'blue' }: StatHighlightProps) {
    const colorClasses = {
        blue: 'from-blue-500 to-indigo-600',
        green: 'from-green-500 to-emerald-600',
        purple: 'from-purple-500 to-violet-600'
    };

    return (
        <div className="my-8 text-center">
            <div className={`inline-block bg-gradient-to-r ${colorClasses[color]} text-white rounded-2xl px-8 py-6 shadow-xl transform hover:scale-105 transition-transform`}>
                <div className="font-sans font-black text-5xl mb-2 tracking-tight">{stat}</div>
                <div className="font-sans text-sm font-medium opacity-90 uppercase tracking-widest">{description}</div>
            </div>
        </div>
    );
}
