// /api/mcp — 워크북 Remote MCP 서버 (Streamable HTTP, JSON-RPC 2.0)
//
// 수강생이 자기 Claude에 커스텀 커넥터로 등록하면, 그 Claude가
// 본인의 워크북 기록(entries)을 읽고 쓸 수 있습니다 — 4회차 '이어쓰기'의 완성.
//
// 인증: 마이페이지에서 발급한 개인 키를 URL로 전달 (?key=axk_...)
//   서버가 SUPABASE_SERVICE_ROLE_KEY로 mcp_keys에서 user_id를 확인하고,
//   그 사용자의 데이터만 다룹니다. 같은 구글 계정이라도 키 없이는 연결되지 않습니다.
//
// 필요 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { env, json, readJsonBody } = require('./_lib/integration');

const PROTOCOL = '2025-03-26';
const WRITABLE = /^(s[1-4]|clinic|my|setup)\.[\w.]{1,60}$/; // 쓰기 허용 키 패턴
const MAX_VALUE = 8000;

function sb(path, options = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1/' + path;
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(url, {
    ...options,
    headers: {
      apikey: service,
      Authorization: 'Bearer ' + service,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function resolveUser(key) {
  if (!key || !/^axk_[A-Za-z0-9]{20,}$/.test(key)) return null;
  const res = await sb(`mcp_keys?key=eq.${encodeURIComponent(key)}&select=user_id`);
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.user_id || null;
}

// ── MCP 도구 정의 ────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_my_workbook',
    description: '내 AX 워크북 기록 전체를 회차별로 정리해 가져옵니다. 연결 레시피·액션아이템·설계서 등 4주간의 실습 기록이 담겨 있습니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_entry',
    description: '워크북 기록 하나를 item_key로 가져옵니다. 예: s3.recipe(연결 레시피), s2.action_items(액션아이템 표), clinic.task(설계서 업무)',
    inputSchema: {
      type: 'object',
      properties: { item_key: { type: 'string', description: '예: s3.recipe' } },
      required: ['item_key'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_entry',
    description: '워크북 기록 하나를 저장(덮어쓰기)합니다. Claude에서 다듬은 결과를 워크북에 되돌려 놓을 때 사용합니다. 허용 키: s1.~s4.*, clinic.*, my.*',
    inputSchema: {
      type: 'object',
      properties: {
        item_key: { type: 'string', description: '예: s3.recipe 또는 my.notes' },
        value: { type: 'string', description: '저장할 내용 (8000자 이내)' },
      },
      required: ['item_key', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_course_status',
    description: '내 기수와 기수별로 열린 회차 등 강의 진행 상태를 확인합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

function groupLabel(key) {
  if (key.startsWith('setup.')) return '연결 준비';
  if (key.startsWith('clinic.')) return '내 업무 연결 설계서';
  if (key.startsWith('my.')) return '내 메모';
  const m = /^s([1-4])\./.exec(key);
  return m ? `${m[1]}회차` : '기타';
}

async function callTool(userId, name, args = {}) {
  if (name === 'get_my_workbook') {
    const res = await sb(`entries?user_id=eq.${userId}&select=item_key,value,updated_at&order=item_key`);
    const rows = await res.json();
    const groups = {};
    for (const r of rows) {
      const v = String(r.value || '').trim();
      if (!v || v === 'false') continue;
      const g = groupLabel(r.item_key);
      (groups[g] = groups[g] || []).push(`- ${r.item_key}: ${v.length > 400 ? v.slice(0, 400) + ' …(생략)' : v}`);
    }
    const order = ['연결 준비', '1회차', '2회차', '3회차', '4회차', '내 업무 연결 설계서', '내 메모', '기타'];
    const text = order.filter(g => groups[g])
      .map(g => `## ${g}\n${groups[g].join('\n')}`)
      .join('\n\n') || '아직 저장된 기록이 없습니다.';
    return `# 내 AX 워크북 기록\n\n${text}\n\n(긴 항목은 미리보기입니다 — 전문은 get_entry(item_key)로 가져오세요)`;
  }

  if (name === 'get_entry') {
    const key = String(args.item_key || '').trim();
    const res = await sb(`entries?user_id=eq.${userId}&item_key=eq.${encodeURIComponent(key)}&select=value,updated_at`);
    const rows = await res.json();
    if (!rows.length) return `'${key}' 기록이 없습니다. get_my_workbook으로 존재하는 키를 먼저 확인하세요.`;
    return `【${key}】 (수정: ${rows[0].updated_at})\n\n${rows[0].value}`;
  }

  if (name === 'save_entry') {
    const key = String(args.item_key || '').trim();
    const value = String(args.value || '');
    if (!WRITABLE.test(key)) throw new Error(`'${key}'에는 쓸 수 없습니다. 허용: s1.~s4.*, clinic.*, my.*, setup.*`);
    if (value.length > MAX_VALUE) throw new Error(`내용이 너무 깁니다 (${value.length}자 / 최대 ${MAX_VALUE}자)`);
    const res = await sb('entries?on_conflict=user_id,item_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, item_key: key, value }),
    });
    if (!res.ok) throw new Error('저장 실패: ' + (await res.text()).slice(0, 200));
    return `저장했습니다 — ${key} (${value.length}자). 워크북 화면에서 새로고침하면 보입니다.`;
  }

  if (name === 'get_course_status') {
    const [pRes, sRes] = await Promise.all([
      sb(`profiles?id=eq.${userId}&select=name,team,cohort,role`),
      sb(`course_settings?select=key,value`),
    ]);
    const me = (await pRes.json())[0] || {};
    const settings = Object.fromEntries((await sRes.json()).map(r => [r.key, r.value]));
    let open = {};
    try { open = JSON.parse(settings.open_sessions_by_cohort || '{}'); } catch {}
    let dates = {};
    try { dates = JSON.parse(settings.session_dates_by_cohort || '{}'); } catch {}
    const c = me.cohort ? String(me.cohort) : null;
    return [
      `이름: ${me.name || '미확인'} / 팀: ${me.team || '미지정'} / 기수: ${me.cohort ? me.cohort + '기' : '미선택'} / 역할: ${me.role === 'instructor' ? '강사' : '수강생'}`,
      c ? `내 기수의 수동 개방 회차: ${(open[c] || [1]).join(', ')}` : '기수 미선택 — 워크북 /onboarding에서 선택하세요',
      c && dates[c] ? `내 기수의 강의일: ${Object.entries(dates[c]).map(([n, d]) => `${n}회차=${d}`).join(', ')} (하루 전 0시 KST 자동 개방)` : '등록된 강의일 없음',
    ].join('\n');
  }

  throw new Error(`알 수 없는 도구: ${name}`);
}

// ── JSON-RPC 처리 ────────────────────────────────────────────
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

module.exports = async function handler(req, res) {
  const urlKey = new URL(req.url, 'http://x').searchParams.get('key') || '';

  if (req.method === 'GET') {
    // 브라우저로 열어봤을 때의 안내
    return json(res, 200, {
      ok: true,
      name: 'ax-workbook-mcp',
      hint: '이 주소를 Claude의 커스텀 커넥터에 등록하세요. 개인 키는 워크북 마이페이지에서 발급합니다.',
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'POST만 지원합니다.' });
  }

  if (!env('SUPABASE_SERVICE_ROLE_KEY')) {
    return json(res, 503, { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY 미설정' });
  }

  let body;
  try { body = await readJsonBody(req); }
  catch { return json(res, 400, rpcError(null, -32700, 'JSON 파싱 실패')); }

  const { id = null, method, params = {} } = body || {};

  // 알림(notifications/*)은 응답 본문 없이 202
  if (method && method.startsWith('notifications/')) {
    res.statusCode = 202;
    return res.end();
  }

  if (method === 'initialize') {
    return json(res, 200, rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: 'ax-workbook', version: '1.0.0' },
      instructions: '부스터스 AX 워크북 커넥터입니다. get_my_workbook으로 내 4주 실습 기록을 불러오고, save_entry로 다듬은 결과를 되돌려 놓을 수 있습니다.',
    }));
  }

  if (method === 'ping') return json(res, 200, rpcResult(id, {}));

  if (method === 'tools/list') {
    return json(res, 200, rpcResult(id, { tools: TOOLS }));
  }

  if (method === 'tools/call') {
    const userId = await resolveUser(urlKey);
    if (!userId) {
      return json(res, 200, rpcResult(id, {
        content: [{ type: 'text', text: '연결 키가 없거나 만료되었습니다. 워크북 마이페이지에서 키를 발급해 커넥터 URL의 ?key= 값으로 넣어주세요.' }],
        isError: true,
      }));
    }
    try {
      const text = await callTool(userId, params.name, params.arguments || {});
      return json(res, 200, rpcResult(id, { content: [{ type: 'text', text }] }));
    } catch (error) {
      return json(res, 200, rpcResult(id, {
        content: [{ type: 'text', text: String(error.message || error) }],
        isError: true,
      }));
    }
  }

  return json(res, 200, rpcError(id, -32601, `지원하지 않는 메서드: ${method}`));
};
