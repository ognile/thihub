'use client';

import React, { useState, useEffect } from 'react';
import { CommentData } from '@/components/FBComments';

interface CommentEditorProps {
    comments: CommentData[];
    onChange: (comments: CommentData[]) => void;
}

const MOCK_PROFILES = [
    { name: 'Sarah Jenkins', avatar: 'https://picsum.photos/seed/sarah/100' },
    { name: 'Michael Ross', avatar: 'https://picsum.photos/seed/mike/100' },
    { name: 'Jennifer Wu', avatar: 'https://picsum.photos/seed/jen/100' },
    { name: 'David Miller', avatar: 'https://picsum.photos/seed/dave/100' },
    { name: 'Emily Chen', avatar: 'https://picsum.photos/seed/emily/100' },
    { name: 'James Wilson', avatar: 'https://picsum.photos/seed/james/100' },
    { name: 'Jessica Taylor', avatar: 'https://picsum.photos/seed/jess/100' },
    { name: 'Daniel Anderson', avatar: 'https://picsum.photos/seed/dan/100' },
];

export default function CommentEditor({ comments, onChange }: CommentEditorProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<CommentData | null>(null);

    // Initialize form when editing starts
    useEffect(() => {
        if (editingId) {
            const comment = comments.find(c => c.id === editingId);
            if (comment) setEditForm(comment);
        } else {
            setEditForm(null);
        }
    }, [editingId, comments]);

    const handleAdd = () => {
        const newId = `c${Date.now()}`;
        const randomProfile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
        const newComment: CommentData = {
            id: newId,
            author: randomProfile.name,
            avatar: randomProfile.avatar,
            content: 'This is a new comment. Click to edit.',
            time: '1h',
            likes: Math.floor(Math.random() * 50),
            hasReplies: false,
            isLiked: false
        };
        onChange([...comments, newComment]);
        setEditingId(newId);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            onChange(comments.filter(c => c.id !== id));
            if (editingId === id) setEditingId(null);
        }
    };

    const handleSave = () => {
        if (editForm) {
            onChange(comments.map(c => c.id === editForm.id ? editForm : c));
            setEditingId(null);
        }
    };

    const handleMagicProfile = () => {
        if (!editForm) return;
        const randomProfile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
        setEditForm({
            ...editForm,
            author: randomProfile.name,
            avatar: randomProfile.avatar
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Facebook Comments Editor</h3>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Comment
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
                {/* List / Editor Column */}
                <div className="p-4 max-h-[600px] overflow-y-auto">
                    {editingId && editForm ? (
                        <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-blue-900 text-sm">Editing Comment</h4>
                                <button onClick={handleMagicProfile} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Magic Profile
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Author Name</label>
                                    <input
                                        type="text"
                                        value={editForm.author}
                                        onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Avatar URL</label>
                                    <input
                                        type="text"
                                        value={editForm.avatar}
                                        onChange={e => setEditForm({ ...editForm, avatar: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
                                <textarea
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                    rows={3}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                                    <input
                                        type="text"
                                        value={editForm.time}
                                        onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Likes</label>
                                    <input
                                        type="number"
                                        value={editForm.likes}
                                        onChange={e => setEditForm({ ...editForm, likes: parseInt(e.target.value) || 0 })}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editForm.isLiked || false}
                                            onChange={e => setEditForm({ ...editForm, isLiked: e.target.checked })}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        Liked by me
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="px-4 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-300 transition-all cursor-pointer group"
                                    onClick={() => setEditingId(comment.id)}
                                >
                                    <img src={comment.avatar} alt={comment.author} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">{comment.author}</div>
                                        <div className="text-xs text-gray-500 truncate">{comment.content}</div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    No comments yet. Click "Add Comment" to start.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Live Preview Column */}
                <div className="p-4 bg-gray-50 flex flex-col">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Preview
                    </div>

                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto">
                        <div className="font-sans">
                            <h3 className="font-bold text-[#050505] text-lg mb-4">Comments</h3>
                            {/* Preview Single Comment if Editing, or All if List */}
                            {editingId && editForm ? (
                                <div className="opacity-100 transition-opacity">
                                    <PreviewComment {...editForm} />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {comments.map(c => <PreviewComment key={c.id} {...c} />)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Reusing the Comment component structure for preview
function PreviewComment({ author, avatar, content, time, likes, hasReplies, isLiked }: CommentData) {
    return (
        <div className="flex gap-2 mb-3 font-sans pointer-events-none">
            <div className="flex-shrink-0">
                <img src={avatar} alt={author} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200" />
            </div>
            <div className="flex-1">
                <div className="bg-[#F0F2F5] rounded-2xl px-3 py-2 inline-block relative">
                    <div className="font-bold text-[13px] text-[#050505] leading-snug font-sans">{author}</div>
                    <p className="text-[15px] text-[#050505] leading-snug font-sans">{content}</p>
                    {likes > 0 && (
                        <div className="absolute -bottom-2 right-1 bg-white rounded-full shadow-md px-1 py-0.5 flex items-center gap-1 border border-white">
                            <div className="bg-[#1877F2] rounded-full p-[3px]">
                                <svg viewBox="0 0 24 24" fill="white" className="w-2 h-2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                            </div>
                            <span className="text-[11px] text-[#65676B] font-normal font-sans">{likes}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 ml-3 font-sans text-[#65676B]">
                    <span className={`text-[12px] font-bold ${isLiked ? 'text-[#1877F2]' : ''}`}>Like</span>
                    <span className="text-[12px] font-bold">Reply</span>
                    <span className="text-[12px]">{time}</span>
                </div>
            </div>
        </div>
    );
}
