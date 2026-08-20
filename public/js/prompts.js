// js/prompts.js — 프롬프트 카드 (/c/{slug}/prompts, 읽기 전용 + 복사)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { el, frag, renderPrompt } from './render.js';
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

  if (!Object.keys(C.PROMPTS).length) {
    app.appendChild(el(`<div class="empty-state">이 강의는 프롬프트 카드가 없습니다. <a href="${coursePath()}">강의 홈으로</a></div>`));
    return;
  }
  document.title = `프롬프트 카드 · ${C.course.title || 'AX 워크북'}`;

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">참고 자료</div>
      <h1>업무 연결 프롬프트 카드</h1>
      <p class="lede">이 페이지는 회차별 연동 버튼 뒤에 어떤 입력·변환·검수 규칙이 필요한지 설명하는 참고 레시피입니다. 기본 실습은 회차 페이지에서 SaaS 원본을 가져와 고치고 같은 항목에 다시 저장하는 것으로 끝납니다.</p>
    </div>`));

  const GROUPS = [
    { n: 0, name: '공통' },
    ...C.SESSIONS.map(s => ({ n: s.n, name: `${s.n}회차 — ${s.title}` })),
  ];

  for (const g of GROUPS) {
    const items = Object.entries(C.PROMPTS).filter(([, p]) => p.session === g.n);
    if (!items.length) continue;
    app.appendChild(el(`<h2>${esc(g.name)}</h2>`));
    for (const [id, p] of items) app.appendChild(renderPrompt(p, C.PROMPT_HELP[id]));
  }

  app.appendChild(frag(`
    <h2>잘 긁히는 요청 vs 안 긁히는 요청</h2>
    <div class="tablewrap"><table>
      <thead><tr><th>이렇게 하면 안 됨</th><th>이렇게 하면 됨</th><th>차이</th></tr></thead>
      <tbody>
        <tr><td>회의록 정리해줘</td><td>지정한 회의록 원본만 읽고, 근거가 붙은 액션아이템 표로</td><td>출처와 범위</td></tr>
        <tr><td>우리 팀 현황 알려줘</td><td>연동한 프로젝트·페이지에서 상태가 '진행 중'인 항목만</td><td>대상과 조건</td></tr>
        <tr><td>잘 정리해줘</td><td>작업 이름 / 담당자 / 마감일 3개 열로, 마감일 빠른 순</td><td>형식</td></tr>
        <tr><td>노션에 올려줘</td><td>표로 먼저 보여주고, 내가 확인하면 그때 등재해줘</td><td>확인 지점</td></tr>
      </tbody>
    </table></div>`));

  if (C.RESCUE.length) {
    const rescue = frag(`
      <h2>막혔을 때 쓰는 문장</h2>
      <div class="tablewrap"><table>
        <thead><tr><th style="width:12rem">상황</th><th>이렇게 말한다</th></tr></thead>
        <tbody></tbody>
      </table></div>`);
    const tb = rescue.querySelector('tbody');
    for (const [situation, line] of C.RESCUE) {
      tb.appendChild(el(`<tr><td>${esc(situation)}</td><td>${esc(line)}</td></tr>`));
    }
    app.appendChild(rescue);
  }
})();
