'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, Node } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import TestimonialExtension from '@/components/admin/extensions/TestimonialExtension';
import ComparisonTableExtension from '@/components/admin/extensions/ComparisonTableExtension';
import IconListExtension from '@/components/admin/extensions/IconListExtension';
import TimelineExtension from '@/components/admin/extensions/TimelineExtension';
import ImagePlaceholderExtension from '@/components/admin/extensions/ImagePlaceholderExtension';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Save, X, ImagePlus, Loader2, Table2, List, Clock, Image as ImageIcon, Settings, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

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
    ctaUrl?: string;
    keyTakeaways?: { title: string; content: string }[] | null;
    comments?: any[];
    // V2 Sticky CTA fields
    stickyCTAEnabled?: boolean;
    stickyCTAText?: string;
    stickyCTAPrice?: string;
    stickyCTAOriginalPrice?: string;
    stickyCTAProductName?: string;
    articleTheme?: 'v1' | 'v2';
}

interface LiveArticleEditorProps {
    article: Article;
    onSave: (updatedArticle: Article) => Promise<void>;
}

export default function LiveArticleEditor({ article: initialArticle, onSave }: LiveArticleEditorProps) {
    const [article, setArticle] = useState(initialArticle);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [showSettings, setShowSettings] = useState(false);
    
    // Refs for auto-resizing textareas
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const subtitleRef = useRef<HTMLTextAreaElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            CustomImage.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'w-full rounded-xl shadow-md',
                },
            }),
            ImportantUpdateExtension,
            BubbleMenuExtension,
            FloatingMenuExtension,
            TestimonialExtension,
            ComparisonTableExtension,
            IconListExtension,
            TimelineExtension,
            ImagePlaceholderExtension,
        ],
        content: initialArticle.content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none text-gray-800 font-serif leading-loose focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            setArticle(prev => ({ ...prev, content: editor.getHTML() }));
        },
    });

    // Auto-resize textareas ONLY on mount - use requestAnimationFrame for reliable DOM measurement
    useEffect(() => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (titleRef.current) {
                    titleRef.current.style.height = 'auto';
                    titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
                }
                if (subtitleRef.current) {
                    subtitleRef.current.style.height = 'auto';
                    subtitleRef.current.style.height = subtitleRef.current.scrollHeight + 'px';
                }
            }, 50);
        });
    }, []); // Empty deps - only on mount

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
        } catch (error) {
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

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setArticle(prev => ({ ...prev, title: e.target.value }));
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleSubtitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setArticle(prev => ({ ...prev, subtitle: e.target.value }));
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    if (!editor) return null;

    const isMobile = previewMode === 'mobile';

    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-50 bg-background border-b">
                <div className="flex items-center justify-between px-4 h-14">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-5 w-5" />
                        </Link>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Editing: </span>
                            <span className="font-medium truncate max-w-[200px] inline-block align-bottom">{article.title}</span>
                        </div>
                </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Preview Mode Toggle */}
                        <div className="flex items-center bg-muted rounded-lg p-1">
                            <Button
                                variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setPreviewMode('desktop')}
                                className="h-8 px-3"
                            >
                                <Monitor className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setPreviewMode('mobile')}
                                className="h-8 px-3"
                            >
                                <Smartphone className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button 
                            variant={showSettings ? 'secondary' : 'outline'}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                            {showSettings ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                        </Button>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-white border-b shadow-sm">
                    <div className="max-w-4xl mx-auto p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Sticky CTA Settings
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Enable Toggle */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={article.stickyCTAEnabled || false}
                                            onChange={(e) => setArticle(prev => ({ ...prev, stickyCTAEnabled: e.target.checked }))}
                                            className="sr-only"
                                        />
                                        <div className={`w-11 h-6 rounded-full transition-colors ${article.stickyCTAEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${article.stickyCTAEnabled ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                                        </div>
                                    </div>
                                    <span className="font-medium">Enable Sticky CTA</span>
                                    <span className="text-sm text-gray-500">(Shows a fixed CTA button while scrolling)</span>
                                </label>
                            </div>

                            {article.stickyCTAEnabled && (
                                <>
                                    {/* Product Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                        <input
                                            type="text"
                                            value={article.stickyCTAProductName || ''}
                                            onChange={(e) => setArticle(prev => ({ ...prev, stickyCTAProductName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="e.g., Gut Health Formula"
                                        />
                                    </div>

                                    {/* CTA Button Text */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                                        <input
                                            type="text"
                                            value={article.stickyCTAText || 'Try Risk-Free'}
                                            onChange={(e) => setArticle(prev => ({ ...prev, stickyCTAText: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="Try Risk-Free"
                                        />
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Price</label>
                                        <input
                                            type="text"
                                            value={article.stickyCTAPrice || ''}
                                            onChange={(e) => setArticle(prev => ({ ...prev, stickyCTAPrice: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="$49.99"
                                        />
                                    </div>

                                    {/* Original Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (strikethrough)</label>
                                        <input
                                            type="text"
                                            value={article.stickyCTAOriginalPrice || ''}
                                            onChange={(e) => setArticle(prev => ({ ...prev, stickyCTAOriginalPrice: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="$79.99"
                                        />
                                    </div>

                                    {/* CTA URL Info */}
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-500">
                                            The CTA button will link to the article's CTA URL setting.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Container */}
            <div className={cn(
                "flex justify-center",
                isMobile ? 'py-6 px-4' : 'py-0'
            )}>
                {isMobile ? (
                    // Mobile Device Frame
                    <div className="relative">
                        <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />
                            <div className="relative bg-white rounded-[2.5rem] overflow-hidden w-[375px] h-[750px]">
                                <div className="h-full overflow-y-auto">
                                    {/* Mobile Preview Content - Inline JSX */}
                                    <div className="bg-white font-serif w-full">
                                        {/* Mobile Header (visual only) */}
                                        <header className="sticky top-0 z-40 bg-transparent">
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
                                            <div className="absolute top-16 right-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="secondary" size="sm" onClick={handleHeroReplace} className="shadow-lg text-xs h-7 px-2">
                                                    <ImagePlus className="h-3 w-3 mr-1" />
                                                    Replace
                                                </Button>
                </div>

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

                                                    <textarea
                                                        ref={titleRef}
                                                        value={article.title}
                                                        onChange={handleTitleChange}
                                                        className="w-full text-2xl font-serif font-black text-white leading-[1.2] mb-4 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-white/50"
                                                        placeholder="Article Title"
                                                        rows={1}
                                                    />

                                                    <textarea
                                                        ref={subtitleRef}
                                                        value={article.subtitle}
                                                        onChange={handleSubtitleChange}
                                                        className="w-full text-sm text-gray-200 font-sans font-light leading-relaxed mb-6 drop-shadow-md bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-gray-400"
                                                        placeholder="Article Subtitle"
                                                        rows={2}
                                                    />

                                                    <div className="flex items-center gap-3 border-t border-white/20 pt-4">
                                                        <div className="w-10 h-10 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                                            <img src="https://picsum.photos/seed/doc/100" alt="Author" className="w-full h-full rounded-full object-cover" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={article.author}
                                                                    onChange={(e) => setArticle(prev => ({ ...prev, author: e.target.value }))}
                                                                    className="text-white font-bold text-xs tracking-wide bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-400"
                                                                    placeholder="Author Name"
                                                                />
                                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={article.date}
                                                                onChange={(e) => setArticle(prev => ({ ...prev, date: e.target.value }))}
                                                                className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[10px] placeholder-gray-500 text-gray-400 uppercase tracking-wider font-medium"
                                                                placeholder="Date"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile Main Content */}
                                        <main className="px-4 pt-6 -mt-12 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                            {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                                                <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-3 my-4 rounded-r-lg shadow-sm group relative">
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setArticle(prev => ({ ...prev, keyTakeaways: undefined }))} className="bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded"><X className="h-3 w-3" /></button>
                                                    </div>
                                                    <h3 className="text-[#0F4C81] font-bold text-xs uppercase tracking-wide mb-2 font-sans">Key Takeaways</h3>
                                                    <ul className="space-y-2">
                                                        {article.keyTakeaways.map((item, index) => (
                                                            <li key={index} className="flex items-start gap-2 text-gray-800 font-sans text-xs leading-relaxed">
                                                                <span className="mt-1 w-1 h-1 bg-[#0F4C81] rounded-full flex-shrink-0"></span>
                                                                <div className="w-full">
                                                                    <input type="text" value={item.title} onChange={(e) => updateKeyTakeaway(index, 'title', e.target.value)} className="font-bold bg-transparent border-none focus:ring-0 focus:outline-none p-0 w-full text-xs" placeholder="Title" />
                                                                    <textarea value={item.content} onChange={(e) => { updateKeyTakeaway(index, 'content', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden text-gray-800 text-xs" rows={1} placeholder="Content" />
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="relative prose prose-sm max-w-none text-gray-800 font-serif">
                                                {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                                                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 hover:bg-gray-50 text-xs ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><strong>B</strong></button>
                                                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 hover:bg-gray-50 text-xs ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><em>i</em></button>
                                                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 hover:bg-gray-50 text-xs ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H2</button>
                                                </BubbleMenu>}
                                                <EditorContent editor={editor} />
                                            </div>

                                            <div className="my-6 p-4 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                                                <input type="text" value={article.ctaTitle || "Curious about the science?"} onChange={(e) => setArticle(prev => ({ ...prev, ctaTitle: e.target.value }))} className="w-full text-sm font-serif mb-2 text-gray-900 font-medium bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center" />
                                                <input type="text" value={article.ctaText || "Read the Clinical Study »"} onChange={(e) => setArticle(prev => ({ ...prev, ctaText: e.target.value }))} className="inline-block bg-[#0F4C81] text-white px-4 py-2 rounded-lg font-sans font-bold text-sm text-center min-w-[140px]" />
                                                <input type="text" value={article.ctaDescription || "Secure, verified link to official research."} onChange={(e) => setArticle(prev => ({ ...prev, ctaDescription: e.target.value }))} className="w-full mt-2 text-[10px] text-gray-500 font-sans bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center" />
                                            </div>
                                        </main>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
                        </div>
                    </div>
                ) : (
                    // Desktop View - Full Width like visitor view
                    <div className="w-full bg-white font-serif">
                        {/* Desktop Hero - Full Width */}
                        <div className="relative group">
                            <div className="absolute top-20 right-6 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="sm" onClick={handleHeroReplace} className="shadow-lg">
                                    <ImagePlus className="h-4 w-4 mr-2" />
                                    Replace Cover
                                </Button>
                            </div>

                            <div className="relative w-full min-h-[85vh] flex items-end pb-24 overflow-hidden">
                                <div className="absolute inset-0 z-0">
                                    <img src={article.image} alt="Hero" className="w-full h-full object-cover object-center" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
                    </div>

                                <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-6 pt-24">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                                Investigative Report
                            </span>
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                                5 Min Read
                            </span>
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
                                        ref={isMobile ? undefined : titleRef}
                            value={article.title}
                                        onChange={handleTitleChange}
                                        className="w-full text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-black text-white leading-[1.2] mb-6 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-white/50"
                            placeholder="Article Title"
                            rows={1}
                        />

                        <textarea
                                        ref={isMobile ? undefined : subtitleRef}
                            value={article.subtitle}
                                        onChange={handleSubtitleChange}
                                        className="w-full text-lg sm:text-xl text-gray-200 font-sans font-light leading-relaxed mb-8 max-w-xl drop-shadow-md bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-gray-400"
                            placeholder="Article Subtitle"
                            rows={2}
                        />

                        <div className="flex items-center gap-4 border-t border-white/20 pt-6">
                            <div className="w-12 h-12 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                            <img src="https://picsum.photos/seed/doc/100" alt="Author" className="w-full h-full rounded-full object-cover" />
                            </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={article.author}
                                                    onChange={(e) => setArticle(prev => ({ ...prev, author: e.target.value }))}
                                                    className="text-white font-bold text-sm tracking-wide bg-transparent border-none focus:ring-0 focus:outline-none p-0 min-w-0 flex-1 placeholder-gray-400"
                                        placeholder="Author Name"
                                    />
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                </div>
                                    <input
                                        type="text"
                                        value={article.date}
                                                onChange={(e) => setArticle(prev => ({ ...prev, date: e.target.value }))}
                                                className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-xs placeholder-gray-500 text-gray-400 uppercase tracking-wider font-medium"
                                        placeholder="Date"
                                    />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                        {/* Desktop Main Content */}
            <main className="px-5 max-w-[680px] mx-auto -mt-20 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-10 sm:pt-12">
                {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-6 my-8 rounded-r-lg shadow-sm group relative">
                                    <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setArticle(prev => ({ ...prev, keyTakeaways: undefined }))} className="bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded transition-colors" title="Remove Section">
                                            <X className="h-4 w-4" />
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

                <div className="relative">
                    {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><strong>B</strong></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><em>i</em></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 3 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('blockquote') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>""</button>
                    </BubbleMenu>}

                    {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex flex-wrap divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">H2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">H3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Quote</button>
                        <button onClick={addImage} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium flex items-center gap-1">
                            <ImagePlus className="w-3 h-3" />
                            Image
                        </button>
                        <button onClick={() => editor.chain().focus().insertContent({ type: 'comparisonTable' }).run()} className="p-2 hover:bg-emerald-50 text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <Table2 className="w-3 h-3" />
                            Table
                        </button>
                        <button onClick={() => editor.chain().focus().insertContent({ type: 'iconList' }).run()} className="p-2 hover:bg-emerald-50 text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <List className="w-3 h-3" />
                            Icons
                        </button>
                        <button onClick={() => editor.chain().focus().insertContent({ type: 'timeline' }).run()} className="p-2 hover:bg-emerald-50 text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Timeline
                        </button>
                        <button onClick={() => editor.chain().focus().insertContent({ type: 'imagePlaceholder' }).run()} className="p-2 hover:bg-emerald-50 text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Placeholder
                        </button>
                        <button onClick={() => editor.chain().focus().insertContent({ type: 'testimonial' }).run()} className="p-2 hover:bg-blue-50 text-blue-600 text-xs font-medium">Review</button>
                    </FloatingMenu>}

                    <EditorContent editor={editor} />
                </div>

                            <div className="my-12 p-8 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                    <input
                        type="text"
                        value={article.ctaTitle || "Curious about the science?"}
                                    onChange={(e) => setArticle(prev => ({ ...prev, ctaTitle: e.target.value }))}
                                    className="w-full text-xl font-serif mb-4 text-gray-900 font-medium bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-blue-300"
                    />
                    <input
                        type="text"
                        value={article.ctaText || "Read the Clinical Study »"}
                                    onChange={(e) => setArticle(prev => ({ ...prev, ctaText: e.target.value }))}
                                    className="inline-block bg-[#0F4C81] text-white px-8 py-4 rounded-lg font-sans font-bold text-lg text-center w-auto min-w-[200px]"
                    />
                    <input
                        type="text"
                        value={article.ctaDescription || "Secure, verified link to official research."}
                                    onChange={(e) => setArticle(prev => ({ ...prev, ctaDescription: e.target.value }))}
                                    className="w-full mt-4 text-xs text-gray-500 font-sans bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center placeholder-gray-400"
                    />
                </div>
            </main>
                    </div>
                )}
            </div>
        </div>
    );
}
