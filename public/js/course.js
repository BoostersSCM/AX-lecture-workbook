// js/course.js — 기수(코호트)별 회차 개방 제어
//
// 두 가지 방식이 합쳐집니다(합집합):
//   1) 수동 개방  — open_sessions_by_cohort: {"1":[1,2]}  (강사가 /admin 토글)
//   2) 예약 개방  — session_dates_by_cohort: {"1":{"2":"2026-08-27"}}  (강의일 KST)
//      → 강의일 "하루 전 0시(KST)"부터 자동으로 열립니다 (예습용)
// 잠그려면 토글을 끄고 날짜도 비워야 합니다.
// 테이블이 없으면(마이그레이션 전) 전부 열린 것으로 동작해 기존 배포가 잠기지 않습니다.

import { supabase } from './supabase.js';

const OPEN_KEY = 'open_sessions_by_cohort';
const DATE_KEY = 'session_dates_by_cohort';
const DEFAULT_OPEN = [1]; // 새 기수의 기본값: 1회차만 열림
const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let _open;            // undefined = 아직 안 읽음, null = 제어 없음(전부 열림), 객체 = 기수별 수동 개방
let _dates;           // 객체 = 기수별 강의일 { cohort: { n: 'YYYY-MM-DD' } } (없으면 {})
let _missing = false; // 테이블 미생성 여부 (admin 안내용)

async function loadSettings(fresh) {
  if (_open !== undefined && !fresh) return;

  const { data, error } = await supabase
    .from('course_settings').select('key, value')
    .in('key', [OPEN_KEY, DATE_KEY]);

  if (error) {
    _missing = /course_settings/.test(error.message || '') || error.code === '42P01';
    console.warn('[course] 회차 개방 설정을 읽지 못해 전체 개방으로 동작합니다:', error.message);
    _open = null;
    _dates = {};
    return;
  }

  _missing = false;
  const rows = Object.fromEntries((data || []).map(r => [r.key, r.value]));

  const parseObj = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      const v = JSON.parse(raw);
      return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
    } catch { return fallback; }
  };

  _open = parseObj(rows[OPEN_KEY], { '1': DEFAULT_OPEN });
  _dates = parseObj(rows[DATE_KEY], {});
}

export async function getOpenMap({ fresh = false } = {}) {
  await loadSettings(fresh);
  return _open;
}

export async function getScheduleMap({ fresh = false } = {}) {
  await loadSettings(fresh);
  return _dates || {};
}

export function settingsMissing() { return _missing; }

// ── 예약 개방 시각 계산 (KST) ────────────────────────────────
// 강의일 'YYYY-MM-DD'(KST) → 하루 전 00:00 KST의 epoch(ms)
export function openEpochOf(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  // KST 00:00 = UTC 전날 15:00 → Date.UTC(강의일) - 9h 가 강의일 0시 KST.
  // 예습 개방은 그 하루 전이므로 24h를 더 뺍니다.
  return Date.UTC(y, mo - 1, d) - KST_MS - DAY_MS;
}

function scheduleOpenNow(datesForCohort, n, now = Date.now()) {
  const epoch = openEpochOf(datesForCohort?.[String(n)]);
  return epoch !== null && now >= epoch;
}

// 사람이 읽는 KST 표기 ("8월 26일(수)")
export function formatKstDate(dateStr) {
  const epoch = openEpochOf(dateStr);
  if (epoch === null) return '';
  // openEpoch는 하루 전 0시이므로, 강의일 표기는 +1일
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(epoch + DAY_MS));
}

export function formatKstOpenFrom(dateStr) {
  const epoch = openEpochOf(dateStr);
  if (epoch === null) return '';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(epoch)) + ' 0시';
}

// ── 열림 판정 ────────────────────────────────────────────────
// 이 사람에게 열린 회차 목록(수동 ∪ 예약 도달). null = 전부 열림(강사 또는 제어 미설정)
export async function openSessionsFor(me) {
  if (me?.role === 'instructor') return null;
  const map = await getOpenMap();
  if (map === null) return null;

  const cohort = Number(me?.cohort);
  if (!cohort) return DEFAULT_OPEN; // 온보딩 전 — requireAuth가 어차피 온보딩으로 보냅니다

  const manual = Array.isArray(map[String(cohort)]) ? map[String(cohort)].map(Number) : DEFAULT_OPEN;
  const dates = (_dates || {})[String(cohort)] || {};
  const merged = new Set(manual);
  for (const n of [1, 2, 3, 4]) if (scheduleOpenNow(dates, n)) merged.add(n);
  return [...merged].sort();
}

export async function isSessionOpen(n, me) {
  const open = await openSessionsFor(me);
  if (open === null) return true;
  return open.includes(Number(n));
}

// 잠긴 회차의 예약 정보 (수강생 잠금 화면용) — 강의일 문자열 또는 null
export async function scheduledDateFor(me, n) {
  await loadSettings(false);
  const cohort = Number(me?.cohort);
  if (!cohort) return null;
  const d = (_dates || {})[String(cohort)]?.[String(n)];
  return d || null;
}

// ── 강사 전용 쓰기 (RLS가 서버에서 한 번 더 막습니다) ───────
export async function setOpenSessionsFor(cohort, list) {
  const map = (await getOpenMap({ fresh: true })) || {};
  const next = { ...map, [String(Number(cohort))]: [...new Set(list.map(Number))].sort() };
  const { error } = await supabase
    .from('course_settings')
    .upsert({ key: OPEN_KEY, value: JSON.stringify(next) }, { onConflict: 'key' });
  if (!error) _open = next;
  return { error };
}

// 강의일 등록·해제 (dateStr가 비면 삭제)
export async function setSessionDate(cohort, n, dateStr) {
  const dates = { ...(await getScheduleMap({ fresh: true })) };
  const c = String(Number(cohort));
  const forCohort = { ...(dates[c] || {}) };
  if (dateStr) forCohort[String(n)] = dateStr;
  else delete forCohort[String(n)];
  if (Object.keys(forCohort).length) dates[c] = forCohort;
  else delete dates[c];
  const { error } = await supabase
    .from('course_settings')
    .upsert({ key: DATE_KEY, value: JSON.stringify(dates) }, { onConflict: 'key' });
  if (!error) _dates = dates;
  return { error };
}

// 잠긴 회차 안내 화면 (session/clinic 공용)
export function lockedNotice(n, openList, scheduledDate = null) {
  const opened = Array.isArray(openList) && openList.length
    ? [...openList].sort().map(x => `${x}회차`).join(' · ')
    : '아직 없음';
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
    <p><a class="btn-link" href="/">홈으로 돌아가기</a></p>`;
  return wrap;
}
