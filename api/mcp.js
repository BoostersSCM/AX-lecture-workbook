// /api/mcp — 워크북 Remote MCP 서버 (Streamable HTTP, JSON-RPC 2.0)
//
// 수강생이 자기 Claude에 커스텀 커넥터로 등록하면, 그 Claude가
// 본인의 워크북 기록(entries)을 읽고 쓸 수 있습니다 — '이어쓰기'의 완성.
//
// 인증: 마이페이지에서 발급한 개인 키를 URL로 전달 (?key=axk_...)
//   또는 조직 커넥터의 OAuth Bearer 토큰(axt_...).
//   서버가 SUPABASE_SERVICE_ROLE_KEY로 user_id를 확인하고, 그 사용자의 데이터만 다룹니다.
//
// 강의 스코프: 플랫폼 전환(006) 이후 기록은 (user, course, item_key)로 저장됩니다.
//   모든 도구는 course(slug) 인자를 받으며 기본값은 connect-ai입니다.
//   006 이전에는 기존 방식(course 축 없음) 그대로 동작합니다 — 무중단.
//
// 필요 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { env, json, readJsonBody } = require('./_lib/integration');

const PROTOCOL = '2025-03-26';
const WRITABLE = /^(s\d{1,2}|clinic|my|setup)\.[\w.]{1,60}$/; // 쓰기 허용 키 패턴
const MAX_VALUE = 8000;
const DEFAULT_COURSE = 'connect-ai';
const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 시드 원본(content.js) — course_docs가 아직 없을 때의 폴백
let _content = null;
async function content() {
  if (!_content) _content = await import('../public/js/content.js');
  return _content;
}

// 프롬프트 본문의 개인화 토큰 → 수강생 entries 값으로 치환 (render.js와 동일 규칙)
const PERSONALIZE = { '[페이지명]': 's1.page_name', '[회의록 원본]': 's2.source_urls' };

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

// slug → 강의 행. 성공한 조회만 캐시합니다 — 006 실행 직후 웜 인스턴스가
// "테이블 없음"을 계속 기억하는 사고를 막기 위해 실패는 캐시하지 않습니다.
const _courseCache = {};
async function courseOf(slug) {
  const s = String(slug || DEFAULT_COURSE).trim() || DEFAULT_COURSE;
  if (_courseCache[s]) return _courseCache[s];
  try {
    const res = await sb(`courses?slug=eq.${encodeURIComponent(s)}&select=id,slug,title&limit=1`);
    if (!res.ok) return null; // 006 이전(테이블 없음) 또는 일시 오류 → 레거시 모드
    const rows = await res.json();
    if (rows[0]) _courseCache[s] = rows[0];
    return rows[0] || null;
  } catch { return null; }
}

// 강의 프롬프트 문서 — course_docs 우선, 없으면 content.js (이중 관리 방지)
async function coursePrompts(course) {
  if (course) {
    try {
      const res = await sb(`course_docs?course_id=eq.${course.id}&kind=eq.prompts&select=payload&limit=1`);
      if (res.ok) {
        const rows = await res.json();
        if (rows[0]?.payload && Object.keys(rows[0].payload).length) return rows[0].payload;
      }
    } catch { /* 폴백 */ }
  }
  return (await content()).PROMPTS;
}

function entriesScope(userId, course) {
  return `user_id=eq.${userId}` + (course ? `&course_id=eq.${course.id}` : '');
}

async function resolveUser(key) {
  if (!key || !/^axk_[A-Za-z0-9]{20,}$/.test(key)) return null;
  const res = await sb(`mcp_keys?key=eq.${encodeURIComponent(key)}&select=user_id`);
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.user_id || null;
}

// 조직 커넥터(팀 플랜) 경로 — OAuth로 발급한 Bearer 토큰(axt_…) → user_id
async function resolveBearer(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!/^axt_[A-Za-z0-9]{20,}$/.test(token)) return null;
  const res = await sb(`mcp_tokens?token=eq.${encodeURIComponent(token)}&select=user_id`);
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.user_id || null;
}

// ── MCP 도구 정의 ────────────────────────────────────────────
const COURSE_PROP = { course: { type: 'string', description: `강의 slug (기본: ${DEFAULT_COURSE})` } };

const TOOLS = [
  {
    name: 'get_my_workbook',
    description: '내 AX 워크북 기록 전체를 회차별로 정리해 가져옵니다. 연결 레시피·액션아이템·설계서 등 실습 기록이 담겨 있습니다.',
    inputSchema: { type: 'object', properties: { ...COURSE_PROP }, additionalProperties: false },
  },
  {
    name: 'get_entry',
    description: '워크북 기록 하나를 item_key로 가져옵니다. 예: s3.recipe(연결 레시피), s2.action_items(액션아이템 표), clinic.task(설계서 업무)',
    inputSchema: {
      type: 'object',
      properties: { item_key: { type: 'string', description: '예: s3.recipe' }, ...COURSE_PROP },
      required: ['item_key'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_entry',
    description: '워크북 기록 하나를 저장(덮어쓰기)합니다. Claude에서 다듬은 결과를 워크북에 되돌려 놓을 때 사용합니다. 허용 키: s1.~s9.*, clinic.*, my.*, setup.*',
    inputSchema: {
      type: 'object',
      properties: {
        item_key: { type: 'string', description: '예: s3.recipe 또는 my.notes' },
        value: { type: 'string', description: '저장할 내용 (8000자 이내)' },
        ...COURSE_PROP,
      },
      required: ['item_key', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_course_status',
    description: '내 기수와 기수별로 열린 회차 등 강의 진행 상태를 확인합니다.',
    inputSchema: { type: 'object', properties: { ...COURSE_PROP }, additionalProperties: false },
  },
  {
    name: 'list_exercises',
    description: '이 워크북의 AI 실습(다듬기 단계) 목록을 봅니다. 각 실습의 id로 get_exercise를 호출해 실행 재료를 받으세요.',
    inputSchema: { type: 'object', properties: { ...COURSE_PROP }, additionalProperties: false },
  },
  {
    name: 'get_exercise',
    description: '실습 하나의 프롬프트 + 워크북에 저장된 재료(원문) + 결과 저장 위치를 통째로 가져옵니다. 받은 지시를 수행한 뒤, 결과를 save_entry(output_key)로 워크북에 저장하세요.',
    inputSchema: {
      type: 'object',
      properties: { exercise_id: { type: 'string', description: 'list_exercises에서 확인한 id. 예: s2rules' }, ...COURSE_PROP },
      required: ['exercise_id'],
      additionalProperties: false,
    },
  },
];

function groupLabel(key) {
  if (key.startsWith('setup.')) return '연결 준비';
  if (key.startsWith('clinic.')) return '업무 설계서';
  if (key.startsWith('my.')) return '내 메모';
  const m = /^s(\d{1,2})\./.exec(key);
  return m ? `${m[1]}회차` : '기타';
}

function openEpochOf(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  return Date.UTC(y, mo - 1, d) - KST_MS - DAY_MS; // 강의일 하루 전 0시 KST
}

async function callTool(userId, name, args = {}) {
  const course = await courseOf(args.course); // null = 레거시 모드(006 이전)

  if (name === 'get_my_workbook') {
    const res = await sb(`entries?${entriesScope(userId, course)}&select=item_key,value,updated_at&order=item_key`);
    const rows = await res.json();
    const groups = {};
    for (const r of rows) {
      const v = String(r.value || '').trim();
      if (!v || v === 'false') continue;
      const g = groupLabel(r.item_key);
      (groups[g] = groups[g] || []).push(`- ${r.item_key}: ${v.length > 400 ? v.slice(0, 400) + ' …(생략)' : v}`);
    }
    const order = ['연결 준비', '1회차', '2회차', '3회차', '4회차', '5회차', '6회차', '업무 설계서', '내 메모', '기타'];
    const text = order.filter(g => groups[g])
      .map(g => `## ${g}\n${groups[g].join('\n')}`)
      .join('\n\n') || '아직 저장된 기록이 없습니다.';
    return `# 내 워크북 기록 — ${course?.title || 'AX 워크북'}\n\n${text}\n\n(긴 항목은 미리보기입니다 — 전문은 get_entry(item_key)로 가져오세요)`;
  }

  if (name === 'get_entry') {
    const key = String(args.item_key || '').trim();
    const res = await sb(`entries?${entriesScope(userId, course)}&item_key=eq.${encodeURIComponent(key)}&select=value,updated_at`);
    const rows = await res.json();
    if (!rows.length) return `'${key}' 기록이 없습니다. get_my_workbook으로 존재하는 키를 먼저 확인하세요.`;
    return `【${key}】 (수정: ${rows[0].updated_at})\n\n${rows[0].value}`;
  }

  if (name === 'save_entry') {
    const key = String(args.item_key || '').trim();
    const value = String(args.value || '');
    if (!WRITABLE.test(key)) throw new Error(`'${key}'에는 쓸 수 없습니다. 허용: s1.~s9.*, clinic.*, my.*, setup.*`);
    if (value.length > MAX_VALUE) throw new Error(`내용이 너무 깁니다 (${value.length}자 / 최대 ${MAX_VALUE}자)`);
    // 006 이후 entries의 PK는 (user, course, item_key) — on_conflict가 실제 제약과 일치해야 합니다
    const conflict = course ? 'user_id,course_id,item_key' : 'user_id,item_key';
    const row = { user_id: userId, item_key: key, value };
    if (course) row.course_id = course.id;
    const res = await sb(`entries?on_conflict=${conflict}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error('저장 실패: ' + (await res.text()).slice(0, 200));
    return `저장했습니다 — ${key} (${value.length}자). 워크북 화면에서 새로고침하면 보입니다.`;
  }

  if (name === 'get_course_status') {
    const pRes = await sb(`profiles?id=eq.${userId}&select=name,team,cohort,role`);
    const me = (await pRes.json())[0] || {};
    const head = `이름: ${me.name || '미확인'} / 팀: ${me.team || '미지정'} / 역할: ${me.role === 'instructor' ? '강사' : '수강생'}`;

    if (course) {
      // 플랫폼 모드 — 내 기수(enrollments)와 그 기수의 개방(gates)
      const eRes = await sb(`enrollments?user_id=eq.${userId}&select=cohort_id,cohorts!inner(id,number,course_id)&cohorts.course_id=eq.${course.id}`);
      const enr = eRes.ok ? await eRes.json() : [];
      const mine = enr[0]?.cohorts || null;
      if (!mine) return [head, `강의 「${course.title}」: 아직 참여한 기수가 없습니다 — 워크북 강의 홈에서 [참여하기]로 기수를 고르세요.`].join('\n');

      const gRes = await sb(`gates?cohort_id=eq.${mine.id}&select=open,open_date,sessions(position,title)`);
      const gates = gRes.ok ? await gRes.json() : [];
      const now = Date.now();
      const open = gates
        .filter(g => g.open || (openEpochOf(g.open_date) !== null && now >= openEpochOf(g.open_date)))
        .map(g => g.sessions?.position).filter(Boolean).sort((a, b) => a - b);
      const scheduled = gates.filter(g => g.open_date).map(g => `${g.sessions?.position}회차=${g.open_date}`);
      return [
        head,
        `강의: ${course.title} / 내 기수: ${mine.number}기`,
        `지금 열려 있는 회차: ${open.join(', ') || '없음'}`,
        scheduled.length ? `등록된 강의일: ${scheduled.join(', ')} (하루 전 0시 KST 자동 개방)` : '등록된 강의일 없음',
      ].join('\n');
    }

    // 레거시 모드 — course_settings 기반
    const sRes = await sb(`course_settings?select=key,value`);
    const settings = Object.fromEntries((sRes.ok ? await sRes.json() : []).map(r => [r.key, r.value]));
    let open = {};
    try { open = JSON.parse(settings.open_sessions_by_cohort || '{}'); } catch {}
    let dates = {};
    try { dates = JSON.parse(settings.session_dates_by_cohort || '{}'); } catch {}
    const c = me.cohort ? String(me.cohort) : null;
    return [
      head + (me.cohort ? ` / 기수: ${me.cohort}기` : ' / 기수: 미선택'),
      c ? `내 기수의 수동 개방 회차: ${(open[c] || [1]).join(', ')}` : '기수 미선택 — 워크북 강의 홈에서 참여하세요',
      c && dates[c] ? `내 기수의 강의일: ${Object.entries(dates[c]).map(([n, d]) => `${n}회차=${d}`).join(', ')} (하루 전 0시 KST 자동 개방)` : '등록된 강의일 없음',
    ].join('\n');
  }

  if (name === 'list_exercises') {
    const PROMPTS = await coursePrompts(course);
    const rows = Object.entries(PROMPTS)
      .filter(([, p]) => p.context?.length || p.output)
      .map(([pid, p]) => `- id: ${pid} | ${p.session}회차 | ${p.title}${p.output ? ` | 결과 저장: ${p.output}` : ''}`);
    return `# AI 실습 목록 (다듬기 단계) — ${course?.title || 'AX 워크북'}\n\n${rows.join('\n')}\n\n사용법: get_exercise(id) → 지시 수행 → save_entry(결과 저장 키, 결과)`;
  }

  if (name === 'get_exercise') {
    const PROMPTS = await coursePrompts(course);
    const pid = String(args.exercise_id || '').trim();
    const p = PROMPTS[pid];
    if (!p || !(p.context?.length || p.output)) {
      return `'${pid}' 실습을 찾을 수 없습니다. list_exercises로 id를 먼저 확인하세요.`;
    }

    // 수강생 entries에서 개인화 토큰 값 + 재료를 한 번에 조회
    const need = [...new Set([...(p.context || []), ...Object.values(PERSONALIZE)])];
    const res = await sb(`entries?${entriesScope(userId, course)}&item_key=in.(${need.map(k => `"${k}"`).join(',')})&select=item_key,value`);
    const got = Object.fromEntries((await res.json()).map(r => [r.item_key, String(r.value || '').trim()]));

    let body = String(p.body || '');
    for (const [token, key] of Object.entries(PERSONALIZE)) {
      if (got[key]) body = body.replaceAll(token, got[key]);
    }

    const materials = (p.context || [])
      .map(k => (got[k] && got[k] !== 'false') ? `【${k}】\n${got[k]}` : null)
      .filter(Boolean)
      .join('\n\n');

    return [
      `# 실습: ${p.title} (${p.session}회차)`,
      p.note ? `참고: ${p.note}` : null,
      `\n## 지시(프롬프트)\n${body}`,
      materials ? `\n## 재료 — 워크북에 저장된 원문\n${materials}` : '\n## 재료\n(워크북에 저장된 재료가 아직 없습니다 — 사용자에게 원문을 요청하거나, 워크북 작업대에서 먼저 가져오라고 안내하세요)',
      p.output ? `\n## 결과 처리\n위 지시를 수행한 결과를 사용자에게 보여주고 확인받은 뒤, save_entry(item_key="${p.output}", value=결과)로 워크북에 저장하세요.` : '\n## 결과 처리\n결과를 사용자에게 보여주세요 (별도 저장 위치 없음).',
      '\n규칙: 재료에 없는 담당자·날짜·수량을 지어내지 말 것. 모르면 빈칸/미확인.',
    ].filter(Boolean).join('\n');
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

  // 인증 — 개인 키(?key=) 또는 OAuth Bearer 토큰(조직 커넥터).
  // 둘 다 없으면 401 + WWW-Authenticate → Claude가 OAuth 플로우를 시작합니다.
  const userId = (await resolveUser(urlKey)) || (await resolveBearer(req));
  if (!userId) {
    const base = 'https://' + String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`);
    return json(res, 401, rpcError(id, -32001, '인증이 필요합니다 — Claude 커넥터에서 로그인(승인)을 진행해주세요.'));
  }

  if (method === 'initialize') {
    return json(res, 200, rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: 'ax-workbook', version: '1.1.0' },
      instructions: '부스터스 AX 워크북 커넥터입니다. 실습 실행: list_exercises → get_exercise(id) → 지시 수행 → save_entry(결과 저장 키)로 워크북에 저장. 기록 조회: get_my_workbook / get_entry. 여러 강의가 있으면 course(slug) 인자로 강의를 고릅니다(기본 connect-ai).',
    }));
  }

  if (method === 'ping') return json(res, 200, rpcResult(id, {}));

  if (method === 'tools/list') {
    return json(res, 200, rpcResult(id, { tools: TOOLS }));
  }

  if (method === 'tools/call') {
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
