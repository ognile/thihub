import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        const { data: article, error } = await supabase
            .from('articles')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }
            throw error;
        }

        // Transform snake_case to camelCase for frontend compatibility
        const mappedArticle = {
            ...article,
            ctaText: article.cta_text,
            ctaTitle: article.cta_title,
            ctaDescription: article.cta_description,
            pixelId: article.pixel_id,
            ctaUrl: article.cta_url,
            keyTakeaways: article.key_takeaways,
            // V2 Sticky CTA fields
            stickyCTAEnabled: article.sticky_cta_enabled,
            stickyCTAText: article.sticky_cta_text,
            stickyCTAPrice: article.sticky_cta_price,
            stickyCTAOriginalPrice: article.sticky_cta_original_price,
            stickyCTAProductName: article.sticky_cta_product_name,
            articleTheme: article.article_theme,
        };

        return NextResponse.json(mappedArticle);
    } catch (e) {
        console.error('Error fetching article:', e);
        return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Transform camelCase to snake_case for database
        const updateData: Record<string, unknown> = {
            title: body.title,
            subtitle: body.subtitle,
            content: body.content,
            author: body.author,
            reviewer: body.reviewer,
            date: body.date,
            image: body.image,
            cta_text: body.ctaText,
            cta_title: body.ctaTitle,
            cta_description: body.ctaDescription,
            pixel_id: body.pixelId,
            cta_url: body.ctaUrl,
            key_takeaways: body.keyTakeaways,
            comments: body.comments,
            // V2 Sticky CTA fields
            sticky_cta_enabled: body.stickyCTAEnabled,
            sticky_cta_text: body.stickyCTAText,
            sticky_cta_price: body.stickyCTAPrice,
            sticky_cta_original_price: body.stickyCTAOriginalPrice,
            sticky_cta_product_name: body.stickyCTAProductName,
            article_theme: body.articleTheme,
            updated_at: new Date().toISOString(),
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const { data: article, error } = await supabase
            .from('articles')
            .update(updateData)
            .eq('slug', slug)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, article });
    } catch (e) {
        console.error('Error updating article:', e);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
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

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error deleting article:', e);
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
