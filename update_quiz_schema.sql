-- SQL Migration Script: Alter quiz_questions.question_text to JSONB and recreate related tables.
-- WARNING: This script will delete all existing quiz-related data.

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.student_quiz_answers CASCADE;
DROP TABLE IF EXISTS public.student_quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quiz_applications CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;

-- Recreate public.quizzes table (assuming no changes needed here)
CREATE TABLE public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discipline_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quizzes OWNER TO "user";

-- Recreate public.quiz_questions table with question_text as JSONB
CREATE TABLE public.quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    flashcard_id UUID REFERENCES public.flashcards(id), -- Optional, if question is custom
    question_text JSONB NOT NULL, -- Changed from TEXT to JSONB
    question_type VARCHAR(50) DEFAULT 'multiple_choice', -- e.g., 'multiple_choice', 'true_false'
    options JSONB NOT NULL, -- [{'id': 'a', 'text': 'Option A'}, ...]
    correct_answer_id VARCHAR(10) NOT NULL, -- 'a', 'b', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_questions OWNER TO "user";

-- Recreate public.quiz_applications table (assuming no changes needed here)
CREATE TABLE public.quiz_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.classes(id), -- Assuming 'classes' table holds turma information
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE, -- Nullable, for quizzes with no strict deadline
    application_date DATE NOT NULL DEFAULT CURRENT_DATE, -- To track when it was applied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_applications OWNER TO "user";

-- Recreate public.student_quiz_attempts table (assuming no changes needed here)
CREATE TABLE public.student_quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.quiz_applications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id),
    attempt_number INTEGER NOT NULL DEFAULT 1, -- To track multiple attempts by the same student for the same application
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    submit_time TIMESTAMP WITH TIME ZONE, -- When the student submits the quiz
    score NUMERIC(5,2), -- Automatically determined, e.g., percentage (0.00-100.00)
    passed BOOLEAN, -- True if score meets a passing threshold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (application_id, student_id, attempt_number) -- A student can have multiple attempts for one application
);

ALTER TABLE public.student_quiz_attempts OWNER TO "user";

-- Recreate public.student_quiz_answers table (assuming no changes needed here)
CREATE TABLE public.student_quiz_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.student_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    chosen_option_id JSONB, -- Changed from VARCHAR(10) to JSONB
    is_correct BOOLEAN NOT NULL, -- Automatically determined based on quiz_questions.correct_answer_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (attempt_id, question_id) -- A student can only answer a question once per attempt
);

ALTER TABLE public.student_quiz_answers OWNER TO "user";

-- Re-add indexes
CREATE INDEX idx_quiz_applications_quiz_id ON public.quiz_applications (quiz_id);
CREATE INDEX idx_quiz_applications_turma_id ON public.quiz_applications (turma_id);
CREATE INDEX idx_student_quiz_attempts_application_id ON public.student_quiz_attempts (application_id);
CREATE INDEX idx_student_quiz_attempts_student_id ON public.student_quiz_attempts (student_id);
CREATE INDEX idx_student_quiz_answers_attempt_id ON public.student_quiz_answers (attempt_id);
CREATE INDEX idx_student_quiz_answers_question_id ON public.quiz_questions (quiz_id);
CREATE INDEX idx_student_quiz_answers_question_id ON public.student_quiz_answers (question_id);