-- Add ingestion tracking fields to carpetas
ALTER TABLE public.carpetas
ADD COLUMN IF NOT EXISTS ingesta_estado TEXT DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS ingesta_paso TEXT;

-- Create an enum-like constraint for allowed states
-- PENDIENTE: Just created/uploaded
-- PROCESANDO: IA is working
-- COMPLETADO: Done
-- ERROR: Failed
ALTER TABLE public.carpetas 
DROP CONSTRAINT IF EXISTS check_ingesta_estado;

ALTER TABLE public.carpetas
ADD CONSTRAINT check_ingesta_estado 
CHECK (ingesta_estado IN ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'ERROR'));

COMMENT ON COLUMN public.carpetas.ingesta_estado IS 'Estado de la ingesta asíncrona: PENDIENTE, PROCESANDO, COMPLETADO, ERROR';
COMMENT ON COLUMN public.carpetas.ingesta_paso IS 'Descripción legible del paso actual del proceso de ingesta';
