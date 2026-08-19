// js/store.js — 워크북 답변 저장/불러오기 + 자동저장
//
// 모든 입력은 entries(user_id, item_key, value) 한 테이블에 들어갑니다.
// 문항이 늘어나도 DB는 그대로입니다.

import { supabase, toast } from './supabase.js';
import { getMe } from './auth.js';

let cache = null;       // { item_key: value }
let userId = null;

export async function loadEntries({ fresh = false } = {}) {
  if (cache && !fresh) return cache;
  const me = await getMe();
  if (!me) return {};
  userId = me.id;

  const { data, error } = await supabase
    .from('entries').select('item_key, value').eq('user_id', me.id);
  if (error) { toast('불러오기에 실패했습니다.', 'error'); return {}; }

  cache = {};
  for (const row of data) cache[row.item_key] = row.value;

  // 지난번에 저장하지 못한 값이 있으면 그게 최신입니다 — 화면에 먼저 반영하고 다시 올립니다
  const pending = readPending();
  for (const k of Object.keys(pending)) cache[k] = pending[k];
  flushPending();

  return cache;
}

// 다른 사람(강사가 열람할 때)의 답변
export async function loadEntriesOf(uid) {
  const { data, error } = await supabase
    .from('entries').select('item_key, value, updated_at').eq('user_id', uid);
  if (error) return {};
  const out = {};
  for (const row of data) out[row.item_key] = row.value;
  return out;
}

export async function loadSlackEvents({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('slack_events')
    .select('event_id, channel_id, slack_user_id, text, event_ts, received_at')
    .order('received_at', { ascending: false })
    .limit(limit);
  return { events: data || [], error };
}

export function getValue(key) {
  return cache?.[key] ?? '';
}

// ── 미저장분 로컬 백업 ───────────────────────────────────────
// 세션 만료(6시간 time-box)나 네트워크 끊김으로 저장이 실패하면
// 참가자가 쓰던 내용이 그대로 날아갑니다. 실패분은 localStorage에 남겨두고
// 다음 로드 때 자동으로 다시 올립니다.
const PENDING = 'axwb.pending';

function readPending() {
  try { return JSON.parse(localStorage.getItem(PENDING) || '{}'); } catch { return {}; }
}
function writePending(obj) {
  try { localStorage.setItem(PENDING, JSON.stringify(obj)); } catch { /* 용량 초과는 무시 */ }
}
function markPending(key, value) {
  const p = readPending(); p[key] = value; writePending(p);
}
function clearPending(key) {
  const p = readPending(); delete p[key]; writePending(p);
}

// 저장 — 같은 키를 연달아 치면 마지막 것만 나갑니다
const timers = {};
const DEBOUNCE = 700;
let sessionWarned = false;

export function saveValue(key, value, { immediate = false } = {}) {
  if (cache) cache[key] = value;
  clearTimeout(timers[key]);

  const run = async () => {
    if (!userId) {
      const me = await getMe();
      if (!me) { markPending(key, value); return false; }
      userId = me.id;
    }
    setStatus('saving');
    const { error } = await supabase
      .from('entries')
      .upsert({ user_id: userId, item_key: key, value }, { onConflict: 'user_id,item_key' });

    if (error) {
      markPending(key, value);
      setStatus('error');
      console.error('[store] save failed', key, error);
      await warnIfSessionExpired();
      return false;
    } else {
      clearPending(key);
      setStatus('saved');
      return true;
    }
  };

  if (immediate) return run();
  timers[key] = setTimeout(run, DEBOUNCE);
  return undefined;
}

// 저장이 실패했을 때 세션이 끊긴 것인지 확인하고 한 번만 안내합니다
async function warnIfSessionExpired() {
  if (sessionWarned) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return; // 세션은 살아 있음 = 일시적 오류
  sessionWarned = true;
  toast('로그인이 만료되어 저장하지 못했습니다. 다시 로그인하면 이어서 저장됩니다.', 'error');
  const bar = document.getElementById('savestate');
  if (bar) {
    bar.innerHTML = '로그인 만료 — <a href="/login" style="color:inherit;text-decoration:underline">다시 로그인</a>';
    bar.className = 'savestate error';
  }
}

// 로그인 후 남아 있는 미저장분을 다시 올립니다
async function flushPending() {
  const p = readPending();
  const keys = Object.keys(p);
  if (!keys.length || !userId) return;

  const rows = keys.map(k => ({ user_id: userId, item_key: k, value: p[k] }));
  const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'user_id,item_key' });
  if (!error) {
    writePending({});
    if (cache) for (const k of keys) cache[k] = p[k];
    toast(`저장하지 못했던 ${keys.length}개 항목을 복구했습니다.`);
  }
}

// ── 저장 상태 표시 ───────────────────────────────────────────
let statusEl = null;
let statusTimer = null;

export function mountStatus(el) { statusEl = el; }

function setStatus(state) {
  if (!statusEl) return;
  clearTimeout(statusTimer);
  const map = {
    saving: ['저장 중…', 'saving'],
    saved:  ['저장됨', 'saved'],
    error:  ['저장 실패 — 새로고침 후 다시 시도해주세요', 'error'],
  };
  const [text, cls] = map[state] || ['', ''];
  statusEl.textContent = text;
  statusEl.className = 'savestate ' + cls;
  if (state === 'saved') {
    statusTimer = setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'savestate'; }, 1800);
  }
}

// ── 진행률 ───────────────────────────────────────────────────
// 채워진 항목 수 / 전체 항목 수
export function progressOf(keys, entries = cache || {}) {
  const total = keys.length;
  if (!total) return { done: 0, total: 0, pct: 0 };
  const done = keys.filter(k => {
    const v = entries[k];
    return v !== undefined && v !== null && String(v).trim() !== '' && v !== 'false';
  }).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}
