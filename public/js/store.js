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

export function getValue(key) {
  return cache?.[key] ?? '';
}

// 저장 — 같은 키를 연달아 치면 마지막 것만 나갑니다
const timers = {};
const DEBOUNCE = 700;

export function saveValue(key, value, { immediate = false } = {}) {
  if (cache) cache[key] = value;
  clearTimeout(timers[key]);

  const run = async () => {
    if (!userId) {
      const me = await getMe();
      if (!me) return;
      userId = me.id;
    }
    setStatus('saving');
    const { error } = await supabase
      .from('entries')
      .upsert({ user_id: userId, item_key: key, value }, { onConflict: 'user_id,item_key' });
    setStatus(error ? 'error' : 'saved');
    if (error) console.error('[store] save failed', key, error);
  };

  if (immediate) run();
  else timers[key] = setTimeout(run, DEBOUNCE);
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
