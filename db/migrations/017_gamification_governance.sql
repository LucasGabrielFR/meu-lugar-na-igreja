-- Migration 017: Gamification, Church Ranks, Priest Verification and Governance System

-- 1. Ampliação da tabela de Casas (Houses) para Gamificação e Papéis
ALTER TABLE houses ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS civil_role text DEFAULT NULL;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS is_priest boolean NOT NULL DEFAULT false;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS priest_title text DEFAULT NULL;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS priest_approved boolean NOT NULL DEFAULT false;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS referred_by text DEFAULT NULL;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz DEFAULT NULL;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS weekly_score integer NOT NULL DEFAULT 0;

-- 2. Ampliação da tabela de Paróquias (Parishes) para Presença Sacerdotal e Upgrades Sagrados
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS has_approved_priest boolean NOT NULL DEFAULT false;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS priest_name text DEFAULT NULL;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS priest_title text DEFAULT NULL;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS priest_house_id integer DEFAULT NULL;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS holy_blessing_active boolean NOT NULL DEFAULT false;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS holy_blessing_expires_at timestamptz DEFAULT NULL;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS stained_glass_active boolean NOT NULL DEFAULT false;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS blessed_sacrament_chapel boolean NOT NULL DEFAULT false;
ALTER TABLE parishes ADD COLUMN IF NOT EXISTS featured_parish boolean NOT NULL DEFAULT false;

-- 3. Ampliação da tabela de Cidades (Cities) para Poderes dos Cargos Civis
ALTER TABLE cities ADD COLUMN IF NOT EXISTS patron_festival_active boolean NOT NULL DEFAULT false;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS mayor_message text DEFAULT NULL;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS governor_featured boolean NOT NULL DEFAULT false;

-- 4. Tabela de Eleição e Votação Presidencial
CREATE TABLE IF NOT EXISTS presidential_votes (
  id serial PRIMARY KEY,
  cycle_week text NOT NULL,
  voter_username text NOT NULL,
  candidate_username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_vote_per_cycle UNIQUE (cycle_week, voter_username)
);
CREATE INDEX IF NOT EXISTS idx_presidential_votes_cycle ON presidential_votes(cycle_week);

-- 5. Tabela de Propostas Presidenciais de Novas Funcionalidades (Gabinete de Inovação AcutisTech)
CREATE TABLE IF NOT EXISTS feature_proposals (
  id serial PRIMARY KEY,
  cycle_week text NOT NULL,
  president_username text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'gameplay',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined', 'implemented'
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_feature_proposals_status ON feature_proposals(status, created_at DESC);

-- 6. Tabela de Intenções de Oração no Sino / Capela
CREATE TABLE IF NOT EXISTS prayer_intentions (
  id serial PRIMARY KEY,
  city_code integer NOT NULL REFERENCES cities(code),
  parish_id integer NOT NULL REFERENCES parishes(id),
  author_username text NOT NULL,
  author_display_name text NOT NULL,
  intention text NOT NULL,
  is_blessed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prayer_intentions_parish ON prayer_intentions(parish_id, created_at DESC);

-- 7. Tabela de Indicações / Menções com @ (Amigos e Padres)
CREATE TABLE IF NOT EXISTS gamification_referrals (
  id serial PRIMARY KEY,
  referrer_username text NOT NULL,
  referred_username text NOT NULL,
  is_priest boolean NOT NULL DEFAULT false,
  priest_title text DEFAULT NULL,
  city_code integer REFERENCES cities(code),
  parish_id integer REFERENCES parishes(id),
  bonus_awarded boolean NOT NULL DEFAULT false,
  approved_by_admin_id integer REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT unique_referral_pair UNIQUE (referrer_username, referred_username)
);
CREATE INDEX IF NOT EXISTS idx_gamification_referrals_pending ON gamification_referrals(is_priest, bonus_awarded);

-- 8. Tabela de Mandatos Oficiais Ativos (Presidente, Governador, Prefeito, Sacristão)
CREATE TABLE IF NOT EXISTS governance_mandates (
  id serial PRIMARY KEY,
  cycle_week text NOT NULL,
  role_type text NOT NULL, -- 'presidente', 'governador', 'prefeito', 'sacristao'
  scope_uf text,
  scope_city_code integer,
  username text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_governance_mandates_lookup ON governance_mandates(active, role_type, scope_uf, scope_city_code);

-- 9. Tabela de Decretos Oficiais de Governador e Prefeito
CREATE TABLE IF NOT EXISTS governance_decrees (
  id serial PRIMARY KEY,
  cycle_week text NOT NULL,
  role_type text NOT NULL,
  author_username text NOT NULL,
  scope_uf text,
  scope_city_code integer,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Atualização Inicial de Fundadores de Cidades
-- O primeiro morador (menor id) de cada cidade com casas ativas é condecorado como Fundador (is_founder = true)
UPDATE houses h
SET is_founder = true
WHERE h.id IN (
  SELECT DISTINCT ON (city_code) id
  FROM houses
  WHERE active
  ORDER BY city_code, id ASC
);

-- Garantir privilégios do Criador (@lucasgfr26)
UPDATE houses
SET level = 99,
    role = 'criador',
    xp = 99999,
    points = 99999,
    is_founder = true
WHERE lower(username) = 'lucasgfr26';
