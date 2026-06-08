-- =============================================================
-- Storage RLS: org-scoped file access for org-documents bucket
-- Path convention: {org_id}/{module}/{record_id}/{timestamp}_{filename}
-- =============================================================

-- Users can read files that belong to their organisation
CREATE POLICY "org_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[1] = get_my_organisation_id()::text
  );

-- Authenticated users can upload to their organisation's folder
CREATE POLICY "org_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[1] = get_my_organisation_id()::text
    AND auth.uid() IS NOT NULL
  );

-- Only system admins can delete files
CREATE POLICY "org_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[1] = get_my_organisation_id()::text
    AND is_system_admin()
  );
