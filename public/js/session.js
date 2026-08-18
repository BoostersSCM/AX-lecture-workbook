// js/session.js — 회차별 워크북 (/session?n=1..4)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { SESSIONS, requiredKeys } from './content.js';
import { el, progressBar, renderBlock } from './render.js';

const app = document.getElementById('app');

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

  // 이전/다음 회차
  const prev = SESSIONS.find(x => x.n === n - 1);
  const next = SESSIONS.find(x => x.n === n + 1);
  const nav = el('<p style="margin-top:2.5rem;display:flex;gap:0.6rem;flex-wrap:wrap"></p>');
  if (prev) nav.appendChild(el(`<a class="btn-link" style="background:var(--surface-2);color:var(--ink)" href="/session?n=${prev.n}">← ${prev.n}회차</a>`));
  if (next) nav.appendChild(el(`<a class="btn-link" href="/session?n=${next.n}">${next.n}회차 →</a>`));
  if (!next) nav.appendChild(el(`<a class="btn-link" href="/clinic">설계서 쓰러 가기 →</a>`));
  app.appendChild(nav);
})();
