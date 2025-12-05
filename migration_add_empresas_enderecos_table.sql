-- migration_add_empresas_enderecos_table.sql

-- Drop existing columns from public.empresas if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='empresas' AND column_name='morada') THEN
        ALTER TABLE public.empresas DROP COLUMN morada;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='empresas' AND column_name='codigo_postal') THEN
        ALTER TABLE public.empresas DROP COLUMN codigo_postal;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='empresas' AND column_name='localidade') THEN
        ALTER TABLE public.empresas DROP COLUMN localidade;
    END IF;
END $$;

-- Create public.empresas_enderecos table
CREATE TABLE public.empresas_enderecos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    morada text NOT NULL,
    codigo_postal character varying(20),
    localidade character varying(100),
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_empresas_enderecos_empresa_id ON public.empresas_enderecos(empresa_id);

-- Trigger for automatic update of data_atualizacao for empresas_enderecos
CREATE TRIGGER trigger_atualizar_empresas_enderecos
    BEFORE UPDATE ON public.empresas_enderecos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_atualizacao();

COMMENT ON TABLE public.empresas_enderecos IS 'Endereços múltiplos para as empresas';
COMMENT ON COLUMN public.empresas_enderecos.morada IS 'Morada da empresa';
COMMENT ON COLUMN public.empresas_enderecos.codigo_postal IS 'Código postal da morada da empresa';
COMMENT ON COLUMN public.empresas_enderecos.localidade IS 'Localidade da morada da empresa';
