// js/qna.js — 수강생 Q&A (/c/{slug}/qna)
//
// 질문은 본인과 그 강의 강사진만 봅니다(RLS). 수업 중에 공개하기 애매한
// 질문도 편하게 남기라는 설계입니다. 기수 공지는 읽기 전용으로 함께 보여줍니다.
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { el } from './render.js';
import { supabase, toast } from './supabase.js';
import { C, initCourse, ensureCourseUrl, coursePath } from './courseState.js';

const app = document.getElementById('app');

(async function main() {
  if (ensureCourseUrl()) return;
  const me = await requireAuth();
  if (!me) return;

  const course = await initCourse(me);
  if (!course) {
    await mountShell();
    app.appendChild(el('<div class="empty-state">강의를 찾을 수 없습니다. <a href="/">강의 목록으로</a></div>'));
    return;
  }
  await mountShell();

  if (!C.course.id) {
    app.appendChild(el(`<div class="empty-state">Q&A는 플랫폼 전환(006 마이그레이션) 후에 열립니다. <a href="${coursePath()}">강의 홈으로</a></div>`));
    return;
  }
  document.title = `Q&A · ${C.course.title}`;

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">Q&A · 질문은 나와 강사만 봅니다</div>
      <h1>질문하기</h1>
      <p class="lede">수업에서 손 들기 애매했던 것, 실습하다 막힌 것을 남겨주세요. 답변이 달리면 여기서 확인합니다.</p>
    </div>`));

  // ── 기수 공지 (읽기 전용) ──────────────────────────────────
  if (C.myCohort) {
    const { data: anns } = await supabase.from('announcements')
      .select('body, created_at').eq('cohort_id', C.myCohort.id)
      .order('created_at', { ascending: false }).limit(5);
    if (anns?.length) {
      const box = el('<section class="field ann-box"><b style="font-size:0.95rem">📢 우리 기수 공지</b><div class="ann-list"></div></section>');
      const list = box.querySelector('.ann-list');
      for (const a of anns) {
        list.appendChild(el(`<div class="qna-answer"><span class="mono">${new Date(a.created_at).toLocaleString('ko-KR')}</span><p>${esc(a.body)}</p></div>`));
      }
      app.appendChild(box);
    }
  }

  // ── 질문 작성 ──────────────────────────────────────────────
  const form = el(`
    <section class="field qna-form">
      <label class="ob-field"><span>어떤 회차와 관련 있나요? (선택)</span>
        <select id="q-session">
          <option value="">회차 무관 / 일반 질문</option>
          ${C.SESSIONS.map(s => `<option value="${s.id}">${s.n}회차 — ${esc(s.title)}</option>`).join('')}
        </select>
      </label>
      <label class="ob-field"><span>질문</span>
        <textarea id="q-body" rows="4" placeholder="예: 3회차 Notion 저장이 계속 실패해요 — 어디를 확인해야 하나요?"></textarea>
      </label>
      <button class="primary" id="q-send" type="button">질문 남기기</button>
    </section>`);
  form.querySelector('#q-send').addEventListener('click', async (e) => {
    const body = form.querySelector('#q-body').value.trim();
    if (!body) { toast('질문 내용을 입력해주세요.', 'error'); return; }
    e.currentTarget.disabled = true;
    const row = {
      course_id: C.course.id,
      cohort_id: C.myCohort?.id || null,
      session_id: form.querySelector('#q-session').value || null,
      user_id: me.id,
      body,
    };
    const { data: created, error } = await supabase.from('questions').insert(row).select().single();
    e.currentTarget.disabled = false;
    if (error) { toast('등록 실패: ' + error.message, 'error'); return; }
    form.querySelector('#q-body').value = '';
    toast('질문을 남겼습니다. 답변이 달리면 이 페이지에서 보입니다.');

    // 강사에게 Slack 알림 (설정돼 있으면 — 실패해도 질문 등록에는 영향 없음)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      fetch('/api/qna-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
        body: JSON.stringify({ question_id: created.id }),
      }).catch(() => {});
    } catch { /* 알림은 부가 기능 */ }

    paint();
  });
  app.appendChild(form);

  // ── 내 질문 목록 ───────────────────────────────────────────
  app.appendChild(el('<h2>내 질문</h2>'));
  const listBox = el('<div class="qna-list"></div>');
  app.appendChild(listBox);

  async function paint() {
    listBox.innerHTML = '<p class="fhint">불러오는 중…</p>';
    const { data, error } = await supabase.from('questions')
      .select('*, answers(id, body, created_at)')
      .eq('course_id', C.course.id).eq('user_id', me.id)
      .order('created_at', { ascending: false });
    listBox.innerHTML = '';
    if (error) { listBox.appendChild(el(`<div class="empty-state">${esc(error.message)}</div>`)); return; }
    if (!data?.length) { listBox.appendChild(el('<div class="empty-state">아직 남긴 질문이 없습니다.</div>')); return; }

    for (const question of data) {
      const sess = C.SESSIONS.find(s => s.id === question.session_id);
      const card = el(`
        <section class="field qna-item${question.status === 'open' ? ' qna-open' : ''}">
          <div class="qna-meta">
            ${sess ? `<span class="journey-tag">${sess.n}회차</span>` : ''}
            <span class="mono">${new Date(question.created_at).toLocaleString('ko-KR')}</span>
            <span class="qna-status ${question.status}">${question.status === 'open' ? '답변 대기' : '답변 완료'}</span>
          </div>
          <p class="qna-body">${esc(question.body)}</p>
          <div class="qna-answers"></div>
        </section>`);
      const answersBox = card.querySelector('.qna-answers');
      const answers = (question.answers || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const a of answers) {
        answersBox.appendChild(el(`<div class="qna-answer"><span class="mono">강사 답변 · ${new Date(a.created_at).toLocaleString('ko-KR')}</span><p>${esc(a.body)}</p></div>`));
      }
      if (!answers.length) answersBox.appendChild(el('<p class="fhint" style="margin:0.2rem 0 0">강사가 확인하면 답변이 여기에 달립니다.</p>'));
      listBox.appendChild(card);
    }
  }
  await paint();
})();
