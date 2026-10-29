// ==========================================
// 1. PROGRESSÃO DE NÍVEIS E XP
// ==========================================

export function calculateLevel(xp) {
  if (xp <= 0) return 1;
  if (xp < 200) {
    // Nível 1 a 4 (50 XP por nível)
    return Math.min(4, Math.floor(xp / 50) + 1);
  }
  if (xp < 600) {
    // Nível 5 a 9 (80 XP por nível entre 200 e 599)
    return Math.min(9, 5 + Math.floor((xp - 200) / 80));
  }
  if (xp < 1600) {
    // Nível 10 a 19 (100 XP por nível entre 600 e 1599)
    return Math.min(19, 10 + Math.floor((xp - 600) / 100));
  }
  if (xp < 2400) {
    // Nível 20 a 24 (160 XP por nível entre 1600 e 2399)
    return Math.min(24, 20 + Math.floor((xp - 1600) / 160));
  }
  if (xp < 3200) {
    // Nível 25 a 29 (160 XP por nível entre 2400 e 3199)
    return Math.min(29, 25 + Math.floor((xp - 2400) / 160));
  }
  // Nível 30+ (200 XP por nível adicional a partir de 3200)
  return 30 + Math.floor((xp - 3200) / 200);
}

export function xpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 4) return (level - 1) * 50;
  if (level <= 9) return 200 + (level - 5) * 80;
  if (level <= 19) return 600 + (level - 10) * 100;
  if (level <= 24) return 1600 + (level - 20) * 160;
  if (level <= 29) return 2400 + (level - 25) * 160;
  return 3200 + (level - 30) * 200;
}

export function xpProgressInLevel(xp) {
  const currentLevel = calculateLevel(xp);
  const currentLevelFloor = xpForLevel(currentLevel);
  const nextLevelFloor = xpForLevel(currentLevel + 1);
  const xpNeeded = nextLevelFloor - currentLevelFloor;
  const xpEarned = xp - currentLevelFloor;
  const progressPct = xpNeeded > 0 ? Math.min(100, Math.max(0, Math.round((xpEarned / xpNeeded) * 100))) : 100;

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    currentXp: xp,
    xpEarnedInLevel: xpEarned,
    xpNeededInLevel: xpNeeded,
    progressPct,
  };
}

// ==========================================
// 2. PAPÉIS E CARGOS LITÚRGICOS
// ==========================================

export function getLiturgicalRole(level, roleOverride) {
  if (roleOverride === 'criador' || level >= 99) {
    return {
      role: 'criador',
      title: 'Criador da Plataforma',
      badge: '👑 Criador',
      icon: '👑',
      description: 'Fundador supremo do Meu Lugar na Igreja e guardião de todas as comunidades paroquiais.',
    };
  }
  if (roleOverride === 'padre') {
    return {
      role: 'padre',
      title: 'Pároco / Sacerdote',
      badge: '✝️ Pároco',
      icon: '✝️',
      description: 'Pastor e guia espiritual entronizado na Igreja Matriz, responsável pelas bênçãos paroquiais.',
    };
  }
  if (roleOverride === 'sacristao' || level >= 30) {
    return {
      role: 'sacristao',
      title: 'Sacristão da Igreja',
      badge: '🗝️ Sacristão',
      icon: '🗝️',
      description: 'Guardião das chaves do templo sagrado e zelador maior da casa de Deus.',
    };
  }
  if (level >= 25) {
    return {
      role: 'ministro_eucaristia',
      title: 'Ministro da Eucaristia',
      badge: '🕊️ Ministro',
      icon: '🕊️',
      description: 'Fiel veterano com missão de levar o Santíssimo Sacramento aos irmãos.',
    };
  }
  if (level >= 20) {
    return {
      role: 'cerimoniario',
      title: 'Cerimoniário',
      badge: '📜 Cerimoniário',
      icon: '📜',
      description: 'Mestre solene das celebrações e organizador das grandes procissões da fé.',
    };
  }
  if (level >= 10) {
    return {
      role: 'acolito',
      title: 'Acólito',
      badge: '🕯️ Acólito',
      icon: '🕯️',
      description: 'Dedicado ao serviço sagrado do altar e das velas em todas as missas.',
    };
  }
  if (level >= 5) {
    return {
      role: 'coroinha',
      title: 'Coroinha',
      badge: '🔔 Coroinha',
      icon: '🔔',
      description: 'Auxiliar das celebrações litúrgicas e tocador do sino do presbitério.',
    };
  }
  return {
    role: 'leigo',
    title: 'Leigo Fiel',
    badge: '🌿 Leigo',
    icon: '🌿',
    description: 'Membro fraterno da comunidade, participando com fé e caridade no bairro paroquial.',
  };
}

// ==========================================
// 3. ESTÁGIOS VISUAIS DA CASA NO MAPA
// ==========================================

export function getHouseVisualStage(level, civilRole, isCreator) {
  if (isCreator) {
    return {
      stage: 99,
      name: 'Castelo do Criador',
      subtitle: 'Sede Insular de Honra',
      description: 'Construção privativa do Criador com torres douradas e grande coroa de rubi.',
      isOverride: true,
      flag: '👑',
    };
  }
  if (civilRole === 'presidente') {
    return {
      stage: 8,
      name: 'Palácio Presidencial da República',
      subtitle: 'Residência Oficial do Presidente do Brasil',
      description: 'Majestosa construção de prestígio nacional com espelho d’água, colunata imponente e a Bandeira do Brasil.',
      isOverride: true,
      flag: '🇧🇷',
    };
  }
  if (civilRole === 'governador') {
    return {
      stage: 7,
      name: 'Palácio dos Governadores',
      subtitle: 'Sede Oficial do Governador do Estado',
      description: 'Suntuoso palácio estadual com escadaria nobre, iluminação noturna e o estandarte do Estado.',
      isOverride: true,
      flag: '🏛️',
    };
  }
  if (civilRole === 'prefeito') {
    return {
      stage: 6,
      name: 'Palacete Municipal da Prefeitura',
      subtitle: 'Gabinete do Prefeito da Cidade',
      description: 'Mansão neoclássica nobre com mastro da bandeira municipal e calçada em mosaico.',
      isOverride: true,
      flag: '🏙️',
    };
  }

  // Estágios regulares por nível pessoal
  if (level >= 30) {
    return {
      stage: 5,
      name: 'Palacete do Sacristão',
      subtitle: 'Nível 30+ · Elite Paroquial',
      description: 'Palacete histórico colonial com oratório iluminado no muro, estandarte dourado e chaves de ouro.',
      isOverride: false,
    };
  }
  if (level >= 25) {
    return {
      stage: 4,
      name: 'Solar da Fé',
      subtitle: 'Nível 25–29 · Tradicional',
      description: 'Casa ampla senhorial, muro de pedras com portão de ferro e cruzeiro de madeira no quintal.',
      isOverride: false,
    };
  }
  if (level >= 15) {
    return {
      stage: 3,
      name: 'Sobrado Paroquial',
      subtitle: 'Nível 15–24 · Sobrado',
      description: 'Sobrado de dois pavimentos com varanda de ferro batido e lampião aceso na entrada.',
      isOverride: false,
    };
  }
  if (level >= 5) {
    return {
      stage: 2,
      name: 'Casa Colonial',
      subtitle: 'Nível 5–14 · Alvenaria',
      description: 'Alvenaria caiada de branco com janelas azuis coloniais, calçada de pedra e jardim florido.',
      isOverride: false,
    };
  }
  return {
    stage: 1,
    name: 'Casinha da Vila',
    subtitle: 'Nível 1–4 · Inicial',
    description: 'Casa rústica em madeira e telha cerâmica tradicional em lote gramado acolhedor.',
    isOverride: false,
  };
}

// ==========================================
// 4. CICLO ELEITORAL E SEMANAL
// ==========================================

export function getCurrentCycleWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isElectionWindowOpen(date = new Date()) {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}
