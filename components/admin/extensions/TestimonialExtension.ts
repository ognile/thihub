import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TestimonialNode from '@/components/admin/TestimonialNode'

export default Node.create({
    name: 'testimonial',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            helpedWith: {
                default: 'Better Sleep',
                parseHTML: element => element.getAttribute('data-helped-with') || 'Better Sleep',
            },
            title: {
                default: 'I finally feel like myself again!',
                parseHTML: element => element.getAttribute('data-title') || 'I finally feel like myself again!',
            },
            body: {
                default: 'After struggling for years, I found this solution and it changed everything. Highly recommended!',
                parseHTML: element => element.getAttribute('data-body') || 'After struggling for years, I found this solution and it changed everything. Highly recommended!',
            },
            author: {
                default: 'Sarah J.',
                parseHTML: element => element.getAttribute('data-author') || 'Sarah J.',
            },
            verified: {
                default: true,
                parseHTML: element => {
                    const attr = element.getAttribute('data-verified')
                    return attr === null ? true : attr === 'true'
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="testimonial"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes, node }) {
        const { helpedWith, title, body, author, verified } = node.attrs

        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-type': 'testimonial', 
            'data-helped-with': helpedWith,
            'data-title': title,
            'data-body': body,
            'data-author': author,
            'data-verified': verified.toString(),
            class: 'my-12' 
        }),
            ['div', { class: 'bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden' },
                // Quote Icon (Background)
                ['div', { class: 'absolute top-4 right-4 text-blue-100 opacity-50 pointer-events-none' },
                    ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '80', height: '80', viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none' },
                        ['path', { d: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z' }],
                        ['path', { d: 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z' }]
                    ]
                ],
                // Helped With Tag
                ['div', { class: 'relative z-10 mb-6' },
                    ['div', { class: 'inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-blue-100 shadow-sm' },
                        ['span', { class: 'text-[10px] uppercase tracking-wider font-bold text-blue-400' }, 'Helped with'],
                        ['span', { class: 'text-xs font-bold text-blue-900' }, helpedWith]
                    ]
                ],
                // Title
                ['h3', { class: 'relative z-10 mb-4 text-xl font-serif font-bold text-gray-900' }, title],
                // Body
                ['p', { class: 'relative z-10 mb-6 text-lg text-gray-700 leading-relaxed font-sans' }, body],
                // Footer
                ['div', { class: 'relative z-10 flex items-center justify-between border-t border-blue-100 pt-4' },
                    // Author
                    ['div', { class: 'flex items-center gap-3' },
                        ['div', { class: 'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm' }, author.charAt(0)],
                        ['div', { class: 'flex flex-col' },
                            ['span', { class: 'text-sm font-bold text-gray-900' }, author],
                            ...(verified ? [['div', { class: 'flex items-center gap-1 text-green-600' },
                                ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                                    ['polyline', { points: '20 6 9 17 4 12' }]
                                ],
                                ['span', { class: 'text-[10px] font-bold uppercase tracking-wider' }, 'Verified Purchase']
                            ]] : [])
                        ]
                    ],
                    // Stars
                    ['div', { class: 'flex gap-0.5 text-yellow-400' },
                        ...Array(5).fill(0).map(() =>
                            ['svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                                ['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]
                            ]
                        )
                    ]
                ]
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(TestimonialNode)
    },
})
