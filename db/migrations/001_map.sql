CREATE TABLE municipalities (
  code integer PRIMARY KEY, name text NOT NULL, uf char(2) NOT NULL
);
CREATE TABLE cities (
  code integer PRIMARY KEY REFERENCES municipalities(code),
  description text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE parishes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city_code integer NOT NULL REFERENCES cities(code), name text NOT NULL,
  description text NOT NULL DEFAULT '', slot integer NOT NULL CHECK(slot >= 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(city_code, slot), UNIQUE(id, city_code)
);
CREATE UNIQUE INDEX parish_name ON parishes(city_code, lower(name));
CREATE TABLE houses (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city_code integer NOT NULL, parish_id integer NOT NULL,
  username text NOT NULL CHECK(username ~ '^[a-zA-Z0-9._]{1,30}$'),
  display_name text NOT NULL, slot integer NOT NULL CHECK(slot >= 0),
  color text NOT NULL DEFAULT '#cc7850', active boolean NOT NULL DEFAULT true,
  FOREIGN KEY(parish_id, city_code) REFERENCES parishes(id, city_code),
  UNIQUE(parish_id, slot)
);
CREATE UNIQUE INDEX house_username ON houses(lower(username));
CREATE INDEX house_city ON houses(city_code);
CREATE TABLE admins (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE, password_hash text NOT NULL
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, admin_id integer NOT NULL REFERENCES admins(id),
  expires_at timestamptz NOT NULL
);
CREATE TABLE login_limits (
  email text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id integer REFERENCES admins(id), action text NOT NULL,
  entity text NOT NULL, entity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
