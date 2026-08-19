// js/store.js — 워크북 답변 저장/불러오기 + 자동저장
//
// 모든 입력은 entries(user_id, item_key, value) 한 테이블에 들어갑니다.
// 문항이 늘어나도 DB는 그대로입니다.

import { supabase, toast } from './supabase.js';
import { getMe } from './auth.js';

let cache = null;       // { item_key: value }
let userId = null;

// ── 저장 모드 ────────────────────────────────────────────────
// 회차·설계서 페이지는 타이핑마다 DB에 쓰지 않습니다(과부하 방지 + 명시적 저장 학습).
// 수동 모드에서는 입력이 로컬 초안(axwb.pending)에만 쌓이고,
// 하단 저장 바의 [모두 저장] 버튼이 한 번의 일괄 upsert로 보냅니다.
// 연결 준비 페이지 등은 기존 자동 저장(디바운스)을 유지합니다.
let manualMode = false;

export function setManualSave(on = true) {
  manualMode = Boolean(on);
}

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

  // 지난번에 저장하지 못한 값(또는 수동 모드의 초안)이 있으면 그게 최신입니다 — 화면에 먼저 반영
  const pending = readPending();
  for (const k of Object.keys(pending)) cache[k] = pending[k];

  if (manualMode) {
    // 수동 모드: 자동 업로드하지 않고, 저장 바에 "저장 안 된 변경 N개"로 보여줍니다
    updateSaveBar();
  } else {
    flushPending();
  }

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

  // 수동 모드의 일반 입력: DB로 보내지 않고 로컬 초안으로만 둡니다.
  // (immediate는 저장 버튼·연동 영수증 등 명시적 저장이므로 그대로 통과)
  if (manualMode && !immediate) {
    markPending(key, value);
    updateSaveBar();
    return undefined;
  }

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
      updateSaveBar();
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

// ── 수동 저장 바 ─────────────────────────────────────────────
let saveBarEl = null;

export function mountSaveBar() {
  if (saveBarEl) return saveBarEl;
  saveBarEl = document.createElement('div');
  saveBarEl.className = 'savebar';
  saveBarEl.hidden = true;
  saveBarEl.innerHTML = `
    <span class="savebar-text"></span>
    <button class="primary savebar-button" type="button">모두 저장</button>`;
  document.body.appendChild(saveBarEl);

  saveBarEl.querySelector('button').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '저장 중…';
    const ok = await saveDirty();
    btn.disabled = false;
    btn.textContent = '모두 저장';
    if (ok) toast('워크북 입력을 저장했습니다.');
  });

  // 저장 안 한 변경이 있는 채로 떠나려 하면 경고 (초안은 localStorage에 남아 복구됩니다)
  window.addEventListener('beforeunload', (e) => {
    if (!manualMode || !Object.keys(readPending()).length) return;
    e.preventDefault();
    e.returnValue = '';
  });

  updateSaveBar();
  return saveBarEl;
}

function updateSaveBar() {
  if (!saveBarEl) return;
  const count = Object.keys(readPending()).length;
  saveBarEl.hidden = count === 0;
  const text = saveBarEl.querySelector('.savebar-text');
  if (text) text.textContent = `저장 안 된 변경 ${count}개`;
}

// 수동 모드: 쌓인 초안 전체를 한 번의 요청으로 저장합니다
export async function saveDirty() {
  const p = readPending();
  const keys = Object.keys(p);
  if (!keys.length) return true;

  if (!userId) {
    const me = await getMe();
    if (!me) { await warnIfSessionExpired(); return false; }
    userId = me.id;
  }

  setStatus('saving');
  const rows = keys.map(k => ({ user_id: userId, item_key: k, value: p[k] }));
  const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'user_id,item_key' });

  if (error) {
    setStatus('error');
    console.error('[store] batch save failed', error);
    await warnIfSessionExpired();
    return false;
  }
  writePending({});
  if (cache) for (const k of keys) cache[k] = p[k];
  updateSaveBar();
  setStatus('saved');
  return true;
}

// 로그인 후 남아 있는 미저장분을 다시 올립니다 (자동 저장 모드의 복구 경로)
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
