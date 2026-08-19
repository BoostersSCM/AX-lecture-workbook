// 브라우저에서 로그인한 사용자로 서버 연동 API를 호출합니다.
import { supabase } from './supabase.js';

export async function callIntegration(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('로그인 세션을 확인해주세요.');

  const headers = { Authorization: `Bearer ${session.access_token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `연동 요청 실패 (${response.status})`);
  }
  return payload;
}
