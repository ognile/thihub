'use client';

import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { getIconComponent, iconKeywordMap } from '@/components/article-v2/IconList';

interface IconListItem {
    icon: string;
    title: string;
    text: string;
}

export default function IconListNode(props: any) {
    const { node, updateAttributes } = props;
    const items: IconListItem[] = node.attrs.items || [];
    const columns: number = node.attrs.columns || 2;

    const updateItem = (index: number, field: keyof IconListItem, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        updateAttributes({ items: newItems });
    };

    const addItem = () => {
        updateAttributes({
            items: [...items, { icon: 'check', title: 'New Point', text: 'Description...' }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        updateAttributes({ items: newItems });
    };

    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    };

    // Get available icon keywords for tooltip
    const availableIcons = Object.keys(iconKeywordMap).slice(0, 20).join(', ');

    return (
        <NodeViewWrapper className="my-10">
            <div className="space-y-4">
                {/* Column Selector */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Columns:</span>
                    {[1, 2, 3].map((col) => (
                        <button
                            key={col}
                            onClick={() => updateAttributes({ columns: col })}
                            className={`px-2 py-1 rounded ${
                                columns === col 
                                    ? 'bg-emerald-100 text-emerald-700 font-bold' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {col}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className={`grid gap-4 ${gridCols[columns as 1 | 2 | 3]}`}>
                    {items.map((item, index) => {
                        const IconComponent = getIconComponent(item.icon);

                        return (
                            <div
                                key={index}
                                className="group bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all relative"
                            >
                                {/* Delete Button */}
                                <button
                                    onClick={() => removeItem(index)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                {/* Icon Preview & Keyword Input */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center flex-shrink-0">
                                        <IconComponent className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-400">Icon keyword</span>
                                            <div className="relative group/tooltip">
                                                <HelpCircle className="w-3 h-3 text-gray-300" />
                                                <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block z-50 w-64 p-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg">
                                                    Keywords: {availableIcons}...
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={item.icon}
                                            onChange={(e) => updateItem(index, 'icon', e.target.value)}
                                            className="w-full text-xs text-emerald-600 font-mono bg-emerald-50 border border-emerald-100 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-300 focus:outline-none"
                                            placeholder="icon keyword..."
                                        />
                                    </div>
                                </div>

                                {/* Title */}
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                                    className="w-full text-base font-bold text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none mb-2"
                                    placeholder="Title..."
                                />

                                {/* Text */}
                                <textarea
                                    value={item.text}
                                    onChange={(e) => {
                                        updateItem(index, 'text', e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    className="w-full text-sm text-gray-600 leading-relaxed bg-transparent border-none focus:ring-0 focus:outline-none resize-none overflow-hidden"
                                    rows={2}
                                    placeholder="Description..."
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Add Item Button */}
                <button
                    onClick={addItem}
                    className="w-full p-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-emerald-600 border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Item
                </button>
            </div>
        </NodeViewWrapper>
    );
}

