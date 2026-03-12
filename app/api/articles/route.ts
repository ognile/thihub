import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id,slug,title,cta_url,pixel_id,comments,created_at,updated_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const mappedArticles = (articles ?? []).map((article) => ({
            ...article,
            ctaUrl: article.cta_url,
            pixelId: article.pixel_id,
        }));

        return NextResponse.json(mappedArticles);
    } catch (error) {
        console.error('Error reading articles:', error);
        return NextResponse.json({ error: 'Failed to read articles' }, { status: 500 });
    }
}
