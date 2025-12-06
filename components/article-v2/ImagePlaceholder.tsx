'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImagePlus, Search, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePlaceholderProps {
    searchQuery: string;
    imageUrl?: string;
    onImageUpload?: (url: string) => void;
    className?: string;
    editable?: boolean;
}

export default function ImagePlaceholder({
    searchQuery,
    imageUrl,
    onImageUpload,
    className,
    editable = false
}: ImagePlaceholderProps) {
    const [uploading, setUploading] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

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
                        setCurrentImageUrl(data.url);
                        onImageUpload?.(data.url);
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
    }, [onImageUpload]);

    const handleRemove = useCallback(() => {
        setCurrentImageUrl(undefined);
        onImageUpload?.('');
    }, [onImageUpload]);

    // If we have an image, show it
    if (currentImageUrl) {
        return (
            <div className={cn('my-8 relative group', className)}>
                <img
                    src={currentImageUrl}
                    alt={searchQuery}
                    className="w-full rounded-xl shadow-md"
                />
                
                {/* Edit overlay (only in editor) */}
                {editable && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={handleUpload}
                            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-50 transition-colors"
                        >
                            Replace
                        </button>
                        <button
                            onClick={handleRemove}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-red-700 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Placeholder state
    return (
        <div className={cn('my-8', className)}>
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-8 sm:p-12">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                        backgroundSize: '24px 24px'
                    }} />
                </div>

                <div className="relative flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4">
                        <ImagePlus className="w-8 h-8 text-slate-500" />
                    </div>

                    {/* Search Query Label */}
                    <div className="flex items-center gap-2 mb-3">
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500">Suggested image:</span>
                    </div>

                    {/* Query Text */}
                    <p className="text-lg font-semibold text-slate-700 mb-6 max-w-md">
                        "{searchQuery}"
                    </p>

                    {/* Upload Button */}
                    {editable && (
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
                    )}

                    {/* Help Text */}
                    <p className="text-xs text-slate-400 mt-4">
                        Upload a relevant image to replace this placeholder
                    </p>
                </div>
            </div>
        </div>
    );
}

