/**
 * Article Parser Utility
 * Converts AI-generated V2 JSON output into Tiptap document structure
 */

import { getIconName } from './iconMapper';

// Types for V2 Components
export interface V2Paragraph {
    type: 'paragraph';
    content: string;
}

export interface V2Heading {
    type: 'heading';
    level: number;
    content: string;
}

export interface V2IconListItem {
    icon: string;
    title: string;
    text: string;
}

export interface V2IconList {
    type: 'icon_list';
    items: V2IconListItem[];
    columns?: number;
}

export interface V2ComparisonFeature {
    name: string;
    us: boolean;
    them: boolean;
}

export interface V2ComparisonTable {
    type: 'comparison_table';
    ourBrand?: string;
    theirBrand?: string;
    features: V2ComparisonFeature[];
}

export interface V2TimelineWeek {
    week: number;
    title: string;
    description: string;
}

export interface V2Timeline {
    type: 'timeline';
    title?: string;
    weeks: V2TimelineWeek[];
}

export interface V2Testimonial {
    type: 'testimonial';
    helpedWith?: string;
    title?: string;
    body: string;
    author?: string;
}

export interface V2ImagePlaceholder {
    type: 'image_placeholder';
    searchQuery: string;
}

export interface V2Blockquote {
    type: 'blockquote';
    content: string;
}

export type V2Component = 
    | V2Paragraph 
    | V2Heading 
    | V2IconList 
    | V2ComparisonTable 
    | V2Timeline 
    | V2Testimonial 
    | V2ImagePlaceholder 
    | V2Blockquote;

// Tiptap Node Types
export interface TiptapNode {
    type: string;
    attrs?: Record<string, any>;
    content?: TiptapNode[];
    text?: string;
    marks?: { type: string; attrs?: Record<string, any> }[];
}

export interface TiptapDocument {
    type: 'doc';
    content: TiptapNode[];
}

/**
 * Convert V2 AI JSON components to Tiptap document structure
 */
export function convertV2JsonToTiptap(components: V2Component[]): TiptapDocument {
    const content: TiptapNode[] = [];

    for (const component of components) {
        const node = convertComponentToTiptapNode(component);
        if (node) {
            content.push(node);
        }
    }

    return {
        type: 'doc',
        content,
    };
}

/**
 * Convert a single V2 component to a Tiptap node
 */
function convertComponentToTiptapNode(component: V2Component): TiptapNode | null {
    switch (component.type) {
        case 'paragraph':
            return {
                type: 'paragraph',
                content: parseTextContent(component.content),
            };

        case 'heading':
            return {
                type: 'heading',
                attrs: { level: component.level || 2 },
                content: parseTextContent(component.content),
            };

        case 'icon_list':
            return {
                type: 'iconList',
                attrs: {
                    items: component.items.map(item => ({
                        icon: getIconName(item.icon),
                        title: item.title,
                        text: item.text,
                    })),
                    columns: component.columns || 2,
                },
            };

        case 'comparison_table':
            return {
                type: 'comparisonTable',
                attrs: {
                    features: component.features,
                    ourBrand: component.ourBrand || 'Our Formula',
                    theirBrand: component.theirBrand || 'Generic Brands',
                },
            };

        case 'timeline':
            return {
                type: 'timeline',
                attrs: {
                    weeks: component.weeks,
                    title: component.title || 'Your Journey',
                },
            };

        case 'testimonial':
            return {
                type: 'testimonial',
                attrs: {
                    helpedWith: component.helpedWith || 'Overall Health',
                    title: component.title || '',
                    body: component.body,
                    author: component.author || 'Anonymous',
                    verified: true,
                },
            };

        case 'image_placeholder':
            return {
                type: 'imagePlaceholder',
                attrs: {
                    searchQuery: component.searchQuery,
                    imageUrl: '',
                },
            };

        case 'blockquote':
            return {
                type: 'blockquote',
                content: [
                    {
                        type: 'paragraph',
                        content: parseTextContent(component.content),
                    },
                ],
            };

        default:
            console.warn('Unknown component type:', (component as any).type);
            return null;
    }
}

/**
 * Parse text content into Tiptap text nodes
 * Handles basic inline formatting if present
 */
function parseTextContent(text: string): TiptapNode[] {
    if (!text) return [];
    
    // Simple case - just plain text
    // In a more advanced implementation, you could parse HTML or markdown here
    return [{ type: 'text', text }];
}

/**
 * Convert HTML string with data attributes back to V2 components
 * Useful for parsing content from the database
 */
export function parseHTMLToV2Components(html: string): V2Component[] {
    const components: V2Component[] = [];
    
    // Create a temporary DOM parser
    if (typeof window === 'undefined') {
        // Server-side: return empty or use a different parser
        return components;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = doc.body.children;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const component = parseElementToComponent(el);
        if (component) {
            components.push(component);
        }
    }

    return components;
}

/**
 * Parse a DOM element to a V2 component
 */
function parseElementToComponent(el: Element): V2Component | null {
    const dataType = el.getAttribute('data-type');

    switch (dataType) {
        case 'icon-list':
            try {
                const items = JSON.parse(el.getAttribute('data-items') || '[]');
                const columns = parseInt(el.getAttribute('data-columns') || '2');
                return { type: 'icon_list', items, columns };
            } catch {
                return null;
            }

        case 'comparison-table':
            try {
                const features = JSON.parse(el.getAttribute('data-features') || '[]');
                return {
                    type: 'comparison_table',
                    features,
                    ourBrand: el.getAttribute('data-our-brand') || 'Our Formula',
                    theirBrand: el.getAttribute('data-their-brand') || 'Generic Brands',
                };
            } catch {
                return null;
            }

        case 'timeline':
            try {
                const weeks = JSON.parse(el.getAttribute('data-weeks') || '[]');
                return {
                    type: 'timeline',
                    weeks,
                    title: el.getAttribute('data-title') || 'Your Journey',
                };
            } catch {
                return null;
            }

        case 'testimonial':
            return {
                type: 'testimonial',
                helpedWith: el.getAttribute('data-helped-with') || 'Overall Health',
                title: el.getAttribute('data-title') || '',
                body: el.getAttribute('data-body') || '',
                author: el.getAttribute('data-author') || 'Anonymous',
            };

        case 'image-placeholder':
            return {
                type: 'image_placeholder',
                searchQuery: el.getAttribute('data-search-query') || '',
            };

        default:
            // Handle standard HTML elements
            const tagName = el.tagName.toLowerCase();
            
            if (tagName === 'p') {
                return { type: 'paragraph', content: el.textContent || '' };
            }
            
            if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
                const level = parseInt(tagName[1]);
                return { type: 'heading', level, content: el.textContent || '' };
            }
            
            if (tagName === 'blockquote') {
                return { type: 'blockquote', content: el.textContent || '' };
            }

            return null;
    }
}

/**
 * Convert Tiptap document JSON to HTML string
 */
export function convertTiptapToHTML(doc: TiptapDocument): string {
    return doc.content.map(node => convertTiptapNodeToHTML(node)).join('\n');
}

/**
 * Convert a single Tiptap node to HTML
 */
function convertTiptapNodeToHTML(node: TiptapNode): string {
    switch (node.type) {
        case 'paragraph':
            const pContent = node.content?.map(n => n.text || '').join('') || '';
            return `<p>${pContent}</p>`;

        case 'heading':
            const level = node.attrs?.level || 2;
            const hContent = node.content?.map(n => n.text || '').join('') || '';
            return `<h${level}>${hContent}</h${level}>`;

        case 'iconList':
            const itemsJson = JSON.stringify(node.attrs?.items || []);
            return `<div data-type="icon-list" data-items='${itemsJson}' data-columns="${node.attrs?.columns || 2}"></div>`;

        case 'comparisonTable':
            const featuresJson = JSON.stringify(node.attrs?.features || []);
            return `<div data-type="comparison-table" data-features='${featuresJson}' data-our-brand="${node.attrs?.ourBrand || 'Our Formula'}" data-their-brand="${node.attrs?.theirBrand || 'Generic Brands'}"></div>`;

        case 'timeline':
            const weeksJson = JSON.stringify(node.attrs?.weeks || []);
            return `<div data-type="timeline" data-weeks='${weeksJson}' data-title="${node.attrs?.title || 'Your Journey'}"></div>`;

        case 'testimonial':
            return `<div data-type="testimonial" data-helped-with="${node.attrs?.helpedWith || ''}" data-title="${node.attrs?.title || ''}" data-body="${escapeHtml(node.attrs?.body || '')}" data-author="${node.attrs?.author || ''}"></div>`;

        case 'imagePlaceholder':
            return `<div data-type="image-placeholder" data-search-query="${node.attrs?.searchQuery || ''}"></div>`;

        case 'blockquote':
            const bqContent = node.content?.map(n => convertTiptapNodeToHTML(n)).join('') || '';
            return `<blockquote>${bqContent}</blockquote>`;

        case 'text':
            return node.text || '';

        default:
            return '';
    }
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export default {
    convertV2JsonToTiptap,
    parseHTMLToV2Components,
    convertTiptapToHTML,
};

