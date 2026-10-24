import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
test('database enforces parish/city consistency, profile uniqueness and transaction rollback', {skip:!process.env.PGHOST}, async()=>{
  const client=new pg.Client();
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123003)');
    await client.query('INSERT INTO cities(code) VALUES(5214606),(3550308) ON CONFLICT DO NOTHING');
    const p=(await client.query(`INSERT INTO parishes(city_code,name,slot) SELECT 5214606,'__transaction_test__',COALESCE(MAX(slot)+1,0) FROM parishes WHERE city_code=5214606 RETURNING id`)).rows[0];
    await client.query('SAVEPOINT mismatch');
    await assert.rejects(client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(3550308,$1,'__db_test__','Test',0)`,[p.id]),error=>error.code==='23503');
    await client.query('ROLLBACK TO SAVEPOINT mismatch');
    await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(5214606,$1,'__db_test__','Test',0)`,[p.id]);
    await client.query('SAVEPOINT duplicate');
    await assert.rejects(client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(5214606,$1,'__DB_TEST__','Test',1)`,[p.id]),error=>error.code==='23505');
    await client.query('ROLLBACK TO SAVEPOINT duplicate');
  } finally { await client.query('ROLLBACK'); await client.end(); }
});
