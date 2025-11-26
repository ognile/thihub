'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, Node } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import TestimonialExtension from '@/components/admin/extensions/TestimonialExtension';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Save, X, ImagePlus, Loader2 } from 'lucide-react';

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
    
    // Refs for auto-resizing textareas
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const subtitleRef = useRef<HTMLTextAreaElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            CustomImage.configure({
                inline: true,
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
            setArticle(prev => ({ ...prev, content: editor.getHTML() }));
        },
    });

    // Auto-resize textareas on mount
    useEffect(() => {
        const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
        };
        
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            resizeTextarea(titleRef.current);
            resizeTextarea(subtitleRef.current);
        }, 100);

        return () => clearTimeout(timer);
    }, [article.title, article.subtitle]);

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
        setArticle({ ...article, title: e.target.value });
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleSubtitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setArticle({ ...article, subtitle: e.target.value });
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    if (!editor) return null;

    // The article preview content
    const ArticlePreview = () => (
        <div className={cn(
            "bg-white font-serif",
            previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
        )}>
            {/* Cinematic Hero (Editable) */}
            <div className="relative group">
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleHeroReplace}
                        className="shadow-lg"
                    >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Replace Cover
                    </Button>
                </div>

                <div className={cn(
                    "relative w-full flex items-end overflow-hidden",
                    previewMode === 'mobile' ? 'min-h-[500px] pb-16' : 'min-h-[85vh] pb-24 sm:pb-20'
                )}>
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
                    <div className={cn(
                        "relative z-10 w-full mx-auto",
                        previewMode === 'mobile' ? 'px-4 pt-16 max-w-full' : 'px-5 sm:px-6 pt-24 sm:pt-20 max-w-3xl'
                    )}>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={cn(
                                "px-2 py-1 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-sm shadow-sm",
                                previewMode === 'mobile' ? 'text-[8px]' : 'text-[10px]'
                            )}>
                                Investigative Report
                            </span>
                            <span className={cn(
                                "px-2 py-1 bg-white/10 backdrop-blur-sm text-white/90 font-bold uppercase tracking-widest rounded-sm border border-white/20",
                                previewMode === 'mobile' ? 'text-[8px]' : 'text-[10px]'
                            )}>
                                5 Min Read
                            </span>
                        </div>

                        <textarea
                            ref={titleRef}
                            value={article.title}
                            onChange={handleTitleChange}
                            className={cn(
                                "w-full font-serif font-black text-white leading-[1.2] mb-4 tracking-tight drop-shadow-lg bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-white/50",
                                previewMode === 'mobile' ? 'text-2xl' : 'text-4xl sm:text-4xl md:text-5xl lg:text-6xl'
                            )}
                            placeholder="Article Title"
                            rows={1}
                        />

                        <textarea
                            ref={subtitleRef}
                            value={article.subtitle}
                            onChange={handleSubtitleChange}
                            className={cn(
                                "w-full text-gray-200 font-sans font-light leading-relaxed mb-6 drop-shadow-md bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden placeholder-gray-400",
                                previewMode === 'mobile' ? 'text-sm max-w-full' : 'text-lg sm:text-xl max-w-xl'
                            )}
                            placeholder="Article Subtitle"
                            rows={2}
                        />

                        {/* Byline */}
                        <div className="flex items-center gap-3 border-t border-white/20 pt-4">
                            <div className={cn(
                                "rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0",
                                previewMode === 'mobile' ? 'w-10 h-10' : 'w-12 h-12'
                            )}>
                                <img
                                    src="https://picsum.photos/seed/doc/100"
                                    alt="Author"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={article.author}
                                        onChange={(e) => setArticle({ ...article, author: e.target.value })}
                                        className={cn(
                                            "text-white font-bold tracking-wide bg-transparent border-none focus:ring-0 focus:outline-none p-0 w-auto placeholder-gray-400",
                                            previewMode === 'mobile' ? 'text-xs' : 'text-sm'
                                        )}
                                        placeholder="Author Name"
                                    />
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400" aria-label="Verified">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={article.date}
                                    onChange={(e) => setArticle({ ...article, date: e.target.value })}
                                    className={cn(
                                        "bg-transparent border-none focus:ring-0 focus:outline-none p-0 placeholder-gray-500 text-gray-400 uppercase tracking-wider font-medium",
                                        previewMode === 'mobile' ? 'text-[10px] w-20' : 'text-xs w-24'
                                    )}
                                    placeholder="Date"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className={cn(
                "mx-auto -mt-16 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]",
                previewMode === 'mobile' ? 'px-4 pt-6 max-w-full' : 'px-5 pt-10 sm:pt-12 max-w-[680px]'
            )}>
                {/* Editable Key Takeaways */}
                {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                    <div className="bg-blue-50/50 border-l-4 border-[#0F4C81] p-4 my-6 rounded-r-lg shadow-sm group relative">
                        <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setArticle({ ...article, keyTakeaways: undefined })}
                                className="bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded transition-colors"
                                title="Remove Section"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                        <h3 className="flex items-center gap-2 text-[#0F4C81] font-bold text-sm uppercase tracking-wide mb-3 font-sans">
                            Key Takeaways
                        </h3>
                        <ul className="space-y-2">
                            {article.keyTakeaways.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 text-gray-800 font-sans text-sm leading-relaxed">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-[#0F4C81] rounded-full flex-shrink-0"></span>
                                    <div className="w-full">
                                        <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => updateKeyTakeaway(index, 'title', e.target.value)}
                                            className="font-bold bg-transparent border-none focus:ring-0 focus:outline-none p-0 w-full text-sm"
                                            placeholder="Title"
                                        />
                                        <textarea
                                            value={item.content}
                                            onChange={(e) => {
                                                updateKeyTakeaway(index, 'content', e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 resize-none overflow-hidden text-gray-800 text-sm"
                                            rows={1}
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
                    {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><strong>B</strong></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}><em>i</em></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 3 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>H3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 hover:bg-gray-50 ${editor.isActive('blockquote') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>""</button>
                    </BubbleMenu>}

                    {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">H2</button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">H3</button>
                        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Quote</button>
                        <button onClick={addImage} className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium">Image</button>
                    </FloatingMenu>}

                    <EditorContent editor={editor} />
                </div>

                {/* CTA Section (Editable) */}
                <div className="my-8 p-6 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                    <input
                        type="text"
                        value={article.ctaTitle || "Curious about the science?"}
                        onChange={(e) => setArticle({ ...article, ctaTitle: e.target.value })}
                        className="w-full text-lg font-serif mb-3 text-gray-900 font-medium bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center"
                    />
                    <input
                        type="text"
                        value={article.ctaText || "Read the Clinical Study »"}
                        onChange={(e) => setArticle({ ...article, ctaText: e.target.value })}
                        className="inline-block bg-[#0F4C81] text-white px-6 py-3 rounded-lg font-sans font-bold text-base text-center min-w-[180px]"
                    />
                    <input
                        type="text"
                        value={article.ctaDescription || "Secure, verified link to official research."}
                        onChange={(e) => setArticle({ ...article, ctaDescription: e.target.value })}
                        className="w-full mt-3 text-xs text-gray-500 font-sans bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-center"
                    />
                </div>
            </main>
        </div>
    );

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

            {/* Preview Container */}
            <div className={cn(
                "flex justify-center py-6",
                previewMode === 'mobile' ? 'px-4' : 'px-0'
            )}>
                {previewMode === 'mobile' ? (
                    // Mobile Device Frame
                    <div className="relative">
                        {/* Phone Frame */}
                        <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />
                            
                            {/* Screen */}
                            <div className="relative bg-white rounded-[2.5rem] overflow-hidden w-[375px] h-[750px]">
                                <div className="h-full overflow-y-auto">
                                    <ArticlePreview />
                                </div>
                            </div>
                            
                            {/* Home Indicator */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
                        </div>
                    </div>
                ) : (
                    // Desktop View
                    <div className="w-full max-w-4xl">
                        <ArticlePreview />
                    </div>
                )}
            </div>
        </div>
    );
}
