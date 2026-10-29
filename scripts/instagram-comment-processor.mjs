import { createHash } from 'node:crypto';
import { normalizeCatalogName } from './catalog-normalization.mjs';
import { decryptInstagramToken } from './instagram-oauth.mjs';

const HOUSE_PALETTE = ['#cc7850', '#d48c46', '#6b8f71', '#5b7c99', '#b85d5d', '#c99b3b', '#8c6d9c'];

const STATE_MAP = new Map([
  ['rondonia', 'RO'], ['ro', 'RO'],
  ['acre', 'AC'], ['ac', 'AC'],
  ['amazonas', 'AM'], ['am', 'AM'],
  ['roraima', 'RR'], ['rr', 'RR'],
  ['para', 'PA'], ['pa', 'PA'],
  ['amapa', 'AP'], ['ap', 'AP'],
  ['tocantins', 'TO'], ['to', 'TO'],
  ['maranhao', 'MA'], ['ma', 'MA'],
  ['piaui', 'PI'], ['pi', 'PI'],
  ['ceara', 'CE'], ['ce', 'CE'],
  ['rio grande do norte', 'RN'], ['rn', 'RN'],
  ['paraiba', 'PB'], ['pb', 'PB'],
  ['pernambuco', 'PE'], ['pe', 'PE'],
  ['alagoas', 'AL'], ['al', 'AL'],
  ['sergipe', 'SE'], ['se', 'SE'],
  ['bahia', 'BH_STATE_NO'], ['bahia', 'BA'], ['ba', 'BA'],
  ['minas gerais', 'MG'], ['minas', 'MG'], ['mg', 'MG'],
  ['espirito santo', 'ES'], ['es', 'ES'],
  ['rio de janeiro', 'RJ'], ['rj', 'RJ'],
  ['sao paulo', 'SP'], ['sp', 'SP'],
  ['parana', 'PR'], ['pr', 'PR'],
  ['santa catarina', 'SC'], ['sc', 'SC'],
  ['rio grande do sul', 'RS'], ['rs', 'RS'],
  ['mato grosso do sul', 'MS'], ['ms', 'MS'],
  ['mato grosso', 'MT'], ['mt', 'MT'],
  ['goias', 'GO'], ['go', 'GO'],
  ['distrito federal', 'DF'], ['df', 'DF'], ['brasilia', 'DF'],
]);

const STOPWORDS = new Set([
  'paroquia', 'igreja', 'matriz', 'santuario', 'catedral', 'basilica', 'menor',
  'arquidiocesana', 'arquidiocesano', 'diocesana', 'diocesano', 'capela',
  'comunidade', 'quase', 'area', 'pastoral', 'reitoria', 'paroquial',
  'de', 'da', 'do', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'ao', 'a', 'o',
]);

export function normalizeUf(value) {
  if (!value) return null;
  const norm = normalizeCatalogName(value);
  return STATE_MAP.get(norm) ?? null;
}

export function parishCoreTokens(value) {
  const expanded = String(value ?? '')
    .replace(/\b(?:n\.?\s*sra\.?|nsa\.?\s*sra\.?|n\.?\s*s\.?)\b/gi, 'nossa senhora')
    .replace(/\bsta\.?\b/gi, 'santa')
    .replace(/\bsto\.?\b/gi, 'santo')
    .replace(/\bs\.?\s+(?=[a-zà-ú])/gi, 'sao ')
    .replace(/\bpe\.?\b/gi, 'padre')
    .replace(/\bsr\.?\b/gi, 'senhor')
    .replace(/\bsra\.?\b/gi, 'senhora');
  const norm = normalizeCatalogName(expanded).replace(/\bd abadia\b/g, 'da abadia');
  return norm.split(/\s+/).filter(token => token.length > 1 && !STOPWORDS.has(token));
}

export function parishCoreIdentity(value) {
  return parishCoreTokens(value).join(' ');
}

export function matchParishDeterministically(parishQuery, parishes) {
  if (!parishQuery || !Array.isArray(parishes) || !parishes.length) {
    return { status: 'not_found', candidates: [] };
  }
  const queryNorm = normalizeCatalogName(parishQuery);
  const queryCore = parishCoreIdentity(parishQuery);
  const queryTokens = parishCoreTokens(parishQuery);
  if (!queryTokens.length) {
    return { status: 'not_found', candidates: [] };
  }

  const exactNorm = parishes.filter(p => normalizeCatalogName(p.name) === queryNorm);
  if (exactNorm.length === 1) return { status: 'matched', parish: exactNorm[0], candidates: exactNorm };

  const exactCore = parishes.filter(p => parishCoreIdentity(p.name) === queryCore);
  if (exactCore.length === 1) return { status: 'matched', parish: exactCore[0], candidates: exactCore };
  if (exactCore.length > 1) return { status: 'ambiguous', candidates: exactCore };

  const tokenMatches = parishes.filter(p => {
    const pTokens = new Set(parishCoreTokens(p.name));
    if (!pTokens.size) return false;
    return queryTokens.every(t => pTokens.has(t));
  });
  if (tokenMatches.length === 1) return { status: 'matched', parish: tokenMatches[0], candidates: tokenMatches };
  if (tokenMatches.length > 1) return { status: 'ambiguous', candidates: tokenMatches };

  const reverseTokenMatches = parishes.filter(p => {
    const pTokens = parishCoreTokens(p.name);
    if (pTokens.length < 2) return false;
    const qSet = new Set(queryTokens);
    return pTokens.every(t => qSet.has(t));
  });
  if (reverseTokenMatches.length === 1) return { status: 'matched', parish: reverseTokenMatches[0], candidates: reverseTokenMatches };
  if (reverseTokenMatches.length > 1) return { status: 'ambiguous', candidates: reverseTokenMatches };

  const partialMatches = parishes.filter(p => {
    const pTokens = new Set(parishCoreTokens(p.name));
    const overlap = queryTokens.filter(t => pTokens.has(t)).length;
    return overlap >= Math.max(1, Math.ceil(queryTokens.length * 0.6));
  });
  return { status: 'not_found', candidates: partialMatches };
}

export function buildFallbackCatholicReply(kind, { username, city, uf, parish, candidates = [] } = {}) {
  const handle = username ? `@${username.replace(/^@/, '')}` : 'irmão(ã)';
  const location = city ? (uf ? `${city}/${uf}` : city) : '';
  if (kind === 'not_understood') {
    return `Paz e Bem, ${handle}! ⛪🙏 Nosso anjo construtor já separou os tijolos, mas faltou o endereço completo! Comenta aqui o nome da sua Paróquia, Cidade e Estado (UF) pra erguermos sua casinha no mapa!`;
  }
  if (kind === 'city_not_found') {
    return `Salve Maria, ${handle}! ⛪🧭 Demos três pulinhos pra São Longuinho, mas ficamos na dúvida sobre a cidade${location ? ` (${location})` : ''}! Comenta novamente informando Paróquia + Cidade + Sigla do Estado (ex.: Palhoça - SC)!`;
  }
  if (kind === 'parish_ambiguous') {
    const sample = candidates.slice(0, 3).map(c => c.name).join('; ');
    return `Paz e Bem, ${handle}! ⛪✨ Que bênção! Em ${location} temos mais de uma paróquia parecida (${sample}). Comenta pra gente o nome completo ou o bairro da sua paróquia pra construirmos sua casa no lugar certinho!`;
  }
  return `Paz e Bem, ${handle}! ⛪🙏 Procuramos até no livro de tombo da sacristia, mas não encontramos a "${parish || 'sua paróquia'}" em ${location || 'sua cidade'} no mapa! Confere se ela tem outro nome oficial ou bairro e comenta aqui pra gente!`;
}

export function extractCommentFallback(commentText, username) {
  const text = String(commentText ?? '').trim();
  if (!text) {
    return {
      understood: false,
      city: null,
      uf: null,
      parish: null,
      display_name: null,
      reply_message: buildFallbackCatholicReply('not_understood', { username }),
    };
  }
  let uf = null;
  const ufMatch = text.match(/(?:[-–—/,]|\bem\b)\s*([A-Za-z]{2})\b\s*[.!🙏⛪❤️]*$/i);
  if (ufMatch) {
    uf = normalizeUf(ufMatch[1]);
  }
  const parishMatch = text.match(/\b((?:par[oó]quia|catedral|santu[aá]rio|bas[ií]lica|igreja\s+matriz|igreja|capela)\s+[^,.;\n—–-]+?)(?=\s*(?:[-–—/,]|\bem\b|\bna\s+cidade\b|$))/i);
  let parish = parishMatch ? parishMatch[1].trim() : null;
  let city = null;

  if (parishMatch) {
    const remainder = text.slice(parishMatch.index + parishMatch[0].length).replace(/^[\s,.;—–-]+/, '').replace(/^(?:em|de|na cidade de|cidade:?)\s+/i, '');
    const cleaned = remainder.replace(/(?:[-–—/,]|\s+)\s*[A-Za-z]{2}\s*[.!🙏⛪❤️]*$/, '').replace(/[.!🙏⛪❤️]+$/, '').trim();
    if (cleaned && cleaned.length >= 2 && cleaned.length <= 60) {
      city = cleaned;
    }
  } else {
    const parts = text.split(/\s*(?:[-–—/|;]|,)\s*/).map(p => p.replace(/[.!🙏⛪❤️]+$/g, '').trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastUf = normalizeUf(parts[parts.length - 1]);
      if (lastUf && parts.length >= 3) {
        uf = lastUf;
        city = parts[parts.length - 2];
        parish = parts.slice(0, -2).join(' - ');
      } else if (lastUf && parts.length === 2) {
        uf = lastUf;
        city = parts[0];
      } else {
        parish = parts[0];
        city = parts[1];
        const trailingUf = city.match(/^(.+?)\s+([A-Za-z]{2})$/);
        if (trailingUf && normalizeUf(trailingUf[2])) {
          city = trailingUf[1].trim();
          uf = normalizeUf(trailingUf[2]);
        }
      }
    }
  }

  const understood = Boolean(parish && city);
  return {
    understood,
    city: city || null,
    uf: uf || null,
    parish: parish || null,
    display_name: null,
    reply_message: understood ? null : buildFallbackCatholicReply('not_understood', { username, city, uf, parish }),
  };
}

async function callOpenRouterJson(messages, env = process.env, fetcher = fetch) {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  const model = env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
  const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.APP_URL || 'https://meulugarnaigreja.acutistech.com.br',
      'X-Title': 'Meu Lugar na Igreja - AcutisTech',
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      max_tokens: 380,
      response_format: { type: 'json_object' },
      messages,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`openrouter_http_${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('openrouter_empty');
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export async function extractCommentWithAi(commentText, username, env = process.env, fetcher = fetch) {
  const fallback = extractCommentFallback(commentText, username);
  if (!env.OPENROUTER_API_KEY?.trim()) return fallback;
  try {
    const parsed = await callOpenRouterJson([
      {
        role: 'system',
        content: [
          'Você é o assistente católico do projeto "Meu Lugar na Igreja" (AcutisTech).',
          'Sua tarefa é ler um comentário feito no Instagram e extrair: qual é a Paróquia, a Cidade (município brasileiro) e o Estado (sigla UF de 2 letras) da pessoa.',
          'Regras:',
          '1. Se a cidade for conhecida no Brasil e o estado não tiver sido escrito explicitamente (ex.: "Palhoça", "Curitiba", "Niterói", "Belo Horizonte", "Jundiaí"), infira a sigla UF de 2 letras.',
          '2. Corrija abreviações comuns no nome da paróquia (ex.: "N. Sra." -> "Nossa Senhora", "Sto." -> "Santo", "Sta." -> "Santa", "S." -> "São").',
          '3. "understood" deve ser true SOMENTE se o comentário indicar ao menos a paróquia (ou padroeiro/igreja) E a cidade.',
          '4. Se faltar a paróquia ou faltar a cidade ("understood": false), gere em "reply_message" uma resposta curta (máx. 240 caracteres), muito respeitosa, católica e divertida/bem-humorada (usando saudações como "Paz e Bem!" ou "Salve Maria!", referências carinhosas a São Longuinho, anjo da guarda, livro de tombo ou sino da matriz), pedindo para @" + username + " comentar o nome da Paróquia + Cidade + Estado (UF) para construirmos a casinha no mapa.',
          'Responda APENAS um objeto JSON válido com as chaves: {"understood": boolean, "city": string|null, "uf": string|null, "parish": string|null, "display_name": string|null, "reply_message": string|null}.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({ author_username: username, comment: commentText }),
      },
    ], env, fetcher);

    const city = typeof parsed?.city === 'string' && parsed.city.trim() ? parsed.city.trim() : fallback.city;
    const uf = normalizeUf(parsed?.uf) ?? fallback.uf;
    const parish = typeof parsed?.parish === 'string' && parsed.parish.trim() ? parsed.parish.trim() : fallback.parish;
    const displayName = typeof parsed?.display_name === 'string' && parsed.display_name.trim().length >= 2 ? parsed.display_name.trim().slice(0, 140) : null;
    const understood = Boolean(city && parish);
    const replyMessage = typeof parsed?.reply_message === 'string' && parsed.reply_message.trim()
      ? parsed.reply_message.trim().slice(0, 300)
      : buildFallbackCatholicReply('not_understood', { username, city, uf, parish });

    return { understood, city, uf, parish, display_name: displayName, reply_message: understood ? null : replyMessage };
  } catch {
    return fallback;
  }
}

export async function resolveMunicipalityFromDb(client, cityQuery, ufQuery, parishQuery) {
  if (!cityQuery) return { status: 'not_found', municipality: null, candidates: [] };
  const normCity = normalizeCatalogName(cityQuery);
  const normUf = normalizeUf(ufQuery);

  const rows = (await client.query(
    `SELECT m.code, m.name, m.uf,
       (SELECT count(*)::int FROM parishes p WHERE p.city_code = m.code AND p.active) AS active_parishes
     FROM municipalities m
     WHERE unaccent(lower(m.name)) = unaccent(lower($1))
     ORDER BY active_parishes DESC, m.uf`,
    [cityQuery.trim()]
  )).rows;

  let matches = rows;
  if (!matches.length) {
    const all = (await client.query(
      `SELECT m.code, m.name, m.uf,
         (SELECT count(*)::int FROM parishes p WHERE p.city_code = m.code AND p.active) AS active_parishes
       FROM municipalities m
       WHERE unaccent(lower(m.name)) ILIKE '%' || unaccent(lower($1)) || '%'
       ORDER BY active_parishes DESC, length(m.name) ASC LIMIT 15`,
      [cityQuery.trim()]
    )).rows;
    const exactNorm = all.filter(m => normalizeCatalogName(m.name) === normCity);
    matches = exactNorm.length ? exactNorm : all;
  }

  if (normUf) {
    const ufMatches = matches.filter(m => m.uf === normUf);
    if (ufMatches.length === 1) return { status: 'matched', municipality: ufMatches[0], candidates: ufMatches };
    if (ufMatches.length > 1) {
      const exact = ufMatches.find(m => normalizeCatalogName(m.name) === normCity) ?? ufMatches[0];
      return { status: 'matched', municipality: exact, candidates: ufMatches };
    }
    return { status: 'not_found', municipality: null, candidates: matches };
  }

  if (matches.length === 1) {
    return { status: 'matched', municipality: matches[0], candidates: matches };
  }

  if (matches.length > 1 && parishQuery) {
    const candidateCodes = matches.map(m => m.code);
    const parishesByCity = (await client.query(
      'SELECT id, city_code, name FROM parishes WHERE city_code = ANY($1::int[]) AND active ORDER BY slot',
      [candidateCodes]
    )).rows;
    const citiesWithMatchingParish = matches.filter(m => {
      const cityParishes = parishesByCity.filter(p => p.city_code === m.code);
      return matchParishDeterministically(parishQuery, cityParishes).status === 'matched';
    });
    if (citiesWithMatchingParish.length === 1) {
      return { status: 'matched', municipality: citiesWithMatchingParish[0], candidates: citiesWithMatchingParish };
    }
  }

  return { status: 'not_found', municipality: null, candidates: matches };
}

export async function resolveParishInCity(client, municipality, parishQuery, commentText, username, env = process.env, fetcher = fetch) {
  const parishes = (await client.query(
    'SELECT id, name FROM parishes WHERE city_code = $1 AND active ORDER BY slot, id',
    [municipality.code]
  )).rows;

  if (!parishes.length) {
    return {
      status: 'parish_not_found',
      parish: null,
      reply_message: buildFallbackCatholicReply('parish_not_found', {
        username,
        city: municipality.name,
        uf: municipality.uf,
        parish: parishQuery,
      }),
    };
  }

  const deterministic = matchParishDeterministically(parishQuery, parishes);
  if (deterministic.status === 'matched') {
    return { status: 'matched', parish: deterministic.parish, reply_message: null };
  }

  const candidatePool = deterministic.candidates.length
    ? deterministic.candidates.slice(0, 50)
    : parishes.slice(0, 60);

  if (env.OPENROUTER_API_KEY?.trim()) {
    try {
      const aiResult = await callOpenRouterJson([
        {
          role: 'system',
          content: [
            'Você é o assistente católico do mapa "Meu Lugar na Igreja" (AcutisTech).',
            `O fiel @${username} comentou querendo registrar sua casa em ${municipality.name}/${municipality.uf}.`,
            'Abaixo está a lista OFICIAL de paróquias ativas cadastradas nesse município no nosso banco de dados.',
            'Regras:',
            '1. Se o comentário corresponder claramente a UMA única paróquia da lista (mesmo com abreviação, nome popular ou pequeno erro de digitação), retorne "status": "matched" e "matched_parish_id" com o ID numérico exato da lista.',
            '2. NUNCA invente um ID fora da lista e nunca chute se houver mais de uma paróquia homônima sem o bairro.',
            '3. Se houver mais de uma paróquia possível na lista (ex.: duas paróquias com o mesmo santo e o fiel não disse o bairro), retorne "status": "parish_ambiguous", "matched_parish_id": null, e escreva em "reply_message" uma resposta curta (máx. 250 caracteres), respeitosa, católica e divertida citando as opções da cidade e perguntando qual delas é a paróquia dele.',
            '4. Se a paróquia mencionada não estiver na lista da cidade, retorne "status": "parish_not_found", "matched_parish_id": null, e escreva em "reply_message" uma resposta curta (máx. 250 caracteres), respeitosa, católica e bem-humorada (ex.: mencionando São Longuinho, o livro de tombo ou o coroinha no GPS), dizendo que não encontramos essa paróquia em ' + `${municipality.name}/${municipality.uf}` + ' no mapa e pedindo para conferir o nome oficial.',
            'Responda APENAS JSON válido: {"status": "matched"|"parish_not_found"|"parish_ambiguous", "matched_parish_id": number|null, "reply_message": string|null}.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            comment: commentText,
            extracted_parish: parishQuery,
            city: `${municipality.name}/${municipality.uf}`,
            available_parishes: candidatePool.map(p => ({ id: Number(p.id), name: p.name })),
          }),
        },
      ], env, fetcher);

      const matchedId = Number(aiResult?.matched_parish_id);
      const validParish = Number.isInteger(matchedId) ? parishes.find(p => Number(p.id) === matchedId) : null;
      if (aiResult?.status === 'matched' && validParish) {
        return { status: 'matched', parish: validParish, reply_message: null };
      }
      const status = aiResult?.status === 'parish_ambiguous' || deterministic.status === 'ambiguous'
        ? 'parish_ambiguous'
        : 'parish_not_found';
      const replyMessage = typeof aiResult?.reply_message === 'string' && aiResult.reply_message.trim()
        ? aiResult.reply_message.trim().slice(0, 300)
        : buildFallbackCatholicReply(status, {
            username,
            city: municipality.name,
            uf: municipality.uf,
            parish: parishQuery,
            candidates: deterministic.candidates,
          });
      return { status, parish: null, reply_message: replyMessage };
    } catch {
      // Fall through to deterministic fallback reply
    }
  }

  const fallbackStatus = deterministic.status === 'ambiguous' ? 'parish_ambiguous' : 'parish_not_found';
  return {
    status: fallbackStatus,
    parish: null,
    reply_message: buildFallbackCatholicReply(fallbackStatus, {
      username,
      city: municipality.name,
      uf: municipality.uf,
      parish: parishQuery,
      candidates: deterministic.candidates,
    }),
  };
}

export function pickHouseColor(username) {
  const digest = createHash('sha256').update(String(username ?? '').toLowerCase()).digest();
  return HOUSE_PALETTE[digest[0] % HOUSE_PALETTE.length];
}

export async function upsertHouseFromInstagramComment(client, {
  cityCode,
  parishId,
  authorId,
  username,
  displayName,
  commentId,
  mediaId,
}) {
  const cleanUsername = String(username ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(cleanUsername)) {
    throw new Error('invalid_username');
  }
  const cleanDisplayName = (displayName && String(displayName).trim().length >= 2)
    ? String(displayName).trim().slice(0, 140)
    : `@${cleanUsername}`;
  const cleanAuthorId = authorId && /^\d+$/.test(String(authorId)) ? String(authorId) : null;

  const inTx = Boolean((await client.query('SELECT pg_current_xact_id_if_assigned() IS NOT NULL AS active')).rows[0]?.active);
  await client.query(inTx ? 'SAVEPOINT instagram_house_upsert' : 'BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(78123003)');
    await client.query('INSERT INTO cities(code) VALUES($1) ON CONFLICT(code) DO UPDATE SET active=true', [cityCode]);
    await client.query('UPDATE parishes SET active=true WHERE id=$1 AND city_code=$2', [parishId, cityCode]);

    const existingRows = (await client.query(
      `SELECT id, parish_id, username, instagram_user_id
       FROM houses
       WHERE lower(username) = lower($1)
          OR ($2::text IS NOT NULL AND instagram_user_id = $2)
       ORDER BY CASE WHEN instagram_user_id = $2 THEN 0 ELSE 1 END, id ASC
       FOR UPDATE`,
      [cleanUsername, cleanAuthorId]
    )).rows;

    let houseId;
    let outcome;
    if (existingRows.length > 0) {
      const target = existingRows[0];
      if (existingRows.length > 1) {
        // If there was a legacy manual row with the new username and another row by instagram_user_id, remove the duplicate manual row first
        for (const extra of existingRows.slice(1)) {
          await client.query('DELETE FROM houses WHERE id=$1', [extra.id]);
        }
      }
      const updated = (await client.query(
        `UPDATE houses
         SET city_code = $1,
             parish_id = $2,
             username = $3,
             display_name = $4,
             instagram_user_id = COALESCE($5, instagram_user_id),
             instagram_comment_id = $6,
             instagram_media_id = $7,
             active = true,
             slot = CASE WHEN parish_id = $2 THEN slot ELSE (SELECT COALESCE(MAX(slot)+1, 0) FROM houses WHERE parish_id = $2) END,
             color = CASE WHEN lower($3) = 'lucasgfr26' THEN '#ffd700' ELSE color END,
             level = CASE WHEN lower($3) = 'lucasgfr26' THEN 99 ELSE level END,
             role = CASE WHEN lower($3) = 'lucasgfr26' THEN 'criador' ELSE role END
         WHERE id = $8
         RETURNING id`,
        [cityCode, parishId, cleanUsername, cleanDisplayName, cleanAuthorId, commentId, mediaId, target.id]
      )).rows[0];
      houseId = updated.id;
      outcome = 'house_updated';
    } else {
      const isCreator = cleanUsername === 'lucasgfr26';
      const color = isCreator ? '#ffd700' : pickHouseColor(cleanUsername);
      const inserted = (await client.query(
        `INSERT INTO houses(city_code, parish_id, username, display_name, color, active, slot, instagram_user_id, instagram_comment_id, instagram_media_id, level, role)
         SELECT $1, $2, $3, $4, $5, true, COALESCE(MAX(slot)+1, 0), $6, $7, $8, $9, $10
         FROM houses WHERE parish_id = $2
         RETURNING id`,
        [cityCode, parishId, cleanUsername, cleanDisplayName, color, cleanAuthorId, commentId, mediaId, isCreator ? 99 : 1, isCreator ? 'criador' : 'leigo']
      )).rows[0];
      houseId = inserted.id;
      outcome = 'house_created';
    }

    await client.query(
      "INSERT INTO audit_log(action, entity, entity_id) VALUES('instagram_comment', 'house', $1)",
      [String(houseId)]
    );
    await client.query(inTx ? 'RELEASE SAVEPOINT instagram_house_upsert' : 'COMMIT');
    return { outcome, houseId };
  } catch (error) {
    await client.query(inTx ? 'ROLLBACK TO SAVEPOINT instagram_house_upsert' : 'ROLLBACK');
    throw error;
  }
}

export async function replyToInstagramComment(commentId, message, token, version = 'v26.0', fetcher = fetch) {
  if (!token || !commentId || !message) {
    return { status: 'skipped', replyId: null };
  }
  if (!/^v\d+\.0$/.test(version)) {
    return { status: 'failed', replyId: null };
  }
  try {
    const url = new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(String(commentId))}/replies`);
    const body = new URLSearchParams({ message: String(message).slice(0, 300) });
    const response = await fetcher(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      return { status: 'failed', replyId: null, http: response.status, code: data?.error?.code ?? null };
    }
    return { status: 'sent', replyId: data?.id ? String(data.id) : null };
  } catch {
    return { status: 'failed', replyId: null };
  }
}

export function extractWebhookCommentChanges(payload) {
  if (payload?.object !== 'instagram' || !Array.isArray(payload.entry)) return [];
  const items = [];
  for (const entry of payload.entry) {
    const entryId = String(entry?.id ?? '');
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== 'comments' || !change?.value) continue;
      const val = change.value;
      items.push({
        entryId,
        commentId: String(val.id ?? '').trim(),
        parentId: val.parent_id ? String(val.parent_id).trim() : null,
        mediaId: val.media?.id ? String(val.media.id).trim() : null,
        text: typeof val.text === 'string' ? val.text.trim() : '',
        authorId: val.from?.id ? String(val.from.id).trim() : null,
        authorUsername: typeof val.from?.username === 'string' ? val.from.username.trim().replace(/^@/, '') : null,
        authorName: typeof val.from?.name === 'string' ? val.from.name.trim() : null,
      });
    }
  }
  return items;
}

async function loadInstagramAccessContext(client, env = process.env) {
  const row = (await client.query(
    'SELECT account_id, username, token_ciphertext, expires_at FROM instagram_connections WHERE slot=true'
  )).rows[0];
  let token = null;
  let accountId = env.INSTAGRAM_ACCOUNT_ID?.trim() || null;
  let accountUsername = null;

  if (row) {
    accountId = row.account_id || accountId;
    accountUsername = row.username || null;
    if (env.INSTAGRAM_TOKEN_ENCRYPTION_KEY && new Date(row.expires_at) > new Date()) {
      try {
        token = decryptInstagramToken(row.token_ciphertext, env.INSTAGRAM_TOKEN_ENCRYPTION_KEY);
      } catch {
        token = null;
      }
    }
  }
  if (!token && env.INSTAGRAM_ACCESS_TOKEN?.trim()) {
    token = env.INSTAGRAM_ACCESS_TOKEN.trim();
  }
  const version = /^v\d+\.0$/.test(env.INSTAGRAM_API_VERSION ?? '') ? env.INSTAGRAM_API_VERSION : 'v26.0';
  return { token, accountId, accountUsername, version };
}

export async function processSingleCommentChange(client, receiptId, item, access, env = process.env, fetcher = fetch) {
  if (!item.commentId) return { outcome: 'ignored_invalid' };

  const existing = (await client.query(
    'SELECT comment_id, outcome FROM instagram_comment_events WHERE comment_id = $1',
    [item.commentId]
  )).rows[0];
  if (existing && existing.outcome !== 'error') {
    return { outcome: existing.outcome, skippedDuplicate: true };
  }

  const recordEvent = async (fields) => {
    await client.query(
      `INSERT INTO instagram_comment_events(
         comment_id, receipt_id, media_id, author_id, author_username, comment_text,
         extracted_city, extracted_uf, extracted_parish, city_code, parish_id, house_id,
         outcome, reply_text, reply_id, reply_status, processed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
       ON CONFLICT (comment_id) DO UPDATE SET
         receipt_id = EXCLUDED.receipt_id,
         extracted_city = EXCLUDED.extracted_city,
         extracted_uf = EXCLUDED.extracted_uf,
         extracted_parish = EXCLUDED.extracted_parish,
         city_code = EXCLUDED.city_code,
         parish_id = EXCLUDED.parish_id,
         house_id = EXCLUDED.house_id,
         outcome = EXCLUDED.outcome,
         reply_text = EXCLUDED.reply_text,
         reply_id = EXCLUDED.reply_id,
         reply_status = EXCLUDED.reply_status,
         processed_at = now()`,
      [
        item.commentId,
        receiptId,
        item.mediaId,
        item.authorId,
        item.authorUsername,
        item.text || '',
        fields.extractedCity ?? null,
        fields.extractedUf ?? null,
        fields.extractedParish ?? null,
        fields.cityCode ?? null,
        fields.parishId ?? null,
        fields.houseId ?? null,
        fields.outcome,
        fields.replyText ?? null,
        fields.replyId ?? null,
        fields.replyStatus ?? 'none',
      ]
    );
    return fields;
  };

  if (
    item.entryId === '0' ||
    (item.authorId === '232323232' && item.authorUsername?.toLowerCase() === 'test') ||
    item.commentId === '17865799348089039'
  ) {
    return recordEvent({ outcome: 'ignored_test' });
  }

  if (
    (access.accountId && item.authorId && item.authorId === access.accountId) ||
    (access.accountUsername && item.authorUsername && item.authorUsername.toLowerCase() === access.accountUsername.toLowerCase())
  ) {
    return recordEvent({ outcome: 'ignored_self' });
  }

  if (!item.text || !item.authorUsername || !/^[a-zA-Z0-9._]{1,30}$/.test(item.authorUsername)) {
    return recordEvent({ outcome: 'ignored_invalid' });
  }

  const extracted = await extractCommentWithAi(item.text, item.authorUsername, env, fetcher);
  if (!extracted.understood || !extracted.city || !extracted.parish) {
    const replyText = extracted.reply_message || buildFallbackCatholicReply('not_understood', {
      username: item.authorUsername,
      city: extracted.city,
      uf: extracted.uf,
      parish: extracted.parish,
    });
    const reply = await replyToInstagramComment(item.commentId, replyText, access.token, access.version, fetcher);
    return recordEvent({
      extractedCity: extracted.city,
      extractedUf: extracted.uf,
      extractedParish: extracted.parish,
      outcome: 'not_understood',
      replyText,
      replyId: reply.replyId,
      replyStatus: reply.status,
    });
  }

  const cityResolution = await resolveMunicipalityFromDb(client, extracted.city, extracted.uf, extracted.parish);
  if (cityResolution.status !== 'matched' || !cityResolution.municipality) {
    const replyText = buildFallbackCatholicReply('city_not_found', {
      username: item.authorUsername,
      city: extracted.city,
      uf: extracted.uf,
      parish: extracted.parish,
    });
    const reply = await replyToInstagramComment(item.commentId, replyText, access.token, access.version, fetcher);
    return recordEvent({
      extractedCity: extracted.city,
      extractedUf: extracted.uf,
      extractedParish: extracted.parish,
      outcome: 'city_not_found',
      replyText,
      replyId: reply.replyId,
      replyStatus: reply.status,
    });
  }

  const municipality = cityResolution.municipality;
  const parishResolution = await resolveParishInCity(
    client,
    municipality,
    extracted.parish,
    item.text,
    item.authorUsername,
    env,
    fetcher
  );

  if (parishResolution.status !== 'matched' || !parishResolution.parish) {
    const replyText = parishResolution.reply_message || buildFallbackCatholicReply(parishResolution.status, {
      username: item.authorUsername,
      city: municipality.name,
      uf: municipality.uf,
      parish: extracted.parish,
    });
    const reply = await replyToInstagramComment(item.commentId, replyText, access.token, access.version, fetcher);
    return recordEvent({
      extractedCity: municipality.name,
      extractedUf: municipality.uf,
      extractedParish: extracted.parish,
      cityCode: municipality.code,
      outcome: parishResolution.status,
      replyText,
      replyId: reply.replyId,
      replyStatus: reply.status,
    });
  }

  const houseResult = await upsertHouseFromInstagramComment(client, {
    cityCode: municipality.code,
    parishId: parishResolution.parish.id,
    authorId: item.authorId,
    username: item.authorUsername,
    displayName: item.authorName || extracted.display_name || `@${item.authorUsername.toLowerCase()}`,
    commentId: item.commentId,
    mediaId: item.mediaId,
  });

  let replyText = null;
  let replyId = null;
  let replyStatus = 'none';
  if (env.INSTAGRAM_REPLY_ON_SUCCESS === 'true') {
    replyText = `Paz e Bem, @${item.authorUsername}! ⛪🏠 Sua casinha já está no mapa na ${parishResolution.parish.name} (${municipality.name}/${municipality.uf})!`;
    const reply = await replyToInstagramComment(item.commentId, replyText, access.token, access.version, fetcher);
    replyId = reply.replyId;
    replyStatus = reply.status;
  }

  return recordEvent({
    extractedCity: municipality.name,
    extractedUf: municipality.uf,
    extractedParish: parishResolution.parish.name,
    cityCode: municipality.code,
    parishId: parishResolution.parish.id,
    houseId: houseResult.houseId,
    outcome: houseResult.outcome,
    replyText,
    replyId,
    replyStatus,
  });
}

export async function processPendingInstagramReceipts(poolOrClient, env = process.env, fetcher = fetch, logger = console) {
  const isPool = typeof poolOrClient.totalCount === 'number' && typeof poolOrClient.connect === 'function';
  const client = isPool ? await poolOrClient.connect() : poolOrClient;
  const summary = { receiptsProcessed: 0, housesCreated: 0, housesUpdated: 0, repliesSent: 0, ignored: 0, errors: 0 };

  try {
    const access = await loadInstagramAccessContext(client, env);
    const receipts = (await client.query(
      `SELECT id, payload
       FROM instagram_webhook_receipts
       WHERE status IN ('received', 'failed')
       ORDER BY id ASC
       LIMIT 25`
    )).rows;

    for (const receipt of receipts) {
      const changes = extractWebhookCommentChanges(receipt.payload);
      if (!changes.length) {
        await client.query(
          "UPDATE instagram_webhook_receipts SET status = 'ignored', processed_at = now(), error_code = NULL WHERE id = $1",
          [receipt.id]
        );
        summary.receiptsProcessed++;
        summary.ignored++;
        continue;
      }

      let receiptFailed = false;
      for (const item of changes) {
        try {
          const res = await processSingleCommentChange(client, receipt.id, item, access, env, fetcher);
          if (res.outcome === 'house_created') summary.housesCreated++;
          else if (res.outcome === 'house_updated') summary.housesUpdated++;
          else if (res.outcome?.startsWith('ignored_')) summary.ignored++;
          if (res.replyStatus === 'sent') summary.repliesSent++;
        } catch (error) {
          receiptFailed = true;
          summary.errors++;
          logger.error('instagram_comment_processing_error', {
            receipt_id: receipt.id,
            code: error instanceof Error ? error.message.slice(0, 60) : 'unknown',
          });
        }
      }

      await client.query(
        `UPDATE instagram_webhook_receipts
         SET status = $2, processed_at = now(), error_code = $3
         WHERE id = $1`,
        [receipt.id, receiptFailed ? 'failed' : 'processed', receiptFailed ? 'comment_processing_error' : null]
      );
      summary.receiptsProcessed++;
    }
    return summary;
  } finally {
    if (isPool && typeof client.release === 'function') client.release();
  }
}

