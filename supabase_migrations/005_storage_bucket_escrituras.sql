-- Crear bucket de storage PRIVADO para documentos de escrituras
INSERT INTO storage.buckets (id, name, public)
VALUES ('escrituras', 'escrituras', false)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT: Políticas RLS para storage.objects

-- Allow service role to insert (for API ingestion)
CREATE POLICY "Service role can upload escrituras"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'escrituras');

-- Allow authenticated users to insert (for manual uploads)
CREATE POLICY "Authenticated users can upload escrituras"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'escrituras');

-- Allow anyone to read (for viewing signed URLs)
CREATE POLICY "Anyone can read escrituras"
ON storage.objects FOR SELECT
TO anon, authenticated, service_role
USING (bucket_id = 'escrituras');

-- Allow authenticated & service_role to update
CREATE POLICY "Authenticated users can update escrituras"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'escrituras');

-- Allow authenticated & service_role to delete
CREATE POLICY "Authenticated users can delete escrituras"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'escrituras');
