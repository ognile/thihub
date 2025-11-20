import React from 'react';

interface ResearchCalloutProps {
    title: string;
    study: string;
    findings: string;
    citation?: string;
}

export default function ResearchCallout({ title, study, findings, citation }: ResearchCalloutProps) {
    return (
        <div className="my-10 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-[#0F4C81] rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-[#0F4C81] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h4 className="font-sans font-black text-[#0F4C81] text-lg uppercase tracking-wide mb-1">{title}</h4>
                    <p className="font-sans text-sm text-gray-600 font-medium">{study}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-3">
                <p className="font-sans text-[15px] leading-relaxed text-gray-800">{findings}</p>
            </div>

            {citation && (
                <div className="flex items-center gap-2 text-xs text-gray-500 font-sans">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Source: {citation}</span>
                </div>
            )}
        </div>
    );
}
