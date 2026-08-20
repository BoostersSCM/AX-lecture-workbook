// /.well-known/oauth-authorization-server (rewrite) — OAuth 서버 메타데이터 (RFC 8414)
const { json } = require('../_lib/integration');
const { baseUrl } = require('./_lib');

module.exports = function handler(req, res) {
  const base = baseUrl(req);
  return json(res, 200, {
    issuer: base,
    authorization_endpoint: base + '/mcp-auth',
    token_endpoint: base + '/api/oauth/token',
    registration_endpoint: base + '/api/oauth/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['workbook'],
  });
};
