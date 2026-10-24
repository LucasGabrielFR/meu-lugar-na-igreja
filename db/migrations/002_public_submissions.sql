CREATE TABLE participation_requests (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city_code integer NOT NULL REFERENCES municipalities(code),
  parish_id integer,
  parish_name text NOT NULL CHECK (length(parish_name) BETWEEN 2 AND 140),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 140),
  username text NOT NULL CHECK (username ~ '^[a-zA-Z0-9._]{1,30}$'),
  consent_version text NOT NULL DEFAULT 'public-profile-v1',
  consented_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_id integer REFERENCES admins(id),
  reviewed_at timestamptz,
  house_id integer REFERENCES houses(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (parish_id, city_code) REFERENCES parishes(id, city_code)
);
CREATE UNIQUE INDEX participation_pending_username ON participation_requests(lower(username)) WHERE status='pending';
CREATE INDEX participation_status_created ON participation_requests(status, created_at DESC);
