'use client';

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, Node } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import TestimonialExtension from '@/components/admin/extensions/TestimonialExtension';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Save,
    Loader2,
    Smartphone,
    Monitor,
    ExternalLink,
} from 'lucide-react';

// --- Custom Important Update Node ---
const ImportantUpdateExtension = Node.create({
    name: 'importantUpdate',
    group: 'block',
    content: 'paragraph+',
    draggable: true,

    parseHTML() {
        return [
            {
                tag: 'div',
                getAttrs: (element) => (element as HTMLElement).classList.contains('important-update') && null,
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'important-update' }), 0]
    },

    addCommands() {
        return {
            setImportantUpdate: () => ({ commands }: { commands: any }) => {
                return commands.toggleWrap('importantUpdate')
            },
        } as any;
    },
});

// --- Custom Image Node View ---
const ImageNode = ({ node, updateAttributes, deleteNode }: any) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleReplace = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    if (data.url) {
                        updateAttributes({ src: data.url });
                    }
                } catch (err) {
                    console.error('Upload failed', err);
                    toast.error('Failed to upload image');
                }
            }
        };
        input.click();
    }, [updateAttributes]);

    return (
        <NodeViewWrapper className="relative inline-block w-full my-8" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <img src={node.attrs.src} alt={node.attrs.alt} className="w-full rounded-xl shadow-md transition-opacity duration-200" style={{ opacity: isHovered ? 0.9 : 1 }} />
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/30 rounded-xl backdrop-blur-[2px] transition-all z-10">
                    <button onClick={handleReplace} className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-50 transition-colors">
                        Replace
                    </button>
                    <button onClick={deleteNode} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-red-700 transition-colors">
                        Remove
                    </button>
                </div>
            )}
        </NodeViewWrapper>
    );
};

// Extend Image extension to use React Component
const CustomImage = Image.extend({
    inline: false,
    group: 'block',
    addNodeView() {
        return ReactNodeViewRenderer(ImageNode);
    },
});

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
    comments?: any[];
}

interface LiveArticleEditorProps {
    article: Article;
    onSave: (updatedArticle: Article) => Promise<void>;
}

export default function LiveArticleEditor({ article: initialArticle, onSave }: LiveArticleEditorProps) {
    const [article, setArticle] = useState(initialArticle);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const subtitleRef = useRef<HTMLTextAreaElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            CustomImage.configure({
                allowBase64: true,
            }),
            ImportantUpdateExtension,
            BubbleMenuExtension,
            FloatingMenuExtension,
            TestimonialExtension,
        ],
        content: initialArticle.content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none text-gray-800 font-serif leading-loose focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            setArticle(prev => ({ ...prev, content: newContent }));
        },
    });

    // Auto-resize textareas on mount and content change
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

    // Send article updates to iframe
    useEffect(() => {
        if (previewMode === 'mobile' && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'ARTICLE_UPDATE',
                article,
                isEditing: true
            }, '*');
        }
    }, [article, previewMode]);

    // Listen for messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'PREVIEW_READY' && iframeRef.current?.contentWindow) {
                // Send initial article data
                iframeRef.current.contentWindow.postMessage({
                    type: 'ARTICLE_UPDATE',
                    article,
                    isEditing: true
                }, '*');
            }
            if (event.data.type === 'ARTICLE_FIELD_UPDATE') {
                // Update from iframe edits
                setArticle(prev => ({ ...prev, [event.data.field]: event.data.value }));
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [article]);

    const addImage = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    if (data.url) {
                        editor?.chain().focus().setImage({ src: data.url }).run();
                    }
                } catch (err) {
                    console.error('Upload failed', err);
                    toast.error('Failed to upload image');
                }
            }
        };
        input.click();
    }, [editor]);

    const handleHeroReplace = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    if (data.url) {
                        setArticle(prev => ({ ...prev, image: data.url }));
                        toast.success('Cover image updated');
                    }
                } catch (err) {
                    console.error('Upload failed', err);
                    toast.error('Failed to upload image');
                }
            }
        };
        input.click();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const articleToSave = {
                ...article,
                keyTakeaways: article.keyTakeaways || null
            };
            await onSave(articleToSave);
            toast.success('Article saved successfully');
        } catch (err) {
            toast.error('Failed to save article');
        } finally {
            setSaving(false);
        }
    };

    const updateKeyTakeaway = (index: number, field: 'title' | 'content', value: string) => {
        const newTakeaways = [...(article.keyTakeaways || [])];
        if (!newTakeaways[index]) return;
        newTakeaways[index] = { ...newTakeaways[index], [field]: value };
        setArticle({ ...article, keyTakeaways: newTakeaways });
    };

    const handleTextareaChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
        field: 'title' | 'subtitle'
    ) => {
        setArticle({ ...article, [field]: e.target.value });
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    if (!editor) return null;

    // Desktop preview content
    const DesktopPreview = (
        <div className="min-h-screen bg-white font-serif">
            {/* Cinematic Hero (Editable) */}
            <div className="relative group">
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleHeroReplace}
                        className="bg-white/90 backdrop-blur text-gray-900 shadow-lg hover:bg-white"
                    >
                        Replace Cover Image
                    </Button>
                </div>

                <div className="relative w-full min-h-[85vh] sm:min-h-[85vh] flex items-end pb-24 sm:pb-20 overflow-hidden">
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={article.image}
                            alt="Hero Background"
                            className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
                    </div>

                    {/* Content Overlay */}
                    <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-6 pt-24 sm:pt-20">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                                Investigative Report
                            </span>
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                                5 Min Read
                            </span>
                            {/* Trust Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Fact Checked
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Medically Reviewed
                                </span>
                            </div>
                        </div>

                        <textarea
                            ref={titleRef}
                            value={article.title}
                            onChange={(e) => handleTextareaChange(e, 'title')}
                            className="w-full text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-black text-white leading-[1.2] mb-6 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-white/50 break-words hyphens-auto"
                            placeholder="Article Title"
                            rows={1}
                        />

                        <textarea
                            ref={subtitleRef}
                            value={article.subtitle}
                            onChange={(e) => handleTextareaChange(e, 'subtitle')}
                            className="w-full text-lg sm:text-xl text-gray-200 font-sans font-light leading-relaxed mb-8 max-w-xl drop-shadow-md bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-gray-400"
                            placeholder="Article Subtitle"
                            rows={2}
                        />

                        {/* Byline */}
                        <div className="flex items-center gap-4 border-t border-white/20 pt-6">
                            <div className="w-12 h-12 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                <img
                                    src="https://picsum.photos/seed/doc/100"
                                    alt="Author"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={article.author}
                                        onChange={(e) => setArticle({ ...article, author: e.target.value })}
                                        className="text-white font-bold text-sm tracking-wide bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-400"
                                        placeholder="Author Name"
                                    />
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0" aria-label="Verified">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
                                    <input
                                        type="text"
                                        value={article.date}
                                        onChange={(e) => setArticle({ ...article, date: e.target.value })}
                                        className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-500 text-gray-400"
                                        placeholder="Date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-5 max-w-[680px] mx-auto -mt-20 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-10 sm:pt-12">

                {/* Editable Key Takeaways */}
                {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-6 my-8 rounded-r-lg shadow-sm group relative">
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Editable Section</span>
                            <button
                                onClick={() => setArticle({ ...article, keyTakeaways: undefined })}
                                className="bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove Section"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <h3 className="flex items-center gap-2 text-[#0F4C81] font-bold text-lg uppercase tracking-wide mb-4 font-sans">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Key Takeaways
                        </h3>
                        <ul className="space-y-3">
                            {article.keyTakeaways.map((item, index) => (
                                <li key={index} className="flex items-start gap-3 text-gray-800 font-sans text-[15px] leading-relaxed">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-[#0F4C81] rounded-full flex-shrink-0"></span>
                                    <div className="w-full">
                                        <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => updateKeyTakeaway(index, 'title', e.target.value)}
                                            className="font-bold bg-transparent border-none focus:ring-0 focus:outline-none p-0 w-full mb-1"
                                            placeholder="Title"
                                        />
                                        <textarea
                                            value={item.content}
                                            onChange={(e) => {
                                                updateKeyTakeaway(index, 'content', e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden text-gray-800"
                                            rows={2}
                                            placeholder="Content"
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Main Editor */}
                <div className="relative">
                    {/* Bubble Menu */}
                    {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><strong>B</strong></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><em>i</em></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 3 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('blockquote') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>""</button>
                        <button onClick={() => (editor.chain().focus() as any).setImportantUpdate().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('importantUpdate') ? 'text-blue-600 bg-blue-50' : 'text-red-600'}`}>⚠️</button>
                    </BubbleMenu>}

                    {/* Floating Menu */}
                    {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Heading 2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Heading 3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Quote</button>
                        <button onClick={() => (editor.chain().focus() as any).setImportantUpdate().run()} className="p-2 hover:bg-gray-50 text-red-600 text-xs font-medium">Important</button>
                        <button onClick={addImage} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Add Image
                        </button>
                        <button onClick={() => (editor.chain().focus() as any).insertContent({ type: 'testimonial' }).run()} className="p-2 hover:bg-gray-50 text-blue-600 text-xs font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            Testimonial
                        </button>
                    </FloatingMenu>}

                    <EditorContent editor={editor} />
                </div>

                {/* CTA Section (Editable) */}
                <div className="my-12 p-8 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm group relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">CTA Section</span>
                    </div>
                    <input
                        type="text"
                        value={article.ctaTitle || "Curious about the science?"}
                        onChange={(e) => setArticle({ ...article, ctaTitle: e.target.value })}
                        className="w-full text-xl font-serif mb-4 text-gray-900 font-medium bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-blue-300"
                    />
                    <input
                        type="text"
                        value={article.ctaText || "Read the Clinical Study »"}
                        onChange={(e) => setArticle({ ...article, ctaText: e.target.value })}
                        className="inline-block bg-[#0F4C81] text-white px-8 py-4 rounded-lg font-sans font-bold text-lg hover:bg-[#0a3b66] transition-colors shadow-md hover:shadow-lg text-center w-auto min-w-[200px]"
                    />
                    <input
                        type="text"
                        value={article.ctaDescription || "Secure, verified link to official research."}
                        onChange={(e) => setArticle({ ...article, ctaDescription: e.target.value })}
                        className="w-full mt-4 text-xs text-gray-500 font-sans bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-gray-400"
                    />
                </div>
            </main>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-100">
            {/* Fixed Top Toolbar */}
            <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200 z-[100] shadow-sm">
                <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="sm" asChild className="text-zinc-600 hover:text-zinc-900">
                            <Link href="/admin">
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Link>
                        </Button>
                        <div className="h-6 w-px bg-zinc-200 hidden sm:block" />
                        <span className="text-sm font-medium text-zinc-700 truncate max-w-[200px] sm:max-w-[400px] hidden sm:block">
                            {article.title}
                        </span>
                    </div>

                    {/* Center: Preview Mode Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
                        <Button
                            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setPreviewMode('desktop')}
                            className={cn(
                                'gap-1.5',
                                previewMode === 'desktop' 
                                    ? 'bg-white shadow-sm text-zinc-900' 
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-transparent'
                            )}
                        >
                            <Monitor className="h-4 w-4" />
                            <span className="hidden sm:inline">Desktop</span>
                        </Button>
                        <Button
                            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setPreviewMode('mobile')}
                            className={cn(
                                'gap-1.5',
                                previewMode === 'mobile' 
                                    ? 'bg-white shadow-sm text-zinc-900' 
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-transparent'
                            )}
                        >
                            <Smartphone className="h-4 w-4" />
                            <span className="hidden sm:inline">Mobile</span>
                        </Button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild className="border-zinc-200 text-zinc-600 hover:text-zinc-900 hidden sm:flex">
                            <a href={`/articles/${article.slug}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Live
                            </a>
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800 text-white"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="pt-14">
                {previewMode === 'desktop' ? (
                    // Desktop Preview - Full Width with inline editing
                    DesktopPreview
                ) : (
                    // Mobile Preview - Iframe with true viewport
                    <div className="flex justify-center py-8 px-4">
                        <div className="relative">
                            {/* iPhone Frame */}
                            <div className="relative w-[375px] h-[812px] bg-black rounded-[3rem] p-3 shadow-2xl">
                                {/* Dynamic Island / Notch */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-full z-50" />
                                {/* Screen - Using iframe for true viewport */}
                                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                                    <iframe
                                        ref={iframeRef}
                                        src={`/admin/articles/${article.slug}/preview`}
                                        className="w-full h-full border-0"
                                        title="Mobile Preview"
                                        style={{ borderRadius: '2.5rem' }}
                                    />
                                </div>
                            </div>
                            {/* Side Buttons */}
                            <div className="absolute right-[-3px] top-[120px] w-[3px] h-[60px] bg-zinc-700 rounded-l" />
                            <div className="absolute left-[-3px] top-[100px] w-[3px] h-[30px] bg-zinc-700 rounded-r" />
                            <div className="absolute left-[-3px] top-[150px] w-[3px] h-[50px] bg-zinc-700 rounded-r" />
                            <div className="absolute left-[-3px] top-[210px] w-[3px] h-[50px] bg-zinc-700 rounded-r" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
