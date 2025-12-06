import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ImagePlaceholderNode from '@/components/admin/ImagePlaceholderNode'

export default Node.create({
    name: 'imagePlaceholder',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            searchQuery: {
                default: 'relevant image',
                parseHTML: element => element.getAttribute('data-search-query') || undefined,
            },
            imageUrl: {
                default: '',
                parseHTML: element => element.getAttribute('data-image-url') || undefined,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="image-placeholder"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes, node }) {
        const { searchQuery, imageUrl } = node.attrs

        // If we have an image, render it
        if (imageUrl) {
            return ['div', mergeAttributes(HTMLAttributes, { 
                'data-type': 'image-placeholder', 
                'data-search-query': searchQuery,
                'data-image-url': imageUrl,
                class: 'my-8' 
            }),
                ['img', { 
                    src: imageUrl, 
                    alt: searchQuery, 
                    class: 'w-full rounded-xl shadow-md' 
                }]
            ]
        }

        // Render placeholder
        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-type': 'image-placeholder', 
            'data-search-query': searchQuery,
            'data-image-url': imageUrl,
            class: 'my-8' 
        }),
            ['div', { class: 'relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-8 sm:p-12' },
                ['div', { class: 'flex flex-col items-center text-center' },
                    // Icon
                    ['div', { class: 'w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4' },
                        ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '32', height: '32', viewBox: '0 0 24 24', fill: 'none', stroke: '#64748b', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                            ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' }],
                            ['circle', { cx: '8.5', cy: '8.5', r: '1.5' }],
                            ['polyline', { points: '21 15 16 10 5 21' }]
                        ]
                    ],
                    // Search label
                    ['div', { class: 'flex items-center gap-2 mb-3' },
                        ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: '#94a3b8', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                            ['circle', { cx: '11', cy: '11', r: '8' }],
                            ['line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }]
                        ],
                        ['span', { class: 'text-sm text-slate-500' }, 'Suggested image:']
                    ],
                    // Query Text
                    ['p', { class: 'text-lg font-semibold text-slate-700 max-w-md' }, `"${searchQuery}"`],
                    // Help text
                    ['p', { class: 'text-xs text-slate-400 mt-4' }, 'Upload a relevant image in the editor']
                ]
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImagePlaceholderNode)
    },
})
