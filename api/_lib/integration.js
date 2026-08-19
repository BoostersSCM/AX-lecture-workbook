const crypto = require('crypto');

function env(name) {
  return String(process.env[name] || '').trim();
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function requireIntegrationSecret(req, res) {
  const expected = env('AX_INTEGRATION_SECRET');
  if (!expected) {
    json(res, 503, { ok: false, error: 'AX_INTEGRATION_SECRET 미설정' });
    return false;
  }

  const provided = String(
    req.headers['x-ax-integration-secret'] ||
    req.headers['authorization'] || ''
  ).replace(/^Bearer\s+/i, '').trim();

  if (!provided || provided.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    json(res, 401, { ok: false, error: 'integration 인증 실패' });
    return false;
  }
  return true;
}

function providedSecret(req) {
  return String(
    req.headers['x-ax-integration-secret'] ||
    req.headers['authorization'] || ''
  ).replace(/^Bearer\s+/i, '').trim();
}

async function requireIntegrationAccess(req, res) {
  const expected = env('AX_INTEGRATION_SECRET');
  const provided = providedSecret(req);
  if (expected && provided && provided.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return true;
  }

  const authorization = String(req.headers.authorization || '');
  if (authorization.startsWith('Bearer ')) {
    const supabaseUrl = env('SUPABASE_URL');
    const anonKey = env('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      json(res, 503, { ok: false, error: 'Supabase 서버 인증 설정 미완료' });
      return false;
    }
    try {
      const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', {
        headers: {
          apikey: anonKey,
          Authorization: authorization,
        },
      });
      if (response.ok) return true;
    } catch (error) {
      console.error('[integration-auth]', error);
    }
  }

  json(res, expected ? 401 : 503, {
    ok: false,
    error: expected ? 'integration 인증 실패' : 'AX_INTEGRATION_SECRET 미설정',
  });
  return false;
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); }
    catch { return Promise.reject(new Error('Invalid JSON')); }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function idFromInput(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const url = new URL(input);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || input;
  } catch {
    return input.replace(/\/+$/, '').split('/').pop() || input;
  }
}

async function upstreamJson(url, options) {
  const response = await fetch(url, options);
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    const detail = payload && (payload.errors || payload.error || payload.message);
    const error = new Error(String(detail || ('upstream status ' + response.status)));
    error.status = response.status;
    throw error;
  }
  return payload;
}

module.exports = {
  env,
  json,
  requireIntegrationSecret,
  requireIntegrationAccess,
  readJsonBody,
  idFromInput,
  upstreamJson,
};
