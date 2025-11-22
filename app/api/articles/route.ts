import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: articles, error } = await supabase
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform snake_case to camelCase for frontend compatibility
        const mappedArticles = articles.map(a => ({
            ...a,
            ctaText: a.cta_text,
            ctaTitle: a.cta_title,
            ctaDescription: a.cta_description,
            pixelId: a.pixel_id,
            ctaUrl: a.cta_url,
            keyTakeaways: a.key_takeaways
        }));

        return NextResponse.json(mappedArticles);
    } catch (e) {
        console.error('Error reading articles:', e);
        return NextResponse.json({ error: 'Failed to read articles' }, { status: 500 });
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
        const { slug, comments, ctaText, ctaTitle, ctaDescription, title, subtitle, content, author, reviewer, date, image, keyTakeaways, pixelId, ctaUrl } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        // Prepare update object
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (title) updateData.title = title;
        if (subtitle) updateData.subtitle = subtitle;
        if (content) updateData.content = content;
        if (author) updateData.author = author;
        if (reviewer) updateData.reviewer = reviewer;
        if (date) updateData.date = date;
        if (image) updateData.image = image;
        if (ctaText) updateData.cta_text = ctaText;
        if (ctaTitle) updateData.cta_title = ctaTitle;
        if (ctaDescription) updateData.cta_description = ctaDescription;
        if (pixelId) updateData.pixel_id = pixelId;
        if (ctaUrl) updateData.cta_url = ctaUrl;
        if (keyTakeaways !== undefined) updateData.key_takeaways = keyTakeaways;
        if (comments) updateData.comments = comments;

        // Check if article exists
        const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('slug', slug)
            .single();

        let error;
        if (existing) {
            // Update
            const { error: updateError } = await supabase
                .from('articles')
                .update(updateData)
                .eq('slug', slug);
            error = updateError;
        } else {
            // Insert
            updateData.slug = slug;
            const { error: insertError } = await supabase
                .from('articles')
                .insert(updateData);
            error = insertError;
        }

        if (error) throw error;

        // Revalidate the article page
        revalidatePath(`/articles/${slug}`);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error updating article:', e);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('articles')
            .delete()
            .eq('slug', slug);

        if (error) throw error;

        // Revalidate the article page
        revalidatePath(`/articles/${slug}`);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error deleting article:', e);
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
