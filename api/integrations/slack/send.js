const {
  env,
  json,
  readJsonBody,
  requireIntegrationAccess,
} = require('../../_lib/integration');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });
  if (!await requireIntegrationAccess(req, res)) return;

  const token = env('SLACK_BOT_TOKEN');
  if (!token) return json(res, 503, { ok: false, error: 'SLACK_BOT_TOKEN 미설정' });

  let body;
  try { body = await readJsonBody(req); }
  catch { return json(res, 400, { ok: false, error: 'Invalid JSON' }); }

  const channel = String(body.channel || body.channelId || '').trim();
  const text = String(body.text || '').trim();
  if (!channel || !text) {
    return json(res, 400, { ok: false, error: 'channel과 text 필요' });
  }

  const payload = { channel, text };
  if (body.threadTs) payload.thread_ts = String(body.threadTs);

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return json(res, response.ok ? 502 : response.status, {
        ok: false,
        error: result.error || 'Slack API 호출 실패',
      });
    }
    return json(res, 200, {
      ok: true,
      channel: result.channel,
      ts: result.ts,
      message: result.message || null,
    });
  } catch (error) {
    console.error('[integrations/slack/send]', error);
    return json(res, 502, { ok: false, error: error.message || 'Slack API 호출 실패' });
  }
};
