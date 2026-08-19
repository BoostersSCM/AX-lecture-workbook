// js/admin.js — 강사 화면 (회차 개방 관리 + 참가자 진행 현황·답변 열람)
import { requireInstructor } from './auth.js';
import { mountShell, esc } from './shell.js';
import { supabase, toast } from './supabase.js';
import { loadEntriesOf, progressOf } from './store.js';
import { SESSIONS, SETUP, CLINIC, requiredKeys } from './content.js';
import { el } from './render.js';
import { getOpenMap, getScheduleMap, setOpenSessionsFor, setSessionDate, settingsMissing, openEpochOf, formatKstOpenFrom } from './course.js';

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

  const scheduleMap = await getScheduleMap({ fresh: true });

  // 관리 대상 기수 = 참가자가 실제로 있는 기수 ∪ 설정에 있는 기수 ∪ 최소 1기
  const known = new Set([1, ...cohorts, ...Object.keys(map || {}).map(Number), ...Object.keys(scheduleMap || {}).map(Number)].filter(Number.isInteger));
  const cohortList = [...known].sort((a, b) => a - b);
  let selected = cohortList[0];
  let current = new Set((map?.[String(selected)]) || [1]);
  let curDates = { ...(scheduleMap?.[String(selected)] || {}) };

  function paintCohorts() {
    cohortBox.innerHTML = '';
    for (const c of cohortList) {
      const chip = el(`<button type="button" role="tab" class="gate-cohort${c === selected ? ' on' : ''}" aria-selected="${c === selected}">${c}기</button>`);
      chip.addEventListener('click', async () => {
        selected = c;
        const freshMap = await getOpenMap();
        const freshDates = await getScheduleMap();
        current = new Set((freshMap?.[String(c)]) || [1]);
        curDates = { ...(freshDates?.[String(c)] || {}) };
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
      curDates = {};
      paintCohorts(); paintToggles();
      toast(`${next}기를 만들고 1회차를 열었습니다.`);
    });
    cohortBox.appendChild(add);
  }

  // 상태 = 수동 개방 ∪ 예약 도달. 잠그려면 토글을 끄고 날짜도 비웁니다.
  function stateOf(n) {
    const manual = current.has(n);
    const dateStr = curDates[String(n)] || '';
    const epoch = openEpochOf(dateStr);
    const schedReached = epoch !== null && Date.now() >= epoch;
    if (manual) return { open: true, label: '열림 · 수동' };
    if (schedReached) return { open: true, label: '열림 · 예약 도달 — 잠그려면 날짜를 지우세요' };
    if (epoch !== null) return { open: false, label: `잠김 · ${formatKstOpenFrom(dateStr)} 자동 개방` };
    return { open: false, label: '잠김' };
  }

  function paintToggles() {
    togglesBox.innerHTML = '';
    for (const s of SESSIONS) {
      const st = stateOf(s.n);
      const dateStr = curDates[String(s.n)] || '';
      const item = el(`
        <div class="gate-item${st.open ? ' open' : ''}">
          <button type="button" class="gate-toggle${st.open ? ' open' : ''}">
            <span class="gate-state">${esc(st.label)}</span>
            <b>${s.n}회차</b>
            <small>${esc(s.title)}</small>
          </button>
          <label class="gate-date">
            <span>강의일(KST)</span>
            <input type="date" value="${esc(dateStr)}">
            <em>${dateStr ? esc(formatKstOpenFrom(dateStr)) + '부터 예습 개방' : '전날 0시에 자동 개방됩니다'}</em>
          </label>
        </div>`);

      item.querySelector('.gate-toggle').addEventListener('click', async (e) => {
        const next = new Set(current);
        if (next.has(s.n)) next.delete(s.n); else next.add(s.n);
        e.currentTarget.disabled = true;
        const { error } = await setOpenSessionsFor(selected, [...next]);
        e.currentTarget.disabled = false;
        if (error) { toast('개방 상태 저장에 실패했습니다: ' + error.message, 'error'); return; }
        current = next;
        paintToggles();
        toast(`${selected}기 ${s.n}회차 수동 개방을 ${next.has(s.n) ? '켰습니다' : '껐습니다'}.`);
      });

      item.querySelector('input[type="date"]').addEventListener('change', async (e) => {
        const value = e.currentTarget.value; // '' = 삭제
        e.currentTarget.disabled = true;
        const { error } = await setSessionDate(selected, s.n, value);
        e.currentTarget.disabled = false;
        if (error) { toast('강의일 저장에 실패했습니다: ' + error.message, 'error'); return; }
        if (value) curDates[String(s.n)] = value; else delete curDates[String(s.n)];
        paintToggles();
        toast(value
          ? `${selected}기 ${s.n}회차 강의일을 등록했습니다 — ${formatKstOpenFrom(value)}부터 자동 개방`
          : `${selected}기 ${s.n}회차 강의일을 지웠습니다.`);
      });

      togglesBox.appendChild(item);
    }
    const effective = SESSIONS.map(s => s.n).filter(n => stateOf(n).open);
    note.textContent = `${selected}기에 지금 열려 있는 회차 — ${effective.map(n => n + '회차').join(' · ') || '없음'}`;
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
