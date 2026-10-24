import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(78123002)');
  for (const [code, names] of [
    [5214606, ['Nossa Senhora da Abadia', 'Comunidade São Francisco (demonstração)']],
    [3550308, ['Paróquia de demonstração • São Paulo']],
    [3304557, ['Paróquia de demonstração • Rio de Janeiro']],
    [2927408, ['Paróquia de demonstração • Salvador']],
  ]) {
    await client.query('INSERT INTO cities(code,description) VALUES($1,$2) ON CONFLICT DO NOTHING', [code, 'Cidade de demonstração. Cadastros ilustrativos, sem confirmação institucional.']);
    for (const name of names) {
      let parish = (await client.query('SELECT id FROM parishes WHERE city_code=$1 AND lower(name)=lower($2)', [code, name])).rows[0];
      if (!parish) parish = (await client.query('INSERT INTO parishes(city_code,name,slot,description) SELECT $1,$2,COALESCE(MAX(slot)+1,0),$3 FROM parishes WHERE city_code=$1 RETURNING id', [code, name, 'Cadastro de demonstração.'])).rows[0];
      for (let i = 0; i < 24; i++) {
        const username = `demo_${code}_${parish.id}_${i}`;
        await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot,color)
          SELECT $1,$2,$3,$4,COALESCE(MAX(slot)+1,0),$5 FROM houses WHERE parish_id=$2
          ON CONFLICT DO NOTHING`, [code, parish.id, username, `Morador exemplo ${i + 1}`, ['#c97653','#e4b65d','#7b9986','#9aaabe'][i % 4]]);
      }
    }
  }
  await client.query('COMMIT');
  console.log('Demonstration data ready. No real Instagram profiles imported.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
