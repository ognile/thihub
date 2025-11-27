'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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

// Mobile Header with safe area for notch
function MobileHeader() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-transparent pt-[env(safe-area-inset-top,0px)]">
            <div className="px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="w-7 h-7 flex items-center justify-center font-serif font-bold text-lg rounded-sm bg-white text-gray-900 flex-shrink-0">
                        T
                    </div>
                    <span className="font-serif font-bold text-sm tracking-tight text-white drop-shadow-md truncate">
                        Top Health Insider
                    </span>
                </div>
                <div className="text-[8px] font-sans font-bold uppercase tracking-wider px-2 py-1 rounded-full border text-white border-white/30 bg-black/20 backdrop-blur-sm flex-shrink-0 ml-2">
                    Trending Report
                </div>
            </div>
        </header>
    );
}

// Editable Mobile Hero
function EditableMobileHero({ 
    article, 
    onUpdate 
}: { 
    article: Article; 
    onUpdate: (field: string, value: string) => void;
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
        const timers = [
            setTimeout(resize, 50),
            setTimeout(resize, 150),
            setTimeout(resize, 300),
        ];
        document.fonts?.ready.then(resize);
        
        return () => timers.forEach(clearTimeout);
    }, [article.title, article.subtitle]);

    return (
        <div className="relative w-full min-h-[80vh] flex items-end pb-16 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={article.image}
                    alt="Hero Background"
                    className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
            </div>

            {/* Content - with top padding for header + notch */}
            <div className="relative z-10 w-full px-4 pt-20">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                        Investigative Report
                    </span>
                    <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-[9px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                        5 Min Read
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Fact Checked
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Medically Reviewed
                    </span>
                </div>

                <textarea
                    ref={titleRef}
                    value={article.title}
                    onChange={(e) => {
                        onUpdate('title', e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    className="w-full text-[28px] font-serif font-black text-white leading-[1.15] mb-3 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-2 focus:ring-white/30 focus:outline-none p-1 -ml-1 resize-none overflow-hidden placeholder-white/50 break-words rounded"
                    placeholder="Article Title"
                    rows={1}
                />

                <textarea
                    ref={subtitleRef}
                    value={article.subtitle}
                    onChange={(e) => {
                        onUpdate('subtitle', e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    className="w-full text-[15px] text-gray-200 font-sans font-light leading-relaxed mb-5 drop-shadow-md bg-transparent border-none focus:ring-2 focus:ring-white/30 focus:outline-none p-1 -ml-1 resize-none overflow-hidden placeholder-gray-400 rounded"
                    placeholder="Article Subtitle"
                    rows={2}
                />

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
                            <input
                                type="text"
                                value={article.author}
                                onChange={(e) => onUpdate('author', e.target.value)}
                                className="text-white font-bold text-sm tracking-wide bg-transparent border-none focus:ring-2 focus:ring-white/30 focus:outline-none p-0.5 -ml-0.5 min-w-0 flex-1 placeholder-gray-400 rounded"
                                placeholder="Author Name"
                            />
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0" aria-label="Verified">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={article.date}
                            onChange={(e) => onUpdate('date', e.target.value)}
                            className="text-[10px] text-gray-400 font-medium uppercase tracking-wider bg-transparent border-none focus:ring-2 focus:ring-white/30 focus:outline-none p-0.5 -ml-0.5 placeholder-gray-500 rounded"
                            placeholder="Updated: Date"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PreviewPage() {
    const [article, setArticle] = useState<Article | null>(null);

    useEffect(() => {
        // Listen for messages from parent window
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ARTICLE_UPDATE') {
                setArticle(event.data.article);
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
            <MobileHeader />

            {/* Hero - Editable */}
            <EditableMobileHero article={article} onUpdate={handleUpdate} />

            {/* Content Area */}
            <main className="px-4 mx-auto -mt-12 relative z-20 bg-white rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-6">
                {/* Key Takeaways */}
                {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-4 my-5 rounded-r-lg shadow-sm">
                        <h3 className="flex items-center gap-2 text-[#0F4C81] font-bold text-sm uppercase tracking-wide mb-3 font-sans">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Key Takeaways
                        </h3>
                        <ul className="space-y-2">
                            {article.keyTakeaways.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-gray-800 font-sans text-[13px] leading-relaxed">
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

                {/* Article Content - View only with edit hint */}
                <article className="prose prose-sm max-w-none text-gray-800 font-serif leading-relaxed">
                    <div 
                        dangerouslySetInnerHTML={{ __html: article.content }} 
                        className="pointer-events-none"
                    />
                    <div className="mt-4 p-3 bg-zinc-100 rounded-lg text-center">
                        <p className="text-xs text-zinc-500 font-sans">
                            📝 Switch to <strong>Desktop</strong> mode to edit article content
                        </p>
                    </div>
                </article>

                {/* CTA Section - Editable */}
                <div className="my-8 p-5 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                    <input
                        type="text"
                        value={article.ctaTitle || "Curious about the science?"}
                        onChange={(e) => handleUpdate('ctaTitle', e.target.value)}
                        className="w-full text-base font-serif mb-3 text-gray-900 font-medium bg-transparent border-none focus:ring-2 focus:ring-blue-300 focus:outline-none p-1 text-center placeholder-blue-300 rounded"
                    />
                    <input
                        type="text"
                        value={article.ctaText || "Check Availability »"}
                        onChange={(e) => handleUpdate('ctaText', e.target.value)}
                        className="inline-block bg-[#0F4C81] text-white px-5 py-3 rounded-lg font-sans font-bold text-sm text-center min-w-[140px] focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    />
                    <input
                        type="text"
                        value={article.ctaDescription || "Secure, verified link to official research."}
                        onChange={(e) => handleUpdate('ctaDescription', e.target.value)}
                        className="w-full mt-3 text-[10px] text-gray-500 font-sans bg-transparent border-none focus:ring-2 focus:ring-blue-300 focus:outline-none p-1 text-center placeholder-gray-400 rounded"
                    />
                </div>

                {/* Discussion placeholder */}
                <div className="font-sans border-t border-gray-200 pt-5 pb-8">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Discussion</h3>
                    <div className="text-xs text-gray-400">Comments section...</div>
                </div>
            </main>
        </div>
    );
}
