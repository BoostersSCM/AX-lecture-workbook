const {
  env,
  json,
  readJsonBody,
  requireIntegrationAccess,
} = require('../../_lib/integration');

module.exports = async function handler(req, res) {
  if (!['POST', 'PATCH'].includes(req.method)) return json(res, 405, { ok: false, error: 'POST 또는 PATCH only' });
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

  if (req.method === 'PATCH') {
    const ts = String(body.ts || '').trim();
    if (!ts) return json(res, 400, { ok: false, error: '수정할 메시지 ts 필요' });
    if (!/^[CDG][A-Z0-9]+$/i.test(channel)) {
      return json(res, 400, { ok: false, error: '메시지 수정에는 실제 Channel ID 또는 DM Channel ID가 필요합니다.' });
    }
    try {
      const response = await fetch('https://slack.com/api/chat.update', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ channel, ts, text }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        return json(res, response.ok ? 502 : response.status, {
          ok: false,
          error: result.error || 'Slack 메시지 수정 실패',
        });
      }
      return json(res, 200, {
        ok: true,
        updated: true,
        channel: result.channel,
        ts: result.ts,
        text: result.text || result.message?.text || text,
        message: result.message || null,
      });
    } catch (error) {
      console.error('[integrations/slack/update]', error);
      return json(res, 502, { ok: false, error: error.message || 'Slack 메시지 수정 실패' });
    }
  }

  let destination = channel;
  if (/^[UW][A-Z0-9]+$/i.test(channel)) {
    const opened = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ users: channel }),
    });
    const openedResult = await opened.json();
    if (!opened.ok || !openedResult.ok || !openedResult.channel?.id) {
      return json(res, opened.ok ? 502 : opened.status, {
        ok: false,
        error: openedResult.error || 'Slack DM 대화 열기 실패',
      });
    }
    destination = openedResult.channel.id;
  }

  const payload = { channel: destination, text };
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
