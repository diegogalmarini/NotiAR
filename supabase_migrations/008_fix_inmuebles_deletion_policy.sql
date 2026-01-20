-- Migration 008: Fix Inmuebles Deletion Policy
-- Changes the foreign key constraint on escrituras to allow deleting inmuebles

-- Drop the existing constraint
ALTER TABLE escrituras 
DROP CONSTRAINT IF EXISTS escrituras_inmueble_princ_id_fkey;

-- Recreate it with ON DELETE SET NULL
ALTER TABLE escrituras 
ADD CONSTRAINT escrituras_inmueble_princ_id_fkey 
FOREIGN KEY (inmueble_princ_id) 
REFERENCES inmuebles(id) 
ON DELETE SET NULL;
