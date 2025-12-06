import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint sets up the V2 article tables in Supabase
// Run it once by visiting /api/setup-v2-schema
export async function GET() {
    try {
        // Create admin client with service role key for DDL operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const sql = `
            -- Add V2 article fields for sticky CTA and theme support

            -- Sticky CTA settings
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_enabled BOOLEAN DEFAULT false;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_text TEXT DEFAULT 'Try Risk-Free';
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_price TEXT;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_original_price TEXT;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_product_name TEXT;

            -- Article theme (v1 = standard blog, v2 = scientific advertorial)
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_theme TEXT DEFAULT 'v1';

            -- Comment to document the schema
            COMMENT ON COLUMN articles.sticky_cta_enabled IS 'Whether to show the sticky CTA on this article';
            COMMENT ON COLUMN articles.sticky_cta_text IS 'Text to display on the sticky CTA button';
            COMMENT ON COLUMN articles.sticky_cta_price IS 'Current price to display (e.g., $49.99)';
            COMMENT ON COLUMN articles.sticky_cta_original_price IS 'Original/crossed out price (e.g., $79.99)';
            COMMENT ON COLUMN articles.sticky_cta_product_name IS 'Product name shown in sticky CTA';
            COMMENT ON COLUMN articles.article_theme IS 'Article generation theme: v1 (standard) or v2 (scientific advertorial)';
        `;

        // Try to run via RPC (if exec_sql function exists)
        const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql });

        if (!rpcError) {
            return NextResponse.json({
                success: true,
                message: 'V2 schema applied successfully!'
            });
        }

        // If RPC fails (likely because exec_sql doesn't exist), return the SQL for manual execution
        return NextResponse.json({
            success: false,
            message: 'Could not apply schema automatically. Please run the following SQL in your Supabase Dashboard SQL Editor:',
            sql: sql,
            error: rpcError
        });

    } catch (e: any) {
        console.error('Error setting up V2 schema:', e);
        return NextResponse.json({
            success: false,
            message: 'Failed to setup V2 schema',
            error: e.message
        }, { status: 500 });
    }
}

