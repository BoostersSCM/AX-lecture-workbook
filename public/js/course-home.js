// js/course-home.js — 강의 홈 (/c/{slug}) : 학습 여정 허브 + 기수 참여
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { el, frag } from './render.js';
import {
  C, initCourse, coursePath, requiredKeys, enroll,
  openSessionsForMe, scheduledDateFor, formatKstOpenFrom,
} from './courseState.js';
import { toast } from './supabase.js';

const app = document.getElementById('app');

function sessionCard(session, progress, locked, openFrom) {
  const pct = progress.total ? progress.pct : 0;
  // 잠긴 회차: 링크가 아닌 카드로 — 강의 진도에 맞춰 강사가 엽니다
  const tagOpen  = locked ? '<div' : `<a href="${coursePath('session')}?n=${session.n}"`;
  const tagClose = locked ? '</div>' : '</a>';
  return `
    ${tagOpen} class="journey-card journey-${session.n}${locked ? ' journey-locked' : ''}"${locked ? ' aria-disabled="true"' : ''}>
      <div class="journey-card-top">
        <span class="journey-number">${String(session.n).padStart(2, '0')}</span>
        <span class="journey-tag">${esc(session.tag || '')}</span>
        <span class="journey-arrow" aria-hidden="true">${locked ? '🔒' : '↗'}</span>
      </div>
      <h3>${esc(session.title)}</h3>
      <p>${locked ? (openFrom ? `${esc(openFrom)}(한국 시간)부터 자동으로 열립니다.` : '강사가 열면 시작할 수 있습니다. 수업에서 만나요.') : esc(session.goal || '')}</p>
      <div class="journey-card-foot">
        <span>${locked ? '잠김' : `${progress.done}/${progress.total} 완료`}</span>
        <span class="mini-progress"><i style="width:${locked ? 0 : pct}%"></i></span>
      </div>
    ${tagClose}`;
}

// 기수 참여 카드 — 자유 참여: 모집 중인 기수를 고르면 바로 시작
function enrollCard() {
  const recruiting = C.cohorts.filter(c => c.recruiting);
  const wrap = el(`
    <section class="enroll-card" id="enroll">
      <div class="enroll-copy">
        <span class="eyebrow">JOIN · 기수 참여</span>
        <h2>어느 기수로 참여하시나요?</h2>
        <p>${recruiting.length
          ? '기수를 고르면 바로 시작됩니다. 회차는 그 기수의 진도에 맞춰 열립니다.'
          : '지금 모집 중인 기수가 없습니다. 다음 기수 모집이 열리면 여기서 바로 참여할 수 있습니다.'}</p>
      </div>
      <div class="enroll-choices"></div>
    </section>`);
  const box = wrap.querySelector('.enroll-choices');
  for (const c of recruiting) {
    const b = el(`<button class="enroll-choice" type="button"><b>${c.number}기</b><span>${esc(c.label || `${c.number}기 수강생`)}</span></button>`);
    b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await enroll(c.id);
      if (error) {
        b.disabled = false;
        toast('참여에 실패했습니다: ' + error.message, 'error');
        return;
      }
      toast(`${c.number}기로 참여했습니다. 환영합니다!`);
      setTimeout(() => location.reload(), 500);
    });
    box.appendChild(b);
  }
  return wrap;
}

(async function main() {
  const me = await requireAuth();
  if (!me) return;

  const course = await initCourse(me);
  if (!course) {
    await mountShell();
    app.appendChild(el('<div class="empty-state">강의를 찾을 수 없습니다. <a href="/">강의 목록으로</a></div>'));
    return;
  }
  await mountShell();
  mountStatus(document.getElementById('savestate'));
  document.title = `${C.COURSE.title || C.course.title} · AX 워크북`;

  const entries = await loadEntries();

  const needEnroll = Boolean(C.course.id) && !C.instructor && !C.myCohort;

  // 내 기수에 열린 회차 확인 — 강사는 전부 열림
  const open = openSessionsForMe(me);
  const lockedSet = new Set(open === null ? [] : C.SESSIONS.map(x => x.n).filter(n => !open.includes(n)));
  const all = progressOf(requiredKeys('all'), entries);
  const setupP = progressOf(requiredKeys('setup'), entries);
  const clinicP = progressOf(requiredKeys('clinic'), entries);
  const firstOpen = C.SESSIONS.find(s => !lockedSet.has(s.n))?.n || C.SESSIONS[0]?.n || 1;

  const heroCta = needEnroll
    ? '<a class="hero-cta" href="#enroll">기수 참여하고 시작하기 <span>→</span></a>'
    : `<a class="hero-cta" href="${coursePath('session')}?n=${firstOpen}">${all.done ? '이어서 학습하기' : '첫 실습 시작하기'} <span>→</span></a>`;

  // 형제 섹션이 여러 개라 el()이 아니라 frag()를 써야 전부 붙는다
  app.appendChild(frag(`
    <section class="home-hero${C.VISUALS && C.COURSE.promise ? '' : ' home-hero-plain'}">
      <div class="hero-copy">
        <div class="hero-kicker"><span class="signal-dot"></span> BOOSTERS AX LAB${C.SESSIONS.length ? ` · ${C.SESSIONS.length} SESSIONS` : ''}</div>
        <h1>${esc(C.COURSE.title || C.course.title)}</h1>
        ${C.COURSE.promise ? `<p class="hero-tagline">${esc(C.COURSE.promise)}</p>` : (C.course.subtitle ? `<p class="hero-tagline">${esc(C.course.subtitle)}</p>` : '')}
        ${C.COURSE.intro ? `<p class="hero-lede">${esc(C.COURSE.intro)}</p>` : ''}
        <div class="hero-actions">
          ${heroCta}
          <a class="hero-text-link" id="flow-link" href="#journey">전체 흐름 보기</a>
        </div>
        ${C.AX_FLOW.length ? '<div class="hero-proof"><span class="proof-line"></span><span>원본 SaaS에서 워크북을 거쳐, 같은 SaaS에 다시 저장</span></div>' : ''}
      </div>
      ${C.VISUALS && C.AX_FLOW.length ? `
      <div class="hero-art-wrap">
        <div class="hero-art-label"><span>THE SHIFT</span><b>one source → many outputs</b></div>
        <img class="hero-art" src="/assets/workflow-connection.png" alt="하나의 업무 정보가 기록·대화·태스크·데이터 표로 이어지는 일러스트">
        <div class="hero-art-caption">한 번 정리한 정보가,<br><strong>팀의 여러 업무로 이어집니다.</strong></div>
      </div>` : ''}
    </section>`));

  if (needEnroll) app.appendChild(enrollCard());

  if (C.AX_FLOW.length) {
    app.appendChild(frag(`
    <section class="home-intro-row">
      <div><span class="section-kicker">이 워크북의 관통 질문</span><h2>“어디서 가져와, 무엇을 고치고,<br>어디에 다시 저장할 것인가?”</h2></div>
      <p>워크북은 메모장이 아니라 <em>SaaS 편집 작업대</em>입니다. Notion 문단·Asana 태스크·Slack 봇 메시지를 가져와 사람이 고치고, 같은 위치에 다시 저장하는 흐름을 배웁니다.</p>
    </section>

    <section class="flow-section" id="journey">
      <div class="section-heading"><div><span class="section-kicker">ONE THREAD / ${String(C.AX_FLOW.length).padStart(2, '0')} MOVES</span><h2>${C.SESSIONS.length}주 동안 하나의 흐름을 만듭니다</h2></div><span class="section-side-note">가져오기 → 다듬기 → 반영하기 → 이어쓰기</span></div>
      <div class="flow-rail">
        ${C.AX_FLOW.map((item, i) => `
          <div class="flow-step flow-${item.tone}">
            <div class="flow-step-head"><span>${item.n}</span><small>${item.en}</small></div>
            <h3>${esc(item.verb)}</h3><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p><span class="flow-tool">${esc(item.tool)}</span>
            ${i < C.AX_FLOW.length - 1 ? '<span class="flow-connector" aria-hidden="true">→</span>' : ''}
          </div>`).join('')}
      </div>
    </section>`));
  }

  if (C.INTEGRATIONS.length) {
    app.appendChild(frag(`
    <section class="workspace-section">
      <div class="section-heading"><div><span class="section-kicker">NOT JUST NOTION</span><h2>같은 봇, 다른 도착지</h2></div><p>도구는 목적지가 아니라 역할입니다.</p></div>
      <div class="integration-grid">
        ${C.INTEGRATIONS.map(item => `
          <article class="integration-card integration-${item.tone}">
            <div class="integration-top"><span class="tool-mark">${esc(item.icon)}</span><span class="tool-name">${esc(item.name)}</span><span class="integration-arrow">↗</span></div>
            <span class="integration-eyebrow">${esc(item.eyebrow)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>
          </article>`).join('')}
      </div>
      <div class="bot-strip"><span class="bot-strip-label">SCM PORTAL에서 가져온 구조</span><div class="bot-flow"><b>SaaS 원본</b><i>→</i><strong>워크북 편집</strong><i>→</i><b>SaaS 저장</b></div><p>API를 직접 붙이던 경험을 수강생의 언어로 바꿉니다. “불러온 값을 고치면 원래 업무 도구에도 반영된다.”</p></div>
    </section>`));
  }

  if (C.DATA_MODEL.length) {
    app.appendChild(frag(`
    <section class="data-model-section">
      <div class="section-heading"><div><span class="section-kicker">THE WORKBOOK UNDER THE HOOD</span><h2>이 워크북도 하나의 연결 사례입니다</h2></div><span class="section-side-note">Supabase · Auth · RLS</span></div>
      <div class="data-model-intro"><p>여러분이 입력한 한 문장이 DB의 한 행이 되고, SaaS 수정 결과도 다시 워크북 기록으로 남습니다. 3회차에서는 원본 값을 가져오고 수정 저장한 뒤, SaaS와 Supabase 양쪽에서 결과를 확인합니다.</p><code>SaaS 원본 ↔ 워크북 편집 → entries 기록</code></div>
      <div class="data-model-grid">
        ${C.DATA_MODEL.map(item => `<article class="data-model-card data-${item.tone}"><div class="data-card-top"><span class="data-icon">${item.name === 'RLS' ? '↗' : item.name.slice(0, 1).toUpperCase()}</span><code>${esc(item.name)}</code></div><span>${esc(item.label)}</span><p>${esc(item.text)}</p></article>`).join('')}
      </div>
    </section>`));
  }

  const quickLinks = [
    C.SETUP.groups?.length ? `<a href="${coursePath('setup')}"><span class="quick-index">00</span><div><b>연결 준비</b><small>${setupP.done}/${setupP.total} 완료 · 읽기 범위 확인</small></div><span>→</span></a>` : '',
    C.CLINIC.groups?.length ? `<a href="${coursePath('clinic')}"><span class="quick-index">FIN</span><div><b>${esc(C.CLINIC.title || '업무 설계서')}</b><small>${clinicP.done}/${clinicP.total} 완료 · 최종 산출물</small></div><span>→</span></a>` : '',
  ].filter(Boolean).join('');

  app.appendChild(frag(`
    <section class="progress-section">
      <div class="progress-main"><span class="section-kicker">YOUR WORKBOOK</span><h2>${esc(me.name)} 님의 연결 현황</h2><p>입력은 각 회차 하단의 [모두 저장]으로 확정됩니다.${C.myCohort ? ` 지금 <b>${C.myCohort.number}기</b>로 참여 중입니다.` : ''}</p><div class="big-progress"><span style="width:${all.pct}%"></span></div><div class="progress-meta"><strong>${all.pct}%</strong><span>${all.done} / ${all.total} 항목 완료</span></div></div>
      ${quickLinks ? `<div class="quick-links">${quickLinks}</div>` : ''}
    </section>

    <section class="sessions-section"><div class="section-heading"><div><span class="section-kicker">WORKBOOK PAGES</span><h2>회차별 실습</h2></div>${Object.keys(C.PROMPTS).length ? `<a class="section-link" href="${coursePath('prompts')}">프롬프트 카드 열기 ↗</a>` : ''}</div><div class="journey-grid">${C.SESSIONS.map(session => sessionCard(session, progressOf(requiredKeys(session.n), entries), lockedSet.has(session.n), lockedSet.has(session.n) ? formatKstOpenFrom(scheduledDateFor(session.n)) : '')).join('')}</div></section>`));

  const flowLink = document.getElementById('flow-link');
  flowLink?.addEventListener('click', (event) => {
    const target = document.getElementById('journey');
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#journey');
  });
})();
