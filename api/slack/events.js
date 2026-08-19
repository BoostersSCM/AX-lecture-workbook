const crypto = require('crypto');
const { env, json } = require('../_lib/integration');

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function header(req, name) {
  const value = req.headers[name] || req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || '');
}

function verifySlackSignature(rawBody, req) {
  const secret = env('SLACK_SIGNING_SECRET');
  const timestamp = header(req, 'x-slack-request-timestamp');
  const signature = header(req, 'x-slack-signature');
  const timestampNumber = Number(timestamp);

  if (!secret || !timestamp || !signature || !Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const base = 'v0:' + timestamp + ':' + rawBody;
  const digest = crypto.createHmac('sha256', secret).update(base).digest('hex');
  const computed = 'v0=' + digest;
  if (computed.length !== signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

async function persistSlackEvent(record) {
  const supabaseUrl = env('SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return { stored: false, reason: 'SUPABASE_SERVICE_ROLE_KEY 미설정' };
  }

  const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/slack_events?on_conflict=event_id', {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error('Supabase slack_events 저장 실패: ' + detail.slice(0, 300));
  }
  return { stored: true };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });
  if (!env('SLACK_SIGNING_SECRET')) {
    return json(res, 503, { ok: false, error: 'SLACK_SIGNING_SECRET 미설정' });
  }

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch { return json(res, 400, { ok: false, error: 'Request body 읽기 실패' }); }

  if (!verifySlackSignature(rawBody, req)) {
    return json(res, 401, { ok: false, error: 'Invalid Slack signature' });
  }

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return json(res, 400, { ok: false, error: 'Invalid JSON' }); }

  if (payload.type === 'url_verification') {
    return json(res, 200, { challenge: payload.challenge });
  }

  if (payload.type !== 'event_callback') {
    return json(res, 200, { ok: true, ignored: true });
  }

  const event = payload.event || {};
  if (event.type !== 'message' || event.subtype || event.bot_id || event.bot_profile) {
    return json(res, 200, { ok: true, ignored: true });
  }

  const channelId = String(event.channel || '');

  const record = {
    event_id: String(payload.event_id || ''),
    team_id: String(payload.team_id || ''),
    channel_id: channelId,
    slack_user_id: String(event.user || ''),
    text: String(event.text || ''),
    event_ts: String(event.event_ts || event.ts || ''),
    received_at: new Date().toISOString(),
  };
  console.log('[slack/events]', JSON.stringify(record));

  let storage = { stored: false, reason: 'not attempted' };
  try { storage = await persistSlackEvent(record); }
  catch (error) { console.error('[slack/events] Supabase 저장 실패', error); }

  return json(res, 200, { ok: true, received: record, storage });
};
