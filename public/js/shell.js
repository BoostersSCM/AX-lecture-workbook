// js/shell.js — 공통 헤더/네비 (플랫폼/강의 컨텍스트 겸용)
//
// 강의 페이지(회차·설계서 등)는 initCourse() 후에 mountShell()을 부릅니다.
// C.course가 채워져 있으면 그 강의의 네비(회차 수·문서 구성이 강의마다 다름)를,
// 아니면 플랫폼 네비(강의 목록·마이)를 그립니다.
import { getMe, signOut, isInstructor, watchSessionExpiry, stopMemberPreview } from './auth.js';
import { C, coursePath, openSessionsForMe } from './courseState.js';

export async function mountShell() {
  const me = await getMe();

  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const qs   = location.search;
  const inCourse = Boolean(C.course);

  const items = [];
  if (inCourse) {
    items.push({ href: coursePath(), label: '강의 홈', exact: true });
    if (C.SETUP.groups?.length) items.push({ href: coursePath('setup'), label: '연결 준비' });
    for (const s of C.SESSIONS) items.push({ href: `${coursePath('session')}?n=${s.n}`, label: `${s.n}회차`, match: `n=${s.n}`, n: s.n });
    if (C.CLINIC.groups?.length) items.push({ href: coursePath('clinic'), label: '업무 설계서', lockWith: C.SESSIONS.at(-1)?.n });
    if (Object.keys(C.PROMPTS).length) items.push({ href: coursePath('prompts'), label: '프롬프트 카드' });
    if (C.course.id) items.push({ href: coursePath('qna'), label: 'Q&A' });
    items.push({ href: '/', label: '강의 목록', exact: true });
    items.push({ href: '/my', label: '마이' });
  } else {
    items.push({ href: '/', label: '강의 목록', exact: true });
    items.push({ href: '/my', label: '마이' });
  }

  // 잠긴 회차는 네비에도 자물쇠로 표시 (강사는 전부 열림)
  const open = inCourse && me ? openSessionsForMe(me) : null;
  const isLocked = (item) => {
    if (open === null) return false;
    const n = item.n ?? item.lockWith;
    return Number.isInteger(n) ? !open.includes(n) : false;
  };

  const links = items.map(item => {
    const base = item.href.split('?')[0].replace(/\/$/, '') || '/';
    let on = false;
    if (item.match) on = path === base && qs.includes(item.match);
    else if (item.exact) on = path === base;
    else on = path === base;
    const locked = isLocked(item);
    const cls = [on ? 'on' : '', locked ? 'nav-locked' : ''].filter(Boolean).join(' ');
    return `<a href="${item.href}"${cls ? ` class="${cls}"` : ''}${locked ? ' title="강사가 아직 열지 않았습니다"' : ''}>${item.label}${locked ? ' 🔒' : ''}</a>`;
  }).join('');

  // 강사 콘솔 — 강의 안에서는 그 강의 스튜디오로, 밖에서는 스튜디오 홈으로
  const canStudio = me && (isInstructor(me) || (inCourse && C.instructor)) && !me._preview;
  const studioHref = inCourse && C.course?.slug ? `/studio/${C.course.slug}` : '/studio';
  const adminLink = canStudio
    ? `<a href="${studioHref}"${path.startsWith('/studio') ? ' class="on"' : ''}>스튜디오</a>` : '';

  const who = me
    ? `<span class="whoami"><b>${esc(me.name)}</b>${isInstructor(me) ? '<span class="tag-instructor">강사</span>' : ''}${me._preview ? '<span class="tag-instructor tag-preview">수강생 뷰</span>' : ''}
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

  // 수강생 뷰 프리뷰 배너 — 강사가 지금 어떤 눈으로 보고 있는지 항상 표시
  if (me?._preview) {
    const banner = document.createElement('div');
    banner.className = 'preview-banner';
    banner.innerHTML = `
      <span>👀 <b>수강생 뷰</b>로 보는 중 (${me.cohort}기 기준) — 잠금·네비가 수강생에게 보이는 그대로입니다</span>
      <button type="button">강사로 돌아가기</button>`;
    banner.querySelector('button').addEventListener('click', () => {
      stopMemberPreview();
      location.reload();
    });
    document.body.insertBefore(banner, bar);
  }

  const out = document.getElementById('signout');
  if (out) out.addEventListener('click', e => { e.preventDefault(); signOut(); });

  // 저장 상태 표시 엘리먼트
  const st = document.createElement('div');
  st.className = 'savestate';
  st.id = 'savestate';
  document.body.appendChild(st);

  // 페이지를 켜둔 채 6시간을 넘기는 경우 대비
  if (me) watchSessionExpiry();

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
