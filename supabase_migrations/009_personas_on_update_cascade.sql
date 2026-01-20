-- Migration 009: Add ON UPDATE CASCADE to personas references
-- This allows changing the DNI (Primary Key) and automatically updating all related tables

-- 1. Table: fichas_web_tokens
ALTER TABLE fichas_web_tokens 
DROP CONSTRAINT IF EXISTS fichas_web_tokens_persona_id_fkey;

ALTER TABLE fichas_web_tokens 
ADD CONSTRAINT fichas_web_tokens_persona_id_fkey 
FOREIGN KEY (persona_id) 
REFERENCES personas(dni) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- 2. Table: participantes_operacion
ALTER TABLE participantes_operacion 
DROP CONSTRAINT IF EXISTS participantes_operacion_persona_id_fkey;

ALTER TABLE participantes_operacion 
ADD CONSTRAINT participantes_operacion_persona_id_fkey 
FOREIGN KEY (persona_id) 
REFERENCES personas(dni) 
ON UPDATE CASCADE 
ON DELETE CASCADE;
