// js/shell.js — 공통 헤더/네비
import { getMe, signOut, isInstructor } from './auth.js';

const NAV = [
  { href: '/',        label: '홈' },
  { href: '/setup',   label: '사전 세팅' },
  { href: '/session?n=1', label: '1회차', match: 'n=1' },
  { href: '/session?n=2', label: '2회차', match: 'n=2' },
  { href: '/session?n=3', label: '3회차', match: 'n=3' },
  { href: '/session?n=4', label: '4회차', match: 'n=4' },
  { href: '/clinic',  label: '설계서' },
  { href: '/prompts', label: '프롬프트' },
];

export async function mountShell() {
  const me = await getMe();

  const path = location.pathname.replace(/\.html$/, '') || '/';
  const qs   = location.search;

  const links = NAV.map(item => {
    const base = item.href.split('?')[0];
    let on = false;
    if (item.match) on = path.startsWith('/session') && qs.includes(item.match);
    else if (base === '/') on = path === '/' || path === '/index';
    else on = path === base;
    return `<a href="${item.href}"${on ? ' class="on"' : ''}>${item.label}</a>`;
  }).join('');

  const adminLink = me && isInstructor(me)
    ? `<a href="/admin"${path === '/admin' ? ' class="on"' : ''}>강사</a>` : '';

  const who = me
    ? `<span class="whoami"><b>${esc(me.name)}</b>${isInstructor(me) ? '<span class="tag-instructor">강사</span>' : ''}
         &nbsp;<a href="#" id="signout" style="color:var(--muted)">로그아웃</a></span>`
    : '';

  const bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML = `
    <div class="topbar-in">
      <a class="brand" href="/">AX <span>워크북</span></a>
      <nav class="navlinks">${links}${adminLink}</nav>
      ${who}
    </div>`;
  document.body.prepend(bar);

  const out = document.getElementById('signout');
  if (out) out.addEventListener('click', e => { e.preventDefault(); signOut(); });

  // 저장 상태 표시 엘리먼트
  const st = document.createElement('div');
  st.className = 'savestate';
  st.id = 'savestate';
  document.body.appendChild(st);

  return me;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// **굵게** 만 지원하는 최소 마크업 (문항 라벨용)
export function mini(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
