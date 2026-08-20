// GET/POST /api/mcp-status — 내 Claude가 워크북에 실제로 연결됐는지 확인
//
// 연결 준비 페이지의 [연결 상태 확인] 버튼이 호출합니다.
// mcp_tokens(조직 커넥터 OAuth)·mcp_keys(개인 키)는 서버 전용 테이블이라
// 클라이언트가 직접 볼 수 없으므로, 본인 확인 후 서버가 대신 세어줍니다.
const { env, json } = require('./_lib/integration');
const { sb } = require('./oauth/_lib');

module.exports = async function handler(req, res) {
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
  } catch (e) { console.error('[mcp-status]', e); }
  if (!userId) return json(res, 401, { ok: false, error: '로그인 확인에 실패했습니다.' });

  try {
    const [tRes, kRes] = await Promise.all([
      sb(`mcp_tokens?user_id=eq.${userId}&select=created_at&order=created_at.desc&limit=5`),
      sb(`mcp_keys?user_id=eq.${userId}&select=created_at&limit=1`),
    ]);
    const tokens = tRes.ok ? await tRes.json() : [];
    const keys = kRes.ok ? await kRes.json() : [];
    return json(res, 200, {
      ok: true,
      connected: tokens.length > 0 || keys.length > 0,
      oauthTokens: tokens.length,          // 조직 커넥터(승인) 연결 수
      personalKeys: keys.length,           // 개인 키 발급 여부
      latest: tokens[0]?.created_at || keys[0]?.created_at || null,
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: '상태 확인에 실패했습니다: ' + (error.message || error) });
  }
};
