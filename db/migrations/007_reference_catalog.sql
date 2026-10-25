ALTER TABLE parish_catalog ALTER COLUMN jurisdiction_id DROP NOT NULL;
ALTER TABLE parish_catalog ADD COLUMN source_kind text NOT NULL DEFAULT 'institutional'
  CHECK (source_kind IN ('institutional','reference'));
ALTER TABLE parish_catalog ADD CONSTRAINT institutional_jurisdiction_required
  CHECK (source_kind='reference' OR jurisdiction_id IS NOT NULL);
ALTER TABLE parish_catalog_sources ADD COLUMN source_kind text NOT NULL DEFAULT 'institutional'
  CHECK (source_kind IN ('institutional','reference'));
