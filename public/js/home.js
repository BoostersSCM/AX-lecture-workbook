// js/home.js — 학습 여정 허브
import { requireAuth, needsTeam, saveTeam } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { COURSE, SESSIONS, SETUP, CLINIC, AX_FLOW, INTEGRATIONS, DATA_MODEL, requiredKeys } from './content.js';
import { el, frag } from './render.js';

const app = document.getElementById('app');

function sessionCard(session, progress) {
  const pct = progress.total ? progress.pct : 0;
  return `
    <a class="journey-card journey-${session.n}" href="/session?n=${session.n}">
      <div class="journey-card-top">
        <span class="journey-number">0${session.n}</span>
        <span class="journey-tag">${esc(session.tag)}</span>
        <span class="journey-arrow" aria-hidden="true">↗</span>
      </div>
      <h3>${esc(session.title)}</h3>
      <p>${esc(session.goal)}</p>
      <div class="journey-card-foot">
        <span>${progress.done}/${progress.total} 완료</span>
        <span class="mini-progress"><i style="width:${pct}%"></i></span>
      </div>
    </a>`;
}

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const entries = await loadEntries();
  const all = progressOf(requiredKeys('all'), entries);
  const setupP = progressOf(requiredKeys('setup'), entries);
  const clinicP = progressOf(requiredKeys('clinic'), entries);

  // 형제 섹션이 여러 개라 el()이 아니라 frag()를 써야 전부 붙는다
  app.appendChild(frag(`
    <section class="home-hero">
      <div class="hero-copy">
        <div class="hero-kicker"><span class="signal-dot"></span> BOOSTERS AX LAB · 4 WEEKS</div>
        <h1>${esc(COURSE.title)}</h1>
        <p class="hero-tagline">${esc(COURSE.promise)}</p>
        <p class="hero-lede">${esc(COURSE.intro)}</p>
        <div class="hero-actions">
          <a class="hero-cta" href="/session?n=1">첫 실습 시작하기 <span>→</span></a>
          <a class="hero-text-link" id="flow-link" href="#journey">전체 흐름 보기</a>
        </div>
        <div class="hero-proof"><span class="proof-line"></span><span>원본 SaaS에서 워크북을 거쳐, 같은 SaaS에 다시 저장</span></div>
      </div>
      <div class="hero-art-wrap">
        <div class="hero-art-label"><span>THE SHIFT</span><b>one source → many outputs</b></div>
        <img class="hero-art" src="/assets/workflow-connection.png" alt="하나의 업무 정보가 기록·대화·태스크·데이터 표로 이어지는 일러스트">
        <div class="hero-art-caption">한 번 정리한 정보가,<br><strong>팀의 여러 업무로 이어집니다.</strong></div>
      </div>
    </section>

    <section class="home-intro-row">
      <div><span class="section-kicker">이 워크북의 관통 질문</span><h2>“어디서 가져와, 무엇을 고치고,<br>어디에 다시 저장할 것인가?”</h2></div>
      <p>워크북은 메모장이 아니라 <em>SaaS 편집 작업대</em>입니다. Notion 문단·Asana 태스크·Slack 봇 메시지를 가져와 사람이 고치고, 같은 위치에 다시 저장하는 흐름을 배웁니다.</p>
    </section>

    <section class="flow-section" id="journey">
      <div class="section-heading"><div><span class="section-kicker">ONE THREAD / 04 MOVES</span><h2>4주 동안 하나의 흐름을 만듭니다</h2></div><span class="section-side-note">가져오기 → 다듬기 → 반영하기 → 이어쓰기</span></div>
      <div class="flow-rail">
        ${AX_FLOW.map((item, i) => `
          <div class="flow-step flow-${item.tone}">
            <div class="flow-step-head"><span>${item.n}</span><small>${item.en}</small></div>
            <h3>${esc(item.verb)}</h3><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p><span class="flow-tool">${esc(item.tool)}</span>
            ${i < AX_FLOW.length - 1 ? '<span class="flow-connector" aria-hidden="true">→</span>' : ''}
          </div>`).join('')}
      </div>
    </section>

    <section class="workspace-section">
      <div class="section-heading"><div><span class="section-kicker">NOT JUST NOTION</span><h2>같은 봇, 다른 도착지</h2></div><p>도구는 목적지가 아니라 역할입니다.</p></div>
      <div class="integration-grid">
        ${INTEGRATIONS.map(item => `
          <article class="integration-card integration-${item.tone}">
            <div class="integration-top"><span class="tool-mark">${esc(item.icon)}</span><span class="tool-name">${esc(item.name)}</span><span class="integration-arrow">↗</span></div>
            <span class="integration-eyebrow">${esc(item.eyebrow)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>
          </article>`).join('')}
      </div>
      <div class="bot-strip"><span class="bot-strip-label">SCM PORTAL에서 가져온 구조</span><div class="bot-flow"><b>SaaS 원본</b><i>→</i><strong>워크북 편집</strong><i>→</i><b>SaaS 저장</b></div><p>API를 직접 붙이던 경험을 수강생의 언어로 바꿉니다. “불러온 값을 고치면 원래 업무 도구에도 반영된다.”</p></div>
    </section>

    <section class="data-model-section">
      <div class="section-heading"><div><span class="section-kicker">THE WORKBOOK UNDER THE HOOD</span><h2>이 워크북도 하나의 연결 사례입니다</h2></div><span class="section-side-note">Supabase · Auth · RLS</span></div>
      <div class="data-model-intro"><p>여러분이 입력한 한 문장이 DB의 한 행이 되고, SaaS 수정 결과도 다시 워크북 기록으로 남습니다. 3회차에서는 원본 값을 가져오고 수정 저장한 뒤, SaaS와 Supabase 양쪽에서 결과를 확인합니다.</p><code>SaaS 원본 ↔ 워크북 편집 → entries 기록</code></div>
      <div class="data-model-grid">
        ${DATA_MODEL.map(item => `<article class="data-model-card data-${item.tone}"><div class="data-card-top"><span class="data-icon">${item.name === 'RLS' ? '↗' : item.name.slice(0, 1).toUpperCase()}</span><code>${esc(item.name)}</code></div><span>${esc(item.label)}</span><p>${esc(item.text)}</p></article>`).join('')}
      </div>
    </section>

    <section class="progress-section">
      <div class="progress-main"><span class="section-kicker">YOUR WORKBOOK</span><h2>${esc(me.name)} 님의 연결 현황</h2><p>입력한 내용은 자동 저장됩니다. 지금의 기록이 4회차에 나만의 봇 설계서가 됩니다.</p><div class="big-progress"><span style="width:${all.pct}%"></span></div><div class="progress-meta"><strong>${all.pct}%</strong><span>${all.done} / ${all.total} 항목 완료</span></div></div>
      <div class="quick-links"><a href="/setup"><span class="quick-index">00</span><div><b>연결 준비</b><small>${setupP.done}/${setupP.total} 완료 · 읽기 범위 확인</small></div><span>→</span></a><a href="/clinic"><span class="quick-index">FIN</span><div><b>내 업무 연결 설계서</b><small>${clinicP.done}/${clinicP.total} 완료 · 4회차 산출물</small></div><span>→</span></a></div>
    </section>

    <section class="sessions-section"><div class="section-heading"><div><span class="section-kicker">WORKBOOK PAGES</span><h2>회차별 실습</h2></div><a class="section-link" href="/prompts">프롬프트 카드 열기 ↗</a></div><div class="journey-grid">${SESSIONS.map(session => sessionCard(session, progressOf(requiredKeys(session.n), entries))).join('')}</div></section>`));

  const flowLink = document.getElementById('flow-link');
  flowLink?.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.getElementById('journey');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#journey');
  });

  if (needsTeam(me)) {
    const box = el(`<div class="team-card"><div><span class="section-kicker">ONE SMALL SETUP</span><b>소속 팀을 알려주세요</b><p>강사가 참가자 명단을 정리할 때 씁니다. 한 번만 입력하면 됩니다.</p></div><div class="team-input"><input type="text" id="team" placeholder="예: SCM본부 / People"><button class="hero-cta" id="teamsave">저장 <span>→</span></button></div></div>`);
    box.querySelector('#teamsave').addEventListener('click', async () => {
      const value = box.querySelector('#team').value.trim();
      if (!value) return;
      await saveTeam(value);
      location.reload();
    });
    app.insertBefore(box, app.firstChild);
  }
})();
