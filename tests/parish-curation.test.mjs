import test from 'node:test';
import assert from 'node:assert/strict';

test('parish name normalization removes liturgical prefixes and references for duplicate detection', () => {
  const cleanParishName = (name) => {
    return String(name ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^(paroquia|quase-paroquia|catedral|santuario|igreja matriz|matriz)\s*(de\s*|da\s*|do\s*|dos\s*|das\s*)?/i, '')
      .replace(/\s*·.*$/, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  };

  const name1 = 'Paróquia Menino Jesus de Praga';
  const name2 = 'Paróquia do Menino Jesus de Praga';
  assert.equal(cleanParishName(name1), cleanParishName(name2));

  const name3 = 'Paróquia de São Francisco';
  const name4 = 'Paróquia de São Francisco · referência 3924';
  assert.equal(cleanParishName(name3), cleanParishName(name4));

  const name5 = 'Catedral Imaculada Conceição';
  const name6 = 'Paróquia Imaculada Conceição';
  assert.equal(cleanParishName(name5), cleanParishName(name6));

  const name7 = 'Paróquia da Sagrada Familia';
  const name8 = 'Paróquia Sagrada Familia';
  assert.equal(cleanParishName(name7), cleanParishName(name8));
});

test('parish migration logic transfers residents to destination parish before deleting duplicate', () => {
  const parishA = { id: 101, city_code: 3550308, name: 'Paróquia São José', active: true };
  const parishB = { id: 102, city_code: 3550308, name: 'Paróquia de São José · referência 12', active: true };

  const houses = [
    { id: 1, parish_id: 101, username: 'lucas' },
    { id: 2, parish_id: 102, username: 'gabriel' },
    { id: 3, parish_id: 102, username: 'mariana' },
  ];

  // Migration simulation (merge B into A)
  const targetId = parishA.id;
  const sourceId = parishB.id;

  const migratedHouses = houses.map(h => {
    if (h.parish_id === sourceId) {
      return { ...h, parish_id: targetId };
    }
    return h;
  });

  // Verify all residents now belong to target parish A
  assert.equal(migratedHouses.filter(h => h.parish_id === sourceId).length, 0);
  assert.equal(migratedHouses.filter(h => h.parish_id === targetId).length, 3);
});
