-- Fix: Add ON DELETE CASCADE to fichas_web_tokens foreign key
-- This allows deleting personas even if they have fichas_web_tokens

ALTER TABLE fichas_web_tokens 
DROP CONSTRAINT IF EXISTS fichas_web_tokens_persona_id_fkey;

ALTER TABLE fichas_web_tokens 
ADD CONSTRAINT fichas_web_tokens_persona_id_fkey 
FOREIGN KEY (persona_id) REFERENCES personas(dni) ON DELETE CASCADE;
