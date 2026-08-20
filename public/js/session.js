// js/session.js — 회차별 워크북 (/c/{slug}/session?n=1..N)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, loadSlackEvents, progressOf, mountStatus, setManualSave, mountSaveBar, onSaved } from './store.js';
import { el, progressBar, renderBlock } from './render.js';
import { renderPanelById, renderSlackSendLab } from './practice.js';
import {
  C, initCourse, ensureCourseUrl, coursePath, requiredKeys,
  isSessionOpen, openSessionsForMe, lockedNotice, scheduledDateFor, enrollNotice,
} from './courseState.js';

const app = document.getElementById('app');

// Slack lab 카드를 본문 흐름 안에 단독 배치할 때의 여백 래퍼
function wrapSlackCard(card) {
  const wrap = el('<div class="slack-lab-single"></div>');
  wrap.appendChild(card);
  return wrap;
}

function renderSlackInbox() {
  const panel = el(`
    <section class="slack-lab-card slack-inbox">
      <div class="slack-lab-card-head slack-inbox-head">
        <span class="slack-lab-index">B</span>
        <div><div class="eyebrow">INBOUND · Slack Events API</div><h2>Slack에서 받기</h2></div>
        <button class="copy slack-refresh" type="button">새로고침</button>
      </div>
      <p class="slack-inbox-intro">이번에는 방향이 반대입니다. 사람이 Slack 테스트 채널에 직접 쓴 메시지를 Events API가 Vercel로 보내고, 연결 준비에 적은 Channel ID와 일치하는 이벤트만 이 수신함에 표시합니다.</p>
      <div class="slack-receive-steps"><span>1. Slack 채널에 직접 작성</span><i>→</i><span>2. Events API 수신</span><i>→</i><span>3. 수신함 새로고침</span></div>
      <div class="slack-event-list" aria-live="polite">불러오는 중…</div>
    </section>`);
  const list = panel.querySelector('.slack-event-list');
  const refresh = panel.querySelector('.slack-refresh');

  async function load() {
    refresh.disabled = true;
    const { events, error } = await loadSlackEvents();
    refresh.disabled = false;
    if (error) {
      list.innerHTML = '<p class="slack-empty">아직 수신함이 준비되지 않았습니다. 운영자가 Supabase 스키마와 서버 키를 설정했는지 확인하세요.</p>';
      return;
    }
    if (!events.length) {
      list.innerHTML = '<div class="slack-empty"><strong>아직 받은 메시지가 없습니다.</strong><span>Slack 앱이 들어 있는 테스트 채널에서 사람이 직접 메시지를 작성한 뒤 새로고침하세요. 위 A 실습에서 봇이 보낸 메시지는 중복 방지를 위해 수신 대상에서 제외될 수 있습니다.</span></div>';
      return;
    }
    list.innerHTML = events.map(event => {
      const time = event.received_at ? new Date(event.received_at).toLocaleString('ko-KR') : '시간 미확인';
      return `<article class="slack-event-item">
        <div class="slack-event-meta"><span>${esc(time)}</span><code>${esc(event.channel_id)}</code></div>
        <p>${esc(event.text || '(내용 없음)')}</p>
        <small>event_id ${esc(event.event_id)} · 작성자 ${esc(event.slack_user_id || '미확인')}</small>
      </article>`;
    }).join('');
  }

  refresh.addEventListener('click', load);
  load();
  setInterval(load, 15000);
  return panel;
}

(async function main() {
  if (ensureCourseUrl()) return; // 구 URL(/session?n=1) → /c/connect-ai/session?n=1
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

  // 이 페이지의 워크북 입력은 자동 저장하지 않습니다 — 하단 [모두 저장] 버튼으로 일괄 저장
  setManualSave(true);
  mountSaveBar();

  const n = Number(new URLSearchParams(location.search).get('n') || 1);
  const s = C.SESSIONS.find(x => x.n === n);

  if (!s) {
    app.appendChild(el(`<div class="empty-state">그런 회차가 없습니다. <a href="${coursePath()}">강의 홈으로</a></div>`));
    return;
  }

  document.title = `${s.n}회차 ${s.title} · ${C.course.title || 'AX 워크북'}`;

  // 회차 개방 게이트 — 강사가 연 회차만 수강생에게 열립니다 (강사는 항상 통과)
  if (!isSessionOpen(n, me)) {
    if (C.course.id && !C.myCohort) app.appendChild(enrollNotice());
    else app.appendChild(lockedNotice(n, openSessionsForMe(me), scheduledDateFor(n)));
    return;
  }

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">${s.n}회차 · ${esc(s.tag || '')}</div>
      <h1>${esc(s.title)}</h1>
      <p class="lede">${esc(s.goal || '')}</p>
    </div>`));

  // 진행률 바 — 저장 성공 시마다 다시 계산해서 "채워지고 있다"가 보이게
  const bar = progressBar(progressOf(requiredKeys(s.n), entries));
  app.appendChild(bar);
  onSaved(() => {
    const p = progressOf(requiredKeys(s.n));
    bar.querySelector('.prog-fill').style.width = p.pct + '%';
    bar.querySelector('.prog-num').textContent = `${p.done}/${p.total}`;
  });

  // 회차 골격은 blocks 순서 그대로 — 작업대(panel)와 Slack lab도
  // 해당 실습 위치에 끼워 넣습니다. 버튼이 설명보다 먼저 나오지 않게 하기 위함입니다.
  for (const b of s.blocks) {
    if (b.type === 'panel') {
      if (b.id === 's3-slack-send') {
        app.appendChild(wrapSlackCard(renderSlackSendLab()));
      } else if (b.id === 's3-slack-inbox') {
        app.appendChild(wrapSlackCard(renderSlackInbox()));
      } else {
        app.appendChild(renderPanelById(b.id));
      }
      continue;
    }
    app.appendChild(renderBlock(b));
  }

  // 이전/다음 회차
  const prev = C.SESSIONS.find(x => x.n === n - 1);
  const next = C.SESSIONS.find(x => x.n === n + 1);
  const nav = el('<p style="margin-top:2.5rem;display:flex;gap:0.6rem;flex-wrap:wrap"></p>');
  if (prev) nav.appendChild(el(`<a class="btn-link" style="background:var(--surface-2);color:var(--ink)" href="${coursePath('session')}?n=${prev.n}">← ${prev.n}회차</a>`));
  if (next) nav.appendChild(el(`<a class="btn-link" href="${coursePath('session')}?n=${next.n}">${next.n}회차 →</a>`));
  if (!next && C.CLINIC.groups?.length) nav.appendChild(el(`<a class="btn-link" href="${coursePath('clinic')}">설계서 쓰러 가기 →</a>`));
  app.appendChild(nav);
})();
