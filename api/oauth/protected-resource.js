// /.well-known/oauth-protected-resource (rewrite) — 보호 자원 메타데이터 (RFC 9728)
const { json } = require('../_lib/integration');
const { baseUrl } = require('./_lib');

module.exports = function handler(req, res) {
  const base = baseUrl(req);
  return json(res, 200, {
    resource: base + '/api/mcp',
    authorization_servers: [base],
    scopes_supported: ['workbook'],
    bearer_methods_supported: ['header'],
  });
};
