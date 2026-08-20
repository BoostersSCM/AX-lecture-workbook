// POST /api/oauth/token — 인가 코드 → 액세스 토큰 (PKCE S256 검증)
// Claude가 form-urlencoded로 호출합니다.
const { json } = require('../_lib/integration');
const { rand, sb, verifyPkce, readBody } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'invalid_request' });
  }
  const body = await readBody(req);

  if (String(body.grant_type) !== 'authorization_code') {
    return json(res, 400, { error: 'unsupported_grant_type' });
  }
  const code = String(body.code || '');
  const verifier = String(body.code_verifier || '');
  const clientId = String(body.client_id || '');
  const redirectUri = String(body.redirect_uri || '');
  if (!code || !verifier) return json(res, 400, { error: 'invalid_request' });

  const r = await sb('mcp_codes?code=eq.' + encodeURIComponent(code) + '&select=*');
  const rows = await r.json();
  const row = rows[0];
  // 코드는 성공 여부와 무관하게 1회용 — 즉시 삭제
  await sb('mcp_codes?code=eq.' + encodeURIComponent(code), { method: 'DELETE' });

  if (!row) return json(res, 400, { error: 'invalid_grant', error_description: '코드가 없거나 이미 사용되었습니다.' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json(res, 400, { error: 'invalid_grant', error_description: '코드가 만료되었습니다.' });
  }
  if (clientId && clientId !== row.client_id) return json(res, 400, { error: 'invalid_grant' });
  if (redirectUri && redirectUri !== row.redirect_uri) return json(res, 400, { error: 'invalid_grant' });
  if (!verifyPkce(verifier, row.code_challenge)) {
    return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE 검증 실패' });
  }

  const token = rand('axt_', 32);
  const ins = await sb('mcp_tokens', {
    method: 'POST',
    body: JSON.stringify({ token, user_id: row.user_id, client_id: row.client_id }),
  });
  if (!ins.ok) return json(res, 500, { error: 'server_error' });

  return json(res, 200, {
    access_token: token,
    token_type: 'Bearer',
    expires_in: 90 * 24 * 3600, // 90일 — 지나면 커넥터에서 재인증
    scope: 'workbook',
  });
};
