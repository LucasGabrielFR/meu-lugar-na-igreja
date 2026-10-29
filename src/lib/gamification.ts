import { db } from './db';
import type { GovernanceMandate } from './types';

export {
  calculateLevel,
  xpForLevel,
  xpProgressInLevel,
  getLiturgicalRole,
  getHouseVisualStage,
  getCurrentCycleWeek,
  isElectionWindowOpen,
} from './gamification-rules.mjs';

import {
  calculateLevel,
  getLiturgicalRole,
  getCurrentCycleWeek,
  isElectionWindowOpen,
} from './gamification-rules.mjs';

// ==========================================
// BANCO DE DADOS: AÇÕES DE GAMIFICAÇÃO
// ==========================================

export async function awardXpToUser(username: string, baseAmount: number, reason: string): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();

  // Verificar se o usuário pertence a uma paróquia com bênção sacerdotal ativa (+10% XP)
  const bonusQuery = await db.query<{ holy_blessing_active: boolean }>(`
    SELECT p.holy_blessing_active
    FROM houses h
    JOIN parishes p ON p.id = h.parish_id
    WHERE lower(h.username) = $1 AND h.active
    LIMIT 1
  `, [cleanUsername]);

  const hasBlessing = bonusQuery.rows[0]?.holy_blessing_active ?? false;
  const finalXp = hasBlessing ? Math.round(baseAmount * 1.1) : baseAmount;

  // Atualizar houses e participant_profiles
  const updateRes = await db.query<{ id: number; xp: number; level: number }>(`
    UPDATE houses
    SET xp = xp + $2,
        points = points + $2,
        weekly_score = weekly_score + $2
    WHERE lower(username) = $1 AND active
    RETURNING id, xp, level
  `, [cleanUsername, finalXp]);

  if (!updateRes.rows.length) {
    return { newXp: 0, newLevel: 1, leveledUp: false };
  }

  const { xp: newXp, level: oldLevel } = updateRes.rows[0];
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    const roleInfo = getLiturgicalRole(newLevel);
    await db.query(`
      UPDATE houses
      SET level = $2, role = $3
      WHERE lower(username) = $1 AND active
    `, [cleanUsername, newLevel, roleInfo.role]);
  }

  return { newXp, newLevel, leveledUp };
}

export async function processDailyCheckin(username: string): Promise<{
  success: boolean;
  xpGained: number;
  streak: number;
  message: string;
}> {
  const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();

  const userRes = await db.query<{ id: number; last_checkin_at: Date | null; streak_days: number }>(`
    SELECT id, last_checkin_at, streak_days
    FROM houses
    WHERE lower(username) = $1 AND active
    LIMIT 1
  `, [cleanUsername]);

  if (!userRes.rows.length) {
    return { success: false, xpGained: 0, streak: 0, message: 'Casa não encontrada.' };
  }

  const { last_checkin_at, streak_days } = userRes.rows[0];
  const now = new Date();

  if (last_checkin_at) {
    const lastCheckin = new Date(last_checkin_at);
    const diffHours = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60);

    // Se fez check-in há menos de 18 horas, já conta como o mesmo dia
    if (diffHours < 18) {
      return {
        success: false,
        xpGained: 0,
        streak: streak_days,
        message: 'Você já realizou o Check-in da Fé hoje! Retorne amanhã.',
      };
    }
  }

  // Se a última visita foi há mais de 48 horas, o streak zera
  let newStreak = 1;
  if (last_checkin_at) {
    const lastCheckin = new Date(last_checkin_at);
    const diffHours = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 48) {
      newStreak = streak_days + 1;
    }
  }

  // Base: +10 XP. Se fechar 7 dias: +35 XP extra (total 45 XP)
  let xpBonus = 10;
  let bonusMsg = 'Check-in da Fé realizado! +10 XP';

  if (newStreak % 7 === 0) {
    xpBonus += 35;
    bonusMsg = `🎉 Incrível! Sequência de 7 dias completada! +45 XP de bônus da fé!`;
  }

  await db.query(`
    UPDATE houses
    SET last_checkin_at = now(),
        streak_days = $2
    WHERE lower(username) = $1
  `, [cleanUsername, newStreak]);

  const awardRes = await awardXpToUser(cleanUsername, xpBonus, 'daily_checkin');

  return {
    success: true,
    xpGained: xpBonus,
    streak: newStreak,
    message: `${bonusMsg} (Nível ${awardRes.newLevel})`,
  };
}

export async function submitPrayer(
  cityCode: number,
  parishId: number,
  username: string,
  displayName: string,
  intention: string
): Promise<{ success: boolean; message: string }> {
  const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
  const cleanIntention = intention.trim().slice(0, 500);

  if (!cleanIntention) {
    return { success: false, message: 'Digite sua intenção de oração.' };
  }

  await db.query(`
    INSERT INTO prayer_intentions (city_code, parish_id, author_username, author_display_name, intention)
    VALUES ($1, $2, $3, $4, $5)
  `, [cityCode, parishId, cleanUsername, displayName.trim() || cleanUsername, cleanIntention]);

  // Conceder +10 XP pela oração
  await awardXpToUser(cleanUsername, 10, 'prayer_intention');

  return { success: true, message: 'Intenção de oração acesa no altar da paróquia! (+10 XP)' };
}

export async function voteForPresident(
  voterUsername: string,
  candidateUsername: string
): Promise<{ success: boolean; message: string }> {
  if (!isElectionWindowOpen()) {
    return { success: false, message: 'As urnas presidenciais abrem de sexta a domingo!' };
  }

  const cycleWeek = getCurrentCycleWeek();
  const cleanVoter = voterUsername.replace(/^@/, '').toLowerCase().trim();
  const cleanCandidate = candidateUsername.replace(/^@/, '').toLowerCase().trim();

  try {
    await db.query(`
      INSERT INTO presidential_votes (cycle_week, voter_username, candidate_username)
      VALUES ($1, $2, $3)
    `, [cycleWeek, cleanVoter, cleanCandidate]);

    // +25 XP pelo voto cívico e comunitário
    await awardXpToUser(cleanVoter, 25, 'presidential_vote');

    return { success: true, message: `Voto confirmado em @${cleanCandidate}! (+25 XP cívico)` };
  } catch (error: any) {
    if (error?.code === '23505') {
      return { success: false, message: 'Você já votou na eleição presidencial desta semana!' };
    }
    return { success: false, message: 'Erro ao registrar voto.' };
  }
}

// ==========================================
// GOVERNANÇA: CONSULTAS E APURAÇÃO SEMANAL
// ==========================================

export async function getCurrentPresident(): Promise<{ username: string; display_name: string; cycle_week: string } | null> {
  const res = await db.query<{ username: string; display_name: string; cycle_week: string }>(`
    SELECT m.username, h.display_name, m.cycle_week
    FROM governance_mandates m
    JOIN houses h ON lower(h.username) = lower(m.username)
    WHERE m.active AND m.role_type = 'presidente'
    LIMIT 1
  `);
  return res.rows[0] ?? null;
}

export async function getCityMayor(cityCode: number): Promise<{ username: string; display_name: string; message: string | null; festival: boolean } | null> {
  const res = await db.query<{ username: string; display_name: string; message: string | null; festival: boolean }>(`
    SELECT m.username, h.display_name, c.mayor_message as message, c.patron_festival_active as festival
    FROM governance_mandates m
    JOIN houses h ON lower(h.username) = lower(m.username)
    JOIN cities c ON c.code = m.scope_city_code
    WHERE m.active AND m.role_type = 'prefeito' AND m.scope_city_code = $1
    LIMIT 1
  `, [cityCode]);
  return res.rows[0] ?? null;
}

export async function getStateGovernor(uf: string): Promise<{ username: string; display_name: string; decree: string | null } | null> {
  const res = await db.query<{ username: string; display_name: string; decree: string | null }>(`
    SELECT m.username, h.display_name, d.content as decree
    FROM governance_mandates m
    JOIN houses h ON lower(h.username) = lower(m.username)
    LEFT JOIN governance_decrees d ON d.role_type = 'governador' AND d.scope_uf = $1 AND d.cycle_week = m.cycle_week
    WHERE m.active AND m.role_type = 'governador' AND m.scope_uf = $1
    ORDER BY d.id DESC
    LIMIT 1
  `, [uf]);
  return res.rows[0] ?? null;
}

export async function tallyWeeklyGovernance(): Promise<{
  cycleWeek: string;
  president: string | null;
  governorsCount: number;
  mayorsCount: number;
  sacristansCount: number;
}> {
  const cycleWeek = getCurrentCycleWeek();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123005)');

    // 1. Desativar mandatos anteriores
    await client.query(`UPDATE governance_mandates SET active = false, ended_at = now() WHERE active = true`);
    await client.query(`UPDATE houses SET civil_role = NULL WHERE civil_role IS NOT NULL`);

    const occupiedUsers = new Set<string>();

    // 2. Apuração Presidencial:
    const voteWinnerRes = await client.query<{ candidate_username: string; votes: number }>(`
      SELECT candidate_username, count(*)::int as votes
      FROM presidential_votes
      WHERE cycle_week = $1
      GROUP BY candidate_username
      ORDER BY votes DESC
      LIMIT 1
    `, [cycleWeek]);

    let presidentUsername = voteWinnerRes.rows[0]?.candidate_username;

    if (!presidentUsername) {
      const topXpRes = await client.query<{ username: string }>(`
        SELECT username FROM houses
        WHERE active AND lower(username) <> 'lucasgfr26'
        ORDER BY xp DESC, id ASC
        LIMIT 1
      `);
      presidentUsername = topXpRes.rows[0]?.username;
    }

    if (presidentUsername) {
      const cleanPres = presidentUsername.toLowerCase();
      occupiedUsers.add(cleanPres);
      await client.query(`
        INSERT INTO governance_mandates (cycle_week, role_type, username, score, active)
        VALUES ($1, 'presidente', $2, 0, true)
      `, [cycleWeek, cleanPres]);
      await client.query(`UPDATE houses SET civil_role = 'presidente' WHERE lower(username) = $1`, [cleanPres]);
    }

    // 3. Apuração dos Governadores (por Estado / UF):
    const ufsRes = await client.query<{ uf: string }>(`SELECT DISTINCT m.uf FROM municipalities m JOIN cities c ON c.code = m.code WHERE c.active`);
    let governorsCount = 0;

    for (const { uf } of ufsRes.rows) {
      const candidateRes = await client.query<{ username: string; weekly_score: number }>(`
        SELECT h.username, h.weekly_score
        FROM houses h
        JOIN municipalities m ON m.code = h.city_code
        WHERE m.uf = $1 AND h.active AND lower(h.username) <> 'lucasgfr26'
        ORDER BY h.weekly_score DESC, h.xp DESC, h.id ASC
      `, [uf]);

      const eligibleGov = candidateRes.rows.find(c => !occupiedUsers.has(c.username.toLowerCase()));
      if (eligibleGov) {
        const cleanGov = eligibleGov.username.toLowerCase();
        occupiedUsers.add(cleanGov);
        await client.query(`
          INSERT INTO governance_mandates (cycle_week, role_type, scope_uf, username, score, active)
          VALUES ($1, 'governador', $2, $3, $4, true)
        `, [cycleWeek, uf, cleanGov, eligibleGov.weekly_score]);
        await client.query(`UPDATE houses SET civil_role = 'governador' WHERE lower(username) = $1`, [cleanGov]);
        governorsCount++;
      }
    }

    // 4. Apuração dos Prefeitos (por Cidade / Município):
    const activeCitiesRes = await client.query<{ code: number }>(`SELECT code FROM cities WHERE active`);
    let mayorsCount = 0;
    let sacristansCount = 0;

    for (const { code } of activeCitiesRes.rows) {
      const cityCandidatesRes = await client.query<{ username: string; weekly_score: number; level: number }>(`
        SELECT username, weekly_score, level
        FROM houses
        WHERE city_code = $1 AND active AND lower(username) <> 'lucasgfr26'
        ORDER BY weekly_score DESC, xp DESC, id ASC
      `, [code]);

      const eligibleMayor = cityCandidatesRes.rows.find(c => !occupiedUsers.has(c.username.toLowerCase()));
      if (eligibleMayor) {
        const cleanMayor = eligibleMayor.username.toLowerCase();
        occupiedUsers.add(cleanMayor);
        await client.query(`
          INSERT INTO governance_mandates (cycle_week, role_type, scope_city_code, username, score, active)
          VALUES ($1, 'prefeito', $2, $3, $4, true)
        `, [cycleWeek, code, cleanMayor, eligibleMayor.weekly_score]);
        await client.query(`UPDATE houses SET civil_role = 'prefeito' WHERE lower(username) = $1`, [cleanMayor]);
        mayorsCount++;
      }

      // 5. Apuração dos 5 Sacristãos da Cidade:
      const sacristanEligible = cityCandidatesRes.rows.filter(c => c.level >= 30);
      const top5Sacristans = sacristanEligible.slice(0, 5);

      for (const s of top5Sacristans) {
        const cleanSacristan = s.username.toLowerCase();
        await client.query(`
          INSERT INTO governance_mandates (cycle_week, role_type, scope_city_code, username, score, active)
          VALUES ($1, 'sacristao', $2, $3, $4, true)
        `, [cycleWeek, code, cleanSacristan, s.weekly_score]);
        await client.query(`UPDATE houses SET role = 'sacristao' WHERE lower(username) = $1`, [cleanSacristan]);
        sacristansCount++;
      }
    }

    // Resetar weekly_score das casas
    await client.query(`UPDATE houses SET weekly_score = 0`);

    await client.query('COMMIT');

    return {
      cycleWeek,
      president: presidentUsername ?? null,
      governorsCount,
      mayorsCount,
      sacristansCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// CONSULTA DE MISSÕES DO USUÁRIO
// ==========================================

export async function getUserMissionsStatus(username: string): Promise<{
  houseId: number;
  username: string;
  displayName: string;
  xp: number;
  level: number;
  streakDays: number;
  parishName: string;
  parishId: number;
  cityCode: number;
  cityName: string;
  missions: Record<string, boolean>;
} | null> {
  const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
  if (!cleanUsername) return null;

  const userRes = await db.query<{
    id: number;
    username: string;
    display_name: string;
    city_code: number;
    city_name: string;
    parish_id: number;
    xp: number;
    points: number;
    level: number;
    streak_days: number;
    last_checkin_at: Date | null;
    has_approved_priest: boolean;
    parish_name: string;
  }>(`
    SELECT h.id, h.username, h.display_name, h.city_code, m.name AS city_name, h.parish_id,
           h.xp, h.points, h.level, h.streak_days, h.last_checkin_at,
           p.has_approved_priest, p.name AS parish_name
    FROM houses h
    JOIN parishes p ON p.id = h.parish_id
    JOIN municipalities m ON m.code = h.city_code
    WHERE lower(h.username) = $1 AND h.active
    LIMIT 1
  `, [cleanUsername]);

  if (!userRes.rows.length) return null;

  const house = userRes.rows[0];
  const cycleWeek = getCurrentCycleWeek();

  // 1. Checkin hoje
  const now = new Date();
  let checkedInToday = false;
  if (house.last_checkin_at) {
    const last = new Date(house.last_checkin_at);
    checkedInToday = (now.toDateString() === last.toDateString()) || ((now.getTime() - last.getTime()) < 18 * 60 * 60 * 1000);
  }

  // 2. Intenção de oração hoje
  const intentionRes = await db.query(`
    SELECT 1 FROM prayer_intentions
    WHERE lower(username) = $1 AND created_at >= CURRENT_DATE
    LIMIT 1
  `, [cleanUsername]);
  const intentionToday = intentionRes.rows.length > 0;

  // 3. Voto presidencial na semana atual
  const voteRes = await db.query(`
    SELECT 1 FROM presidential_votes
    WHERE lower(voter_username) = $1 AND cycle_week = $2
    LIMIT 1
  `, [cleanUsername, cycleWeek]);
  const votedThisWeek = voteRes.rows.length > 0;

  // 4. Indicação de amigos que criaram casa
  const referralHouseRes = await db.query(`
    SELECT 1 FROM houses
    WHERE lower(referred_by) = $1 AND active
    LIMIT 1
  `, [cleanUsername]);
  const hasReferredHouse = referralHouseRes.rows.length > 0;

  // 5. Indicação de sacerdote
  const priestReferralRes = await db.query(`
    SELECT 1 FROM gamification_referrals
    WHERE lower(referrer_username) = $1 AND referral_type = 'priest'
    LIMIT 1
  `, [cleanUsername]);
  const hasReferredPriest = priestReferralRes.rows.length > 0;

  // 6. Comentários / atividade recente
  const commentsRes = await db.query(`
    SELECT 1 FROM gamification_referrals
    WHERE lower(referrer_username) = $1
    LIMIT 1
  `, [cleanUsername]);
  const hasCommentActivity = commentsRes.rows.length > 0;

  return {
    houseId: house.id,
    username: house.username,
    displayName: house.display_name,
    xp: house.xp,
    level: house.level,
    streakDays: house.streak_days,
    parishName: house.parish_name,
    parishId: house.parish_id,
    cityCode: house.city_code,
    cityName: house.city_name,
    missions: {
      checkin: checkedInToday,
      intention: intentionToday,
      walk: false,
      comment: hasCommentActivity,
      vote: votedThisWeek,
      matriz_visit: false,
      streak: house.streak_days >= 7,
      referral_house: hasReferredHouse,
      refer_priest: hasReferredPriest,
      priest_verified: house.has_approved_priest,
    }
  };
}
