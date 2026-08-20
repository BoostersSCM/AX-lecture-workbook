// POST /api/oauth/approve — 승인 페이지(mcp-auth.html)가 호출합니다.
// Supabase 로그인 토큰으로 본인을 확인하고 1회용 인가 코드를 발급합니다.
const { env, json } = require('../_lib/integration');
const { rand, sb, readBody } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'POST만 지원합니다.' });
  }

  // 워크북 로그인(Supabase 세션) 검증 → user_id
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    return json(res, 401, { ok: false, error: '로그인이 필요합니다.' });
  }
  let userId = null;
  try {
    const r = await fetch(env('SUPABASE_URL').replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: authorization },
    });
    if (r.ok) userId = (await r.json()).id || null;
  } catch (e) { console.error('[oauth-approve]', e); }
  if (!userId) return json(res, 401, { ok: false, error: '로그인 확인에 실패했습니다. 다시 로그인해주세요.' });

  const body = await readBody(req);
  const clientId = String(body.client_id || '');
  const redirectUri = String(body.redirect_uri || '');
  const challenge = String(body.code_challenge || '');
  const method = String(body.code_challenge_method || 'S256');
  const state = String(body.state || '');

  if (!clientId || !redirectUri || !challenge) {
    return json(res, 400, { ok: false, error: '필수 파라미터가 없습니다.' });
  }
  if (method !== 'S256') return json(res, 400, { ok: false, error: 'PKCE는 S256만 지원합니다.' });

  // 등록된 클라이언트·리다이렉트인지 확인
  const cr = await sb('mcp_clients?client_id=eq.' + encodeURIComponent(clientId) + '&select=redirect_uris');
  const rows = await cr.json();
  if (!rows.length) return json(res, 400, { ok: false, error: '등록되지 않은 클라이언트입니다.' });
  let allowed = [];
  try { allowed = JSON.parse(rows[0].redirect_uris); } catch { allowed = []; }
  if (!allowed.includes(redirectUri)) {
    return json(res, 400, { ok: false, error: '허용되지 않은 redirect_uri 입니다.' });
  }

  const code = rand('axc_', 24);
  const ins = await sb('mcp_codes', {
    method: 'POST',
    body: JSON.stringify({
      code,
      user_id: userId,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }),
  });
  if (!ins.ok) return json(res, 500, { ok: false, error: '코드 발급에 실패했습니다.' });

  const sep = redirectUri.includes('?') ? '&' : '?';
  const redirect = redirectUri + sep + 'code=' + encodeURIComponent(code)
    + (state ? '&state=' + encodeURIComponent(state) : '');
  return json(res, 200, { ok: true, redirect });
};
