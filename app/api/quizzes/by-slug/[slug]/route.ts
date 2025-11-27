import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/quizzes/by-slug/[slug] - Get quiz by slug (public)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        console.log('Fetching quiz by slug:', slug);
        
        const supabase = await createClient();
        
        // First, try to find the quiz by slug (any status for debugging)
        const { data: quizCheck, error: checkError } = await supabase
            .from('quizzes')
            .select('id, slug, status')
            .eq('slug', slug)
            .single();
            
        console.log('Quiz check result:', quizCheck, 'Error:', checkError);
        
        // Now fetch only published
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (quizError) {
            console.log('Quiz fetch error:', quizError);
            if (quizError.code === 'PGRST116') {
                // Check if quiz exists but isn't published
                if (quizCheck && quizCheck.status !== 'published') {
                    return NextResponse.json({ 
                        error: 'Quiz exists but is not published', 
                        status: quizCheck.status 
                    }, { status: 404 });
                }
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

        if (slidesError) {
            console.log('Slides fetch error:', slidesError);
            throw slidesError;
        }

        console.log('Returning quiz with', slides?.length || 0, 'slides');
        
        return NextResponse.json({
            ...quiz,
            slides: slides || []
        });
    } catch (e) {
        console.error('Error fetching quiz:', e);
        return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }
}

