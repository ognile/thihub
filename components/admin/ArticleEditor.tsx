'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import { useState, useEffect } from 'react';

interface ArticleEditorProps {
    content: string;
    onChange: (html: string) => void;
}

const ArticleEditor = ({ content, onChange }: ArticleEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            BubbleMenuExtension,
            FloatingMenuExtension,
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content if it changes externally (e.g. initial load)
    useEffect(() => {
        if (editor && content && editor.getHTML() !== content) {
            // Only set content if it's significantly different to avoid cursor jumping
            // This is a simple check; might need refinement
            if (Math.abs(editor.getHTML().length - content.length) > 10) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    const addImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                    });
                    const data = await res.json();
                    if (data.url) {
                        editor?.chain().focus().setImage({ src: data.url }).run();
                    }
                } catch (err) {
                    console.error('Upload failed', err);
                    alert('Failed to upload image');
                }
            }
        };
        input.click();
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="relative border border-gray-200 rounded-xl bg-white min-h-[500px] p-8 shadow-sm">
            {/* Bubble Menu for Text Selection */}
            {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 hover:bg-gray-50 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                >
                    <strong>B</strong>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 hover:bg-gray-50 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                >
                    <em>i</em>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 hover:bg-gray-50 ${editor.isActive('heading', { level: 3 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                >
                    H3
                </button>
            </BubbleMenu>}

            {/* Floating Menu for Empty Lines */}
            {editor && <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex divide-x divide-gray-100">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                >
                    Heading
                </button>
                <button
                    onClick={addImage}
                    className="p-2 hover:bg-gray-50 text-gray-600 text-xs font-medium flex items-center gap-1"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Add Image
                </button>
            </FloatingMenu>}

            <EditorContent editor={editor} />
        </div>
    );
};

export default ArticleEditor;
