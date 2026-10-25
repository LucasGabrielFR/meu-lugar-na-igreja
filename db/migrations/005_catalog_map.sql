CREATE INDEX parish_catalog_active_city ON parish_catalog(municipality_code) WHERE active;
CREATE TABLE parish_catalog_sources (
  source_key text PRIMARY KEY,
  catalog_id integer NOT NULL REFERENCES parish_catalog(id),
  source_url text NOT NULL,
  retrieved_at timestamptz NOT NULL
);
CREATE INDEX parish_catalog_sources_catalog ON parish_catalog_sources(catalog_id);
CREATE TABLE catalog_imports (
  source_key text PRIMARY KEY,
  retrieved_at timestamptz NOT NULL,
  description text NOT NULL,
  imported integer NOT NULL,
  skipped integer NOT NULL
);
