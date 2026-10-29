CREATE TABLE IF NOT EXISTS instagram_direct_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id text NOT NULL,
  recipient_id text NOT NULL,
  message_id text UNIQUE,
  incoming_text text NOT NULL,
  response_text text,
  points_awarded integer NOT NULL DEFAULT 0,
  xp_awarded integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participant_profiles (
  instagram_scoped_id text PRIMARY KEY,
  points integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON instagram_direct_messages(sender_id, created_at DESC);
