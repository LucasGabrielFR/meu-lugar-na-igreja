CREATE TABLE parish_catalog_redirects (
  duplicate_id integer PRIMARY KEY REFERENCES parish_catalog(id),
  canonical_id integer NOT NULL REFERENCES parish_catalog(id),
  reason text NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (duplicate_id <> canonical_id)
);
CREATE INDEX parish_redirect_canonical ON parish_catalog_redirects(canonical_id);
