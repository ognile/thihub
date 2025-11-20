import React from 'react';

interface TimelineItem {
    week: string;
    title: string;
    description: string;
    status: 'complete' | 'current' | 'upcoming';
}

interface TimelineProgressProps {
    items: TimelineItem[];
}

export default function TimelineProgress({ items }: TimelineProgressProps) {
    return (
        <div className="my-10 bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h4 className="font-sans font-black text-gray-900 text-lg mb-6 text-center">Recovery Journey</h4>

            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-4">
                        {/* Timeline marker */}
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sans font-bold text-sm ${item.status === 'complete' ? 'bg-green-500 text-white' :
                                    item.status === 'current' ? 'bg-blue-500 text-white' :
                                        'bg-gray-300 text-gray-600'
                                }`}>
                                {item.status === 'complete' ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : item.week}
                            </div>
                            {index < items.length - 1 && (
                                <div className={`w-0.5 h-12 mt-2 ${item.status === 'complete' ? 'bg-green-300' : 'bg-gray-300'}`} />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-4">
                            <div className="font-sans font-bold text-gray-900 mb-1">{item.title}</div>
                            <div className="font-sans text-sm text-gray-600 leading-relaxed">{item.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
