// js/supabase.js — Supabase 클라이언트 (CDN ESM)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = window.__ENV__?.SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[ax-workbook] Supabase 환경변수가 비어 있습니다. .env.local 또는 Vercel 환경변수를 확인하세요.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// 화면 우하단 토스트
export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

export function isBoostersEmail(email) {
  return /@boosters\.kr$/i.test((email || '').trim());
}
