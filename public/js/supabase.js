// js/supabase.js — Supabase 클라이언트 (CDN ESM)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = window.__ENV__?.SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';

// 설정이 잘못되면 화면이 백지가 되고 콘솔을 열지 않는 한 아무도 이유를 모릅니다.
// 그래서 앱을 띄우기 전에 먼저 눈에 보이는 안내를 깔아둡니다.
function configError(title, detail) {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `
      <div class="login-wrap"><div class="login-card">
        <div class="eyebrow">설정 필요</div>
        <h1>${title}</h1>
        <p class="lede">${detail}</p>
        <p class="login-foot">참가자분이 이 화면을 보셨다면 강사에게 알려주세요.</p>
      </div></div>`;
  });
  throw new Error('[ax-workbook] ' + title);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  configError(
    '환경변수가 비어 있습니다',
    'SUPABASE_URL / SUPABASE_ANON_KEY 가 설정되지 않았습니다. ' +
    '로컬은 <code>.env.local</code>, 배포는 Vercel 환경변수를 확인한 뒤 <b>재배포</b>해야 합니다.'
  );
}

// anon key는 JWT(eyJ…) 또는 publishable key(sb_publishable_…) 형태입니다.
// 프로젝트 ref를 잘못 넣는 실수가 잦아서 미리 잡아줍니다.
if (!/^(eyJ|sb_publishable_)/.test(SUPABASE_ANON_KEY)) {
  configError(
    'API 키가 올바르지 않습니다',
    'SUPABASE_ANON_KEY 자리에 프로젝트 ref가 들어간 것 같습니다. ' +
    'Supabase → Project Settings → API 의 <b>anon public</b> 키(<code>eyJ…</code>로 시작)를 넣고 재배포해주세요.'
  );
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
