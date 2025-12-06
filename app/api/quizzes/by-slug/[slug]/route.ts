import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/quizzes/by-slug/[slug] - Get quiz by slug (public)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();
        
        // Fetch published quiz by slug
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (quizError) {
            if (quizError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
            }
            throw quizError;
        }

        // Fetch slides
        const { data: slides, error: slidesError } = await supabase
            .from('quiz_slides')
            .select('*')
            .eq('quiz_id', quiz.id)
            .order('slide_order', { ascending: true });

        if (slidesError) throw slidesError;

        return NextResponse.json({
            ...quiz,
            slides: slides || []
        });
    } catch (e) {
        console.error('Error fetching quiz:', e);
        return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }
}

