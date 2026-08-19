// js/prompts.js — 프롬프트 카드 (읽기 전용 + 복사)
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { PROMPTS, RESCUE } from './content.js';
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
      <p class="lede">어디서 읽고, 무엇을 만들고, 어디로 보낼지 분명하게 말하는 문장들입니다. 대괄호 부분만 각자 상황에 맞게 바꾸세요.</p>
    </div>`));

  for (const g of GROUPS) {
    const items = Object.values(PROMPTS).filter(p => p.session === g.n);
    if (!items.length) continue;
    app.appendChild(el(`<h2>${esc(g.name)}</h2>`));
    for (const p of items) app.appendChild(renderPrompt(p));
  }

  app.appendChild(el(`
    <h2>잘 긁히는 요청 vs 안 긁히는 요청</h2>
    <div class="tablewrap"><table>
      <thead><tr><th>이렇게 하면 안 됨</th><th>이렇게 하면 됨</th><th>차이</th></tr></thead>
      <tbody>
        <tr><td>회의록 정리해줘</td><td>「AX 실습장」의 샘플 회의록 3건을 읽고, 액션아이템만 표로</td><td>출처와 범위</td></tr>
        <tr><td>우리 팀 현황 알려줘</td><td>「내 업무(연습용)」에서 상태가 '진행 중'인 항목 전부</td><td>DB 이름과 조건</td></tr>
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
