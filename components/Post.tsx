import React from 'react';
import Link from 'next/link';
import ReactionBar from './ReactionBar';

interface PostProps {
    id: string;
    author: string;
    time: string;
    content: string;
    image?: string;
    likes: number;
    comments: number;
    shares: number;
}

export default function Post({ id, author, time, content, image, likes, comments, shares }: PostProps) {
    return (
        <div className="bg-fb-card mb-4 shadow-sm rounded-none sm:rounded-lg overflow-hidden">
            {/* Post Header */}
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                        {/* Placeholder Avatar */}
                        <div className="w-full h-full bg-fb-blue flex items-center justify-center text-white font-bold">
                            {author.charAt(0)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-fb-text-main text-[15px] leading-tight">{author}</h3>
                        <div className="flex items-center gap-1 text-xs text-fb-text-secondary">
                            <span>{time}</span>
                            <span>•</span>
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zM4 8a4 4 0 1 1 4 4 4 4 0 0 1-4-4z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-fb-bg rounded-full transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-fb-text-secondary">
                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                </button>
            </div>

            {/* Post Content */}
            <div className="px-3 pb-2">
                <p className="text-[15px] text-fb-text-main leading-normal whitespace-pre-wrap">
                    {content}
                </p>
            </div>

            {/* Post Image */}
            {image && (
                <div className="w-full bg-gray-100">
                    <Link href={`/articles/${id}`}>
                        {/* Using standard img for now, can upgrade to Next Image later */}
                        <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
                    </Link>
                </div>
            )}

            {/* Post Stats */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-fb-divider">
                <div className="flex items-center gap-1">
                    <div className="bg-fb-blue rounded-full p-1">
                        <svg viewBox="0 0 24 24" fill="white" className="w-2 h-2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                    </div>
                    <span className="text-fb-text-secondary text-[13px]">{likes}</span>
                </div>
                <div className="flex gap-3 text-fb-text-secondary text-[13px]">
                    <span>{comments} comments</span>
                    <span>{shares} shares</span>
                </div>
            </div>

            {/* Reaction Bar */}
            <div className="px-2 pb-1">
                <ReactionBar />
            </div>
        </div>
    );
}
