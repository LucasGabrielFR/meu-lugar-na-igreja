ALTER TABLE houses ADD COLUMN instagram_user_id text UNIQUE;
ALTER TABLE houses ADD COLUMN instagram_comment_id text;
ALTER TABLE houses ADD COLUMN instagram_media_id text;

CREATE TABLE instagram_comment_events (
  comment_id text PRIMARY KEY,
  receipt_id bigint NOT NULL REFERENCES instagram_webhook_receipts(id) ON DELETE CASCADE,
  media_id text,
  author_id text,
  author_username text,
  comment_text text NOT NULL,
  extracted_city text,
  extracted_uf text,
  extracted_parish text,
  city_code integer REFERENCES municipalities(code),
  parish_id integer REFERENCES parishes(id),
  house_id integer REFERENCES houses(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN (
    'house_created',
    'house_updated',
    'not_understood',
    'city_not_found',
    'parish_not_found',
    'parish_ambiguous',
    'ignored_self',
    'ignored_test',
    'ignored_invalid',
    'error'
  )),
  reply_text text,
  reply_id text,
  reply_status text NOT NULL DEFAULT 'none' CHECK (reply_status IN ('none','sent','failed','skipped')),
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX instagram_comment_events_processed_at ON instagram_comment_events(processed_at DESC);
CREATE INDEX instagram_comment_events_receipt_id ON instagram_comment_events(receipt_id);

