import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TimelineNode from '@/components/admin/TimelineNode'

export interface TimelineWeek {
    week: number;
    title: string;
    description: string;
}

export default Node.create({
    name: 'timeline',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            weeks: {
                default: [
                    { week: 1, title: 'Initial Changes', description: 'You may notice subtle improvements in digestion and energy levels.' },
                    { week: 2, title: 'Building Momentum', description: 'Many users report improved sleep and reduced bloating.' },
                    { week: 4, title: 'Visible Results', description: 'Significant improvements in overall gut health and wellbeing.' },
                    { week: 8, title: 'Lasting Benefits', description: 'Long-term benefits become established with continued use.' },
                ],
            },
            title: {
                default: 'Your Journey to Better Health',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="timeline"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes, node }) {
        const { weeks, title } = node.attrs

        const weekElements = (weeks as TimelineWeek[]).map((item) => {
            return ['div', { class: 'relative pl-14' },
                // Timeline Node
                ['div', { class: 'absolute left-0 top-1 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg z-10' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'white', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['polyline', { points: '20 6 9 17 4 12' }]
                    ]
                ],
                // Content Card
                ['div', { class: 'bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200' },
                    // Week Badge
                    ['div', { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3' },
                        ['span', {}, `Week ${item.week}`]
                    ],
                    // Title
                    ['h4', { class: 'text-base sm:text-lg font-bold text-gray-900 mb-2' }, item.title],
                    // Description
                    ['p', { class: 'text-sm sm:text-base text-gray-600 leading-relaxed' }, item.description]
                ]
            ]
        })

        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'timeline', class: 'my-10' }),
            // Section Header
            ['div', { class: 'flex items-center gap-3 mb-6' },
                ['div', { class: 'w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: '#059669', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        ['circle', { cx: '12', cy: '12', r: '10' }],
                        ['polyline', { points: '12 6 12 12 16 14' }]
                    ]
                ],
                ['h3', { class: 'text-xl font-bold text-gray-900' }, title]
            ],
            // Timeline Container
            ['div', { class: 'relative' },
                // Vertical Line
                ['div', { class: 'absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-emerald-100' }],
                // Timeline Items
                ['div', { class: 'space-y-6' },
                    ...weekElements
                ]
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(TimelineNode)
    },
})

