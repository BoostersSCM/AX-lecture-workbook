// js/courseState.js — 강의 컨텍스트의 단일 창구
//
// DB(courses/sessions/blocks/course_docs/cohorts/enrollments/gates)를 읽어
// 기존 content.js와 "같은 모양"의 데이터(C.SESSIONS, C.SETUP, …)로 재조립합니다.
// 렌더러(render/practice/각 페이지)는 content.js 대신 여기의 C만 봅니다.
//
// 안전장치: connect-ai가 아직 시드되지 않았으면(006b 미실행) content.js로
// 폴백해 기존과 동일하게 동작합니다 — 무중단 이전의 핵심.

import { supabase, toast } from './supabase.js';
import { setCourse as storeSetCourse } from './store.js';

export const DEFAULT_SLUG = 'connect-ai';
const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 렌더러가 읽는 컨테이너 — initCourse()가 채웁니다
export const C = {
  course: null,        // {id, slug, title, subtitle, intro, status}
  COURSE: {},          // meta.course (히어로 카피)
  AX_FLOW: [], INTEGRATIONS: [], DATA_MODEL: [], VISUALS: {},
  SESSIONS: [],        // [{n, id, title, tag, goal, blocks:[{type,...payload}]}]
  SETUP: { groups: [] },
  CLINIC: { groups: [] },
  PROMPTS: {}, PROMPT_HELP: {}, RESCUE: [],
  cohorts: [],         // [{id, number, label, recruiting}]
  myCohort: null,      // {id, number} | null (미등록)
  gates: [],           // [{cohort_id, session_id, open, open_date}]
  instructor: false,   // 이 강의의 강사인가 (플랫폼 관리자 포함)
};

// ── URL 헬퍼 ─────────────────────────────────────────────────
export function courseSlug() {
  const m = /^\/c\/([^/]+)/.exec(location.pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

export function coursePath(page = '') {
  const slug = C.course?.slug || courseSlug() || DEFAULT_SLUG;
  return `/c/${slug}${page ? '/' + page : ''}`;
}

// 구 URL(/session 등) → /c/connect-ai/… 로 이동 (링크 호환)
export function ensureCourseUrl() {
  if (courseSlug()) return false;
  const page = location.pathname.replace(/^\//, '').replace(/\.html$/, '');
  location.replace(`/c/${DEFAULT_SLUG}/${page}${location.search}`);
  return true;
}

// ── 로딩 ─────────────────────────────────────────────────────
async function fetchCourseBundle(slug) {
  const { data: course, error } = await supabase
    .from('courses').select('*').eq('slug', slug).maybeSingle();
  if (error || !course) return null;

  const [docsRes, sessRes, cohortRes] = await Promise.all([
    supabase.from('course_docs').select('kind, payload').eq('course_id', course.id),
    supabase.from('sessions').select('id, position, title, tag, goal').eq('course_id', course.id).order('position'),
    supabase.from('cohorts').select('id, number, label, recruiting').eq('course_id', course.id).order('number'),
  ]);
  const sessions = sessRes.data || [];
  const blocksRes = sessions.length
    ? await supabase.from('blocks').select('session_id, position, type, payload')
        .in('session_id', sessions.map(s => s.id)).order('position')
    : { data: [] };

  return { course, docs: docsRes.data || [], sessions, blocks: blocksRes.data || [], cohorts: cohortRes.data || [] };
}

function assemble(bundle) {
  const docs = Object.fromEntries(bundle.docs.map(d => [d.kind, d.payload]));
  const meta = docs.meta || {};

  C.course = bundle.course;
  C.COURSE = meta.course || { title: bundle.course.title, subtitle: bundle.course.subtitle, intro: bundle.course.intro, promise: '' };
  C.AX_FLOW = meta.flow || [];
  C.INTEGRATIONS = meta.integrations || [];
  C.DATA_MODEL = meta.data_model || [];
  C.VISUALS = meta.visuals || {};
  C.SETUP = docs.setup || { title: '연결 준비', intro: '', groups: [] };
  C.CLINIC = docs.clinic || { title: '설계서', intro: '', groups: [] };
  C.PROMPTS = docs.prompts || {};
  C.PROMPT_HELP = docs.prompt_help || {};
  C.RESCUE = docs.rescue || [];
  C.cohorts = bundle.cohorts;

  const bySession = {};
  for (const b of bundle.blocks) {
    (bySession[b.session_id] = bySession[b.session_id] || []).push({ type: b.type, ...(b.payload || {}) });
  }
  C.SESSIONS = bundle.sessions.map(s => ({
    n: s.position, id: s.id, title: s.title, tag: s.tag, goal: s.goal,
    blocks: bySession[s.id] || [],
  }));
}

// 레거시(006 이전) 모드에서는 기존 course_settings 게이트를 그대로 따릅니다
let _legacy = null; // { open: number[]|null, dates: {n:'YYYY-MM-DD'} }

// connect-ai 시드 전 폴백 — content.js 그대로
async function assembleFromContentJs() {
  const m = await import('./content.js');
  C.course = { id: null, slug: DEFAULT_SLUG, title: m.COURSE.title, status: 'active' };
  C.COURSE = m.COURSE;
  C.AX_FLOW = m.AX_FLOW; C.INTEGRATIONS = m.INTEGRATIONS; C.DATA_MODEL = m.DATA_MODEL; C.VISUALS = m.VISUALS;
  C.SESSIONS = m.SESSIONS.map(s => ({ ...s, id: null }));
  C.SETUP = m.SETUP; C.CLINIC = m.CLINIC;
  C.PROMPTS = m.PROMPTS; C.PROMPT_HELP = m.PROMPT_HELP; C.RESCUE = m.RESCUE;
  C.cohorts = []; C.myCohort = null; C.gates = [];
}

// 강의 컨텍스트 초기화 — 모든 강의 페이지가 requireAuth 후 이걸 호출합니다
export async function initCourse(me, slug = courseSlug() || DEFAULT_SLUG) {
  const bundle = await fetchCourseBundle(slug);

  if (!bundle) {
    if (slug === DEFAULT_SLUG) {
      // 006 미실행 상태 — 이전과 동일하게 동작 (course_id 없는 레거시 모드)
      await assembleFromContentJs();
      storeSetCourse(null);
      C.instructor = me?.role === 'instructor';
      // 게이트도 기존 course_settings 방식 그대로 (전환 사이에 잠금이 풀리지 않게)
      try {
        const legacy = await import('./course.js');
        const open = await legacy.openSessionsFor(me);
        const dates = me?.cohort ? ((await legacy.getScheduleMap())[String(me.cohort)] || {}) : {};
        _legacy = { open, dates };
      } catch { _legacy = null; }
      return C;
    }
    return null; // 없는 강의
  }

  assemble(bundle);
  storeSetCourse(bundle.course.id);

  // 이 강의의 강사인가 (플랫폼 관리자 포함)
  if (me?.role === 'instructor') {
    C.instructor = true;
  } else if (me) {
    const { data } = await supabase.from('course_instructors')
      .select('user_id').eq('course_id', bundle.course.id).eq('user_id', me.id).maybeSingle();
    C.instructor = Boolean(data);
  } else {
    C.instructor = false;
  }

  // 내 수강 기수 (프리뷰 중이면 프리뷰 기수 번호로 매핑)
  C.myCohort = null;
  if (me?._preview) {
    const found = C.cohorts.find(x => x.number === Number(me.cohort));
    C.myCohort = found ? { id: found.id, number: found.number } : null;
  } else if (me && !C.instructor) {
    const { data } = await supabase.from('enrollments')
      .select('cohort_id, cohorts!inner(id, number, course_id)')
      .eq('user_id', me.id).eq('cohorts.course_id', bundle.course.id);
    const row = (data || [])[0];
    if (row) C.myCohort = { id: row.cohort_id, number: row.cohorts.number };
  }

  // 내 기수의 개방 상태
  C.gates = [];
  if (C.myCohort) {
    const { data } = await supabase.from('gates').select('cohort_id, session_id, open, open_date')
      .eq('cohort_id', C.myCohort.id);
    C.gates = data || [];
  }

  return C;
}

// ── 등록 (자유 참여) ─────────────────────────────────────────
export async function enroll(cohortId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: new Error('로그인이 필요합니다.') };
  const { error } = await supabase.from('enrollments')
    .insert({ cohort_id: cohortId, user_id: session.user.id });
  if (error && !/duplicate/i.test(error.message)) return { error };
  return { error: null };
}

// ── 개방 판정 (기수×회차 gates 기준) ─────────────────────────
export function openEpochOf(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  return Date.UTC(y, mo - 1, d) - KST_MS - DAY_MS; // 강의일 하루 전 0시 KST
}

export function formatKstDate(dateStr) {
  const epoch = openEpochOf(dateStr);
  if (epoch === null) return '';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(epoch + DAY_MS));
}

export function formatKstOpenFrom(dateStr) {
  const epoch = openEpochOf(dateStr);
  if (epoch === null) return '';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(epoch)) + ' 0시';
}

function gateFor(n) {
  const s = C.SESSIONS.find(x => x.n === Number(n));
  if (!s || !s.id) return null;
  return C.gates.find(g => g.session_id === s.id) || null;
}

// 열린 회차 목록. null = 전부 열림(강사) / 배열 = 열린 회차 번호
export function openSessionsForMe(me) {
  if (C.instructor && !me?._preview) return null;
  if (!C.course?.id) return _legacy ? _legacy.open : null; // 레거시 — 기존 게이트 그대로
  if (!C.myCohort) return [];                 // 미등록 — 등록 카드로 유도
  const open = [];
  for (const s of C.SESSIONS) {
    const g = C.gates.find(x => x.session_id === s.id);
    if (!g) continue;
    const epoch = openEpochOf(g.open_date);
    if (g.open || (epoch !== null && Date.now() >= epoch)) open.push(s.n);
  }
  return open;
}

export function isSessionOpen(n, me) {
  const open = openSessionsForMe(me);
  return open === null || open.includes(Number(n));
}

export function scheduledDateFor(n) {
  if (!C.course?.id) return _legacy?.dates?.[String(n)] || null;
  return gateFor(n)?.open_date || null;
}

export function lockedNotice(n, openList, scheduledDate = null) {
  const opened = Array.isArray(openList) && openList.length
    ? [...openList].sort().map(x => `${x}회차`).join(' · ') : '아직 없음';
  const scheduleLine = scheduledDate
    ? `<p class="locked-schedule">📅 강의일 <b>${formatKstDate(scheduledDate)}</b> — 예습을 위해 <b>${formatKstOpenFrom(scheduledDate)}(한국 시간)</b>부터 자동으로 열립니다.</p>`
    : '';
  const wrap = document.createElement('div');
  wrap.className = 'locked-notice';
  wrap.innerHTML = `
    <div class="locked-icon" aria-hidden="true">🔒</div>
    <h2>${n}회차는 아직 열리지 않았습니다</h2>
    <p>회차는 강의 진도에 맞춰 열립니다. 수업에서 만나면 함께 열립니다.</p>
    ${scheduleLine}
    <p class="locked-open">내 기수에 지금 열려 있는 회차 — <b>${opened}</b></p>
    <p><a class="btn-link" href="${coursePath()}">강의 홈으로</a></p>`;
  return wrap;
}

// 미등록 안내 (자유 참여 유도)
export function enrollNotice() {
  const wrap = document.createElement('div');
  wrap.className = 'locked-notice';
  wrap.innerHTML = `
    <div class="locked-icon" aria-hidden="true">🎓</div>
    <h2>먼저 기수에 참여해주세요</h2>
    <p>강의 홈에서 모집 중인 기수를 고르면 바로 시작할 수 있습니다.</p>
    <p><a class="btn-link" href="${coursePath()}">강의 홈에서 참여하기</a></p>`;
  return wrap;
}

// ── 진행률 필수 키 (기존 requiredKeys와 동일 시그니처) ────────
export function requiredKeys(scope) {
  const out = [];
  if (scope === 'setup') {
    for (const g of C.SETUP.groups || [])
      for (const f of g.fields || []) if (f.kind === 'check' || f.required) out.push(f.key);
  }
  if (scope === 'all') {
    for (const g of C.SETUP.groups || [])
      for (const f of g.fields || []) if (f.required) out.push(f.key);
  }
  if (scope === 'clinic' || scope === 'all') {
    for (const g of C.CLINIC.groups || [])
      for (const f of g.fields || []) if (f.required) out.push(f.key);
  }
  if (typeof scope === 'number') {
    const s = C.SESSIONS.find(x => x.n === scope);
    if (s) for (const b of s.blocks) if (b.type === 'field' && b.required) out.push(b.key);
  }
  if (scope === 'all') {
    for (const s of C.SESSIONS)
      for (const b of s.blocks) if (b.type === 'field' && b.required) out.push(b.key);
  }
  return out;
}

// ── 카탈로그 ─────────────────────────────────────────────────
export async function listCourses() {
  const { data, error } = await supabase
    .from('courses').select('id, slug, title, subtitle, status').order('created_at');
  if (error) return { courses: [], error };
  return { courses: data || [], error: null };
}

export async function listMyEnrollments(me) {
  if (!me) return [];
  const { data } = await supabase.from('enrollments')
    .select('cohort_id, cohorts!inner(number, course_id)')
    .eq('user_id', me.id);
  return data || [];
}

// 마이페이지·스튜디오용 — 특정 강의의 문항 구조(라벨 지도 재료)를 가볍게 로드
export async function loadCourseShape(courseId) {
  const { data: course } = await supabase
    .from('courses').select('id, slug, title').eq('id', courseId).maybeSingle();
  if (!course) return null;
  const [docsRes, sessRes] = await Promise.all([
    supabase.from('course_docs').select('kind, payload').eq('course_id', courseId).in('kind', ['setup', 'clinic']),
    supabase.from('sessions').select('id, position, title').eq('course_id', courseId).order('position'),
  ]);
  const docs = Object.fromEntries((docsRes.data || []).map(d => [d.kind, d.payload]));
  const sessions = sessRes.data || [];
  const blocksRes = sessions.length
    ? await supabase.from('blocks').select('session_id, type, payload')
        .in('session_id', sessions.map(s => s.id)).order('position')
    : { data: [] };
  return {
    course,
    SETUP: docs.setup || { groups: [] },
    CLINIC: docs.clinic || { groups: [] },
    SESSIONS: sessions.map(s => ({
      n: s.position, id: s.id, title: s.title,
      blocks: (blocksRes.data || []).filter(b => b.session_id === s.id).map(b => ({ type: b.type, ...(b.payload || {}) })),
    })),
  };
}

// 문항 구조(C 또는 loadCourseShape 결과) → item_key 라벨 지도
export function labelMapOf(shape) {
  const m = {};
  for (const g of shape.SETUP?.groups || []) for (const f of g.fields || []) if (f.key && f.kind !== 'note') m[f.key] = { label: f.label || f.key, group: '연결 준비', page: 'setup' };
  for (const s of shape.SESSIONS || []) for (const b of s.blocks || []) if (b.type === 'field') m[b.key] = { label: b.label, group: `${s.n}회차 · ${s.title}`, page: `session?n=${s.n}` };
  for (const g of shape.CLINIC?.groups || []) for (const f of g.fields || []) if (f.key && f.kind !== 'note') m[f.key] = { label: f.label || f.key, group: '업무 설계서', page: 'clinic' };
  return m;
}
