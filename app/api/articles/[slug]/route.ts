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
            keyTakeaways: article.key_takeaways
        };

        return NextResponse.json(mappedArticle);
    } catch (e) {
        console.error('Error reading article:', e);
        return NextResponse.json({ error: 'Failed to read article' }, { status: 500 });
    }
}

