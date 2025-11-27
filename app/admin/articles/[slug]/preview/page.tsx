'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ArticleHeader from '@/components/ArticleHeader';
import Link from 'next/link';

interface Article {
    slug: string;
    title: string;
    subtitle: string;
    content: string;
    author: string;
    reviewer: string;
    date: string;
    image: string;
    ctaText?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    keyTakeaways?: { title: string; content: string }[] | null;
}

// Editable CinematicHero for preview
function EditableHero({ 
    article, 
    onUpdate,
    isEditing 
}: { 
    article: Article; 
    onUpdate: (field: string, value: string) => void;
    isEditing: boolean;
}) {
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const subtitleRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textareas
    useLayoutEffect(() => {
        const resize = () => {
            if (titleRef.current) {
                titleRef.current.style.height = 'auto';
                titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
            }
            if (subtitleRef.current) {
                subtitleRef.current.style.height = 'auto';
                subtitleRef.current.style.height = subtitleRef.current.scrollHeight + 'px';
            }
        };
        
        resize();
        // Run again after fonts load
        const timer = setTimeout(resize, 100);
        document.fonts?.ready.then(resize);
        
        return () => clearTimeout(timer);
    }, [article.title, article.subtitle]);

    return (
        <div className="relative w-full min-h-[85vh] flex items-end pb-24 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={article.image}
                    alt="Hero Background"
                    className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-3xl mx-auto px-5 pt-20">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                        Investigative Report
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm text-white/90 text-[9px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                        5 Min Read
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Fact Checked
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Medically Reviewed
                        </span>
                    </div>
                </div>

                {isEditing ? (
                    <textarea
                        ref={titleRef}
                        value={article.title}
                        onChange={(e) => {
                            onUpdate('title', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="w-full text-3xl font-serif font-black text-white leading-[1.2] mb-4 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-white/50 break-words"
                        placeholder="Article Title"
                        rows={1}
                    />
                ) : (
                    <h1 className="text-3xl font-serif font-black text-white leading-[1.2] mb-4 tracking-tight drop-shadow-lg break-words">
                        {article.title}
                    </h1>
                )}

                {isEditing ? (
                    <textarea
                        ref={subtitleRef}
                        value={article.subtitle}
                        onChange={(e) => {
                            onUpdate('subtitle', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="w-full text-base text-gray-200 font-sans font-light leading-relaxed mb-6 max-w-xl drop-shadow-md bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-gray-400"
                        placeholder="Article Subtitle"
                        rows={2}
                    />
                ) : (
                    <p className="text-base text-gray-200 font-sans font-light leading-relaxed mb-6 max-w-xl drop-shadow-md">
                        {article.subtitle}
                    </p>
                )}

                {/* Byline */}
                <div className="flex items-center gap-3 border-t border-white/20 pt-4">
                    <div className="w-10 h-10 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                        <img
                            src="https://picsum.photos/seed/doc/100"
                            alt="Author"
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={article.author}
                                    onChange={(e) => onUpdate('author', e.target.value)}
                                    className="text-white font-bold text-xs tracking-wide bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-400"
                                    placeholder="Author Name"
                                />
                            ) : (
                                <span className="text-white font-bold text-xs tracking-wide">{article.author}</span>
                            )}
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-label="Verified">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={article.date}
                                    onChange={(e) => onUpdate('date', e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-500 text-gray-400 text-[10px]"
                                    placeholder="Updated: Date"
                                />
                            ) : (
                                <span>{article.date}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PreviewPage() {
    const [article, setArticle] = useState<Article | null>(null);
    const [isEditing, setIsEditing] = useState(true);

    useEffect(() => {
        // Listen for messages from parent window
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ARTICLE_UPDATE') {
                setArticle(event.data.article);
                setIsEditing(event.data.isEditing ?? true);
            }
            if (event.data.type === 'SET_EDITING') {
                setIsEditing(event.data.isEditing);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request initial data from parent
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Send updates back to parent
    const handleUpdate = (field: string, value: string) => {
        if (!article) return;
        const updatedArticle = { ...article, [field]: value };
        setArticle(updatedArticle);
        window.parent.postMessage({ type: 'ARTICLE_FIELD_UPDATE', field, value }, '*');
    };

    if (!article) {
        return (
            <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
                <div className="text-zinc-400 text-sm">Loading preview...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-serif">
            {/* Header */}
            <ArticleHeader transparent={true} />

            {/* Hero */}
            <EditableHero 
                article={article} 
                onUpdate={handleUpdate}
                isEditing={isEditing}
            />

            {/* Content Area */}
            <main className="px-4 max-w-[680px] mx-auto -mt-16 relative z-20 bg-white rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-8">
                {/* Key Takeaways */}
                {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-4 my-6 rounded-r-lg shadow-sm">
                        <h3 className="flex items-center gap-2 text-[#0F4C81] font-bold text-sm uppercase tracking-wide mb-3 font-sans">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Key Takeaways
                        </h3>
                        <ul className="space-y-2">
                            {article.keyTakeaways.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-gray-800 font-sans text-sm leading-relaxed">
                                    <span className="mt-1.5 w-1 h-1 bg-[#0F4C81] rounded-full flex-shrink-0"></span>
                                    <div>
                                        <span className="font-bold">{item.title}</span>
                                        {item.content && <span> — {item.content}</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Article Content */}
                <article className="prose prose-sm max-w-none text-gray-800 font-serif leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>

                {/* CTA Section */}
                <div className="my-8 p-6 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                value={article.ctaTitle || "Curious about the science?"}
                                onChange={(e) => handleUpdate('ctaTitle', e.target.value)}
                                className="w-full text-lg font-serif mb-3 text-gray-900 font-medium bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-blue-300"
                            />
                            <input
                                type="text"
                                value={article.ctaText || "Read the Clinical Study »"}
                                onChange={(e) => handleUpdate('ctaText', e.target.value)}
                                className="inline-block bg-[#0F4C81] text-white px-6 py-3 rounded-lg font-sans font-bold text-base text-center min-w-[160px]"
                            />
                            <input
                                type="text"
                                value={article.ctaDescription || "Secure, verified link to official research."}
                                onChange={(e) => handleUpdate('ctaDescription', e.target.value)}
                                className="w-full mt-3 text-[10px] text-gray-500 font-sans bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-gray-400"
                            />
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-serif mb-3 text-gray-900 font-medium">
                                {article.ctaTitle || "Curious about the science?"}
                            </p>
                            <Link 
                                href="#" 
                                className="inline-block bg-[#0F4C81] text-white px-6 py-3 rounded-lg font-sans font-bold text-base hover:bg-[#0a3b66] transition-colors shadow-md"
                            >
                                {article.ctaText || "Read the Clinical Study »"}
                            </Link>
                            <p className="mt-3 text-[10px] text-gray-500 font-sans">
                                {article.ctaDescription || "Secure, verified link to official research."}
                            </p>
                        </>
                    )}
                </div>

                {/* Discussion placeholder */}
                <div className="font-sans border-t border-gray-200 pt-6 pb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Discussion</h3>
                    <div className="text-sm text-gray-400">Comments section preview...</div>
                </div>
            </main>
        </div>
    );
}

