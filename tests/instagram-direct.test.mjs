import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDirectResponse, sendInstagramDirectMessage, processIncomingDirectMessage } from '../scripts/instagram-direct.mjs';

test('generateDirectResponse awards 100 points and 100 XP on first follow trigger', () => {
  const result = generateDirectResponse({ text: 'Segui', isFirstFollow: true, totalPoints: 100, totalXp: 100 });
  assert.equal(result.points, 100);
  assert.equal(result.xp, 100);
  assert.ok(result.reply.includes('+100 pontos e +100 XP'));
  assert.ok(result.reply.includes('Meu Lugar na Igreja'));
});

test('generateDirectResponse prevents duplicate points when user already followed', () => {
  const result = generateDirectResponse({ text: 'segui de novo', isFirstFollow: false, totalPoints: 100, totalXp: 100 });
  assert.equal(result.points, 0);
  assert.equal(result.xp, 0);
  assert.ok(result.reply.includes('Você já garantiu'));
  assert.ok(result.reply.includes('100 Pontos'));
});

test('generateDirectResponse gives welcoming instructions for unknown text', () => {
  const result = generateDirectResponse({ text: 'Como funciona?', isFirstFollow: false, totalPoints: 0, totalXp: 0 });
  assert.equal(result.points, 0);
  assert.equal(result.xp, 0);
  assert.ok(result.reply.includes('Envie "Segui"'));
});

test('sendInstagramDirectMessage sends formatted POST to Instagram messages endpoint', async () => {
  let calledUrl = null;
  let calledBody = null;
  let calledHeaders = null;

  const mockFetcher = async (url, options) => {
    calledUrl = String(url);
    calledHeaders = options.headers;
    calledBody = JSON.parse(options.body);
    return Response.json({ recipient_id: 'user_123', message_id: 'm_mid_abc' });
  };

  const res = await sendInstagramDirectMessage('test-token', 'user_123', 'Mensagem de teste', 'v26.0', mockFetcher);
  assert.equal(res.ok, true);
  assert.equal(calledUrl, 'https://graph.instagram.com/v26.0/me/messages');
  assert.equal(calledHeaders.Authorization, 'Bearer test-token');
  assert.equal(calledBody.recipient.id, 'user_123');
  assert.equal(calledBody.message.text, 'Mensagem de teste');
});

test('processIncomingDirectMessage ignores echoes and updates profiles safely', async () => {
  const queries = [];
  const mockClient = {
    query: async (sql, params) => {
      queries.push({ sql: String(sql).trim(), params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rowCount: 1 };
      if (sql.includes('SELECT id FROM instagram_direct_messages')) return { rowCount: 0, rows: [] };
      if (sql.includes('SELECT points, xp FROM participant_profiles')) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [{ id: 1 }] };
    }
  };

  const echoResult = await processIncomingDirectMessage(mockClient, {
    sender: { id: 'u1' },
    message: { mid: 'm1', text: 'oi', is_echo: true }
  }, 'token');
  assert.equal(echoResult.ignored, true);

  let sent = false;
  const mockFetcher = async () => {
    sent = true;
    return Response.json({ recipient_id: 'u1' });
  };

  const normalResult = await processIncomingDirectMessage(mockClient, {
    sender: { id: 'u1' },
    recipient: { id: 'bot' },
    message: { mid: 'm2', text: 'Segui' }
  }, 'token', 'v26.0', console, mockFetcher);

  assert.equal(normalResult.success, true);
  assert.equal(normalResult.points, 100);
  assert.equal(normalResult.xp, 100);
  assert.equal(sent, true);
});
