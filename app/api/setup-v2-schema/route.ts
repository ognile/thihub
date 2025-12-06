import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// This endpoint sets up the V2 article tables in Supabase
// Run it once by visiting /api/setup-v2-schema
export async function GET() {
    let stepsTaken = [];
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

    try {
        stepsTaken.push('Attempting Supabase RPC (exec_sql)...');
        
        // 1. Try Supabase RPC (best if helper exists)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql });

        if (!rpcError) {
            return NextResponse.json({
                success: true,
                message: 'V2 schema applied successfully via Supabase RPC!',
                method: 'rpc'
            });
        }
        
        stepsTaken.push(`RPC failed: ${rpcError.message}`);

        // 2. Try Direct Postgres Connection (if DATABASE_URL is available)
        if (process.env.DATABASE_URL) {
            stepsTaken.push('Attempting direct PostgreSQL connection...');
            try {
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false } // Required for Supabase/Neon/etc usually
                });
                
                const client = await pool.connect();
                try {
                    await client.query(sql);
                    return NextResponse.json({
                        success: true,
                        message: 'V2 schema applied successfully via Direct PG Connection!',
                        method: 'pg'
                    });
                } finally {
                    client.release();
                    await pool.end();
                }
            } catch (pgError: any) {
                stepsTaken.push(`PG connection failed: ${pgError.message}`);
            }
        } else {
            stepsTaken.push('Skipping direct connection: DATABASE_URL not set');
        }

        // 3. Fallback: Return SQL for manual execution
        return NextResponse.json({
            success: false,
            message: 'Could not apply schema automatically. Please run the following SQL in your Supabase Dashboard SQL Editor:',
            sql: sql,
            debug: stepsTaken
        });

    } catch (e: any) {
        console.error('Error setting up V2 schema:', e);
        return NextResponse.json({
            success: false,
            message: 'Failed to setup V2 schema',
            error: e.message,
            debug: stepsTaken
        }, { status: 500 });
    }
}
