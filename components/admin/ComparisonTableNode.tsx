'use client';

import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';

interface Feature {
    name: string;
    us: boolean;
    them: boolean;
}

export default function ComparisonTableNode(props: any) {
    const { node, updateAttributes } = props;
    const features: Feature[] = node.attrs.features || [];
    const ourBrand: string = node.attrs.ourBrand || 'Our Formula';
    const theirBrand: string = node.attrs.theirBrand || 'Generic Brands';

    const updateFeature = (index: number, field: keyof Feature, value: any) => {
        const newFeatures = [...features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        updateAttributes({ features: newFeatures });
    };

    const addFeature = () => {
        updateAttributes({
            features: [...features, { name: 'New Feature', us: true, them: false }]
        });
    };

    const removeFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        updateAttributes({ features: newFeatures });
    };

    return (
        <NodeViewWrapper className="my-10">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                {/* Header */}
                <div className="grid grid-cols-[1fr,120px,120px] bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                    <div className="p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Feature</span>
                    </div>
                    <div className="p-4 text-center border-l border-gray-200 bg-emerald-50/50">
                        <input
                            type="text"
                            value={ourBrand}
                            onChange={(e) => updateAttributes({ ourBrand: e.target.value })}
                            className="w-full text-center text-sm font-bold text-emerald-700 bg-transparent border-none focus:ring-0 focus:outline-none"
                            placeholder="Our Brand"
                        />
                    </div>
                    <div className="p-4 text-center border-l border-gray-200">
                        <input
                            type="text"
                            value={theirBrand}
                            onChange={(e) => updateAttributes({ theirBrand: e.target.value })}
                            className="w-full text-center text-sm font-bold text-gray-500 bg-transparent border-none focus:ring-0 focus:outline-none"
                            placeholder="Competitors"
                        />
                    </div>
                </div>

                {/* Rows */}
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[1fr,120px,120px] border-b border-gray-100 last:border-b-0 group/row"
                    >
                        {/* Feature Name */}
                        <div className="p-4 flex items-center gap-2">
                            <input
                                type="text"
                                value={feature.name}
                                onChange={(e) => updateFeature(index, 'name', e.target.value)}
                                className="flex-1 text-sm text-gray-800 font-medium bg-transparent border-none focus:ring-0 focus:outline-none"
                                placeholder="Feature name..."
                            />
                            <button
                                onClick={() => removeFeature(index)}
                                className="opacity-0 group-hover/row:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Our Brand Toggle */}
                        <div className="p-4 flex items-center justify-center border-l border-gray-100 bg-emerald-50/30">
                            <button
                                onClick={() => updateFeature(index, 'us', !feature.us)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    feature.us 
                                        ? 'bg-emerald-100 hover:bg-emerald-200' 
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                {feature.us ? (
                                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
                                ) : (
                                    <X className="w-5 h-5 text-gray-400" strokeWidth={3} />
                                )}
                            </button>
                        </div>

                        {/* Their Brand Toggle */}
                        <div className="p-4 flex items-center justify-center border-l border-gray-100">
                            <button
                                onClick={() => updateFeature(index, 'them', !feature.them)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    feature.them 
                                        ? 'bg-emerald-100 hover:bg-emerald-200' 
                                        : 'bg-red-50 hover:bg-red-100'
                                }`}
                            >
                                {feature.them ? (
                                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
                                ) : (
                                    <X className="w-5 h-5 text-red-400" strokeWidth={3} />
                                )}
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add Row Button */}
                <button
                    onClick={addFeature}
                    className="w-full p-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-gray-100"
                >
                    <Plus className="w-4 h-4" />
                    Add Feature
                </button>
            </div>
        </NodeViewWrapper>
    );
}

