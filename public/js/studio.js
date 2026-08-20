// js/studio.js — 강사 스튜디오
//
// /studio          강의 목록 + 새 강의 만들기(플랫폼 관리자)
// /studio/{slug}   강의 운영: 기수·개방 / 수강생 / 구성(회차·블록) / Q&A / 설정
//
// 권한: 플랫폼 관리자(profiles.role='instructor')는 전부,
//       강의별 강사(course_instructors)는 자기 강의만. RLS가 서버에서 한 번 더 막습니다.
import { requireAuth, isInstructor } from './auth.js';
import { mountShell, esc } from './shell.js';
import { el } from './render.js';
import { supabase, toast } from './supabase.js';
import { loadEntriesOf, progressOf } from './store.js';
import { openEpochOf, formatKstOpenFrom, labelMapOf, loadCourseShape } from './courseState.js';

const app = document.getElementById('app');
const slug = decodeURIComponent((/^\/studio\/([^/]+)/.exec(location.pathname) || [])[1] || '') || null;

const STATUS_LABEL = { draft: '준비 중 (수강생에게 안 보임)', active: '진행 중 (공개)', archived: '보관 (수강생에게 안 보임)' };

// ── 공용 ─────────────────────────────────────────────────────
function fail(msg) {
  app.appendChild(el(`<div class="empty-state">${msg} <a href="/studio">스튜디오 홈으로</a></div>`));
}

async function myInstructorCourseIds(me) {
  const { data } = await supabase.from('course_instructors').select('course_id').eq('user_id', me.id);
  return new Set((data || []).map(r => r.course_id));
}

// ═════════════════════════════════════════════════════════════
// 스튜디오 홈 — 강의 목록 + 새 강의
// ═════════════════════════════════════════════════════════════
async function renderHome(me) {
  const admin = isInstructor(me);
  const [coursesRes, mine] = await Promise.all([
    supabase.from('courses').select('*').order('created_at'),
    myInstructorCourseIds(me),
  ]);

  if (coursesRes.error) {
    app.appendChild(el(`<div class="empty-state">플랫폼 테이블이 아직 없습니다 — Supabase SQL Editor에서
      <code>supabase/006_platform.sql</code> → <code>006b_seed_connect_ai.sql</code> 순서로 실행해주세요.
      그 전까지 회차 개방은 <a href="/admin">기존 강사 화면</a>에서 관리합니다.</div>`));
    return;
  }

  const courses = (coursesRes.data || []).filter(c => admin || mine.has(c.id));
  if (!admin && !mine.size) {
    fail('스튜디오는 강사만 쓸 수 있습니다.');
    return;
  }

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">STUDIO · ${esc(me.email)}</div>
      <h1>강의 스튜디오</h1>
      <p class="lede">강의를 만들고, 기수를 열고, 회차 구성과 질문을 한 곳에서 운영합니다.</p>
    </div>`));

  const grid = el('<div class="catalog-grid"></div>');
  for (const c of courses) {
    grid.appendChild(el(`
      <a class="catalog-card" href="/studio/${encodeURIComponent(c.slug)}">
        <div class="catalog-card-top">
          <span class="catalog-status catalog-${c.status}">${esc({ draft: '준비 중', active: '진행 중', archived: '보관' }[c.status] || c.status)}</span>
          <span class="journey-arrow" aria-hidden="true">↗</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.subtitle || '')}</p>
        <div class="catalog-card-foot"><span class="mono">/c/${esc(c.slug)}</span></div>
      </a>`));
  }
  app.appendChild(grid);

  if (admin) {
    const form = el(`
      <section class="field studio-new">
        <b style="font-size:0.95rem">새 강의 만들기</b>
        <p class="fhint" style="margin:0.3rem 0 0.8rem">준비 중(draft) 상태로 만들어집니다 — 구성과 기수를 준비한 뒤 설정에서 공개하세요.</p>
        <div class="studio-new-grid">
          <label class="ob-field"><span>강의 이름</span><input type="text" id="nc-title" maxlength="60" placeholder="예: 데이터로 말하는 리포트"></label>
          <label class="ob-field"><span>주소 (영문 slug)</span><input type="text" id="nc-slug" maxlength="40" placeholder="예: data-report"></label>
          <label class="ob-field" style="grid-column:1/-1"><span>한 줄 소개</span><input type="text" id="nc-subtitle" maxlength="120" placeholder="카드에 보이는 소개 문장"></label>
        </div>
        <button class="primary" id="nc-save" type="button" style="margin-top:0.8rem">강의 만들기</button>
      </section>`);
    form.querySelector('#nc-title').addEventListener('input', (e) => {
      const s = form.querySelector('#nc-slug');
      if (!s.dataset.touched) s.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    });
    form.querySelector('#nc-slug').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
    form.querySelector('#nc-save').addEventListener('click', async (e) => {
      const title = form.querySelector('#nc-title').value.trim();
      const slugV = form.querySelector('#nc-slug').value.trim().toLowerCase();
      const subtitle = form.querySelector('#nc-subtitle').value.trim();
      if (!title || !/^[a-z0-9-]{2,40}$/.test(slugV)) { toast('강의 이름과 영문 slug(소문자·숫자·하이픈)를 확인해주세요.', 'error'); return; }
      e.currentTarget.disabled = true;
      const { data: course, error } = await supabase.from('courses')
        .insert({ title, slug: slugV, subtitle, status: 'draft', created_by: me.id }).select().single();
      if (error) { e.currentTarget.disabled = false; toast('생성 실패: ' + error.message, 'error'); return; }
      await supabase.from('course_instructors').insert({ course_id: course.id, user_id: me.id, role: 'owner' });
      await supabase.from('cohorts').insert({ course_id: course.id, number: 1, label: '1기', recruiting: false });
      toast('강의를 만들었습니다. 구성 탭에서 회차를 추가하세요.');
      location.href = '/studio/' + encodeURIComponent(slugV);
    });
    app.appendChild(form);
  }
}

// ═════════════════════════════════════════════════════════════
// 강의 스튜디오 — 탭
// ═════════════════════════════════════════════════════════════
async function renderCourseStudio(me) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('slug', slug).maybeSingle();
  if (error || !course) { fail('강의를 찾을 수 없습니다.'); return; }

  const admin = isInstructor(me);
  if (!admin) {
    const { data: ci } = await supabase.from('course_instructors')
      .select('user_id').eq('course_id', course.id).eq('user_id', me.id).maybeSingle();
    if (!ci) { fail('이 강의의 강사가 아닙니다.'); return; }
  }

  const { data: sessions } = await supabase.from('sessions')
    .select('*').eq('course_id', course.id).order('position');

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">STUDIO · <a href="/studio" style="color:inherit">강의 목록</a> / ${esc(course.slug)}</div>
      <h1>${esc(course.title)}</h1>
      <p class="lede">${esc(course.subtitle || '')} <a class="section-link" href="/c/${encodeURIComponent(course.slug)}" style="margin-left:0.4rem">수강생 화면 보기 ↗</a></p>
    </div>`));

  const TABS = [
    ['gates', '기수·개방'],
    ['people', '수강생'],
    ['compose', '구성'],
    ['qna', 'Q&A'],
    ['settings', '설정'],
  ];
  const tabBar = el(`<div class="gate-cohorts studio-tabs" role="tablist">${TABS.map(([k, label]) =>
    `<button type="button" role="tab" class="gate-cohort" data-tab="${k}">${label}</button>`).join('')}</div>`);
  const panel = el('<div class="studio-panel"></div>');
  app.appendChild(tabBar);
  app.appendChild(panel);

  const renderers = {
    gates: () => renderGatesTab(panel, course, sessions || [], me),
    people: () => renderPeopleTab(panel, course),
    compose: () => renderComposeTab(panel, course),
    qna: () => renderQnaTab(panel, course, sessions || []),
    settings: () => renderSettingsTab(panel, course, me, admin),
  };

  async function show(tab) {
    location.hash = tab;
    for (const b of tabBar.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === tab);
    panel.innerHTML = '<p class="fhint">불러오는 중…</p>';
    panel.innerHTML = '';
    await renderers[tab]();
  }
  tabBar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) show(b.dataset.tab);
  });

  const initial = (location.hash || '').replace('#', '');
  await show(renderers[initial] ? initial : 'gates');
}

// ── 탭 1: 기수·개방 ─────────────────────────────────────────
async function renderGatesTab(panel, course, sessions, me) {
  const box = el(`
    <section class="gate-panel">
      <div class="gate-head">
        <div><span class="eyebrow">SESSION CONTROL</span><h2>기수별 회차 개방</h2></div>
        <p>끄면 그 기수 수강생에게 잠금 화면이 보입니다. 강의일을 넣으면 <b>하루 전 0시(KST)</b>부터 자동으로 열립니다. 강사는 항상 전부 들어갈 수 있습니다.</p>
      </div>
      <div class="gate-cohorts" role="tablist" aria-label="기수 선택"></div>
      <div class="gate-recruit"></div>
      <div class="gate-toggles"></div>
      <p class="gate-note" aria-live="polite"></p>
      <div class="gate-ann"></div>
    </section>`);
  panel.appendChild(box);

  const cohortBox = box.querySelector('.gate-cohorts');
  const recruitBox = box.querySelector('.gate-recruit');
  const togglesBox = box.querySelector('.gate-toggles');
  const note = box.querySelector('.gate-note');
  const annBox = box.querySelector('.gate-ann');

  if (!sessions.length) {
    note.innerHTML = '먼저 <b>구성</b> 탭에서 회차를 추가하세요 — 회차가 있어야 개방을 관리할 수 있습니다.';
    return;
  }

  let cohorts = [];
  let selected = null;   // cohort row
  let gates = [];        // 선택 기수의 gates

  async function loadCohorts() {
    const { data } = await supabase.from('cohorts').select('*').eq('course_id', course.id).order('number');
    cohorts = data || [];
    if (!selected && cohorts.length) selected = cohorts[0];
    else if (selected) selected = cohorts.find(c => c.id === selected.id) || cohorts[0] || null;
  }
  async function loadGates() {
    if (!selected) { gates = []; return; }
    const { data } = await supabase.from('gates').select('*').eq('cohort_id', selected.id);
    gates = data || [];
  }

  function gateOf(sessionId) {
    return gates.find(g => g.session_id === sessionId) || null;
  }
  function stateOf(s) {
    const g = gateOf(s.id);
    const dateStr = g?.open_date || '';
    const epoch = openEpochOf(dateStr);
    const schedReached = epoch !== null && Date.now() >= epoch;
    if (g?.open) return { open: true, label: '열림 · 수동' };
    if (schedReached) return { open: true, label: '열림 · 예약 도달 — 잠그려면 날짜를 지우세요' };
    if (epoch !== null) return { open: false, label: `잠김 · ${formatKstOpenFrom(dateStr)} 자동 개방` };
    return { open: false, label: '잠김' };
  }

  async function upsertGate(sessionId, bits) {
    const cur = gateOf(sessionId);
    const row = { cohort_id: selected.id, session_id: sessionId, open: cur?.open || false, open_date: cur?.open_date || null, ...bits };
    const { error } = await supabase.from('gates').upsert(row, { onConflict: 'cohort_id,session_id' });
    if (error) { toast('저장 실패: ' + error.message, 'error'); return false; }
    await loadGates();
    return true;
  }

  function paintCohorts() {
    cohortBox.innerHTML = '';
    for (const c of cohorts) {
      const chip = el(`<button type="button" role="tab" class="gate-cohort${selected?.id === c.id ? ' on' : ''}">${c.number}기${c.recruiting ? ' ·모집중' : ''}</button>`);
      chip.addEventListener('click', async () => { selected = c; await loadGates(); paintAll(); });
      cohortBox.appendChild(chip);
    }
    const add = el('<button type="button" class="gate-cohort gate-cohort-add" title="새 기수 추가">＋ 기수</button>');
    add.addEventListener('click', async () => {
      const next = cohorts.length ? Math.max(...cohorts.map(c => c.number)) + 1 : 1;
      const { data: created, error } = await supabase.from('cohorts')
        .insert({ course_id: course.id, number: next, label: `${next}기`, recruiting: true }).select().single();
      if (error) { toast('기수 추가 실패: ' + error.message, 'error'); return; }
      // 새 기수 기본값: 1회차만 열림
      const first = sessions[0];
      if (first) await supabase.from('gates').upsert({ cohort_id: created.id, session_id: first.id, open: true }, { onConflict: 'cohort_id,session_id' });
      selected = created;
      await loadCohorts(); await loadGates(); paintAll();
      toast(`${next}기를 만들고 1회차를 열었습니다. (모집 중 상태)`);
    });
    cohortBox.appendChild(add);
  }

  function paintRecruit() {
    recruitBox.innerHTML = '';
    if (!selected) return;
    const row = el(`
      <div class="recruit-row">
        <span>${selected.number}기 — <b>${selected.recruiting ? '모집 중' : '모집 마감'}</b>
        <small>${selected.recruiting ? '강의 홈에서 이 기수로 참여할 수 있습니다.' : '새 참여를 받지 않습니다. 기존 수강생은 계속 학습합니다.'}</small></span>
        <button type="button" class="copy">${selected.recruiting ? '모집 마감하기' : '모집 다시 열기'}</button>
      </div>`);
    row.querySelector('button').addEventListener('click', async () => {
      const { error } = await supabase.from('cohorts').update({ recruiting: !selected.recruiting }).eq('id', selected.id);
      if (error) { toast('저장 실패: ' + error.message, 'error'); return; }
      await loadCohorts(); paintAll();
    });
    recruitBox.appendChild(row);
  }

  function paintToggles() {
    togglesBox.innerHTML = '';
    if (!selected) { note.textContent = '기수를 먼저 추가하세요.'; return; }
    for (const s of sessions) {
      const st = stateOf(s);
      const g = gateOf(s.id);
      const dateStr = g?.open_date || '';
      const item = el(`
        <div class="gate-item${st.open ? ' open' : ''}">
          <button type="button" class="gate-toggle${st.open ? ' open' : ''}">
            <span class="gate-state">${esc(st.label)}</span>
            <b>${s.position}회차</b>
            <small>${esc(s.title)}</small>
          </button>
          <label class="gate-date">
            <span>강의일(KST)</span>
            <input type="date" value="${esc(dateStr)}">
            <em>${dateStr ? esc(formatKstOpenFrom(dateStr)) + '부터 예습 개방' : '전날 0시에 자동 개방됩니다'}</em>
          </label>
        </div>`);
      item.querySelector('.gate-toggle').addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        const ok = await upsertGate(s.id, { open: !(g?.open) });
        e.currentTarget.disabled = false;
        if (ok) { paintToggles(); toast(`${selected.number}기 ${s.position}회차 수동 개방을 ${g?.open ? '껐습니다' : '켰습니다'}.`); }
      });
      item.querySelector('input[type="date"]').addEventListener('change', async (e) => {
        const value = e.currentTarget.value || null;
        e.currentTarget.disabled = true;
        const ok = await upsertGate(s.id, { open_date: value });
        e.currentTarget.disabled = false;
        if (ok) {
          paintToggles();
          toast(value ? `강의일 등록 — ${formatKstOpenFrom(value)}부터 자동 개방` : '강의일을 지웠습니다.');
        }
      });
      togglesBox.appendChild(item);
    }
    const effective = sessions.filter(s => stateOf(s).open).map(s => s.position);
    note.textContent = `${selected.number}기에 지금 열려 있는 회차 — ${effective.map(n => n + '회차').join(' · ') || '없음'}`;
  }

  // 선택 기수 공지 — 수강생 Q&A 페이지 상단에 노출됩니다
  async function paintAnn() {
    annBox.innerHTML = '';
    if (!selected) return;
    const { data: anns } = await supabase.from('announcements')
      .select('id, body, created_at').eq('cohort_id', selected.id)
      .order('created_at', { ascending: false }).limit(5);
    const wrap = el(`
      <div class="ann-compose">
        <b style="font-size:0.92rem">📢 ${selected.number}기 공지</b>
        <p class="fhint" style="margin:0.2rem 0 0.5rem">수강생의 Q&A 페이지 상단에 보입니다. 강의일 변경·준비물 안내에 쓰세요.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <input type="text" maxlength="300" placeholder="예: 3회차는 노트북 지참 — 실습장 복제를 미리 해두면 빨라요" style="flex:1;min-width:16rem">
          <button class="primary" type="button">공지 올리기</button>
        </div>
        <div class="ann-list" style="margin-top:0.6rem"></div>
      </div>`);
    wrap.querySelector('button').addEventListener('click', async (e) => {
      const input = wrap.querySelector('input');
      const body = input.value.trim();
      if (!body) return;
      e.currentTarget.disabled = true;
      const { error } = await supabase.from('announcements').insert({ cohort_id: selected.id, user_id: me.id, body });
      e.currentTarget.disabled = false;
      if (error) { toast('공지 등록 실패: ' + error.message, 'error'); return; }
      input.value = '';
      toast('공지를 올렸습니다.');
      paintAnn();
    });
    const list = wrap.querySelector('.ann-list');
    for (const a of anns || []) {
      const row = el(`
        <div class="recruit-row">
          <span><small class="mono">${new Date(a.created_at).toLocaleString('ko-KR')}</small> ${esc(a.body)}</span>
          <button type="button" class="copy" data-rm>삭제</button>
        </div>`);
      row.querySelector('[data-rm]').addEventListener('click', async () => {
        await supabase.from('announcements').delete().eq('id', a.id);
        paintAnn();
      });
      list.appendChild(row);
    }
    annBox.appendChild(wrap);
  }

  function paintAll() { paintCohorts(); paintRecruit(); paintToggles(); paintAnn(); }

  await loadCohorts();
  await loadGates();
  paintAll();
}

// ── 탭 2: 수강생 ─────────────────────────────────────────────
async function renderPeopleTab(panel, course) {
  const shape = await loadCourseShape(course.id);
  const labels = shape ? labelMapOf(shape) : {};
  const allKeys = [];
  if (shape) {
    for (const g of shape.SETUP.groups || []) for (const f of g.fields || []) if (f.required) allKeys.push(f.key);
    for (const s of shape.SESSIONS) for (const b of s.blocks) if (b.type === 'field' && b.required) allKeys.push(b.key);
    for (const g of shape.CLINIC.groups || []) for (const f of g.fields || []) if (f.required) allKeys.push(f.key);
  }

  const { data, error } = await supabase.from('enrollments')
    .select('user_id, joined_at, cohorts!inner(id, number, course_id), profiles(id, name, email, team)')
    .eq('cohorts.course_id', course.id);
  if (error) { panel.appendChild(el(`<div class="empty-state">수강생을 불러오지 못했습니다: ${esc(error.message)}</div>`)); return; }

  const people = (data || []).map(r => ({
    id: r.user_id, cohort: r.cohorts.number,
    name: r.profiles?.name || '(이름 비공개)', email: r.profiles?.email || '', team: r.profiles?.team || '',
  })).sort((a, b) => a.cohort - b.cohort || a.name.localeCompare(b.name, 'ko'));

  if (!people.length) {
    panel.appendChild(el('<div class="empty-state">아직 참여한 수강생이 없습니다. 기수·개방 탭에서 모집을 열고, 강의 홈 주소를 공유하세요.</div>'));
    return;
  }

  const cohorts = [...new Set(people.map(p => p.cohort))].sort((a, b) => a - b);
  let filterCohort = 'all';

  const filterBox = el('<div class="gate-cohorts" role="tablist" aria-label="기수 필터" style="margin:0.4rem 0 0.8rem"></div>');
  panel.appendChild(filterBox);

  // 회차별 필수 키 (퍼널 통계용)
  const sessionKeys = (shape?.SESSIONS || []).map(s => ({
    n: s.n, keys: s.blocks.filter(b => b.type === 'field' && b.required).map(b => b.key),
  })).filter(s => s.keys.length);
  const funnelBox = el('<div class="gate-cohorts" style="margin:0 0 0.8rem"></div>');
  panel.appendChild(funnelBox);

  const list = el('<div class="crew"></div>');
  list.appendChild(el('<div class="crew-row head"><span>수강생</span><span>기수</span><span>팀</span><span>진행률</span></div>'));
  panel.appendChild(list);
  const detail = el('<div class="answers" id="detail"></div>');
  panel.appendChild(detail);

  const rows = [];
  for (const p of people) {
    const entries = await loadEntriesOf(p.id, course.id);
    const prog = progressOf(allKeys, entries);
    p._entries = entries;
    p._prog = prog;
    const row = el(`
      <div class="crew-row">
        <span class="crew-name">${esc(p.name)}<span class="em">${esc(p.email)}</span></span>
        <span class="mono" style="font-size:0.86rem">${p.cohort}기</span>
        <span style="font-size:0.86rem;color:var(--ink-soft)">${esc(p.team)}</span>
        <span class="mono ${prog.pct === 100 ? 'card-prog done' : 'card-prog'}">${prog.done}/${prog.total}</span>
      </div>`);
    row.addEventListener('click', () => showAnswers(p, entries, labels, detail));
    list.appendChild(row);
    rows.push({ el: row, cohort: p.cohort });
  }

  // 회차 퍼널 — 필터된 인원 기준 평균 완료율
  function paintFunnel() {
    const pool = people.filter(p => filterCohort === 'all' || p.cohort === filterCohort);
    funnelBox.innerHTML = '';
    if (!pool.length || !sessionKeys.length) return;
    for (const s of sessionKeys) {
      const avg = Math.round(pool.reduce((a, p) => a + progressOf(s.keys, p._entries).pct, 0) / pool.length);
      funnelBox.appendChild(el(`<span class="gate-cohort" style="cursor:default" title="필수 문항 평균 완료율">${s.n}회차 ${avg}%</span>`));
    }
    const total = Math.round(pool.reduce((a, p) => a + p._prog.pct, 0) / pool.length);
    funnelBox.appendChild(el(`<span class="gate-cohort on" style="cursor:default">전체 평균 ${total}%</span>`));
  }

  // 명단 CSV — 수료 판정·명단 정리에 바로 쓸 수 있게
  const csvBtn = el('<button class="copy" type="button" style="margin:0 0 0.8rem">명단 CSV 내보내기</button>');
  csvBtn.addEventListener('click', () => {
    const pool = people.filter(p => filterCohort === 'all' || p.cohort === filterCohort);
    const head = ['이름', '이메일', '팀', '기수', '완료 문항', '전체 문항', '완료율(%)', ...sessionKeys.map(s => `${s.n}회차(%)`)];
    const lines = [head.join(',')];
    for (const p of pool) {
      lines.push([
        `"${p.name.replaceAll('"', '""')}"`, p.email, `"${String(p.team).replaceAll('"', '""')}"`, p.cohort,
        p._prog.done, p._prog.total, p._prog.pct,
        ...sessionKeys.map(s => progressOf(s.keys, p._entries).pct),
      ].join(','));
    }
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.slug}-수강생-${filterCohort === 'all' ? '전체' : filterCohort + '기'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${pool.length}명을 내보냈습니다.`);
  });
  panel.insertBefore(csvBtn, list);

  function paintFilter() {
    filterBox.innerHTML = '';
    const options = [['all', `전체 (${people.length})`], ...cohorts.map(c => [c, `${c}기 (${people.filter(m => m.cohort === c).length})`])];
    for (const [val, label] of options) {
      const chip = el(`<button type="button" class="gate-cohort${String(filterCohort) === String(val) ? ' on' : ''}">${label}</button>`);
      chip.addEventListener('click', () => {
        filterCohort = val;
        for (const r of rows) r.el.style.display = (filterCohort === 'all' || r.cohort === filterCohort) ? '' : 'none';
        paintFilter();
        paintFunnel();
      });
      filterBox.appendChild(chip);
    }
  }
  paintFilter();
  paintFunnel();
}

function showAnswers(person, entries, labels, mount) {
  mount.innerHTML = '';
  mount.appendChild(el(`<h2>${esc(person.name)} — ${person.cohort}기 · ${esc(person.team)}</h2>`));
  const written = Object.keys(entries).filter(k => {
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
    else if (k.endsWith('.cols') || k.endsWith('.db_map')) {
      try {
        const rows = JSON.parse(v).filter(r => r && r.some(c => (c || '').trim()));
        v = rows.map(r => r.join('  |  ')).join('\n');
      } catch { /* 원문 그대로 */ }
    }
    mount.appendChild(el(`
      <div class="answer-item">
        <div class="answer-key mono">${esc(k)}</div>
        <div class="answer-q">${esc(labels[k]?.label || '')}</div>
        <div class="answer-v">${esc(v)}</div>
      </div>`));
  }
  mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 탭 3: 구성 (회차 + 블록 폼 편집기) ───────────────────────
const BLOCK_TYPES = {
  head:   '소제목',
  note:   '안내 문단',
  field:  '입력 문항',
  prompt: '프롬프트 카드 (id 참조)',
  visual: '일러스트 (id 참조)',
  link:   '링크 버튼',
  panel:  '연동 작업대 (id 참조)',
};

function blockSummary(b) {
  const p = b.payload || {};
  if (b.type === 'field') return `${p.label || ''} <code>${p.key || ''}</code>${p.required ? ' *' : ''}`;
  if (b.type === 'head' || b.type === 'note') return esc(String(p.text || '').slice(0, 60));
  if (b.type === 'link') return `${esc(p.text || '')} → <code>${esc(p.href || '')}</code>`;
  return `<code>${esc(p.id || '')}</code>`;
}

function blockForm(b, onSave, onCancel) {
  const p = b.payload || {};
  const isField = b.type === 'field';
  const idRef = ['prompt', 'visual', 'panel'].includes(b.type);
  const form = el(`
    <div class="block-form">
      ${b.type === 'head' || b.type === 'note' ? `
        <label class="ob-field"><span>내용 (**굵게** 지원)</span><textarea rows="3">${esc(p.text || '')}</textarea></label>` : ''}
      ${isField ? `
        <div class="studio-new-grid">
          <label class="ob-field"><span>저장 키 (예: s1.page_name)</span><input data-k="key" type="text" value="${esc(p.key || '')}"></label>
          <label class="ob-field"><span>종류</span>
            <select data-k="kind">
              ${['text', 'textarea', 'number', 'check', 'checks', 'radio', 'grid', 'note'].map(k => `<option value="${k}"${(p.kind || 'text') === k ? ' selected' : ''}>${k}</option>`).join('')}
            </select></label>
          <label class="ob-field" style="grid-column:1/-1"><span>문항 라벨</span><input data-k="label" type="text" value="${esc(p.label || '')}"></label>
          <label class="ob-field" style="grid-column:1/-1"><span>힌트 (선택)</span><input data-k="hint" type="text" value="${esc(p.hint || '')}"></label>
          <label class="ob-field"><span>선택지 (checks/radio — 줄바꿈 구분)</span><textarea data-k="options" rows="3">${esc((p.options || []).join('\n'))}</textarea></label>
          <label class="ob-field"><span>행 수 (textarea/grid)</span><input data-k="rows" type="number" min="1" max="20" value="${esc(p.rows || '')}"></label>
          <label class="checkrow" style="align-items:center;gap:0.5rem;display:flex"><input data-k="required" type="checkbox"${p.required ? ' checked' : ''}> 필수 문항 (진행률 집계)</label>
        </div>` : ''}
      ${idRef ? `
        <label class="ob-field"><span>참조 id — ${b.type === 'prompt' ? '프롬프트 문서의 키' : b.type === 'visual' ? '일러스트 키' : '작업대 레지스트리 키(개발 배포 필요)'}</span>
        <input data-k="id" type="text" value="${esc(p.id || '')}"></label>` : ''}
      ${b.type === 'link' ? `
        <div class="studio-new-grid">
          <label class="ob-field"><span>버튼 문구</span><input data-k="text" type="text" value="${esc(p.text || '')}"></label>
          <label class="ob-field"><span>주소</span><input data-k="href" type="text" value="${esc(p.href || '')}"></label>
        </div>` : ''}
      <div class="my-actions" style="margin-top:0.7rem">
        <button class="primary" data-save type="button">블록 저장</button>
        <button data-cancel type="button">취소</button>
      </div>
    </div>`);

  form.querySelector('[data-save]').addEventListener('click', () => {
    const next = {};
    if (b.type === 'head' || b.type === 'note') next.text = form.querySelector('textarea').value;
    for (const input of form.querySelectorAll('[data-k]')) {
      const k = input.dataset.k;
      if (k === 'required') { if (input.checked) next.required = true; continue; }
      if (k === 'options') {
        const opts = input.value.split('\n').map(s => s.trim()).filter(Boolean);
        if (opts.length) next.options = opts;
        continue;
      }
      if (k === 'rows') { const n = Number(input.value); if (n) next.rows = n; continue; }
      const v = input.value.trim();
      if (v) next[k] = v;
    }
    if (isField && !next.key) { toast('저장 키는 필수입니다.', 'error'); return; }
    onSave(next);
  });
  form.querySelector('[data-cancel]').addEventListener('click', onCancel);
  return form;
}

async function renderComposeTab(panel, course) {
  panel.appendChild(el(`
    <div class="note" style="margin-bottom:1rem">회차의 <b>소제목·안내·문항</b>은 여기서 바로 고칠 수 있습니다.
    프롬프트 카드 본문·연결 준비·설계서 문항은 <b>설정 탭 → 강의 문서(JSON)</b>에서 편집합니다.
    저장하면 수강생 화면에 바로 반영됩니다.</div>`));

  const list = el('<div class="compose-list"></div>');
  panel.appendChild(list);

  async function loadSessions() {
    const { data } = await supabase.from('sessions').select('*').eq('course_id', course.id).order('position');
    return data || [];
  }

  async function paint() {
    const sessions = await loadSessions();
    list.innerHTML = '';

    for (const s of sessions) {
      const card = el(`
        <section class="field compose-session">
          <div class="compose-session-head">
            <b>${s.position}회차</b>
            <div class="my-actions">
              <button data-edit type="button">회차 정보 수정</button>
              <button data-blocks type="button">블록 편집</button>
              <button data-del type="button" style="color:var(--warn,#9A4A22)">삭제</button>
            </div>
          </div>
          <p style="margin:0.3rem 0 0"><b>${esc(s.title)}</b>${s.tag ? ` <span class="journey-tag">${esc(s.tag)}</span>` : ''}</p>
          <p class="fhint" style="margin:0.3rem 0 0">${esc(s.goal || '')}</p>
          <div class="compose-detail"></div>
        </section>`);
      const detail = card.querySelector('.compose-detail');

      card.querySelector('[data-edit]').addEventListener('click', () => {
        detail.innerHTML = '';
        const form = el(`
          <div class="block-form">
            <div class="studio-new-grid">
              <label class="ob-field" style="grid-column:1/-1"><span>회차 제목</span><input data-k="title" type="text" value="${esc(s.title)}"></label>
              <label class="ob-field"><span>태그 (한 단어)</span><input data-k="tag" type="text" value="${esc(s.tag || '')}"></label>
              <label class="ob-field"><span>순서</span><input data-k="position" type="number" min="1" value="${s.position}"></label>
              <label class="ob-field" style="grid-column:1/-1"><span>목표 문장</span><textarea data-k="goal" rows="2">${esc(s.goal || '')}</textarea></label>
            </div>
            <div class="my-actions" style="margin-top:0.7rem"><button class="primary" data-save type="button">저장</button><button data-cancel type="button">취소</button></div>
          </div>`);
        form.querySelector('[data-save]').addEventListener('click', async () => {
          const bits = {};
          for (const input of form.querySelectorAll('[data-k]')) bits[input.dataset.k] = input.dataset.k === 'position' ? Number(input.value) || s.position : input.value.trim();
          const { error } = await supabase.from('sessions').update(bits).eq('id', s.id);
          if (error) { toast('저장 실패: ' + error.message, 'error'); return; }
          toast('회차 정보를 저장했습니다.');
          paint();
        });
        form.querySelector('[data-cancel]').addEventListener('click', () => { detail.innerHTML = ''; });
        detail.appendChild(form);
      });

      card.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm(`${s.position}회차 「${s.title}」를 삭제할까요?\n블록과 개방 설정이 함께 삭제됩니다 (수강생 기록은 남습니다).`)) return;
        const { error } = await supabase.from('sessions').delete().eq('id', s.id);
        if (error) { toast('삭제 실패: ' + error.message, 'error'); return; }
        toast('회차를 삭제했습니다.');
        paint();
      });

      card.querySelector('[data-blocks]').addEventListener('click', () => paintBlocks(s, detail));
      list.appendChild(card);
    }

    const add = el('<button class="primary" type="button" style="margin-top:0.4rem">＋ 회차 추가</button>');
    add.addEventListener('click', async () => {
      const next = sessions.length ? Math.max(...sessions.map(x => x.position)) + 1 : 1;
      const { error } = await supabase.from('sessions')
        .insert({ course_id: course.id, position: next, title: `${next}회차`, tag: '', goal: '' });
      if (error) { toast('추가 실패: ' + error.message, 'error'); return; }
      toast(`${next}회차를 추가했습니다. 회차 정보를 채워주세요.`);
      paint();
    });
    list.appendChild(add);
  }

  async function paintBlocks(session, mount) {
    mount.innerHTML = '<p class="fhint">블록 불러오는 중…</p>';
    const { data } = await supabase.from('blocks').select('*').eq('session_id', session.id).order('position');
    const blocks = data || [];
    mount.innerHTML = '';

    const wrap = el('<div class="block-list"></div>');
    mount.appendChild(wrap);

    blocks.forEach((b, i) => {
      const row = el(`
        <div class="block-row">
          <span class="block-type mono">${esc(b.type)}</span>
          <span class="block-summary">${blockSummary(b)}</span>
          <span class="my-actions block-actions">
            <button data-up type="button" title="위로"${i === 0 ? ' disabled' : ''}>▲</button>
            <button data-down type="button" title="아래로"${i === blocks.length - 1 ? ' disabled' : ''}>▼</button>
            <button data-edit type="button">편집</button>
            <button data-del type="button">✕</button>
          </span>
          <div class="block-editor" hidden></div>
        </div>`);

      row.querySelector('[data-edit]').addEventListener('click', () => {
        const editor = row.querySelector('.block-editor');
        editor.hidden = false;
        editor.innerHTML = '';
        editor.appendChild(blockForm(b, async (payload) => {
          const { error } = await supabase.from('blocks').update({ payload }).eq('id', b.id);
          if (error) { toast('저장 실패: ' + error.message, 'error'); return; }
          toast('블록을 저장했습니다.');
          paintBlocks(session, mount);
        }, () => { editor.hidden = true; }));
      });

      row.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('이 블록을 삭제할까요?')) return;
        const { error } = await supabase.from('blocks').delete().eq('id', b.id);
        if (error) { toast('삭제 실패: ' + error.message, 'error'); return; }
        paintBlocks(session, mount);
      });

      const swap = async (other) => {
        const [r1, r2] = await Promise.all([
          supabase.from('blocks').update({ position: other.position }).eq('id', b.id),
          supabase.from('blocks').update({ position: b.position }).eq('id', other.id),
        ]);
        if (r1.error || r2.error) toast('순서 변경 실패', 'error');
        paintBlocks(session, mount);
      };
      row.querySelector('[data-up]').addEventListener('click', () => swap(blocks[i - 1]));
      row.querySelector('[data-down]').addEventListener('click', () => swap(blocks[i + 1]));

      wrap.appendChild(row);
    });

    const adder = el(`
      <div class="block-add">
        <select>${Object.entries(BLOCK_TYPES).map(([k, label]) => `<option value="${k}">${label}</option>`).join('')}</select>
        <button class="primary" type="button">＋ 블록 추가</button>
        <button data-close type="button">블록 편집 닫기</button>
      </div>`);
    adder.querySelector('button.primary').addEventListener('click', async () => {
      const type = adder.querySelector('select').value;
      const position = blocks.length ? Math.max(...blocks.map(x => x.position)) + 1 : 1;
      const payload = type === 'field' ? { key: '', label: '', kind: 'text' } : type === 'head' || type === 'note' ? { text: '' } : type === 'link' ? { text: '', href: '' } : { id: '' };
      const { error } = await supabase.from('blocks').insert({ session_id: session.id, position, type, payload });
      if (error) { toast('추가 실패: ' + error.message, 'error'); return; }
      paintBlocks(session, mount);
    });
    adder.querySelector('[data-close]').addEventListener('click', () => { mount.innerHTML = ''; });
    mount.appendChild(adder);
  }

  await paint();
}

// ── 탭 4: Q&A ────────────────────────────────────────────────
async function renderQnaTab(panel, course, sessions) {
  let filter = 'open';
  const filterBox = el(`
    <div class="gate-cohorts" role="tablist" style="margin-bottom:0.8rem">
      <button type="button" class="gate-cohort on" data-f="open">미답변</button>
      <button type="button" class="gate-cohort" data-f="all">전체</button>
    </div>`);
  const listBox = el('<div class="qna-list"></div>');
  panel.appendChild(filterBox);
  panel.appendChild(listBox);

  filterBox.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    for (const x of filterBox.querySelectorAll('button')) x.classList.toggle('on', x === b);
    paint();
  });

  async function paint() {
    listBox.innerHTML = '<p class="fhint">불러오는 중…</p>';
    let q = supabase.from('questions')
      .select('*, profiles(name, email, team), answers(id, body, created_at, user_id)')
      .eq('course_id', course.id).order('created_at', { ascending: false });
    if (filter === 'open') q = q.eq('status', 'open');
    const { data, error } = await q;
    listBox.innerHTML = '';
    if (error) { listBox.appendChild(el(`<div class="empty-state">${esc(error.message)}</div>`)); return; }
    if (!data?.length) { listBox.appendChild(el(`<div class="empty-state">${filter === 'open' ? '미답변 질문이 없습니다. 🎉' : '아직 질문이 없습니다.'}</div>`)); return; }

    for (const question of data) {
      const sess = sessions.find(s => s.id === question.session_id);
      const card = el(`
        <section class="field qna-item${question.status === 'open' ? ' qna-open' : ''}">
          <div class="qna-meta">
            <b>${esc(question.profiles?.name || '수강생')}</b>
            <span>${esc(question.profiles?.team || '')}</span>
            ${sess ? `<span class="journey-tag">${sess.position}회차</span>` : ''}
            <span class="mono">${new Date(question.created_at).toLocaleString('ko-KR')}</span>
            <span class="qna-status ${question.status}">${question.status === 'open' ? '미답변' : '답변 완료'}</span>
          </div>
          <p class="qna-body">${esc(question.body)}</p>
          <div class="qna-answers"></div>
          <div class="qna-reply">
            <textarea rows="2" placeholder="답변을 입력하세요 — 질문한 수강생과 강사진만 봅니다"></textarea>
            <button class="primary" type="button">답변 등록</button>
          </div>
        </section>`);
      const answersBox = card.querySelector('.qna-answers');
      for (const a of question.answers || []) {
        answersBox.appendChild(el(`<div class="qna-answer"><span class="mono">${new Date(a.created_at).toLocaleString('ko-KR')}</span><p>${esc(a.body)}</p></div>`));
      }
      card.querySelector('.qna-reply button').addEventListener('click', async (e) => {
        const ta = card.querySelector('textarea');
        const body = ta.value.trim();
        if (!body) return;
        e.currentTarget.disabled = true;
        const { data: { session } } = await supabase.auth.getSession();
        const { error: aerr } = await supabase.from('answers').insert({ question_id: question.id, user_id: session.user.id, body });
        if (aerr) { e.currentTarget.disabled = false; toast('등록 실패: ' + aerr.message, 'error'); return; }
        await supabase.from('questions').update({ status: 'answered' }).eq('id', question.id);
        toast('답변을 등록했습니다.');
        paint();
      });
      listBox.appendChild(card);
    }
  }
  await paint();
}

// ── 탭 5: 설정 ───────────────────────────────────────────────
async function renderSettingsTab(panel, course, me, admin) {
  // 기본 정보 + 상태
  const base = el(`
    <section class="field">
      <b style="font-size:0.95rem">강의 정보</b>
      <div class="studio-new-grid" style="margin-top:0.7rem">
        <label class="ob-field" style="grid-column:1/-1"><span>강의 이름</span><input id="st-title" type="text" value="${esc(course.title)}"></label>
        <label class="ob-field" style="grid-column:1/-1"><span>한 줄 소개</span><input id="st-subtitle" type="text" value="${esc(course.subtitle || '')}"></label>
        <label class="ob-field" style="grid-column:1/-1"><span>소개 문단</span><textarea id="st-intro" rows="3">${esc(course.intro || '')}</textarea></label>
        <label class="ob-field"><span>상태</span>
          <select id="st-status">${Object.entries(STATUS_LABEL).map(([k, label]) => `<option value="${k}"${course.status === k ? ' selected' : ''}>${label}</option>`).join('')}</select>
        </label>
      </div>
      <button class="primary" id="st-save" type="button" style="margin-top:0.8rem">강의 정보 저장</button>
    </section>`);
  base.querySelector('#st-save').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const bits = {
      title: base.querySelector('#st-title').value.trim(),
      subtitle: base.querySelector('#st-subtitle').value.trim(),
      intro: base.querySelector('#st-intro').value.trim(),
      status: base.querySelector('#st-status').value,
    };
    const { error } = await supabase.from('courses').update(bits).eq('id', course.id);
    e.currentTarget.disabled = false;
    if (error) { toast('저장 실패: ' + error.message, 'error'); return; }
    Object.assign(course, bits);
    toast('강의 정보를 저장했습니다.');
  });
  panel.appendChild(base);

  // 강사진
  const ciBox = el(`
    <section class="field">
      <b style="font-size:0.95rem">강사진</b>
      <div class="ci-list" style="margin:0.6rem 0"></div>
      ${admin ? `
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <input id="ci-email" type="text" placeholder="name@boosters.kr" style="flex:1;min-width:14rem">
        <button class="primary" id="ci-add" type="button">강사 추가</button>
      </div>
      <p class="fhint" style="margin-top:0.5rem">추가하려는 분이 워크북에 한 번은 로그인한 상태여야 합니다.</p>` :
      '<p class="fhint">강사 추가·제거는 플랫폼 관리자가 합니다.</p>'}
    </section>`);
  const ciList = ciBox.querySelector('.ci-list');
  async function paintCi() {
    const { data } = await supabase.from('course_instructors')
      .select('user_id, role, profiles(name, email)').eq('course_id', course.id);
    ciList.innerHTML = '';
    for (const r of data || []) {
      const row = el(`
        <div class="recruit-row">
          <span><b>${esc(r.profiles?.name || r.user_id.slice(0, 8))}</b> <small>${esc(r.profiles?.email || '')} · ${r.role === 'owner' ? '대표 강사' : '강사'}</small></span>
          ${admin && r.role !== 'owner' ? '<button type="button" class="copy" data-rm>제외</button>' : ''}
        </div>`);
      row.querySelector('[data-rm]')?.addEventListener('click', async () => {
        await supabase.from('course_instructors').delete().eq('course_id', course.id).eq('user_id', r.user_id);
        paintCi();
      });
      ciList.appendChild(row);
    }
  }
  ciBox.querySelector('#ci-add')?.addEventListener('click', async () => {
    const email = ciBox.querySelector('#ci-email').value.trim().toLowerCase();
    if (!email) return;
    const { data: p } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (!p) { toast('해당 이메일의 프로필이 없습니다 — 먼저 워크북에 로그인해달라고 요청하세요.', 'error'); return; }
    const { error } = await supabase.from('course_instructors').insert({ course_id: course.id, user_id: p.id, role: 'instructor' });
    if (error && !/duplicate/i.test(error.message)) { toast('추가 실패: ' + error.message, 'error'); return; }
    toast('강사로 추가했습니다.');
    ciBox.querySelector('#ci-email').value = '';
    paintCi();
  });
  await paintCi();
  panel.appendChild(ciBox);

  // 강의 문서(JSON) — 프롬프트·연결 준비·설계서·홈 카피의 원본
  const docsBox = el(`
    <section class="field">
      <b style="font-size:0.95rem">강의 문서 (JSON)</b>
      <p class="fhint" style="margin:0.3rem 0 0.6rem">프롬프트 카드(prompts)·연결 준비(setup)·설계서(clinic)·홈 카피(meta)·도움말(prompt_help)·구조 문서(rescue)의 원본입니다.
      형식이 깨지면 저장되지 않으니 안심하고 편집하세요.</p>
      <div class="docs-list"></div>
    </section>`);
  const docsList = docsBox.querySelector('.docs-list');
  const KINDS = ['meta', 'setup', 'clinic', 'prompts', 'prompt_help', 'rescue'];
  const { data: docs } = await supabase.from('course_docs').select('kind, payload').eq('course_id', course.id);
  const docMap = Object.fromEntries((docs || []).map(d => [d.kind, d.payload]));
  for (const kind of KINDS) {
    const item = el(`
      <details class="prompt-source" style="margin-top:0.5rem">
        <summary><code>${kind}</code> ${docMap[kind] ? '' : '(비어 있음)'}</summary>
        <textarea rows="12" spellcheck="false" style="width:100%;font-family:ui-monospace,monospace;font-size:0.8rem"></textarea>
        <div class="my-actions" style="margin-top:0.5rem"><button class="primary" type="button">JSON 검사 후 저장</button></div>
      </details>`);
    const ta = item.querySelector('textarea');
    ta.value = docMap[kind] ? JSON.stringify(docMap[kind], null, 2) : '';
    item.querySelector('button').addEventListener('click', async (e) => {
      let payload;
      try { payload = JSON.parse(ta.value || 'null'); }
      catch (err) { toast('JSON 형식 오류: ' + err.message, 'error'); return; }
      if (payload === null) { toast('내용이 비어 있습니다.', 'error'); return; }
      e.currentTarget.disabled = true;
      const { error } = await supabase.from('course_docs')
        .upsert({ course_id: course.id, kind, payload, updated_at: new Date().toISOString() }, { onConflict: 'course_id,kind' });
      e.currentTarget.disabled = false;
      if (error) { toast('저장 실패: ' + error.message, 'error'); return; }
      toast(`${kind} 문서를 저장했습니다.`);
    });
    docsList.appendChild(item);
  }
  panel.appendChild(docsBox);

  // 강의 복제 (관리자)
  if (admin) {
    const cloneBox = el(`
      <section class="field">
        <b style="font-size:0.95rem">강의 복제</b>
        <p class="fhint" style="margin:0.3rem 0 0.6rem">회차·블록·문서를 통째로 복사해 새 강의(준비 중)를 만듭니다. 수강생·기록·기수는 복사되지 않습니다.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <input id="cl-slug" type="text" placeholder="새 slug (예: connect-ai-v2)" style="flex:1;min-width:14rem">
          <button class="primary" id="cl-go" type="button">복제하기</button>
        </div>
      </section>`);
    cloneBox.querySelector('#cl-go').addEventListener('click', async (e) => {
      const newSlug = cloneBox.querySelector('#cl-slug').value.trim().toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(newSlug)) { toast('slug는 영문 소문자·숫자·하이픈 2~40자입니다.', 'error'); return; }
      e.currentTarget.disabled = true;
      try {
        const { data: nc, error: cerr } = await supabase.from('courses')
          .insert({ slug: newSlug, title: course.title + ' (복제)', subtitle: course.subtitle, intro: course.intro, status: 'draft', created_by: me.id })
          .select().single();
        if (cerr) throw cerr;
        await supabase.from('course_instructors').insert({ course_id: nc.id, user_id: me.id, role: 'owner' });

        const { data: sess } = await supabase.from('sessions').select('*').eq('course_id', course.id).order('position');
        for (const s of sess || []) {
          const nid = crypto.randomUUID();
          const { error: serr } = await supabase.from('sessions')
            .insert({ id: nid, course_id: nc.id, position: s.position, title: s.title, tag: s.tag, goal: s.goal });
          if (serr) throw serr;
          const { data: blocks } = await supabase.from('blocks').select('position, type, payload').eq('session_id', s.id).order('position');
          if (blocks?.length) {
            const { error: berr } = await supabase.from('blocks')
              .insert(blocks.map(b => ({ session_id: nid, position: b.position, type: b.type, payload: b.payload })));
            if (berr) throw berr;
          }
        }
        const { data: docs2 } = await supabase.from('course_docs').select('kind, payload').eq('course_id', course.id);
        if (docs2?.length) {
          await supabase.from('course_docs').insert(docs2.map(d => ({ course_id: nc.id, kind: d.kind, payload: d.payload })));
        }
        await supabase.from('cohorts').insert({ course_id: nc.id, number: 1, label: '1기', recruiting: false });
        toast('복제가 끝났습니다. 새 강의로 이동합니다.');
        location.href = '/studio/' + encodeURIComponent(newSlug);
      } catch (err) {
        e.currentTarget.disabled = false;
        toast('복제 실패: ' + (err.message || err), 'error');
      }
    });
    panel.appendChild(cloneBox);
  }
}

// ═════════════════════════════════════════════════════════════
(async function main() {
  const me = await requireAuth();
  if (!me) return;
  if (me._preview) {
    await mountShell();
    app.appendChild(el('<div class="empty-state">수강생 뷰에서는 스튜디오가 잠깁니다 — 상단 배너에서 [강사로 돌아가기] 후 이용하세요.</div>'));
    return;
  }
  await mountShell();

  // 접근 권한: 플랫폼 관리자 또는 강의별 강사
  if (!isInstructor(me)) {
    const mine = await myInstructorCourseIds(me);
    if (!mine.size) {
      toast('강사만 볼 수 있는 화면입니다.', 'error');
      setTimeout(() => location.href = '/', 1200);
      return;
    }
  }

  if (slug) await renderCourseStudio(me);
  else await renderHome(me);
})();
