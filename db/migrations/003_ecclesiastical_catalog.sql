CREATE TABLE ecclesiastical_jurisdictions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('diocese','archdiocese','prelature','other')),
  website text NOT NULL
);
CREATE TABLE parish_catalog (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key text NOT NULL UNIQUE,
  jurisdiction_id integer NOT NULL REFERENCES ecclesiastical_jurisdictions(id),
  municipality_code integer NOT NULL REFERENCES municipalities(code),
  name text NOT NULL,
  source_url text NOT NULL,
  source_updated_at timestamptz,
  retrieved_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX parish_catalog_municipality ON parish_catalog(municipality_code);
CREATE INDEX parish_catalog_jurisdiction ON parish_catalog(jurisdiction_id);
ALTER TABLE parishes ADD COLUMN catalog_id integer REFERENCES parish_catalog(id);
