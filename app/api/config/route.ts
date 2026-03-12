import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const FALLBACK_DEFAULT_PIXEL_ID = '1213472546398709';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: config, error } = await supabase
            .from('global_config')
            .select('default_pixel_id,default_cta_url')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            defaultPixelId: config?.default_pixel_id ?? FALLBACK_DEFAULT_PIXEL_ID,
            defaultCtaUrl: config?.default_cta_url ?? '',
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        return NextResponse.json({
            defaultPixelId: FALLBACK_DEFAULT_PIXEL_ID,
            defaultCtaUrl: '',
        });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as {
            defaultPixelId?: string;
            defaultCtaUrl?: string;
        };

        const { error } = await supabase
            .from('global_config')
            .upsert({
                id: 1,
                default_pixel_id: body.defaultPixelId ?? FALLBACK_DEFAULT_PIXEL_ID,
                default_cta_url: body.defaultCtaUrl ?? '',
            });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving config:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
