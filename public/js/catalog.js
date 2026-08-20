// js/catalog.js — 강의 목록 (플랫폼 홈)
//
// 사내 AX 강의 플랫폼의 대문입니다. 열려 있는 강의를 고르고,
// 참여 중인 강의는 어느 기수로 듣고 있는지 함께 보여줍니다.
import { requireAuth, isInstructor } from './auth.js';
import { mountShell, esc } from './shell.js';
import { el, frag } from './render.js';
import { listCourses, listMyEnrollments, DEFAULT_SLUG } from './courseState.js';
import { supabase } from './supabase.js';

const app = document.getElementById('app');

const STATUS_LABEL = { active: '진행 중', draft: '준비 중', archived: '보관' };

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();

  const { courses, error } = await listCourses();

  // 006 미실행(courses 테이블 없음) — 기존 강의 홈으로 그대로 안내 (무중단 폴백)
  if (error) {
    location.replace('/c/' + DEFAULT_SLUG);
    return;
  }

  // 내 수강 현황 + 기수 모집 현황
  const [enrollments, cohortsRes] = await Promise.all([
    listMyEnrollments(me),
    supabase.from('cohorts').select('course_id, number, recruiting'),
  ]);
  const myCohortByCourse = {};
  for (const e of enrollments) myCohortByCourse[e.cohorts.course_id] = e.cohorts.number;
  const cohorts = cohortsRes.data || [];

  app.appendChild(frag(`
    <section class="catalog-hero">
      <div>
        <div class="hero-kicker"><span class="signal-dot"></span> BOOSTERS AX CAMPUS</div>
        <h1>사내 AX 강의</h1>
        <p class="hero-tagline">배우고, 기록하고, 내 업무에 연결합니다.</p>
        <p class="hero-lede">각 강의는 웹 워크북과 함께 진행됩니다 — 수업에서 쓴 기록이 그대로 내 업무 재료가 됩니다.</p>
      </div>
      ${isInstructor(me) ? '<a class="btn-link" href="/studio">스튜디오에서 강의 만들기 ↗</a>' : ''}
    </section>`));

  if (!courses.length) {
    app.appendChild(el('<div class="empty-state">아직 열린 강의가 없습니다. 강의가 열리면 여기서 바로 들어갈 수 있습니다.</div>'));
    return;
  }

  const grid = el('<div class="catalog-grid"></div>');
  for (const c of courses) {
    const mine = myCohortByCourse[c.id];
    const recruiting = cohorts.filter(x => x.course_id === c.id && x.recruiting).map(x => x.number).sort((a, b) => a - b);
    const badges = [
      `<span class="catalog-status catalog-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>`,
      mine ? `<span class="catalog-mine">${mine}기 참여 중</span>` :
        (recruiting.length ? `<span class="catalog-recruiting">${recruiting.map(n => n + '기').join(' · ')} 모집 중</span>` : ''),
    ].filter(Boolean).join('');
    grid.appendChild(el(`
      <a class="catalog-card" href="/c/${encodeURIComponent(c.slug)}">
        <div class="catalog-card-top">${badges}<span class="journey-arrow" aria-hidden="true">↗</span></div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.subtitle || '')}</p>
        <div class="catalog-card-foot"><span>${mine ? '이어서 학습하기' : '강의 살펴보기'}</span></div>
      </a>`));
  }
  app.appendChild(grid);
})();
