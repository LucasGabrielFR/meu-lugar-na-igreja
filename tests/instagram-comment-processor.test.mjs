import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {
  matchParishDeterministically,
  extractCommentWithAi,
  processPendingInstagramReceipts,
} from '../scripts/instagram-comment-processor.mjs';
import { encryptInstagramToken } from '../scripts/instagram-oauth.mjs';
import { storeInstagramReceipt } from '../scripts/instagram-webhook.mjs';

test('deterministic parish matcher resolves abbreviations and detects homonymous ambiguity', () => {
  const palhocaParishes = [
    { id: 1, name: 'Paróquia Nossa Senhora do Rosário' },
    { id: 2, name: 'Paróquia São Francisco de Assis' },
    { id: 3, name: 'Paróquia São Judas Tadeu e São João Batista' },
    { id: 4, name: 'Paróquia São Sebastião' },
    { id: 5, name: 'Paróquia Senhor Bom Jesus de Nazaré' },
  ];

  const m1 = matchParishDeterministically('Igreja Matriz Senhor Bom Jesus de Nazaré', palhocaParishes);
  assert.equal(m1.status, 'matched');
  assert.equal(m1.parish.id, 5);

  const m2 = matchParishDeterministically('Paróquia N. Sra. do Rosário', palhocaParishes);
  assert.equal(m2.status, 'matched');
  assert.equal(m2.parish.id, 1);

  const m3 = matchParishDeterministically('Paróquia São Judas Tadeu', palhocaParishes);
  assert.equal(m3.status, 'matched');
  assert.equal(m3.parish.id, 3);

  const homonyms = [
    { id: 10, name: 'Paróquia Santo Antônio - Centro' },
    { id: 11, name: 'Paróquia Santo Antônio - Pari' },
  ];
  const m4 = matchParishDeterministically('Paróquia Santo Antônio', homonyms);
  assert.equal(m4.status, 'ambiguous');
  assert.equal(m4.candidates.length, 2);
});

test('OpenRouter AI extraction parses parish/city/uf and produces respectful Catholic fun reply when incomplete', async () => {
  const env = { OPENROUTER_API_KEY: 'test-or-key', OPENROUTER_MODEL: 'openai/gpt-4o-mini' };
  const fetcher = async (url, init) => {
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'openai/gpt-4o-mini');
    const userPayload = JSON.parse(body.messages[1].content);
    if (userPayload.comment.includes('Amém')) {
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              understood: false,
              city: null,
              uf: null,
              parish: null,
              display_name: null,
              reply_message: 'Paz e Bem, @fiel_catolico! ⛪🙏 Nosso coroinha já separou os tijolos, mas faltou você comentar sua Paróquia, Cidade e Estado (UF)!',
            }),
          },
        }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            understood: true,
            city: 'Palhoça',
            uf: 'SC',
            parish: 'Paróquia Senhor Bom Jesus de Nazaré',
            display_name: 'João Católico',
            reply_message: null,
          }),
        },
      }],
    }), { status: 200 });
  };

  const incomplete = await extractCommentWithAi('Amém! Que lindo esse mapa!', 'fiel_catolico', env, fetcher);
  assert.equal(incomplete.understood, false);
  assert.ok(incomplete.reply_message.includes('Paz e Bem'));

  const complete = await extractCommentWithAi('Sou o João da Bom Jesus de Nazaré em Palhoça', 'fiel_catolico', env, fetcher);
  assert.equal(complete.understood, true);
  assert.equal(complete.city, 'Palhoça');
  assert.equal(complete.uf, 'SC');
  assert.equal(complete.parish, 'Paróquia Senhor Bom Jesus de Nazaré');
});

test('webhook processor creates/updates house, ignores self/test comments, and replies on inconsistencies', { skip: !process.env.PGHOST }, async () => {
  const client = new pg.Client();
  await client.connect();
  const encryptionKey = 'a'.repeat(64);
  const env = {
    OPENROUTER_API_KEY: 'test-or-key',
    OPENROUTER_MODEL: 'openai/gpt-4o-mini',
    INSTAGRAM_TOKEN_ENCRYPTION_KEY: encryptionKey,
    INSTAGRAM_API_VERSION: 'v26.0',
  };

  const repliesSent = [];
  const fetcher = async (url, init) => {
    const urlStr = String(url);
    if (urlStr === 'https://openrouter.ai/api/v1/chat/completions') {
      const reqBody = JSON.parse(init.body);
      const userContent = JSON.parse(reqBody.messages[1].content);
      if (userContent.available_parishes) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                status: 'parish_not_found',
                matched_parish_id: null,
                reply_message: 'Paz e Bem, @maria_devota! ⛪ Demos três pulinhos pra São Longuinho, mas não achamos a Paróquia Santa Engrácia de Marte em Palhoça/SC! Confere o nome oficial pra gente!',
              }),
            },
          }],
        }), { status: 200 });
      }
      if (userContent.comment.includes('Salve Maria')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                understood: false,
                city: null,
                uf: null,
                parish: null,
                reply_message: 'Salve Maria, @pedro_fiel! 🙏⛪ Nosso anjo construtor precisa saber sua Paróquia, Cidade e Estado (UF) pra levantar sua casinha no mapa!',
              }),
            },
          }],
        }), { status: 200 });
      }
      if (userContent.comment.includes('Santa Engrácia de Marte')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                understood: true,
                city: 'Palhoça',
                uf: 'SC',
                parish: 'Paróquia Santa Engrácia de Marte',
                reply_message: null,
              }),
            },
          }],
        }), { status: 200 });
      }
      if (userContent.comment.includes('São Sebastião')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                understood: true,
                city: 'Palhoça',
                uf: 'SC',
                parish: 'Paróquia São Sebastião',
                reply_message: null,
              }),
            },
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              understood: true,
              city: 'Palhoça',
              uf: 'SC',
              parish: 'Paróquia Senhor Bom Jesus de Nazaré',
              reply_message: null,
            }),
          },
        }],
      }), { status: 200 });
    }

    if (urlStr.startsWith('https://graph.instagram.com/v26.0/') && urlStr.endsWith('/replies')) {
      const params = new URLSearchParams(init.body.toString());
      repliesSent.push({ url: urlStr, message: params.get('message'), auth: init.headers.Authorization });
      return new Response(JSON.stringify({ id: 'reply_' + repliesSent.length }), { status: 200 });
    }
    throw new Error('Unexpected URL: ' + urlStr);
  };

  try {
    await client.query('BEGIN');
    await client.query("UPDATE instagram_webhook_receipts SET status = 'ignored' WHERE status IN ('received', 'failed')");
    const adminId = (await client.query('SELECT id FROM admins LIMIT 1')).rows[0].id;
    await client.query('DELETE FROM instagram_connections');
    await client.query(
      `INSERT INTO instagram_connections(account_id, username, display_name, account_type, token_ciphertext, expires_at, connected_by)
       VALUES ('17841473427552380', 'meu_lugar_na_igreja', 'Meu Lugar na Igreja', 'BUSINESS', $1, now() + interval '30 days', $2)`,
      [encryptInstagramToken('ig_secret_token_test', encryptionKey), adminId]
    );

    const payload = {
      object: 'instagram',
      entry: [
        {
          id: '0',
          changes: [{ field: 'comments', value: { id: '17865799348089039', text: 'This is an example.', from: { id: '232323232', username: 'test' } } }],
        },
        {
          id: '17841473427552380',
          changes: [
            { field: 'comments', value: { id: 'c_self_1', text: 'Paz e Bem!', from: { id: '17841473427552380', username: 'meu_lugar_na_igreja' } } },
            { field: 'comments', value: { id: 'c_valid_1', text: 'Sou da Paróquia Senhor Bom Jesus de Nazaré em Palhoça - SC', from: { id: '900001', username: 'lucas_fiel' } } },
            { field: 'comments', value: { id: 'c_update_1', text: 'Mudei para a Paróquia São Sebastião em Palhoça - SC', from: { id: '900001', username: 'lucas_fiel_novo' } } },
            { field: 'comments', value: { id: 'c_unclear_1', text: 'Salve Maria! Que projeto abençoado!', from: { id: '900002', username: 'pedro_fiel' } } },
            { field: 'comments', value: { id: 'c_missing_parish_1', text: 'Paróquia Santa Engrácia de Marte em Palhoça - SC', from: { id: '900003', username: 'maria_devota' } } },
          ],
        },
      ],
    };

    const raw = JSON.stringify(payload);
    await storeInstagramReceipt(client, Buffer.from(raw), payload);

    const summary = await processPendingInstagramReceipts(client, env, fetcher);
    assert.equal(summary.receiptsProcessed, 1);
    assert.equal(summary.housesCreated, 1);
    assert.equal(summary.housesUpdated, 1);
    assert.equal(summary.repliesSent, 2);
    assert.equal(summary.ignored, 2);
    assert.equal(summary.errors, 0);

    const houseRows = (await client.query("SELECT * FROM houses WHERE instagram_user_id = '900001'")).rows;
    assert.equal(houseRows.length, 1);
    assert.equal(houseRows[0].username, 'lucas_fiel_novo');
    assert.equal(houseRows[0].city_code, 4211900);

    const parishRow = (await client.query('SELECT name FROM parishes WHERE id = $1', [houseRows[0].parish_id])).rows[0];
    assert.ok(parishRow.name.startsWith('Paróquia São Sebastião'));

    assert.equal(repliesSent.length, 2);
    assert.ok(repliesSent[0].url.includes('/c_unclear_1/replies'));
    assert.ok(repliesSent[0].message.includes('Salve Maria, @pedro_fiel'));
    assert.ok(repliesSent[1].url.includes('/c_missing_parish_1/replies'));
    assert.ok(repliesSent[1].message.includes('São Longuinho'));
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

