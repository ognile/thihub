import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ComparisonTableNode from '@/components/admin/ComparisonTableNode'

export interface ComparisonFeature {
    name: string;
    us: boolean;
    them: boolean;
}

export default Node.create({
    name: 'comparisonTable',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            features: {
                default: [
                    { name: 'Lab Tested & Verified', us: true, them: false },
                    { name: 'High Potency Formula', us: true, them: false },
                    { name: 'No Artificial Fillers', us: true, them: false },
                    { name: '60-Day Guarantee', us: true, them: false },
                ],
                parseHTML: element => {
                    const attr = element.getAttribute('data-features')
                    try {
                        return attr ? JSON.parse(attr) : null
                    } catch {
                        return null
                    }
                },
            },
            ourBrand: {
                default: 'Our Formula',
                parseHTML: element => element.getAttribute('data-our-brand'),
            },
            theirBrand: {
                default: 'Generic Brands',
                parseHTML: element => element.getAttribute('data-their-brand'),
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="comparison-table"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes, node }) {
        const { features, ourBrand, theirBrand } = node.attrs

        // Build the table rows
        const rows = (features as ComparisonFeature[]).map((feature) => {
            const usIcon = feature.us
                ? ['div', { class: 'w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: '#059669', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['polyline', { points: '20 6 9 17 4 12' }]
                    ]
                  ]
                : ['div', { class: 'w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: '#9ca3af', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['line', { x1: '18', y1: '6', x2: '6', y2: '18' }],
                        ['line', { x1: '6', y1: '6', x2: '18', y2: '18' }]
                    ]
                  ]

            const themIcon = feature.them
                ? ['div', { class: 'w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: '#059669', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['polyline', { points: '20 6 9 17 4 12' }]
                    ]
                  ]
                : ['div', { class: 'w-8 h-8 rounded-full bg-red-50 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: '#f87171', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['line', { x1: '18', y1: '6', x2: '6', y2: '18' }],
                        ['line', { x1: '6', y1: '6', x2: '18', y2: '18' }]
                    ]
                  ]

            return ['div', { class: 'grid grid-cols-[1fr,100px,100px] sm:grid-cols-[1fr,140px,140px] border-b border-gray-100 last:border-b-0' },
                ['div', { class: 'p-4 sm:p-5 flex items-center' },
                    ['span', { class: 'text-sm sm:text-base text-gray-800 font-medium' }, feature.name]
                ],
                ['div', { class: 'p-4 sm:p-5 flex items-center justify-center border-l border-gray-100 bg-emerald-50/30' }, usIcon],
                ['div', { class: 'p-4 sm:p-5 flex items-center justify-center border-l border-gray-100' }, themIcon]
            ]
        })

        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-type': 'comparison-table', 
            'data-features': JSON.stringify(features),
            'data-our-brand': ourBrand,
            'data-their-brand': theirBrand,
            class: 'my-10' 
        }),
            ['div', { class: 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden' },
                // Header
                ['div', { class: 'grid grid-cols-[1fr,100px,100px] sm:grid-cols-[1fr,140px,140px] bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200' },
                    ['div', { class: 'p-4 sm:p-5' },
                        ['span', { class: 'text-xs font-bold uppercase tracking-wider text-gray-500' }, 'Feature']
                    ],
                    ['div', { class: 'p-4 sm:p-5 text-center border-l border-gray-200 bg-emerald-50/50' },
                        ['span', { class: 'text-xs sm:text-sm font-bold text-emerald-700' }, ourBrand]
                    ],
                    ['div', { class: 'p-4 sm:p-5 text-center border-l border-gray-200' },
                        ['span', { class: 'text-xs sm:text-sm font-bold text-gray-500' }, theirBrand]
                    ]
                ],
                // Rows
                ...rows
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ComparisonTableNode)
    },
})
