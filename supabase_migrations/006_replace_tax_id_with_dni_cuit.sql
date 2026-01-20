-- Migración: Cambiar tax_id por dni y agregar cuit
-- Paso 1: Agregar nuevas columnas dni y cuit
ALTER TABLE personas ADD COLUMN IF NOT EXISTS dni text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS cuit text;

-- Paso 2: Migrar datos de tax_id a dni (asumiendo que tax_id era el DNI)
UPDATE personas SET dni = tax_id WHERE dni IS NULL;

-- Paso 3: Hacer dni NOT NULL
ALTER TABLE personas ALTER COLUMN dni SET NOT NULL;

-- Paso 4: Eliminar foreign key constraints que referencian tax_id
ALTER TABLE fichas_web_tokens DROP CONSTRAINT IF EXISTS fichas_web_tokens_persona_id_fkey;
ALTER TABLE participantes_operacion DROP CONSTRAINT IF EXISTS participantes_operacion_persona_id_fkey;

-- Paso 5: Eliminar PRIMARY KEY actual
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_pkey;

-- Paso 6: Crear nuevo PRIMARY KEY en dni
ALTER TABLE personas ADD PRIMARY KEY (dni);

-- Paso 7: Actualizar foreign keys para usar dni
-- Primero agregar columna temporal para migración
ALTER TABLE fichas_web_tokens ADD COLUMN IF NOT EXISTS persona_dni text;
ALTER TABLE participantes_operacion ADD COLUMN IF NOT EXISTS persona_dni text;

-- Migrar datos
UPDATE fichas_web_tokens SET persona_dni = persona_id;
UPDATE participantes_operacion SET persona_dni = persona_id;

-- Eliminar columnas viejas
ALTER TABLE fichas_web_tokens DROP COLUMN IF EXISTS persona_id;
ALTER TABLE participantes_operacion DROP COLUMN IF EXISTS persona_id;

-- Renombrar columnas nuevas
ALTER TABLE fichas_web_tokens RENAME COLUMN persona_dni TO persona_id;
ALTER TABLE participantes_operacion RENAME COLUMN persona_dni TO persona_id;

-- Recrear foreign keys
ALTER TABLE fichas_web_tokens 
ADD CONSTRAINT fichas_web_tokens_persona_id_fkey 
FOREIGN KEY (persona_id) REFERENCES personas(dni);

ALTER TABLE participantes_operacion 
ADD CONSTRAINT participantes_operacion_persona_id_fkey 
FOREIGN KEY (persona_id) REFERENCES personas(dni) ON DELETE CASCADE;

-- Paso 8: Eliminar columna tax_id
ALTER TABLE personas DROP COLUMN IF EXISTS tax_id;

-- Paso 9: Crear índice para CUIT (para búsquedas rápidas)
CREATE INDEX IF NOT EXISTS idx_personas_cuit ON personas(cuit);
CREATE INDEX IF NOT EXISTS idx_personas_dni ON personas(dni);
