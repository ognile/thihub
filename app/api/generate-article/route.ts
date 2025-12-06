import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// V1 Standard Blog Prompt
const getV1Prompt = (rawText: string) => `
            You are an expert content formatter and HTML structurer.
            
            YOUR TASK:
            Take the provided RAW TEXT and format it into a JSON object for a health news site.
            
            CRITICAL RULE: ** DO NOT REWRITE THE CONTENT.**
            -   You must use the EXACT wording from the raw text.
            - Do NOT summarize, do NOT "optimize", do NOT change the tone.
            - Your ONLY job is to apply HTML tags and extract the structure.
            
            INSTRUCTIONS FOR PARSING:
        1. ** Headline **: Identify the main headline(usually the first line).Extract it exactly.
            2. ** Subheadline **: Identify the subheadline(usually the second line).Extract it exactly.
            3. ** Body Content **:
                -   Take the rest of the text and format it as clean, semantic HTML.
                -   **CRITICAL**: Do NOT add any new text, introductory phrases, or concluding remarks.
                -   **CRITICAL**: Do NOT invent new headlines or subheadlines if they are not in the source text.
                -   If a line looks like a subheadline (short, bold, or separate line), use <h2> or <h3>.
                -   Use <blockquote> for testimonials, key quotes, or "callout" boxes.
                -   Use <ul> or <ol> for lists.
                -   Use <strong> and <em> for emphasis.
                -   ** DO NOT ** include the title or subtitle in the "content" field.
                -   ** DO NOT CHANGE A SINGLE WORD OF THE BODY TEXT.**
            4. ** Key Takeaways **: Extract 3 distinct, punchy "Key Takeaways" from the text. (You may summarize here, but keep it close to the text).
            5. ** Comments **: Generate 4 - 7 realistic comments from women(ages 35 - 65) discussing the topic / product.They should sound natural, not like bots.

            OUTPUT JSON SCHEMA:
        {
            "title": "The Main Headline (Exact Match)",
            "subtitle": "The Subheadline (Exact Match)",
            "author": "Female Name (e.g. Sarah Jenkins)",
            "reviewer": "Medical Doctor Name (e.g. Dr. A. Peterson, MD)",
            "date": "Updated: 2 hours ago",
            "content": "<p>First paragraph...</p>...",
            "keyTakeaways": [
                { "title": "Short Title", "content": "One sentence summary" }
            ],
            "comments": [
                {
                    "id": "c1",
                    "author": "Name",
                    "avatar": "https://picsum.photos/seed/c1/100",
                    "content": "Comment text",
                    "time": "2h",
                    "likes": 45,
                    "hasReplies": false,
                    "isLiked": true
                }
            ]
        }

            RAW TEXT:
            ${rawText}
        `;

// V2 Scientific Advertorial Prompt - Outputs structured JSON for rich components
const getV2Prompt = (rawText: string) => `
You are an expert content analyzer for high-conversion health advertorials.

YOUR TASK:
Analyze the provided RAW TEXT and structure it into rich UI components. DO NOT rewrite or change any text - only categorize and wrap existing content into the appropriate component types.

CRITICAL RULES:
1. ** PRESERVE ALL TEXT VERBATIM ** - Do not change a single word of the original content
2. Your job is to DETECT the context/intent of each paragraph and assign it a component type
3. The text content inside each component must be EXACTLY from the source

COMPONENT TYPES TO USE:
- "paragraph" - Standard text paragraphs
- "heading" - Section headers (h2, h3 level)
- "icon_list" - When text describes multiple benefits, features, or points (detect keywords like gut, bacteria, immune, energy, sleep, etc.)
- "comparison_table" - When text compares product vs competitors or lists advantages
- "timeline" - When text describes a journey, progression, or "week 1, week 2" style results
- "testimonial" - Customer quotes, reviews, or personal stories
- "image_placeholder" - Suggest an image where visual content would enhance understanding
- "blockquote" - Important callouts or highlighted statements

DETECTION GUIDELINES:
- If you see a list of 3+ benefits with distinct topics, use "icon_list"
- If you see comparisons or "unlike others" language, consider "comparison_table"
- If you see time-based progression or "after X weeks", use "timeline"
- If you see quotes with attribution or review-style content, use "testimonial"
- When discussing scientific concepts (biofilm, bacteria, etc.), add "image_placeholder" with search query

OUTPUT JSON SCHEMA:
{
    "title": "The Main Headline (Exact Match)",
    "subtitle": "The Subheadline (Exact Match)",
    "author": "Female Name",
    "reviewer": "Medical Doctor Name (e.g. Dr. A. Peterson, MD)",
    "date": "Updated: 2 hours ago",
    "articleTheme": "v2",
    "components": [
        {
            "type": "paragraph",
            "content": "Exact paragraph text from source..."
        },
        {
            "type": "heading",
            "level": 2,
            "content": "Section Title"
        },
        {
            "type": "icon_list",
            "items": [
                { "icon": "bacteria", "title": "Short Title", "text": "The exact text about this point..." },
                { "icon": "shield", "title": "Another Point", "text": "More exact text..." }
            ]
        },
        {
            "type": "comparison_table",
            "ourBrand": "Our Formula",
            "theirBrand": "Generic Brands",
            "features": [
                { "name": "Feature from text", "us": true, "them": false }
            ]
        },
        {
            "type": "timeline",
            "title": "Your Journey",
            "weeks": [
                { "week": 1, "title": "Week 1 Title", "description": "Exact description..." }
            ]
        },
        {
            "type": "testimonial",
            "helpedWith": "Category",
            "title": "Testimonial headline if any",
            "body": "The exact quote or review text...",
            "author": "Name from text or generate realistic name"
        },
        {
            "type": "image_placeholder",
            "searchQuery": "descriptive search term for relevant image"
        },
        {
            "type": "blockquote",
            "content": "Important statement to highlight..."
        }
    ],
    "keyTakeaways": [
        { "title": "Short Title", "content": "One sentence summary" }
    ],
    "comments": [
        {
            "id": "c1",
            "author": "Name",
            "avatar": "https://picsum.photos/seed/c1/100",
            "content": "Comment text",
            "time": "2h",
            "likes": 45,
            "hasReplies": false,
            "isLiked": true
        }
    ]
}

ICON KEYWORDS FOR icon_list (use these for the "icon" field):
- gut, stomach, digestion -> digestive topics
- bacteria, probiotic, biofilm -> microbiome topics
- immune, immunity, shield -> immune system
- energy, zap -> energy/vitality
- sleep, moon -> sleep quality
- brain -> cognitive function
- heart -> cardiovascular
- inflammation, flame -> inflammation
- vitamin, pill -> supplements
- natural, leaf -> natural ingredients
- quality, certified, tested -> quality assurance
- warning, danger -> concerns/problems
- check, star -> benefits/positives

RAW TEXT:
${rawText}
`;

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not set in environment variables.' },
                { status: 500 }
            );
        }

        const supabase = await createClient();

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { rawText, pixelId, ctaUrl, slug: customSlug, theme = 'v1' } = await request.json();

        if (!rawText) {
            return NextResponse.json({ error: 'Raw text is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Select prompt based on theme
        const prompt = theme === 'v2' ? getV2Prompt(rawText) : getV1Prompt(rawText);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const text = response.text();
        const generatedData = JSON.parse(text);

        // Determine Slug
        let slug = customSlug;
        if (!slug) {
            slug = generatedData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        } else {
            // Sanitize custom slug
            slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        }

        // Process content based on theme
        let finalContent: string;
        
        if (theme === 'v2' && generatedData.components) {
            // Convert V2 components to Tiptap-compatible HTML with data attributes
            finalContent = convertV2ComponentsToHTML(generatedData.components);
        } else {
            // V1 - use content directly
            finalContent = generatedData.content;
        }

        const newArticle = {
            slug: slug,
            title: generatedData.title,
            subtitle: generatedData.subtitle,
            author: generatedData.author,
            reviewer: generatedData.reviewer,
            date: generatedData.date,
            content: finalContent,
            key_takeaways: generatedData.keyTakeaways,
            comments: generatedData.comments,
            image: "https://picsum.photos/seed/" + slug + "/800/600",
            cta_text: "Check Availability »",
            cta_title: "Curious about the science?",
            cta_description: "Secure, verified link to official research.",
            pixel_id: pixelId || "",
            cta_url: ctaUrl || "",
            article_theme: theme,
            updated_at: new Date().toISOString()
        };

        // Check if slug exists
        const { data: existing } = await supabase
            .from('articles')
            .select('slug')
            .eq('slug', slug)
            .single();

        if (existing) {
            newArticle.slug = `${slug}-${Math.random().toString(36).substring(7)}`;
        }

        const { error } = await supabase
            .from('articles')
            .insert(newArticle);

        if (error) throw error;

        return NextResponse.json({ success: true, slug: newArticle.slug });

    } catch (error) {
        console.error('Error generating article:', error);
        return NextResponse.json(
            { error: 'Failed to generate article' },
            { status: 500 }
        );
    }
}

// Convert V2 components array to Tiptap-compatible HTML
function convertV2ComponentsToHTML(components: any[]): string {
    return components.map(component => {
        switch (component.type) {
            case 'paragraph':
                return `<p>${component.content}</p>`;
            
            case 'heading':
                const level = component.level || 2;
                return `<h${level}>${component.content}</h${level}>`;
            
            case 'icon_list':
                // Store as data attribute for Tiptap to parse
                const iconListData = JSON.stringify(component.items);
                return `<div data-type="icon-list" data-items='${iconListData}' data-columns="${component.columns || 2}"></div>`;
            
            case 'comparison_table':
                const tableData = JSON.stringify(component.features);
                return `<div data-type="comparison-table" data-features='${tableData}' data-our-brand="${component.ourBrand || 'Our Formula'}" data-their-brand="${component.theirBrand || 'Generic Brands'}"></div>`;
            
            case 'timeline':
                const timelineData = JSON.stringify(component.weeks);
                return `<div data-type="timeline" data-weeks='${timelineData}' data-title="${component.title || 'Your Journey'}"></div>`;
            
            case 'testimonial':
                return `<div data-type="testimonial" data-helped-with="${component.helpedWith || 'Overall Health'}" data-title="${component.title || ''}" data-body="${escapeHtml(component.body)}" data-author="${component.author || 'Anonymous'}"></div>`;
            
            case 'image_placeholder':
                return `<div data-type="image-placeholder" data-search-query="${component.searchQuery}"></div>`;
            
            case 'blockquote':
                return `<blockquote>${component.content}</blockquote>`;
            
            default:
                return `<p>${component.content || ''}</p>`;
        }
    }).join('\n');
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
