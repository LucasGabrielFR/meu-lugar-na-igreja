CREATE TABLE municipality_boundaries (
  code integer PRIMARY KEY REFERENCES municipalities(code),
  geometry jsonb NOT NULL,
  path text NOT NULL,
  bounds double precision[] NOT NULL CHECK(array_length(bounds,1)=4),
  source_url text NOT NULL,
  retrieved_at timestamptz NOT NULL
);
CREATE TABLE geography_imports (
  source_key text PRIMARY KEY,
  checksum text NOT NULL,
  source_url text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  imported integer NOT NULL
);
