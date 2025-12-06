import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/quizzes/[id]/responses - Get all responses for a quiz
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: responses, error } = await supabase
            .from('quiz_responses')
            .select('*')
            .eq('quiz_id', id)
            .order('started_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(responses || []);
    } catch (e) {
        console.error('Error fetching responses:', e);
        return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }
}

// POST /api/quizzes/[id]/responses - Create or update a response
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();

        const { sessionId, answers, currentSlide, completed } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Get user agent and IP
        const userAgent = request.headers.get('user-agent') || null;
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : null;

        // Check if response already exists for this session
        const { data: existing } = await supabase
            .from('quiz_responses')
            .select('id')
            .eq('quiz_id', id)
            .eq('session_id', sessionId)
            .single();

        if (existing) {
            // Update existing response
            const updateData: Record<string, unknown> = {
                answers: answers || [],
                current_slide: currentSlide || 0
            };

            if (completed) {
                updateData.completed_at = new Date().toISOString();
            }

            const { data: response, error } = await supabase
                .from('quiz_responses')
                .update(updateData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(response);
        } else {
            // Create new response
            const { data: response, error } = await supabase
                .from('quiz_responses')
                .insert({
                    quiz_id: id,
                    session_id: sessionId,
                    answers: answers || [],
                    current_slide: currentSlide || 0,
                    user_agent: userAgent,
                    ip_address: ip,
                    completed_at: completed ? new Date().toISOString() : null
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(response, { status: 201 });
        }
    } catch (e) {
        console.error('Error saving response:', e);
        return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }
}

