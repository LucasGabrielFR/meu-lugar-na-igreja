-- Migration 015: Creator account and user levels
ALTER TABLE houses ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'leigo';

ALTER TABLE participant_profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE participant_profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'leigo';
ALTER TABLE participant_profiles ADD COLUMN IF NOT EXISTS username text;
CREATE INDEX IF NOT EXISTS idx_participant_profiles_username ON participant_profiles(lower(username));

-- Ativar Niquelândia (código IBGE 5214606)
INSERT INTO cities(code, description, active)
VALUES(5214606, 'Niquelândia - GO', true)
ON CONFLICT(code) DO UPDATE SET active = true;

-- Ativar Paróquia Nossa Senhora da Abadia (id 1)
UPDATE parishes SET active = true WHERE id = 1 AND city_code = 5214606;

-- Criar ou atualizar a casa do Criador (@lucasgfr26) nível 99 em Niquelândia-GO
INSERT INTO houses (city_code, parish_id, username, display_name, slot, color, active, level, role)
VALUES (
  5214606,
  1,
  'lucasgfr26',
  'Lucas (Criador)',
  COALESCE((SELECT MAX(slot) + 1 FROM houses WHERE parish_id = 1), 0),
  '#ffd700',
  true,
  99,
  'criador'
)
ON CONFLICT (lower(username)) DO UPDATE SET
  city_code = 5214606,
  parish_id = 1,
  display_name = 'Lucas (Criador)',
  color = '#ffd700',
  active = true,
  level = 99,
  role = 'criador';

-- Criar ou atualizar o perfil de participante no Instagram (@lucasgfr26) com nível 99
INSERT INTO participant_profiles (instagram_scoped_id, username, points, xp, level, role)
VALUES ('lucasgfr26', 'lucasgfr26', 99999, 99999, 99, 'criador')
ON CONFLICT (instagram_scoped_id) DO UPDATE SET
  username = 'lucasgfr26',
  points = 99999,
  xp = 99999,
  level = 99,
  role = 'criador';
