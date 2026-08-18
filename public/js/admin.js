// js/admin.js — 강사 화면 (참가자 진행 현황 + 답변 열람)
import { requireInstructor } from './auth.js';
import { mountShell, esc } from './shell.js';
import { supabase } from './supabase.js';
import { loadEntriesOf, progressOf } from './store.js';
import { SESSIONS, SETUP, CLINIC, requiredKeys } from './content.js';
import { el } from './render.js';

const app = document.getElementById('app');

// item_key → 문항 라벨 (답변을 사람이 읽을 수 있게)
const LABELS = (() => {
  const m = {};
  for (const g of SETUP.groups) for (const f of g.fields) if (f.key) m[f.key] = f.label || f.text || f.key;
  for (const g of CLINIC.groups) for (const f of g.fields) if (f.key) m[f.key] = f.label || f.text || f.key;
  for (const s of SESSIONS) for (const b of s.blocks) if (b.type === 'field') m[b.key] = b.label;
  return m;
})();

(async function main() {
  const me = await requireInstructor();
  if (!me) return;
  await mountShell();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">강사 전용</div>
      <h1>참가자 진행 현황</h1>
      <p class="lede">이름을 누르면 그 사람이 쓴 내용을 볼 수 있습니다. 읽기만 가능하며 수정은 되지 않습니다.</p>
    </div>`));

  const { data: people, error } = await supabase
    .from('profiles').select('id, name, email, team, role').order('name');

  if (error) {
    app.appendChild(el('<div class="empty-state">명단을 불러오지 못했습니다.</div>'));
    return;
  }

  const members = people.filter(p => p.role !== 'instructor');
  if (!members.length) {
    app.appendChild(el('<div class="empty-state">아직 로그인한 참가자가 없습니다.</div>'));
    return;
  }

  const allKeys = requiredKeys('all');

  const list = el('<div class="crew"></div>');
  list.appendChild(el(`
    <div class="crew-row head">
      <span>참가자</span><span>팀</span><span>진행률</span>
    </div>`));
  app.appendChild(list);

  const detail = el('<div class="answers" id="detail"></div>');
  app.appendChild(detail);

  for (const p of members) {
    const entries = await loadEntriesOf(p.id);
    const prog = progressOf(allKeys, entries);

    const row = el(`
      <div class="crew-row">
        <span class="crew-name">${esc(p.name)}<span class="em">${esc(p.email)}</span></span>
        <span style="font-size:0.86rem;color:var(--ink-soft)">${esc(p.team)}</span>
        <span class="mono ${prog.pct === 100 ? 'card-prog done' : 'card-prog'}">${prog.done}/${prog.total}</span>
      </div>`);

    row.addEventListener('click', () => showAnswers(p, entries, detail));
    list.appendChild(row);
  }
})();

function showAnswers(person, entries, mount) {
  mount.innerHTML = '';
  mount.appendChild(el(`<h2>${esc(person.name)} — ${esc(person.team)}</h2>`));

  const keys = Object.keys(LABELS);
  const written = keys.filter(k => {
    const v = entries[k];
    return v !== undefined && String(v).trim() !== '' && v !== 'false';
  });

  if (!written.length) {
    mount.appendChild(el('<div class="empty-state">아직 작성한 내용이 없습니다.</div>'));
    return;
  }

  for (const k of written) {
    let v = entries[k];
    if (v === 'true') v = '✓ 체크함';
    else if (k.endsWith('.cols')) {
      // grid 는 JSON 배열
      try {
        const rows = JSON.parse(v).filter(r => r && r.some(c => (c || '').trim()));
        v = rows.map(r => r.join('  |  ')).join('\n');
      } catch { /* 원문 그대로 */ }
    }
    mount.appendChild(el(`
      <div class="answer-item">
        <div class="answer-key mono">${esc(k)}</div>
        <div class="answer-q">${esc(LABELS[k] || '')}</div>
        <div class="answer-v">${esc(v)}</div>
      </div>`));
  }

  mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
