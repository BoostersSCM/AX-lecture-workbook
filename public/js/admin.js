// js/admin.js — 강사 화면 (회차 개방 관리 + 참가자 진행 현황·답변 열람)
import { requireInstructor } from './auth.js';
import { mountShell, esc } from './shell.js';
import { supabase, toast } from './supabase.js';
import { loadEntriesOf, progressOf } from './store.js';
import { SESSIONS, SETUP, CLINIC, requiredKeys } from './content.js';
import { el } from './render.js';
import { getOpenMap, setOpenSessionsFor, settingsMissing } from './course.js';

const app = document.getElementById('app');

// ── 기수별 회차 개방 관리 ────────────────────────────────────
// 수강생은 자기 기수에 열린 회차만 들어올 수 있습니다. 강의 진도에 맞춰 하나씩 엽니다.
async function renderSessionGate(cohorts) {
  const section = el(`
    <section class="gate-panel">
      <div class="gate-head">
        <div><span class="eyebrow">SESSION CONTROL</span><h2>기수별 회차 개방</h2></div>
        <p>끄면 그 기수 수강생에게 잠금 화면이 보입니다. 강사 계정은 항상 모든 회차에 들어갈 수 있습니다.</p>
      </div>
      <div class="gate-cohorts" role="tablist" aria-label="기수 선택"></div>
      <div class="gate-toggles"></div>
      <p class="gate-note" aria-live="polite"></p>
    </section>`);
  const cohortBox = section.querySelector('.gate-cohorts');
  const togglesBox = section.querySelector('.gate-toggles');
  const note = section.querySelector('.gate-note');

  const map = await getOpenMap({ fresh: true });

  if (settingsMissing()) {
    note.innerHTML = '⚠️ <b>course_settings 테이블이 아직 없습니다.</b> Supabase SQL Editor에서 <code>supabase/002_course_settings.sql</code>을 실행해주세요. 실행 전까지는 모든 회차가 열려 있습니다.';
    return section;
  }

  // 관리 대상 기수 = 참가자가 실제로 있는 기수 ∪ 설정에 있는 기수 ∪ 최소 1기
  const known = new Set([1, ...cohorts, ...Object.keys(map || {}).map(Number)].filter(Number.isInteger));
  const cohortList = [...known].sort((a, b) => a - b);
  let selected = cohortList[0];
  let current = new Set((map?.[String(selected)]) || [1]);

  function paintCohorts() {
    cohortBox.innerHTML = '';
    for (const c of cohortList) {
      const chip = el(`<button type="button" role="tab" class="gate-cohort${c === selected ? ' on' : ''}" aria-selected="${c === selected}">${c}기</button>`);
      chip.addEventListener('click', async () => {
        selected = c;
        const freshMap = await getOpenMap();
        current = new Set((freshMap?.[String(c)]) || [1]);
        paintCohorts(); paintToggles();
      });
      cohortBox.appendChild(chip);
    }
    // 새 기수 추가 — 다음 기수 모집을 시작할 때
    const add = el('<button type="button" class="gate-cohort gate-cohort-add" title="새 기수 추가">＋ 기수</button>');
    add.addEventListener('click', async () => {
      const next = Math.max(...cohortList) + 1;
      const { error } = await setOpenSessionsFor(next, [1]);
      if (error) { toast('기수 추가에 실패했습니다: ' + error.message, 'error'); return; }
      cohortList.push(next);
      selected = next;
      current = new Set([1]);
      paintCohorts(); paintToggles();
      toast(`${next}기를 만들고 1회차를 열었습니다.`);
    });
    cohortBox.appendChild(add);
  }

  function paintToggles() {
    togglesBox.innerHTML = '';
    for (const s of SESSIONS) {
      const on = current.has(s.n);
      const btn = el(`
        <button type="button" class="gate-toggle${on ? ' open' : ''}">
          <span class="gate-state">${on ? '열림' : '잠김'}</span>
          <b>${s.n}회차</b>
          <small>${esc(s.title)}</small>
        </button>`);
      btn.addEventListener('click', async () => {
        const next = new Set(current);
        if (next.has(s.n)) next.delete(s.n); else next.add(s.n);
        btn.disabled = true;
        const { error } = await setOpenSessionsFor(selected, [...next]);
        btn.disabled = false;
        if (error) { toast('개방 상태 저장에 실패했습니다: ' + error.message, 'error'); return; }
        current = next;
        paintToggles();
        toast(`${selected}기 ${s.n}회차를 ${next.has(s.n) ? '열었습니다' : '잠갔습니다'}.`);
      });
      togglesBox.appendChild(btn);
    }
    const opened = [...current].sort().map(n => n + '회차').join(' · ') || '없음';
    note.textContent = `${selected}기에 지금 열려 있는 회차 — ${opened}`;
  }

  paintCohorts();
  paintToggles();
  return section;
}

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
      <div class="eyebrow">강사 전용 · ${esc(me.email)}</div>
      <h1>강의 운영</h1>
      <p class="lede">기수별로 회차를 열고, 참가자 진행 현황과 답변을 확인합니다.</p>
    </div>`));

  const { data: people, error } = await supabase
    .from('profiles').select('id, name, email, team, role, cohort').order('cohort').order('name');

  if (error) {
    app.appendChild(el('<div class="empty-state">명단을 불러오지 못했습니다.</div>'));
    return;
  }

  const members = (people || []).filter(p => p.role !== 'instructor');
  const cohorts = [...new Set(members.map(p => p.cohort).filter(Number.isInteger))];

  // 기수별 회차 개방 관리
  app.appendChild(await renderSessionGate(cohorts));

  app.appendChild(el('<h2 style="margin-top:2.2rem">참가자 진행 현황</h2>'));
  if (!members.length) {
    app.appendChild(el('<div class="empty-state">아직 로그인한 참가자가 없습니다.</div>'));
    return;
  }

  // 기수 필터
  let filterCohort = 'all';
  const filterBox = el('<div class="gate-cohorts" role="tablist" aria-label="기수 필터" style="margin:0.4rem 0 0.8rem"></div>');
  app.appendChild(filterBox);

  const allKeys = requiredKeys('all');

  const list = el('<div class="crew"></div>');
  list.appendChild(el(`
    <div class="crew-row head">
      <span>참가자</span><span>기수</span><span>팀</span><span>진행률</span>
    </div>`));
  app.appendChild(list);

  const detail = el('<div class="answers" id="detail"></div>');
  app.appendChild(detail);

  const rows = []; // { el, cohort }
  for (const p of members) {
    const entries = await loadEntriesOf(p.id);
    const prog = progressOf(allKeys, entries);

    const row = el(`
      <div class="crew-row">
        <span class="crew-name">${esc(p.name)}<span class="em">${esc(p.email)}</span></span>
        <span class="mono" style="font-size:0.86rem">${p.cohort ? p.cohort + '기' : '<span style="color:var(--warn,#9A4A22)">미선택</span>'}</span>
        <span style="font-size:0.86rem;color:var(--ink-soft)">${esc(p.team)}</span>
        <span class="mono ${prog.pct === 100 ? 'card-prog done' : 'card-prog'}">${prog.done}/${prog.total}</span>
      </div>`);
    row.addEventListener('click', () => showAnswers(p, entries, detail));
    list.appendChild(row);
    rows.push({ el: row, cohort: p.cohort });
  }

  function paintFilter() {
    filterBox.innerHTML = '';
    const options = [['all', `전체 (${members.length})`], ...cohorts.sort((a, b) => a - b).map(c => [c, `${c}기 (${members.filter(m => m.cohort === c).length})`])];
    if (members.some(m => !Number.isInteger(m.cohort))) options.push(['none', '기수 미선택']);
    for (const [val, label] of options) {
      const chip = el(`<button type="button" class="gate-cohort${String(filterCohort) === String(val) ? ' on' : ''}">${label}</button>`);
      chip.addEventListener('click', () => {
        filterCohort = val;
        for (const r of rows) {
          r.el.style.display =
            filterCohort === 'all' ? '' :
            filterCohort === 'none' ? (Number.isInteger(r.cohort) ? 'none' : '') :
            (r.cohort === filterCohort ? '' : 'none');
        }
        paintFilter();
      });
      filterBox.appendChild(chip);
    }
  }
  paintFilter();
})();

function showAnswers(person, entries, mount) {
  mount.innerHTML = '';
  mount.appendChild(el(`<h2>${esc(person.name)} — ${person.cohort ? person.cohort + '기 · ' : ''}${esc(person.team)}</h2>`));

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
