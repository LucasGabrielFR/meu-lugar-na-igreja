CREATE TABLE instagram_oauth_states (
  state_hash text PRIMARY KEY,
  admin_id integer NOT NULL REFERENCES admins(id),
  session_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE TABLE instagram_connections (
  slot boolean PRIMARY KEY DEFAULT true CHECK(slot),
  account_id text NOT NULL,
  username text NOT NULL,
  display_name text,
  account_type text,
  token_ciphertext text NOT NULL,
  expires_at timestamptz NOT NULL,
  connected_by integer NOT NULL REFERENCES admins(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz NOT NULL DEFAULT now()
);
