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
                        return attr ? JSON.parse(attr) : undefined
                    } catch {
                        return undefined
                    }
                },
            },
            ourBrand: {
                default: 'Our Formula',
                parseHTML: element => element.getAttribute('data-our-brand') || undefined,
            },
            theirBrand: {
                default: 'Generic Brands',
                parseHTML: element => element.getAttribute('data-their-brand') || undefined,
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

        // Safety check
        const safeFeatures = Array.isArray(features) ? features : []

        // Build the table rows
        const rows = (safeFeatures as ComparisonFeature[]).map((feature) => {
            const usIcon = feature.us
                ? ['div', { class: 'w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: '#059669', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['polyline', { points: '20 6 9 17 4 12' }]
                    ]
                  ]
                : ['div', { class: 'w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: '#9ca3af', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['line', { x1: '18', y1: '6', x2: '6', y2: '18' }],
                        ['line', { x1: '6', y1: '6', x2: '18', y2: '18' }]
                    ]
                  ]

            const themIcon = feature.them
                ? ['div', { class: 'w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: '#059669', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['polyline', { points: '20 6 9 17 4 12' }]
                    ]
                  ]
                : ['div', { class: 'w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: '#9ca3af', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['line', { x1: '18', y1: '6', x2: '6', y2: '18' }],
                        ['line', { x1: '6', y1: '6', x2: '18', y2: '18' }]
                    ]
                  ]

            return ['div', { class: 'grid grid-cols-[1fr,auto,auto] divide-x divide-gray-100' },
                ['div', { class: 'p-3 pl-4 flex items-center' },
                    ['span', { class: 'text-xs sm:text-sm text-gray-700 font-medium leading-snug' }, feature.name]
                ],
                ['div', { class: 'p-3 w-24 sm:w-32 flex items-center justify-center bg-emerald-50/10' }, usIcon],
                ['div', { class: 'p-3 w-24 sm:w-32 flex items-center justify-center' }, themIcon]
            ]
        })

        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-type': 'comparison-table', 
            'data-features': JSON.stringify(safeFeatures),
            'data-our-brand': ourBrand,
            'data-their-brand': theirBrand,
            class: 'my-8 not-prose' 
        }),
            ['div', { class: 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ring-1 ring-gray-950/5' },
                // Header
                ['div', { class: 'grid grid-cols-[1fr,auto,auto] bg-gray-50/50 border-b border-gray-200 divide-x divide-gray-200' },
                    ['div', { class: 'p-3 pl-4 flex items-center' },
                        ['span', { class: 'text-[10px] uppercase tracking-widest font-bold text-gray-500' }, 'Feature']
                    ],
                    ['div', { class: 'p-3 w-24 sm:w-32 text-center bg-emerald-50/30' },
                        ['span', { class: 'text-xs sm:text-sm font-bold text-emerald-800 leading-tight block' }, ourBrand]
                    ],
                    ['div', { class: 'p-3 w-24 sm:w-32 text-center bg-gray-50/50' },
                        ['span', { class: 'text-xs sm:text-sm font-bold text-gray-500 leading-tight block' }, theirBrand]
                    ]
                ],
                // Rows
                ['div', { class: 'divide-y divide-gray-100' },
                    ...rows
                ]
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ComparisonTableNode)
    },
})
