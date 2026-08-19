// /api/ai/transform — 워크북 안의 AI 실행 (다듬기 단계)
//
// 수강생이 프롬프트를 복사해 각자의 AI로 나르지 않도록, 서버가 대신 호출합니다.
// 각자의 AI는 오늘 실습 맥락을 모르지만, 이 엔드포인트는 워크북이 가져온
// 원문(재료)을 프롬프트와 함께 받으므로 맥락이 완전합니다.
//
// 필요 환경변수: ANTHROPIC_API_KEY (서버 전용, Vercel Sensitive)
// 미설정 시 503 — 프론트는 [요청문 복사] 폴백으로 안내합니다.

const { env, json, requireIntegrationAccess, readJsonBody, upstreamJson } = require('../_lib/integration');

const MODEL = 'claude-sonnet-5';
const MAX_INPUT_CHARS = 24000;  // 프롬프트+재료 합계 상한 (남용·과금 방지)
const MAX_OUTPUT_TOKENS = 1600;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'POST만 지원합니다.' });
  }

  if (!(await requireIntegrationAccess(req, res))) return;

  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json(res, 503, { ok: false, error: 'AI_NOT_CONFIGURED' });
  }

  let body;
  try { body = await readJsonBody(req); }
  catch { return json(res, 400, { ok: false, error: '잘못된 JSON 본문입니다.' }); }

  const prompt = String(body.prompt || '').trim();
  const materials = String(body.materials || '').trim();
  if (!prompt) return json(res, 400, { ok: false, error: '실행할 프롬프트가 없습니다.' });

  const user = materials
    ? `${prompt}\n\n──── 아래는 워크북에서 가져온 재료(원문) ────\n${materials}`
    : prompt;

  if (user.length > MAX_INPUT_CHARS) {
    return json(res, 413, { ok: false, error: `입력이 너무 깁니다 (${user.length}자 / 최대 ${MAX_INPUT_CHARS}자). 재료 범위를 줄여주세요.` });
  }

  try {
    const payload = await upstreamJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [
          '너는 부스터스 사내 AX 강의 워크북의 실습 보조다.',
          '규칙: 재료(원문)에 없는 담당자·날짜·수량을 지어내지 마라. 모르면 빈칸 또는 "미확인"으로 표시하라.',
          '근거문장을 요구받으면 원문 문장을 그대로 복사하라.',
          '한국어로, 요청된 형식(표·목록)을 정확히 지켜 답하라. 서론·잡담 없이 결과만.',
        ].join('\n'),
        messages: [{ role: 'user', content: user }],
      }),
    });

    const text = (payload.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) return json(res, 502, { ok: false, error: 'AI 응답이 비어 있습니다. 다시 시도해주세요.' });
    return json(res, 200, { ok: true, text, model: MODEL });
  } catch (error) {
    const status = error.status === 429 ? 429 : 502;
    const message = error.status === 429
      ? '요청이 몰려 잠시 대기 중입니다. 10초 뒤 다시 시도해주세요.'
      : 'AI 호출에 실패했습니다: ' + (error.message || error);
    return json(res, status, { ok: false, error: message });
  }
};
