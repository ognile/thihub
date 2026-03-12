import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { jsonWithEtag } from '@/lib/http/etag';
import { recordCounter } from '@/lib/observability/counters';
import { ArticleService } from '@/lib/services/article-service';
import { createDomainContextFromRequest } from '@/lib/services/domain-context';
import { createDocumentFromBlocks, createPersistedArticlePayload, resolveCanonicalDocument } from '@/lib/articles/service';
import { createDocumentFromLegacyArticle } from '@/lib/articles/backfill-parser';
import { DEFAULT_STYLE_PRESET, heroMetaSchema, normalizeHeroMeta } from '@/lib/articles/schema';

const updateBodySchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    author: z.string().optional(),
    reviewer: z.string().optional(),
    date: z.string().optional(),
    image: z.string().optional(),
    authorImage: z.string().nullable().optional(),
    pixelId: z.string().nullable().optional(),
    ctaUrl: z.string().nullable().optional(),
    comments: z.unknown().optional(),
    stickyCTAEnabled: z.boolean().nullable().optional(),
    stickyCTAText: z.string().nullable().optional(),
    stickyCTAPrice: z.string().nullable().optional(),
    stickyCTAOriginalPrice: z.string().nullable().optional(),
    stickyCTAProductName: z.string().nullable().optional(),
    contentBlocks: z.unknown().optional(),
    stylePreset: z.literal(DEFAULT_STYLE_PRESET).optional(),
    heroMeta: heroMetaSchema.optional(),
    content: z.string().optional(),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await params;
        const domainContext = createDomainContextFromRequest(request);
        const supabase = await createClient();

        const article = await ArticleService.getBySlug(slug, domainContext, {
            supabase,
        });

        if (!article) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        recordCounter('article.api.get', {
            slug,
            domain: domainContext.domain,
            host: domainContext.host,
        });

        return jsonWithEtag(request, article);
    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = updateBodySchema.parse(await request.json());

        const { data: existingArticle, error: existingError } = await supabase
            .from('articles')
            .select('content_blocks,content_schema_version,style_preset,content,hero_meta')
            .eq('slug', slug)
            .single();

        if (existingError) {
            throw existingError;
        }

        const canonicalDocument = payload.contentBlocks !== undefined
            ? createDocumentFromBlocks(payload.contentBlocks, payload.stylePreset)
            : payload.content !== undefined
                ? createDocumentFromLegacyArticle({ content: payload.content })
                : resolveCanonicalDocument({
                    contentBlocks: existingArticle.content_blocks,
                    contentSchemaVersion: existingArticle.content_schema_version,
                    stylePreset: existingArticle.style_preset,
                    content: existingArticle.content,
                });

        const persistedContent = createPersistedArticlePayload(canonicalDocument);

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            ...persistedContent,
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.subtitle !== undefined) updateData.subtitle = payload.subtitle;
        if (payload.author !== undefined) updateData.author = payload.author;
        if (payload.reviewer !== undefined) updateData.reviewer = payload.reviewer;
        if (payload.date !== undefined) updateData.date = payload.date;
        if (payload.image !== undefined) updateData.image = payload.image;
        if (payload.authorImage !== undefined) updateData.author_image = payload.authorImage;
        if (payload.pixelId !== undefined) updateData.pixel_id = payload.pixelId ?? '';
        if (payload.ctaUrl !== undefined) updateData.cta_url = payload.ctaUrl ?? '';
        if (payload.comments !== undefined) updateData.comments = payload.comments;
        if (payload.stickyCTAEnabled !== undefined) updateData.sticky_cta_enabled = payload.stickyCTAEnabled ?? false;
        if (payload.stickyCTAText !== undefined) updateData.sticky_cta_text = payload.stickyCTAText ?? '';
        if (payload.stickyCTAPrice !== undefined) updateData.sticky_cta_price = payload.stickyCTAPrice ?? '';
        if (payload.stickyCTAOriginalPrice !== undefined) updateData.sticky_cta_original_price = payload.stickyCTAOriginalPrice ?? '';
        if (payload.stickyCTAProductName !== undefined) updateData.sticky_cta_product_name = payload.stickyCTAProductName ?? '';
        if (payload.heroMeta !== undefined) {
            updateData.hero_meta = normalizeHeroMeta(payload.heroMeta);
        }

        const { data: article, error } = await supabase
            .from('articles')
            .update(updateData)
            .eq('slug', slug)
            .select()
            .single();

        if (error) {
            throw error;
        }

        revalidatePath(`/articles/${slug}`);

        return NextResponse.json({ success: true, article });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid article payload',
                    details: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                { status: 422 },
            );
        }

        console.error('Error updating article:', error);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('articles')
            .delete()
            .eq('slug', slug);

        if (error) {
            throw error;
        }

        revalidatePath('/admin');
        revalidatePath(`/articles/${slug}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
