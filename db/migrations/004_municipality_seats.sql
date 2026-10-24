ALTER TABLE municipalities ADD COLUMN seat_longitude double precision CHECK (seat_longitude BETWEEN -180 AND 180);
ALTER TABLE municipalities ADD COLUMN seat_latitude double precision CHECK (seat_latitude BETWEEN -90 AND 90);
ALTER TABLE municipalities ADD COLUMN seat_source text;
CREATE EXTENSION IF NOT EXISTS unaccent;
