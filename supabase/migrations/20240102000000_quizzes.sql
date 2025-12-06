-- Quiz Funnel Builder Tables

-- Main quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{
        "primaryColor": "#0F4C81",
        "backgroundColor": "#ffffff",
        "showProgressBar": true,
        "allowBack": false
    }'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz slides table
CREATE TABLE IF NOT EXISTS quiz_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    slide_order INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text-choice', 'image-choice', 'multi-select', 'info', 'loading', 'results', 'offer')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- content structure varies by type:
    -- text-choice: { headline, subheadline, options: [{ id, text, nextSlide }] }
    -- image-choice: { headline, subheadline, options: [{ id, text, imageUrl, nextSlide }] }
    -- multi-select: { headline, subheadline, options: [{ id, text }], buttonText }
    -- info: { headline, body, imageUrl, videoUrl, buttonText, nextSlide }
    -- loading: { headline, items: [{ text, duration }] }
    -- results: { headline, body, summaryTemplate, dynamicFields: [...] }
    -- offer: { headline, bullets: [...], offerText, ctaText, ctaUrl, guaranteeText }
    conditional_logic JSONB DEFAULT NULL,
    -- conditional_logic: { showIf: { slideId, optionId } } or null for always show
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, slide_order)
);

-- Quiz responses table
CREATE TABLE IF NOT EXISTS quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- answers: [{ slideId, slideType, selectedOptions: [...], timestamp }]
    current_slide INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    user_agent TEXT,
    ip_address TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_slides_quiz_id ON quiz_slides(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_slides_order ON quiz_slides(quiz_id, slide_order);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session ON quiz_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_slug ON quizzes(slug);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_slides_updated_at ON quiz_slides;
CREATE TRIGGER update_quiz_slides_updated_at
    BEFORE UPDATE ON quiz_slides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes (admin can do everything, anon can read published)
CREATE POLICY "Admin full access to quizzes" ON quizzes
    FOR ALL USING (true);

CREATE POLICY "Public can view published quizzes" ON quizzes
    FOR SELECT USING (status = 'published');

-- RLS Policies for quiz_slides
CREATE POLICY "Admin full access to quiz_slides" ON quiz_slides
    FOR ALL USING (true);

CREATE POLICY "Public can view slides of published quizzes" ON quiz_slides
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_slides.quiz_id 
            AND quizzes.status = 'published'
        )
    );

-- RLS Policies for quiz_responses
CREATE POLICY "Admin full access to quiz_responses" ON quiz_responses
    FOR ALL USING (true);

CREATE POLICY "Anyone can insert responses" ON quiz_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own responses" ON quiz_responses
    FOR SELECT USING (true);

