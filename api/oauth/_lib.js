// api/oauth/_lib.js — MCP OAuth 공용 (엔드포인트로 노출되지 않는 내부 모듈)
const crypto = require('crypto');
const { env } = require('../_lib/integration');

function baseUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return 'https://' + host;
}

function rand(prefix, bytes = 24) {
  return prefix + crypto.randomBytes(bytes).toString('hex');
}

// service role로 Supabase REST 호출
function sb(path, options = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1/' + path;
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(url, {
    ...options,
    headers: {
      apikey: service,
      Authorization: 'Bearer ' + service,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// PKCE S256 검증
function verifyPkce(codeVerifier, codeChallenge) {
  const digest = crypto.createHash('sha256').update(String(codeVerifier)).digest('base64url');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(codeChallenge));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 본문 파싱 — JSON과 form-urlencoded 둘 다 (토큰 엔드포인트는 form으로 옵니다)
function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return resolve(req.body);
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      return resolve(parseRaw(raw, req.headers['content-type']));
    }
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => resolve(parseRaw(raw, req.headers['content-type'])));
    req.on('error', reject);
  });
}

function parseRaw(raw, contentType) {
  if (!raw) return {};
  const ct = String(contentType || '');
  if (ct.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

module.exports = { baseUrl, rand, sb, verifyPkce, readBody };
