-- Migration: Add FIDEICOMISO support and dual pricing for fiduciary operations
-- Date: 2026-01-29
-- Purpose: Support trust entities, beneficiary assignments, and dual pricing

-- 1. Add FIDEICOMISO as a new tipo_persona
-- Note: This assumes tipo_persona is stored as TEXT. If it's an ENUM, you'll need to ALTER TYPE instead.
-- Example for ENUM (uncomment if needed):
-- ALTER TYPE tipo_persona_enum ADD VALUE IF NOT EXISTS 'FIDEICOMISO';

-- 2. Add dual pricing fields to operaciones table
ALTER TABLE operaciones 
ADD COLUMN IF NOT EXISTS precio_construccion DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS precio_cesion DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS moneda_cesion VARCHAR(10),
ADD COLUMN IF NOT EXISTS tipo_cambio_cesion DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS equivalente_ars_cesion DECIMAL(15,2);

-- 3. Add beneficiary assignment fields to operaciones table
ALTER TABLE operaciones
ADD COLUMN IF NOT EXISTS beneficiario_cedente VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_incorporacion_cedente DATE,
ADD COLUMN IF NOT EXISTS beneficiario_cesionario VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_cesion DATE,
ADD COLUMN IF NOT EXISTS precio_cesion_monto DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS moneda_cesion_beneficiario VARCHAR(10);

-- 4. Add comments for documentation
COMMENT ON COLUMN operaciones.precio_construccion IS 'Costo de construcción en fideicomisos al costo (ya integrado)';
COMMENT ON COLUMN operaciones.precio_cesion IS 'Precio de cesión de beneficiario (valor de mercado)';
COMMENT ON COLUMN operaciones.tipo_cambio_cesion IS 'Tipo de cambio aplicado para conversión de precio cesión';
COMMENT ON COLUMN operaciones.beneficiario_cedente IS 'Nombre del beneficiario original que cede sus derechos';
COMMENT ON COLUMN operaciones.beneficiario_cesionario IS 'Nombre del beneficiario final que adquiere los derechos';

-- 5. Create index for fideicomiso searches
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_persona_fideicomiso 
ON clientes(tipo_persona) 
WHERE tipo_persona = 'FIDEICOMISO';

-- 6. Create index for beneficiary assignment searches
CREATE INDEX IF NOT EXISTS idx_operaciones_cesion 
ON operaciones(beneficiario_cedente, beneficiario_cesionario) 
WHERE beneficiario_cedente IS NOT NULL;
