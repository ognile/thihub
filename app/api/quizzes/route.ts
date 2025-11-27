import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/quizzes - List all quizzes
export async function GET() {
    try {
        const supabase = await createClient();
        
        const { data: quizzes, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_slides(count),
                quiz_responses(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the response to include counts
        const transformedQuizzes = quizzes?.map(quiz => ({
            ...quiz,
            slideCount: quiz.quiz_slides?.[0]?.count || 0,
            responseCount: quiz.quiz_responses?.[0]?.count || 0,
        }));

        return NextResponse.json(transformedQuizzes || []);
    } catch (e) {
        console.error('Error fetching quizzes:', e);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}

// POST /api/quizzes - Create a new quiz
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        const { name, slug, description, settings } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        // Check if slug already exists
        const { data: existing } = await supabase
            .from('quizzes')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'A quiz with this slug already exists' }, { status: 400 });
        }

        // Create the quiz
        const { data: quiz, error } = await supabase
            .from('quizzes')
            .insert({
                name,
                slug,
                description: description || null,
                settings: settings || {
                    primaryColor: '#0F4C81',
                    backgroundColor: '#ffffff',
                    showProgressBar: true,
                    allowBack: false
                },
                status: 'draft'
            })
            .select()
            .single();

        if (error) throw error;

        // Create a default first slide
        await supabase
            .from('quiz_slides')
            .insert({
                quiz_id: quiz.id,
                slide_order: 0,
                type: 'text-choice',
                content: {
                    headline: 'Welcome to your quiz!',
                    subheadline: 'Click to edit this slide',
                    options: [
                        { id: '1', text: 'Option 1' },
                        { id: '2', text: 'Option 2' },
                        { id: '3', text: 'Option 3' }
                    ]
                }
            });

        return NextResponse.json(quiz, { status: 201 });
    } catch (e) {
        console.error('Error creating quiz:', e);
        return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
}

