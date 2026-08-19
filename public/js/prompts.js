// js/prompts.js — 프롬프트 카드 (읽기 전용 + 복사)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { PROMPT_HELP, PROMPTS, RESCUE } from './content.js';
import { el, renderPrompt } from './render.js';

const app = document.getElementById('app');

const GROUPS = [
  { n: 0, name: '공통' },
  { n: 1, name: '1회차 — 업무 원본 읽기' },
  { n: 2, name: '2회차 — 회의록 → 업무 DB' },
  { n: 3, name: '3회차 — Asana·Notion·Slack 실제 연결' },
  { n: 4, name: '4회차 — 개인 루틴' },
];

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">참고 자료</div>
      <h1>업무 연결 프롬프트 카드</h1>
      <p class="lede">이 페이지는 연동 결과를 어떤 형식으로 만들지 참고하는 변환 레시피입니다. 실제 실습은 회차 페이지의 연결 버튼으로 원본을 가져오고, 필요할 때만 선택한 AI에 이 카드를 사용한 뒤, 워크북에서 검토·저장·전송합니다.</p>
    </div>`));

  for (const g of GROUPS) {
    const items = Object.entries(PROMPTS).filter(([, p]) => p.session === g.n);
    if (!items.length) continue;
    app.appendChild(el(`<h2>${esc(g.name)}</h2>`));
    for (const [id, p] of items) app.appendChild(renderPrompt(p, PROMPT_HELP[id]));
  }

  app.appendChild(el(`
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

  const rescue = el(`
    <h2>막혔을 때 쓰는 문장</h2>
    <div class="tablewrap"><table>
      <thead><tr><th style="width:12rem">상황</th><th>이렇게 말한다</th></tr></thead>
      <tbody></tbody>
    </table></div>`);
  const tb = rescue.querySelector('tbody');
  for (const [situation, line] of RESCUE) {
    tb.appendChild(el(`<tr><td>${esc(situation)}</td><td>${esc(line)}</td></tr>`));
  }
  app.appendChild(rescue);
})();
