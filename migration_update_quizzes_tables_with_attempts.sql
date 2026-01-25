-- Migration: Update quizzes tables with quiz applications, student attempts, and answers

-- Alter existing quizzes table to potentially add new columns if needed in the future
-- For now, no alterations are strictly necessary based on current request for 'quizzes' and 'quiz_questions'

-- Table for quiz applications (an instance of a quiz for a specific class)
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

-- Table for student attempts on a quiz application
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

-- Table for student answers to each question within an attempt
CREATE TABLE public.student_quiz_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.student_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id),
    chosen_option_id VARCHAR(10), -- The 'id' of the option chosen by the student (e.g., 'a', 'b')
    is_correct BOOLEAN NOT NULL, -- Automatically determined based on quiz_questions.correct_answer_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (attempt_id, question_id) -- A student can only answer a question once per attempt
);

ALTER TABLE public.student_quiz_answers OWNER TO "user";

-- Add indexes for performance
CREATE INDEX idx_quiz_applications_quiz_id ON public.quiz_applications (quiz_id);
CREATE INDEX idx_quiz_applications_turma_id ON public.quiz_applications (turma_id);
CREATE INDEX idx_student_quiz_attempts_application_id ON public.student_quiz_attempts (application_id);
CREATE INDEX idx_student_quiz_attempts_student_id ON public.student_quiz_attempts (student_id);
CREATE INDEX idx_student_quiz_answers_attempt_id ON public.student_quiz_answers (attempt_id);
CREATE INDEX idx_student_quiz_answers_question_id ON public.student_quiz_answers (question_id);
