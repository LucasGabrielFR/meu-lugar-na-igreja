ALTER TABLE ecclesiastical_jurisdictions ADD COLUMN catalog_checked_at timestamptz;
ALTER TABLE ecclesiastical_jurisdictions ADD COLUMN source_churches_count integer CHECK(source_churches_count>=0);
