// js/session.js — 회차별 워크북 (/session?n=1..4)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, loadSlackEvents, progressOf, mountStatus } from './store.js';
import { SESSIONS, requiredKeys } from './content.js';
import { el, progressBar, renderBlock } from './render.js';

const app = document.getElementById('app');

function renderSlackInbox() {
  const panel = el(`
    <section class="slack-inbox">
      <div class="slack-inbox-head">
        <div>
          <div class="eyebrow">LIVE CHECK · Slack Events API</div>
          <h2>Slack 수신함</h2>
        </div>
        <button class="copy slack-refresh" type="button">새로고침</button>
      </div>
      <p class="slack-inbox-intro">내가 연결 준비에 적은 Channel ID의 메시지만 표시됩니다. Slack에서 테스트 메시지를 보낸 뒤 새로고침하세요.</p>
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
      list.innerHTML = '<p class="slack-empty">아직 받은 메시지가 없습니다. Slack 테스트 채널에 메시지를 보내보세요.</p>';
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
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const n = Number(new URLSearchParams(location.search).get('n') || 1);
  const s = SESSIONS.find(x => x.n === n);

  if (!s) {
    app.appendChild(el('<div class="empty-state">그런 회차가 없습니다. <a href="/">홈으로</a></div>'));
    return;
  }

  document.title = `${s.n}회차 ${s.title} · AX 워크북`;

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">${s.n}회차 · ${esc(s.tag)}</div>
      <h1>${esc(s.title)}</h1>
      <p class="lede">${esc(s.goal)}</p>
    </div>`));

  app.appendChild(progressBar(progressOf(requiredKeys(s.n), entries)));

  for (const b of s.blocks) app.appendChild(renderBlock(b));
  if (n === 3) app.appendChild(renderSlackInbox());

  // 이전/다음 회차
  const prev = SESSIONS.find(x => x.n === n - 1);
  const next = SESSIONS.find(x => x.n === n + 1);
  const nav = el('<p style="margin-top:2.5rem;display:flex;gap:0.6rem;flex-wrap:wrap"></p>');
  if (prev) nav.appendChild(el(`<a class="btn-link" style="background:var(--surface-2);color:var(--ink)" href="/session?n=${prev.n}">← ${prev.n}회차</a>`));
  if (next) nav.appendChild(el(`<a class="btn-link" href="/session?n=${next.n}">${next.n}회차 →</a>`));
  if (!next) nav.appendChild(el(`<a class="btn-link" href="/clinic">설계서 쓰러 가기 →</a>`));
  app.appendChild(nav);
})();
