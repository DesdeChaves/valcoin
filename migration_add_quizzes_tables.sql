CREATE TABLE public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discipline_id UUID NOT NULL REFERENCES public.subjects(id),
    professor_id UUID NOT NULL REFERENCES public.users(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    flashcard_id UUID REFERENCES public.flashcards(id), -- Optional, if question is custom
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice', -- e.g., 'multiple_choice', 'true_false'
    options JSONB NOT NULL, -- [{'id': 'a', 'text': 'Option A'}, ...]
    correct_answer_id VARCHAR(10) NOT NULL, -- 'a', 'b', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
