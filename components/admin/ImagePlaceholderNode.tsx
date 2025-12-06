'use client';

import { NodeViewWrapper } from '@tiptap/react';
import React, { useState, useCallback } from 'react';
import { ImagePlus, Search, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ImagePlaceholderNode(props: any) {
    const { node, updateAttributes, deleteNode } = props;
    const searchQuery: string = node.attrs.searchQuery || '';
    const imageUrl: string = node.attrs.imageUrl || '';
    
    const [uploading, setUploading] = useState(false);

    const handleUpload = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);
                
                setUploading(true);
                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error(await res.text());
                    
                    const data = await res.json();
                    if (data.url) {
                        updateAttributes({ imageUrl: data.url });
                        toast.success('Image uploaded successfully');
                    }
                } catch (err) {
                    console.error('Upload failed', err);
                    toast.error('Failed to upload image');
                } finally {
                    setUploading(false);
                }
            }
        };
        input.click();
    }, [updateAttributes]);

    const handleRemoveImage = useCallback(() => {
        updateAttributes({ imageUrl: '' });
    }, [updateAttributes]);

    // If we have an image, show it with edit controls
    if (imageUrl) {
        return (
            <NodeViewWrapper className="my-8">
                <div className="relative group rounded-xl overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={searchQuery}
                        className="w-full rounded-xl shadow-md"
                    />
                    
                    {/* Edit overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={handleUpload}
                            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-50 transition-colors"
                        >
                            Replace
                        </button>
                        <button
                            onClick={handleRemoveImage}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-yellow-600 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={deleteNode}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>

                    {/* Search query badge */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
                        <Search className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{searchQuery}</span>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    // Placeholder state
    return (
        <NodeViewWrapper className="my-8">
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-8 group">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                        backgroundSize: '24px 24px'
                    }} />
                </div>

                {/* Delete Button */}
                <button
                    onClick={deleteNode}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4">
                        <ImagePlus className="w-8 h-8 text-slate-500" />
                    </div>

                    {/* Search Query Input */}
                    <div className="w-full max-w-md mb-4">
                        <div className="flex items-center gap-2 mb-2 justify-center">
                            <Search className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Suggested image:</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => updateAttributes({ searchQuery: e.target.value })}
                            className="w-full text-center text-lg font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 focus:outline-none"
                            placeholder="e.g., gut biofilm diagram"
                        />
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload Image
                            </>
                        )}
                    </button>

                    {/* Help Text */}
                    <p className="text-xs text-slate-400 mt-4">
                        Upload a relevant image to replace this placeholder
                    </p>
                </div>
            </div>
        </NodeViewWrapper>
    );
}

