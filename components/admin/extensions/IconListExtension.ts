import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import IconListNode from '@/components/admin/IconListNode'

export interface IconListItem {
    icon: string;
    title: string;
    text: string;
}

// Icon keyword to SVG mapping for static HTML rendering
const iconSvgMap: Record<string, string> = {
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    heart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`,
    zap: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`,
}

export default Node.create({
    name: 'iconList',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            items: {
                default: [
                    { icon: 'shield', title: 'Clinically Tested', text: 'Backed by peer-reviewed research and clinical trials.' },
                    { icon: 'check', title: 'Premium Ingredients', text: 'Only the highest quality, bioavailable compounds.' },
                ],
                parseHTML: element => {
                    const attr = element.getAttribute('data-items')
                    try {
                        return attr ? JSON.parse(attr) : undefined
                    } catch {
                        return undefined
                    }
                },
            },
            columns: {
                default: 2,
                parseHTML: element => {
                    const attr = element.getAttribute('data-columns')
                    return attr ? parseInt(attr) : 2
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="icon-list"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes, node }) {
        const { items, columns } = node.attrs

        const gridCols: Record<number, string> = {
            1: 'grid-cols-1',
            2: 'grid-cols-1 sm:grid-cols-2',
            3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        }

        // Safety check
        const safeItems = Array.isArray(items) ? items : []

        const itemElements = (safeItems as IconListItem[]).map((item) => {
            return ['div', { class: 'group bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 rounded-xl border border-slate-200' },
                // Icon Container
                ['div', { class: 'w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center mb-4 text-emerald-600' },
                    ['span', { class: 'icon-placeholder', 'data-icon': item.icon }]
                ],
                // Title
                ['h4', { class: 'text-base sm:text-lg font-bold text-gray-900 mb-2' }, item.title],
                // Text
                ['p', { class: 'text-sm sm:text-base text-gray-600 leading-relaxed' }, item.text]
            ]
        })

        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-type': 'icon-list', 
            'data-items': JSON.stringify(safeItems),
            'data-columns': columns,
            class: 'my-10' 
        }),
            ['div', { class: `grid gap-4 sm:gap-6 ${gridCols[columns as number] || gridCols[2]}` },
                ...itemElements
            ]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(IconListNode)
    },
})
