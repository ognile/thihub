import React from 'react';

export default function ReactionBar() {
    return (
        <div className="flex items-center justify-between border-t border-fb-divider pt-1 mt-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-fb-bg transition-colors group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-fb-text-secondary group-hover:text-fb-text-main">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span className="text-fb-text-secondary font-medium text-sm group-hover:text-fb-text-main">Like</span>
            </button>

            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-fb-bg transition-colors group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-fb-text-secondary group-hover:text-fb-text-main">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span className="text-fb-text-secondary font-medium text-sm group-hover:text-fb-text-main">Comment</span>
            </button>

            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-fb-bg transition-colors group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-fb-text-secondary group-hover:text-fb-text-main">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span className="text-fb-text-secondary font-medium text-sm group-hover:text-fb-text-main">Share</span>
            </button>
        </div>
    );
}
