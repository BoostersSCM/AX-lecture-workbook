// POST /api/oauth/register — 동적 클라이언트 등록 (RFC 7591, public client)
// Claude가 조직 커넥터를 처음 연결할 때 자동으로 호출합니다.
const { json } = require('../_lib/integration');
const { rand, sb, readBody } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'invalid_request' });
  }
  const body = await readBody(req);
  const uris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter(u => /^https:\/\//.test(String(u)))
    : [];
  if (!uris.length) {
    return json(res, 400, { error: 'invalid_redirect_uri', error_description: 'https redirect_uris가 필요합니다.' });
  }

  const client = {
    client_id: rand('axcl_', 12),
    client_name: String(body.client_name || 'MCP Client').slice(0, 80),
    redirect_uris: JSON.stringify(uris),
  };
  const r = await sb('mcp_clients', { method: 'POST', body: JSON.stringify(client) });
  if (!r.ok) {
    return json(res, 500, { error: 'server_error', error_description: (await r.text()).slice(0, 200) });
  }

  return json(res, 201, {
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
  });
};
