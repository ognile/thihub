import { NodeViewWrapper } from '@tiptap/react'
import React from 'react'
import { Check, X, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ComparisonTableNode(props: any) {
    const { node, updateAttributes } = props;
    const { features = [], ourBrand = 'Our Formula', theirBrand = 'Generic Brands' } = node.attrs;

    const toggleFeature = (index: number, brand: 'us' | 'them') => {
        const newFeatures = [...features];
        newFeatures[index] = {
            ...newFeatures[index],
            [brand]: !newFeatures[index][brand]
        };
        updateAttributes({ features: newFeatures });
    };

    const updateFeatureName = (index: number, name: string) => {
        const newFeatures = [...features];
        newFeatures[index] = { ...newFeatures[index], name };
        updateAttributes({ features: newFeatures });
    };

    const addFeature = () => {
        updateAttributes({
            features: [...features, { name: 'New Feature', us: true, them: false }]
        });
    };

    const removeFeature = (index: number) => {
        const newFeatures = features.filter((_: any, i: number) => i !== index);
        updateAttributes({ features: newFeatures });
    };

    return (
        <NodeViewWrapper className="my-8 not-prose">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ring-1 ring-gray-950/5 group">
                {/* Header */}
                <div className="grid grid-cols-[1fr,auto,auto,40px] bg-gray-50/50 border-b border-gray-200 divide-x divide-gray-200">
                    <div className="p-3 pl-4 flex items-center">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Feature</span>
                    </div>
                    <div className="p-3 w-24 sm:w-32 text-center bg-emerald-50/30">
                        <input
                            type="text"
                            value={ourBrand}
                            onChange={(e) => updateAttributes({ ourBrand: e.target.value })}
                            className="w-full text-center text-xs sm:text-sm font-bold text-emerald-800 bg-transparent border-none focus:ring-0 focus:outline-none placeholder-emerald-800/50"
                            placeholder="Our Brand"
                        />
                    </div>
                    <div className="p-3 w-24 sm:w-32 text-center bg-gray-50/50">
                        <input
                            type="text"
                            value={theirBrand}
                            onChange={(e) => updateAttributes({ theirBrand: e.target.value })}
                            className="w-full text-center text-xs sm:text-sm font-bold text-gray-500 bg-transparent border-none focus:ring-0 focus:outline-none placeholder-gray-400"
                            placeholder="Competitors"
                        />
                    </div>
                    <div className="bg-gray-50"></div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                    {features.map((feature: any, index: number) => (
                        <div
                            key={index}
                            className="grid grid-cols-[1fr,auto,auto,40px] divide-x divide-gray-100 transition-colors hover:bg-gray-50/50 relative"
                        >
                            {/* Feature Name */}
                            <div className="p-3 pl-4 flex items-center">
                                <input
                                    type="text"
                                    value={feature.name}
                                    onChange={(e) => updateFeatureName(index, e.target.value)}
                                    className="w-full text-xs sm:text-sm text-gray-700 font-medium bg-transparent border-none focus:ring-0 focus:outline-none placeholder-gray-400"
                                    placeholder="Feature Name..."
                                />
                            </div>

                            {/* Our Brand */}
                            <div 
                                className="p-3 w-24 sm:w-32 flex items-center justify-center bg-emerald-50/10 cursor-pointer hover:bg-emerald-100/30 transition-colors"
                                onClick={() => toggleFeature(index, 'us')}
                            >
                                {feature.us ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Their Brand */}
                            <div 
                                className="p-3 w-24 sm:w-32 flex items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                                onClick={() => toggleFeature(index, 'them')}
                            >
                                {feature.them ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Delete Action */}
                            <div className="flex items-center justify-center">
                                <button
                                    onClick={() => removeFeature(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove row"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={addFeature}
                        className="h-7 text-xs text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                        <Plus className="w-3 h-3 mr-1.5" />
                        Add Feature
                    </Button>
                </div>
            </div>
        </NodeViewWrapper>
    );
}
