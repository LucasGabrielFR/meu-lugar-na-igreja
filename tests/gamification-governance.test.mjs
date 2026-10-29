import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevel,
  xpForLevel,
  getLiturgicalRole,
  getHouseVisualStage,
  xpProgressInLevel,
  getCurrentCycleWeek,
} from '../src/lib/gamification-rules.mjs';

test('gamification calculates ecclesiastical levels and XP thresholds correctly', () => {
  // Níveis 1 a 4: Leigo (0 a 199 XP)
  assert.equal(calculateLevel(0), 1);
  assert.equal(calculateLevel(49), 1);
  assert.equal(calculateLevel(50), 2);
  assert.equal(calculateLevel(199), 4);

  // Níveis 5 a 9: Coroinha (200 a 599 XP)
  assert.equal(calculateLevel(200), 5);
  assert.equal(calculateLevel(599), 9);

  // Níveis 10 a 19: Acólito (600 a 1.599 XP)
  assert.equal(calculateLevel(600), 10);
  assert.equal(calculateLevel(1599), 19);

  // Níveis 20 a 24: Cerimoniário (1.600 a 2.399 XP)
  assert.equal(calculateLevel(1600), 20);
  assert.equal(calculateLevel(2399), 24);

  // Níveis 25 a 29: Ministro da Eucaristia (2.400 a 3.199 XP)
  assert.equal(calculateLevel(2400), 25);
  assert.equal(calculateLevel(3199), 29);

  // Nível 30+: Sacristão da Igreja (>= 3.200 XP)
  assert.equal(calculateLevel(3200), 30);
  assert.equal(calculateLevel(3400), 31);
});

test('xpForLevel maps level floor thresholds accurately', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(5), 200);
  assert.equal(xpForLevel(10), 600);
  assert.equal(xpForLevel(20), 1600);
  assert.equal(xpForLevel(25), 2400);
  assert.equal(xpForLevel(30), 3200);
  assert.equal(xpForLevel(31), 3400);
});

test('getLiturgicalRole assigns titles based on level and overrides', () => {
  assert.equal(getLiturgicalRole(1).role, 'leigo');
  assert.equal(getLiturgicalRole(5).role, 'coroinha');
  assert.equal(getLiturgicalRole(10).role, 'acolito');
  assert.equal(getLiturgicalRole(20).role, 'cerimoniario');
  assert.equal(getLiturgicalRole(25).role, 'ministro_eucaristia');
  assert.equal(getLiturgicalRole(30).role, 'sacristao');

  // Overrides especiais
  assert.equal(getLiturgicalRole(99, 'criador').role, 'criador');
  assert.equal(getLiturgicalRole(1, 'padre').role, 'padre');
});

test('getHouseVisualStage handles 5 personal stages and official governance overrides', () => {
  // 5 Estágios Regulares
  assert.equal(getHouseVisualStage(1).stage, 1); // Casinha da Vila
  assert.equal(getHouseVisualStage(5).stage, 2); // Casa Colonial
  assert.equal(getHouseVisualStage(15).stage, 3); // Sobrado Paroquial
  assert.equal(getHouseVisualStage(25).stage, 4); // Solar da Fé
  assert.equal(getHouseVisualStage(30).stage, 5); // Palacete do Sacristão

  // Sobreposições por Cargo Civil (Residências Oficiais)
  const mayorStage = getHouseVisualStage(10, 'prefeito');
  assert.equal(mayorStage.stage, 6);
  assert.equal(mayorStage.isOverride, true);
  assert.match(mayorStage.name, /Prefeitura/);

  const govStage = getHouseVisualStage(10, 'governador');
  assert.equal(govStage.stage, 7);
  assert.equal(govStage.isOverride, true);
  assert.match(govStage.name, /Governadores/);

  const presStage = getHouseVisualStage(10, 'presidente');
  assert.equal(presStage.stage, 8);
  assert.equal(presStage.isOverride, true);
  assert.match(presStage.name, /Presidencial/);

  const creatorStage = getHouseVisualStage(99, null, true);
  assert.equal(creatorStage.stage, 99);
  assert.equal(creatorStage.isOverride, true);
  assert.match(creatorStage.name, /Criador/);
});

test('xpProgressInLevel computes percent within current tier', () => {
  const p = xpProgressInLevel(300); // Nível 6 (piso 280, teto 360, ganho 20 de 80 = 25%)
  assert.equal(p.currentLevel, 6);
  assert.equal(p.nextLevel, 7);
  assert.equal(p.progressPct, 25);
});

test('getCurrentCycleWeek returns standard ISO week format', () => {
  const week = getCurrentCycleWeek(new Date('2026-10-29T12:00:00Z'));
  assert.match(week, /^2026-W\d{2}$/);
});
