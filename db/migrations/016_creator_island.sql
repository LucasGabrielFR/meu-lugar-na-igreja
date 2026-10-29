-- Migration 016: Ilha do Criador no Oceano Atlântico Sul
INSERT INTO municipalities (code, name, uf, seat_longitude, seat_latitude, seat_source)
VALUES (4399999, 'Ilha do Criador', 'RS', -51.8, -35.2, 'AcutisTech')
ON CONFLICT (code) DO UPDATE SET
  name = 'Ilha do Criador',
  uf = 'RS',
  seat_longitude = -51.8,
  seat_latitude = -35.2;

INSERT INTO cities (code, description, active)
VALUES (4399999, 'Território insular privativo do Criador do Meu Lugar na Igreja, situado no oceano Atlântico ao sul do Rio Grande do Sul. Desvinculado de rankings paroquiais.', true)
ON CONFLICT (code) DO UPDATE SET active = true;

-- Criar a Paróquia / Santuário do Criador na Ilha
INSERT INTO parishes (city_code, name, slot, description, active)
VALUES (4399999, 'Santuário do Criador', 0, 'Santuário de vigília e honra do Criador do Meu Lugar na Igreja.', true)
ON CONFLICT (city_code, slot) DO UPDATE SET name = 'Santuário do Criador', active = true;

-- Mover a casa de @lucasgfr26 de Niquelândia-GO para a Ilha do Criador
UPDATE houses
SET city_code = 4399999,
    parish_id = (SELECT id FROM parishes WHERE city_code = 4399999 AND slot = 0 LIMIT 1),
    slot = 0,
    color = '#ffd700',
    level = 99,
    role = 'criador',
    active = true
WHERE lower(username) = 'lucasgfr26';
