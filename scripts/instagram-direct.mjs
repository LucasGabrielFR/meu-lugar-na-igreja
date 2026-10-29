export function generateDirectResponse({ text, isFirstFollow, totalPoints, totalXp }) {
  const normalized = (text ?? '').toLowerCase().trim();
  const isFollowTrigger = /(^|\b)(segui|seguindo|seguir|seguidor|follow)(\b|$)/i.test(normalized);

  if (isFollowTrigger) {
    if (isFirstFollow) {
      return {
        reply: '✅ Valeu por seguir! +100 pontos e +100 XP 🎉\n\nBem-vindo(a) ao Meu Lugar na Igreja! Sua presença fortalece nossa comunidade paroquial.',
        points: 100,
        xp: 100
      };
    }
    return {
      reply: `🙌 Você já garantiu os +100 pontos de seguidor!\n\nSeu saldo atual: 🌟 ${totalPoints} Pontos | ⚡ ${totalXp} XP.\nContinue interagindo para conquistar novas posições no mapa paroquial!`,
      points: 0,
      xp: 0
    };
  }

  return {
    reply: 'Olá! Paz e bem! ⛪✨\n\nVocê está no canal oficial do Meu Lugar na Igreja.\nEnvie "Segui" para confirmar que você segue nossa página e garantir seus primeiros +100 pontos e +100 XP na comunidade!',
    points: 0,
    xp: 0
  };
}

export async function sendInstagramDirectMessage(token, recipientId, text, version = 'v26.0', fetcher = fetch) {
  if (!token || !recipientId || !text) return { ok: false, error: 'missing_params' };
  const url = `https://graph.instagram.com/${version}/me/messages`;
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function processIncomingDirectMessage(client, messageEvent, token, version = 'v26.0', logger = console, fetcher = fetch) {
  const senderId = messageEvent.sender?.id;
  const recipientId = messageEvent.recipient?.id;
  const message = messageEvent.message;

  if (!senderId || !message || message.is_echo) {
    return { ignored: true };
  }

  const messageId = message.mid;
  const incomingText = String(message.text || '').trim();

  await client.query('BEGIN');
  try {
    if (messageId) {
      const existing = await client.query('SELECT id FROM instagram_direct_messages WHERE message_id = $1', [messageId]);
      if (existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return { duplicate: true };
      }
    }

    let profile = (await client.query(
      'SELECT points, xp FROM participant_profiles WHERE instagram_scoped_id = $1 FOR UPDATE',
      [senderId]
    )).rows[0];

    let isFirstFollow = false;
    if (!profile) {
      isFirstFollow = true;
      profile = { points: 0, xp: 0 };
      await client.query(
        'INSERT INTO participant_profiles(instagram_scoped_id, points, xp) VALUES($1, 0, 0)',
        [senderId]
      );
    } else {
      const pastFollow = await client.query(
        "SELECT id FROM instagram_direct_messages WHERE sender_id = $1 AND points_awarded > 0 LIMIT 1",
        [senderId]
      );
      isFirstFollow = pastFollow.rowCount === 0;
    }

    const { reply, points, xp } = generateDirectResponse({
      text: incomingText,
      isFirstFollow,
      totalPoints: profile.points + (isFirstFollow ? 100 : 0),
      totalXp: profile.xp + (isFirstFollow ? 100 : 0)
    });

    if (points > 0 || xp > 0) {
      await client.query(
        'UPDATE participant_profiles SET points = points + $1, xp = xp + $2, last_active_at = now() WHERE instagram_scoped_id = $3',
        [points, xp, senderId]
      );
    } else {
      await client.query(
        'UPDATE participant_profiles SET last_active_at = now() WHERE instagram_scoped_id = $1',
        [senderId]
      );
    }

    await client.query(
      `INSERT INTO instagram_direct_messages(sender_id, recipient_id, message_id, incoming_text, response_text, points_awarded, xp_awarded, sent_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, now())`,
      [senderId, recipientId, messageId, incomingText, reply, points, xp]
    );

    await client.query('COMMIT');

    let sendResult = null;
    if (token) {
      sendResult = await sendInstagramDirectMessage(token, senderId, reply, version, fetcher);
      logger.info?.('instagram_direct_reply_sent', { senderId, ok: sendResult.ok });
    }

    return { success: true, points, xp, reply, sendResult };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error?.('process_direct_message_error', error);
    throw error;
  }
}
