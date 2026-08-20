// POST /api/qna-notify — 새 질문을 강사 Slack 채널에 알림
//
// Q&A 페이지가 질문 등록 직후 호출합니다. 부가 기능이라 어떤 실패도
// 질문 등록 자체에는 영향을 주지 않습니다 (클라이언트가 결과를 기다리지 않음).
//
// 설정: Vercel 환경변수
//   SLACK_BOT_TOKEN      — 이미 3회차 실습에 사용 중인 봇 토큰
//   AX_QNA_SLACK_CHANNEL — 알림 받을 채널 ID (예: C0123456789). 없으면 조용히 스킵.
const { env, json, readJsonBody } = require('./_lib/integration');
const { sb } = require('./oauth/_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });

  // 본인 확인 — 워크북 로그인(Supabase 세션) 필요
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return json(res, 401, { ok: false, error: '로그인이 필요합니다.' });
  let userId = null;
  try {
    const r = await fetch(env('SUPABASE_URL').replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: authorization },
    });
    if (r.ok) userId = (await r.json()).id || null;
  } catch (e) { console.error('[qna-notify]', e); }
  if (!userId) return json(res, 401, { ok: false, error: '로그인 확인에 실패했습니다.' });

  const token = env('SLACK_BOT_TOKEN');
  const channel = env('AX_QNA_SLACK_CHANNEL');
  if (!token || !channel) return json(res, 200, { ok: true, skipped: 'notify-not-configured' });

  let body;
  try { body = await readJsonBody(req); }
  catch { return json(res, 400, { ok: false, error: 'Invalid JSON' }); }
  const questionId = String(body.question_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) return json(res, 400, { ok: false, error: 'question_id 필요' });

  try {
    // service role로 질문 확인 — 본인이 쓴 질문만 알림을 트리거할 수 있습니다
    const qRes = await sb(`questions?id=eq.${questionId}&select=id,body,user_id,course_id,session_id,created_at&limit=1`);
    const [question] = qRes.ok ? await qRes.json() : [];
    if (!question || question.user_id !== userId) {
      return json(res, 403, { ok: false, error: '본인 질문만 알림을 보낼 수 있습니다.' });
    }

    const [cRes, pRes] = await Promise.all([
      sb(`courses?id=eq.${question.course_id}&select=title,slug&limit=1`),
      sb(`profiles?id=eq.${userId}&select=name,team&limit=1`),
    ]);
    const [course] = cRes.ok ? await cRes.json() : [];
    const [profile] = pRes.ok ? await pRes.json() : [];

    const origin = 'https://' + String(req.headers.host || '');
    const preview = String(question.body).slice(0, 300);
    const text = [
      `❓ *새 질문* — ${course?.title || '강의'}`,
      `> ${preview.replace(/\n/g, '\n> ')}`,
      `${profile?.name || '수강생'}${profile?.team ? ` (${profile.team})` : ''} · 답변: ${origin}/studio/${course?.slug || ''}#qna`,
    ].join('\n');

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    });
    const result = await slackRes.json();
    if (!result.ok) return json(res, 200, { ok: true, skipped: 'slack:' + result.error });
    return json(res, 200, { ok: true, notified: true });
  } catch (error) {
    console.error('[qna-notify]', error);
    return json(res, 200, { ok: true, skipped: 'error' });
  }
};
