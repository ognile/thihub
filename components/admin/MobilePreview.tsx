import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TestimonialExtension from '@/components/admin/extensions/TestimonialExtension';
import ComparisonTableExtension from '@/components/admin/extensions/ComparisonTableExtension';
import IconListExtension from '@/components/admin/extensions/IconListExtension';
import TimelineExtension from '@/components/admin/extensions/TimelineExtension';
import ImagePlaceholderExtension from '@/components/admin/extensions/ImagePlaceholderExtension';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';

interface MobilePreviewProps {
    article: any;
    onUpdate?: (article: any) => void;
}

export default function MobilePreview({ article, onUpdate }: MobilePreviewProps) {
    // Read-only editor for content
    const editor = useEditor({
        editable: false,
        extensions: [
            StarterKit,
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'w-full rounded-xl shadow-md',
                },
            }),
            TestimonialExtension,
            ComparisonTableExtension,
            IconListExtension,
            TimelineExtension,
            ImagePlaceholderExtension,
        ],
        content: article.content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none text-gray-800 font-serif leading-relaxed focus:outline-none',
            },
        },
    });

    // Sync content when article changes
    useEffect(() => {
        if (editor && article.content && editor.getHTML() !== article.content) {
             // Only update if significantly different to avoid loops/jitters, 
             // but for read-only mobile preview, we want to stay in sync.
             // We use a simple check to prevent constant re-rendering if the HTML structure varies slightly
             if (Math.abs(editor.getHTML().length - article.content.length) > 5) {
                 editor.commands.setContent(article.content);
             }
        }
    }, [article.content, editor]);

    return (
        <div className="relative">
            <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />
                <div className="relative bg-white rounded-[2.5rem] overflow-hidden w-[375px] h-[750px]">
                    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
                        {/* Mobile Header (visual only) */}
                        <header className="sticky top-0 z-40 bg-transparent pointer-events-none">
                            <div className="px-4 h-14 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 flex items-center justify-center font-serif font-bold text-lg rounded-sm bg-white text-gray-900">
                                        T
                                    </div>
                                    <span className="font-serif font-bold text-sm tracking-tight text-white drop-shadow-md">
                                        Top Health Insider
                                    </span>
                                </div>
                                <div className="text-[8px] font-sans font-bold uppercase tracking-widest px-2 py-1 rounded-full border text-white border-white/30 bg-black/20 backdrop-blur-sm">
                                    Trending Report
                                </div>
                            </div>
                        </header>

                        {/* Mobile Hero */}
                        <div className="relative group -mt-14">
                            <div className="relative w-full min-h-[500px] flex items-end pb-16 overflow-hidden">
                                <div className="absolute inset-0 z-0">
                                    <img src={article.image} alt="Hero" className="w-full h-full object-cover object-center" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
                                </div>

                                <div className="relative z-10 w-full px-4 pt-20">
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="px-2 py-1 bg-blue-600 text-white text-[8px] font-bold uppercase tracking-widest rounded-sm">
                                            Investigative Report
                                        </span>
                                        <span className="px-2 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-[8px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                                            5 Min Read
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mb-4">
                                        <span className="flex items-center gap-1 text-[8px] font-bold text-green-400 uppercase tracking-wider">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Fact Checked
                                        </span>
                                        <span className="flex items-center gap-1 text-[8px] font-bold text-green-400 uppercase tracking-wider">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Medically Reviewed
                                        </span>
                                    </div>

                                    <h1 className="w-full text-2xl font-serif font-black text-white leading-[1.2] mb-4 tracking-tight drop-shadow-lg">
                                        {article.title}
                                    </h1>

                                    <h2 className="w-full text-sm text-gray-200 font-sans font-light leading-relaxed mb-6 drop-shadow-md">
                                        {article.subtitle}
                                    </h2>

                                    <div className="flex items-center gap-3 border-t border-white/20 pt-4">
                                        <div className="w-10 h-10 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                            <img src="https://picsum.photos/seed/doc/100" alt="Author" className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-xs tracking-wide">
                                                    {article.author}
                                                </span>
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                            </div>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                                                UPDATED: {article.date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Main Content */}
                        <main className="px-4 pt-6 -mt-12 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                            {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                                <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-3 my-4 rounded-r-lg shadow-sm">
                                    <h3 className="text-[#0F4C81] font-bold text-xs uppercase tracking-wide mb-2 font-sans">Key Takeaways</h3>
                                    <ul className="space-y-2">
                                        {article.keyTakeaways.map((item: any, index: number) => (
                                            <li key={index} className="flex items-start gap-2 text-gray-800 font-sans text-xs leading-relaxed">
                                                <span className="mt-1 w-1 h-1 bg-[#0F4C81] rounded-full flex-shrink-0"></span>
                                                <div className="w-full">
                                                    <span className="font-bold block text-xs">{item.title}</span>
                                                    <span className="text-gray-800 text-xs">{item.content}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Render content using Tiptap to ensure Node Views work */}
                            <div className="relative">
                                <EditorContent editor={editor} />
                            </div>

                            <div className="my-6 p-4 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                                <h4 className="w-full text-sm font-serif mb-2 text-gray-900 font-medium">
                                    {article.ctaTitle || "Curious about the science?"}
                                </h4>
                                <button className="inline-block bg-[#0F4C81] text-white px-4 py-2 rounded-lg font-sans font-bold text-sm text-center min-w-[140px]">
                                    {article.ctaText || "Read the Clinical Study »"}
                                </button>
                                <p className="w-full mt-2 text-[10px] text-gray-500 font-sans">
                                    {article.ctaDescription || "Secure, verified link to official research."}
                                </p>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
        </div>
    );
}

