-- Crear bucket de storage para documentos de escrituras
INSERT INTO storage.buckets (id, name, public)
VALUES ('escrituras', 'escrituras', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir que cualquiera pueda leer archivos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'escrituras');

-- Permitir que usuarios autenticados suban archivos
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'escrituras');

-- Permitir que usuarios autenticados actualicen sus propios archivos
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'escrituras');

-- Permitir que usuarios autenticados eliminen archivos
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'escrituras');
