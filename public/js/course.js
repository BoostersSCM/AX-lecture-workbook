// js/course.js — 기수(코호트)별 회차 개방 제어
//
// 강사가 /admin에서 기수별로 회차를 열고 닫습니다. 상태는 course_settings의
// open_sessions_by_cohort 키에 JSON 객체로 저장됩니다. 예: {"1":[1,2],"2":[1]}
// 테이블이 아직 없으면(마이그레이션 전) 전부 열린 것으로 동작해
// 기존 배포가 잠기지 않습니다.

import { supabase } from './supabase.js';

const KEY = 'open_sessions_by_cohort';
const DEFAULT_OPEN = [1]; // 새 기수의 기본값: 1회차만 열림

let _map;             // undefined = 아직 안 읽음, null = 제어 없음(전부 열림), 객체 = 기수별 맵
let _missing = false; // 테이블 미생성 여부 (admin 안내용)

export async function getOpenMap({ fresh = false } = {}) {
  if (_map !== undefined && !fresh) return _map;

  const { data, error } = await supabase
    .from('course_settings').select('value').eq('key', KEY).maybeSingle();

  if (error) {
    _missing = /course_settings/.test(error.message || '') || error.code === '42P01';
    console.warn('[course] 회차 개방 설정을 읽지 못해 전체 개방으로 동작합니다:', error.message);
    _map = null;
    return _map;
  }

  _missing = false;
  if (!data) { _map = { '1': DEFAULT_OPEN }; return _map; }
  try {
    const parsed = JSON.parse(data.value);
    _map = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : { '1': DEFAULT_OPEN };
  } catch {
    _map = { '1': DEFAULT_OPEN };
  }
  return _map;
}

export function settingsMissing() { return _missing; }

// 이 사람에게 열린 회차 목록. null = 전부 열림(강사 또는 제어 미설정)
export async function openSessionsFor(me) {
  if (me?.role === 'instructor') return null;
  const map = await getOpenMap();
  if (map === null) return null;
  const cohort = Number(me?.cohort);
  if (!cohort) return DEFAULT_OPEN; // 온보딩 전 — requireAuth가 어차피 온보딩으로 보냅니다
  const list = map[String(cohort)];
  return Array.isArray(list) ? list.map(Number) : DEFAULT_OPEN;
}

export async function isSessionOpen(n, me) {
  const open = await openSessionsFor(me);
  if (open === null) return true;
  return open.includes(Number(n));
}

// 강사 전용 — 한 기수의 개방 목록을 갱신 (RLS가 서버에서 한 번 더 막습니다)
export async function setOpenSessionsFor(cohort, list) {
  const map = (await getOpenMap({ fresh: true })) || {};
  const next = { ...map, [String(Number(cohort))]: [...new Set(list.map(Number))].sort() };
  const { error } = await supabase
    .from('course_settings')
    .upsert({ key: KEY, value: JSON.stringify(next) }, { onConflict: 'key' });
  if (!error) _map = next;
  return { error };
}

// 잠긴 회차 안내 화면 (session/clinic 공용)
export function lockedNotice(n, openList) {
  const opened = Array.isArray(openList) && openList.length
    ? [...openList].sort().map(x => `${x}회차`).join(' · ')
    : '아직 없음';
  const wrap = document.createElement('div');
  wrap.className = 'locked-notice';
  wrap.innerHTML = `
    <div class="locked-icon" aria-hidden="true">🔒</div>
    <h2>${n}회차는 아직 열리지 않았습니다</h2>
    <p>회차는 강의 진도에 맞춰 강사가 엽니다. 수업에서 만나면 함께 열립니다.</p>
    <p class="locked-open">내 기수에 지금 열려 있는 회차 — <b>${opened}</b></p>
    <p><a class="btn-link" href="/">홈으로 돌아가기</a></p>`;
  return wrap;
}
