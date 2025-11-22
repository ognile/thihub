import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: config, error } = await supabase
            .from('global_config')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            throw error;
        }

        if (!config) {
            return NextResponse.json({ defaultPixelId: "1213472546398709", defaultCtaUrl: "", articles: {} });
        }

        // Fetch article specific configs (pixel_id, cta_url)
        const { data: articles } = await supabase
            .from('articles')
            .select('slug, pixel_id, cta_url');

        const articlesConfig: Record<string, any> = {};
        articles?.forEach(a => {
            if (a.pixel_id || a.cta_url) {
                articlesConfig[a.slug] = {
                    pixelId: a.pixel_id,
                    ctaUrl: a.cta_url
                };
            }
        });

        return NextResponse.json({
            defaultPixelId: config.default_pixel_id,
            defaultCtaUrl: config.default_cta_url,
            articles: articlesConfig
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        return NextResponse.json({ defaultPixelId: "1213472546398709", defaultCtaUrl: "", articles: {} });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Update global config
        const { error: configError } = await supabase
            .from('global_config')
            .upsert({
                id: 1,
                default_pixel_id: body.defaultPixelId,
                default_cta_url: body.defaultCtaUrl
            });

        if (configError) throw configError;

        // Update article configs if provided
        // Note: The frontend sends the entire config object including articles.
        // We need to iterate and update articles.
        if (body.articles) {
            for (const [slug, config] of Object.entries(body.articles)) {
                const articleConfig = config as any;
                await supabase
                    .from('articles')
                    .update({
                        pixel_id: articleConfig.pixelId,
                        cta_url: articleConfig.ctaUrl
                    })
                    .eq('slug', slug);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving config:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
