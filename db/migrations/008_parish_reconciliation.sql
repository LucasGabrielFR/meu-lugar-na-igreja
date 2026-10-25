CREATE TABLE parish_catalog_redirects (
  duplicate_id integer PRIMARY KEY REFERENCES parish_catalog(id),
  canonical_id integer NOT NULL REFERENCES parish_catalog(id),
  reason text NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (duplicate_id <> canonical_id)
);
CREATE INDEX parish_redirect_canonical ON parish_catalog_redirects(canonical_id);
CREATE TABLE parish_catalog_review_queue (
  source_key text PRIMARY KEY,
  municipality_code integer NOT NULL REFERENCES municipalities(code),
  name text NOT NULL,
  source_url text NOT NULL,
  candidates jsonb NOT NULL,
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
