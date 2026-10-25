CREATE TABLE instagram_webhook_receipts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload_sha256 text NOT NULL UNIQUE CHECK (length(payload_sha256)=64),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  last_received_at timestamptz NOT NULL DEFAULT now(),
  delivery_count integer NOT NULL DEFAULT 1 CHECK (delivery_count>0),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed','ignored')),
  processed_at timestamptz,
  error_code text
);
CREATE INDEX instagram_webhook_pending ON instagram_webhook_receipts(id) WHERE status='received';
