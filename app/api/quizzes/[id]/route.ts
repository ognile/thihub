import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/quizzes/[id] - Get single quiz with all slides
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        
        // Fetch quiz with slides
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .single();

        if (quizError) {
            if (quizError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
            }
            throw quizError;
        }

        // Fetch slides separately
        const { data: slides, error: slidesError } = await supabase
            .from('quiz_slides')
            .select('*')
            .eq('quiz_id', id)
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

// PUT /api/quizzes/[id] - Update quiz and/or slides
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();

        const { name, slug, description, settings, status, slides } = body;

        // Update quiz metadata
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (description !== undefined) updateData.description = description;
        if (settings !== undefined) updateData.settings = settings;
        if (status !== undefined) updateData.status = status;

        if (Object.keys(updateData).length > 0) {
            const { error: quizError } = await supabase
                .from('quizzes')
                .update(updateData)
                .eq('id', id);

            if (quizError) throw quizError;
        }

        // Update slides if provided
        if (slides && Array.isArray(slides)) {
            // Delete existing slides
            await supabase
                .from('quiz_slides')
                .delete()
                .eq('quiz_id', id);

            // Insert new slides
            if (slides.length > 0) {
                const slidesToInsert = slides.map((slide, index) => ({
                    quiz_id: id,
                    slide_order: index,
                    type: slide.type,
                    content: slide.content,
                    conditional_logic: slide.conditionalLogic || null
                }));

                const { error: slidesError } = await supabase
                    .from('quiz_slides')
                    .insert(slidesToInsert);

                if (slidesError) throw slidesError;
            }
        }

        // Fetch updated quiz
        const { data: quiz, error: fetchError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const { data: updatedSlides } = await supabase
            .from('quiz_slides')
            .select('*')
            .eq('quiz_id', id)
            .order('slide_order', { ascending: true });

        return NextResponse.json({
            ...quiz,
            slides: updatedSlides || []
        });
    } catch (e) {
        console.error('Error updating quiz:', e);
        return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }
}

// DELETE /api/quizzes/[id] - Delete quiz
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error deleting quiz:', e);
        return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }
}

