import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
    articleBlockSchema,
    articleDocumentSchema,
    DEFAULT_STYLE_PRESET,
    normalizeHeroMeta,
    type ArticleBlock,
    type StylePreset,
} from '@/lib/articles/schema';
import { createBlockId } from '@/lib/articles/schema';
import { createPersistedArticlePayload } from '@/lib/articles/service';
import { normalizeArticleDocumentOnly } from '@/lib/articles/normalize';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const requestSchema = z.object({
    rawText: z.string().min(1, 'Raw text is required'),
    slug: z.string().optional(),
    pixelId: z.string().optional(),
    ctaUrl: z.string().optional(),
    stylePreset: z.literal(DEFAULT_STYLE_PRESET).optional(),
});

const generatedCommentSchema = z.object({
    id: z.string(),
    author: z.string(),
    avatar: z.string(),
    content: z.string(),
    time: z.string(),
    likes: z.number(),
    hasReplies: z.boolean().optional(),
    isLiked: z.boolean().optional(),
});

const generatedArticleSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().default(''),
    author: z.string().default('Editorial Team'),
    reviewer: z.string().default(''),
    date: z.string().default(''),
    blocks: z.array(z.unknown()).min(1),
    comments: z.array(generatedCommentSchema).default([]),
});

function normalizeGeneratedBlocks(rawBlocks: unknown[]): ArticleBlock[] {
    const normalized: ArticleBlock[] = [];

    rawBlocks.forEach((rawBlock, index) => {
        const candidate =
            rawBlock && typeof rawBlock === 'object'
                ? ({ ...(rawBlock as Record<string, unknown>) } as Record<string, unknown>)
                : {};

        if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
            candidate.id = createBlockId(`gen_${index}`);
        }
        if (typeof candidate.hidden !== 'boolean') {
            candidate.hidden = false;
        }

        if (candidate.type === 'image') {
            if (candidate.imageUrl === undefined) candidate.imageUrl = null;
            if (candidate.alt === undefined) candidate.alt = null;
            if (typeof candidate.searchQuery !== 'string') candidate.searchQuery = 'article image';
        }

        if (candidate.type === 'inline_cta') {
            if (typeof candidate.title !== 'string') candidate.title = 'Curious about the science?';
            if (typeof candidate.buttonText !== 'string') candidate.buttonText = 'Read the Clinical Study »';
            if (typeof candidate.description !== 'string') candidate.description = 'Secure, verified link to official research.';
        }

        if (candidate.type === 'heading' && candidate.level !== 1 && candidate.level !== 2 && candidate.level !== 3) {
            candidate.level = 2;
        }

        const parsed = articleBlockSchema.safeParse(candidate);
        if (parsed.success) {
            normalized.push(parsed.data);
            return;
        }

        const fallbackText =
            typeof candidate.text === 'string'
                ? candidate.text
                : typeof candidate.content === 'string'
                    ? candidate.content
                    : '';

        normalized.push({
            id: createBlockId(`fallback_${index}`),
            hidden: false,
            type: 'paragraph',
            html: fallbackText,
        });
    });

    return normalized;
}

const generatorPrompt = (rawText: string, stylePreset: StylePreset) => `
You are an expert content structuring assistant.

Your task: transform the provided RAW TEXT into structured blocks for an article UI.

Hard constraints:
1) Preserve source text verbatim. Do not rewrite claims or wording.
2) Only structure and classify text into blocks.
3) Use this style preset: "${stylePreset}".
4) Output strict JSON only.

Return JSON with this schema:
{
  "title": "Main headline from source",
  "subtitle": "Subheadline from source if present, else empty string",
  "author": "Author name",
  "reviewer": "Reviewer name",
  "date": "Updated: ...",
  "blocks": [
    { "id": "b1", "type": "heading", "level": 2, "text": "..." },
    { "id": "b2", "type": "paragraph", "html": "Exact paragraph text with optional inline tags" },
    { "id": "b3", "type": "blockquote", "text": "..." },
    { "id": "b4", "type": "icon_list", "columns": 2, "items": [{ "icon": "check", "title": "...", "text": "..." }] },
    { "id": "b5", "type": "comparison_table", "ourBrand": "Our Formula", "theirBrand": "Generic Brands", "features": [{ "name": "...", "us": true, "them": false }] },
    { "id": "b6", "type": "timeline", "title": "Your Journey", "weeks": [{ "week": 1, "title": "...", "description": "..." }] },
    { "id": "b7", "type": "testimonial", "helpedWith": "...", "title": "...", "body": "...", "author": "...", "verified": true },
    { "id": "b8", "type": "image", "searchQuery": "...", "imageUrl": null, "alt": null },
    { "id": "b9", "type": "takeaways", "items": [{ "title": "...", "content": "..." }] },
    { "id": "b10", "type": "inline_cta", "title": "Curious about the science?", "buttonText": "Read the Clinical Study »", "description": "Secure, verified link to official research." }
  ],
  "comments": [
    { "id": "c1", "author": "...", "avatar": "https://picsum.photos/seed/c1/100", "content": "...", "time": "2h", "likes": 10, "hasReplies": false, "isLiked": false }
  ]
}

Rules for block usage:
- Use heading for section labels.
- Use paragraph for body text.
- Use blockquote for highlighted callouts.
- Use icon_list for grouped benefits or repeated points.
- Use comparison_table for side-by-side product comparisons.
- Use timeline for week/day progression statements.
- Use testimonial for quote-like personal stories.
- Use image block with imageUrl=null and a useful searchQuery.
- Include at most one takeaways block and one inline_cta block.

RAW TEXT:
${rawText}
`;

function ensureRequiredBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
    const nextBlocks = [...blocks];

    if (!nextBlocks.some((block) => block.type === 'inline_cta')) {
        nextBlocks.push({
            id: createBlockId('cta'),
            hidden: false,
            type: 'inline_cta',
            title: 'Curious about the science?',
            buttonText: 'Read the Clinical Study »',
            description: 'Secure, verified link to official research.',
        });
    }

    return nextBlocks;
}

function normalizeSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not set in environment variables.' },
                { status: 500 },
            );
        }

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = requestSchema.parse(await request.json());
        const stylePreset = payload.stylePreset ?? DEFAULT_STYLE_PRESET;

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: generatorPrompt(payload.rawText, stylePreset) }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });

        const text = result.response.text();
        let parsedResponse: unknown;

        try {
            parsedResponse = JSON.parse(text);
        } catch {
            return NextResponse.json(
                { error: 'Model returned malformed JSON. Please retry.' },
                { status: 422 },
            );
        }

        const generated = generatedArticleSchema.parse(parsedResponse);
        const normalizedBlocks = normalizeGeneratedBlocks(generated.blocks);

        const document = normalizeArticleDocumentOnly(articleDocumentSchema.parse({
            schemaVersion: 1,
            stylePreset,
            blocks: ensureRequiredBlocks(normalizedBlocks),
        }));

        let slug = payload.slug ? normalizeSlug(payload.slug) : normalizeSlug(generated.title);
        if (!slug) {
            slug = `article-${Date.now().toString(36)}`;
        }

        const { data: existing } = await supabase
            .from('articles')
            .select('slug')
            .eq('slug', slug)
            .single();

        if (existing) {
            slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
        }

        const persistedContent = createPersistedArticlePayload(document);

        const insertPayload = {
            slug,
            title: generated.title,
            subtitle: generated.subtitle,
            author: generated.author,
            reviewer: generated.reviewer,
            date: generated.date,
            image: `https://picsum.photos/seed/${slug}/800/600`,
            hero_meta: normalizeHeroMeta(undefined),
            author_image: null,
            pixel_id: payload.pixelId || '',
            cta_url: payload.ctaUrl || '',
            comments: generated.comments,
            ...persistedContent,
            updated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('articles').insert(insertPayload);

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({ success: true, slug });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation error while generating article.',
                    details: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                { status: 422 },
            );
        }

        console.error('Error generating article:', error);
        return NextResponse.json({ error: 'Failed to generate article' }, { status: 500 });
    }
}
