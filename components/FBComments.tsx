'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface CommentData {
    id: string;
    author: string;
    avatar: string;
    content: string;
    time: string;
    likes: number;
    hasReplies?: boolean;
    isLiked?: boolean;
}

interface CommentProps extends CommentData { }

const Comment = ({ author, avatar, content, time, likes: initialLikes, hasReplies, isLiked: initialIsLiked }: CommentProps) => {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [showReplyInput, setShowReplyInput] = useState(false);

    const handleLike = () => {
        if (isLiked) {
            setLikes(likes - 1);
            setIsLiked(false);
        } else {
            setLikes(likes + 1);
            setIsLiked(true);
        }
    };

    return (
        <div className="flex gap-2 mb-3 font-sans">
            <div className="flex-shrink-0 cursor-pointer">
                <img src={avatar} alt={author} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200" />
            </div>
            <div className="flex-1">
                <div className="bg-[#F0F2F5] rounded-2xl px-3 py-2 inline-block relative group">
                    <div className="font-bold text-[13px] text-[#050505] leading-snug cursor-pointer hover:underline font-sans">{author}</div>
                    <p className="text-[15px] text-[#050505] leading-snug font-sans">{content}</p>

                    {/* Like Count Bubble */}
                    {likes > 0 && (
                        <div className="absolute -bottom-2 right-1 bg-white rounded-full shadow-md px-1 py-0.5 flex items-center gap-1 border border-white cursor-pointer">
                            <div className="bg-[#1877F2] rounded-full p-[3px]">
                                <svg viewBox="0 0 24 24" fill="white" className="w-2 h-2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                </svg>
                            </div>
                            <span className="text-[11px] text-[#65676B] font-normal font-sans">{likes}</span>
                        </div>
                    )}
                </div>

                {/* Action Links */}
                <div className="flex items-center gap-3 mt-0.5 ml-3 font-sans">
                    <span
                        className={`text-[12px] font-bold cursor-pointer hover:underline ${isLiked ? 'text-[#1877F2]' : 'text-[#65676B]'}`}
                        onClick={handleLike}
                    >
                        Like
                    </span>
                    <span
                        className="text-[12px] font-bold text-[#65676B] hover:underline cursor-pointer"
                        onClick={() => setShowReplyInput(!showReplyInput)}
                    >
                        Reply
                    </span>
                    <span className="text-[12px] text-[#65676B] cursor-pointer hover:underline">{time}</span>
                </div>

                {/* Reply Input */}
                {showReplyInput && (
                    <div className="mt-2 flex gap-2 font-sans">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 bg-[#F0F2F5] rounded-2xl px-3 py-1">
                            <input type="text" placeholder="Write a reply..." className="w-full bg-transparent border-none focus:ring-0 text-[13px] placeholder-gray-500 outline-none" autoFocus />
                        </div>
                    </div>
                )}

                {/* View Previous Replies */}
                {hasReplies && (
                    <div className="mt-2 ml-2 flex items-center gap-2 cursor-pointer group font-sans">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#65676B] group-hover:text-[#050505] -rotate-180">
                            <path d="M19 15l-6 6-1.42-1.42L15.17 16H4V4h2v10h9.17l-3.59-3.58L13 9l6 6z" />
                        </svg>
                        <span className="text-[13px] font-bold text-[#65676B] group-hover:text-[#050505]">View 2 previous replies</span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface FBCommentsProps {
    comments?: CommentData[];
}

export default function FBComments({ comments = [] }: FBCommentsProps) {
    if (!comments || comments.length === 0) {
        return (
            <div className="bg-white p-4 border-t border-gray-200 mt-8 font-sans">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#050505] text-lg font-sans">Comments</h3>
                </div>
                <p className="text-gray-500 text-sm italic">No comments yet.</p>
                <CopyrightFooter />
            </div>
        );
    }

    return (
        <div className="bg-white p-4 border-t border-gray-200 mt-8 font-sans">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#050505] text-lg font-sans">Comments</h3>
                <div className="flex items-center gap-1 text-[#65676B] text-sm cursor-pointer font-sans">
                    <span>Most Relevant</span>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7 10l5 5 5-5z" />
                    </svg>
                </div>
            </div>

            <div className="space-y-1">
                {comments.map((comment) => (
                    <Comment key={comment.id} {...comment} />
                ))}
            </div>

            <div className="mt-4 pt-2 text-center">
                <button className="w-full py-2 text-[#65676B] font-bold text-[15px] hover:bg-[#F0F2F5] rounded-md transition-colors">
                    View more comments
                </button>
            </div>

            <CopyrightFooter />
        </div>
    );
}

function CopyrightFooter() {
    return (
        <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-[11px] text-[#65676B] leading-relaxed font-sans">
                Copyright © {new Date().getFullYear()} Top Health Insider. All rights reserved. Top Health Insider does not provide medical advice, diagnosis, or treatment. See{' '}
                <Link href="/disclaimer" className="text-[#1877F2] hover:underline">
                    Additional Information
                </Link>.
            </p>
        </div>
    );
}
