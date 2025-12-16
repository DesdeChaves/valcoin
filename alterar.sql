-- SQL commands to update the database schema for the 'memoria' module

-- 1. Create a new function to handle 'updated_at' column updates
--    This is necessary because the existing 'update_updated_at_column'
--    function is designed for tables with 'data_atualizacao' column.
CREATE OR REPLACE FUNCTION public.update_generic_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Alter triggers for 'flashcards' table
--    Drop the existing trigger and recreate it using the new function
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON public.flashcards;
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at_column();

-- 3. Alter triggers for 'flashcard_memory_state' table
--    Drop the existing trigger and recreate it using the new function
DROP TRIGGER IF EXISTS update_memory_state_updated_at ON public.flashcard_memory_state;
CREATE TRIGGER update_memory_state_updated_at
BEFORE UPDATE ON public.flashcard_memory_state
FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at_column();

-- 4. Alter triggers for 'assuntos' table (created by migration_add_assunto_table.sql)
--    Drop the existing trigger and recreate it using the new function
DROP TRIGGER IF EXISTS update_assuntos_updated_at ON public.assuntos;
CREATE TRIGGER update_assuntos_updated_at
BEFORE UPDATE ON public.assuntos
FOR EACH ROW EXECUTE PROCEDURE public.update_generic_updated_at_column();

-- IMPORTANT: You might need to manually run the following if the `update_updated_at_column`
-- function definition in your `schema.sql` (or active schema) is incorrect.
-- This ensures the generic function continues to work for tables with 'data_atualizacao'.
-- If your current 'update_updated_at_column' correctly updates 'updated_at',
-- then you should NOT run this part, and inspect your schema.sql for the correct definition.
/*
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/
