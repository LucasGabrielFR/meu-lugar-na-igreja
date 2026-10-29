CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS parish_duplicate_ignores (
  parish_id_1 integer NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  parish_id_2 integer NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(parish_id_1, parish_id_2),
  CHECK(parish_id_1 < parish_id_2)
);
CREATE INDEX IF NOT EXISTS parish_duplicate_ignores_p2 ON parish_duplicate_ignores(parish_id_2);
