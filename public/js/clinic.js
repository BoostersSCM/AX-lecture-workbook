// js/clinic.js — 4회차 케이스 클리닉 설계서
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus, getValue } from './store.js';
import { CLINIC, requiredKeys } from './content.js';
import { el, progressBar, renderField } from './render.js';

const app = document.getElementById('app');

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">4회차 · 업무 설계</div>
      <h1>${esc(CLINIC.title)}</h1>
      <p class="lede">${esc(CLINIC.intro)}</p>
    </div>`));

  app.appendChild(progressBar(progressOf(requiredKeys('clinic'), entries)));

  for (const g of CLINIC.groups) {
    app.appendChild(el(`<h2>${esc(g.name)}</h2>`));
    for (const f of g.fields) app.appendChild(renderField(f));

    // 0번 그룹 뒤에 주당 소요시간 자동 계산을 붙입니다
    if (g.name.startsWith('0.')) app.appendChild(weeklyTotal());
  }

  app.appendChild(el(`
      <h2>연결 설계 예시</h2>
    <div class="tablewrap"><table>
      <tbody>
        <tr><th style="width:7rem">업무</th><td>매주 금요일 우리 팀 주간 진행상황을 정리해 팀 채널에 공유</td></tr>
        <tr><th>시간</th><td>1회 40분 × 1회/주 = 주 40분</td></tr>
        <tr><th>긁기</th><td>노션 우리 팀 업무 DB / 이번 주 업데이트분 / 민감정보 없음</td></tr>
        <tr><th>정하기</th><td>작업 이름·담당자·상태·마감일·지연사유 5칸. 지연사유는 원본에 없음 → <b>빈칸으로 두고 내가 채움</b></td></tr>
        <tr><th>만들기</th><td>완료/진행/지연 3분류 슬랙 메시지 15줄</td></tr>
        <tr><th>보내기</th><td>팀 채널 / 매주 금 16시 / 최종 게시는 내가 직접</td></tr>
        <tr><th>안전장치</th><td>지연 건은 반드시 내가 사유 확인, 담당자 멘션 오타 확인</td></tr>
        <tr><th>되돌리기</th><td>슬랙 메시지 삭제 (게시 전 DM 리허설로 대부분 방지)</td></tr>
        <tr><th>첫 걸음</th><td>다음 주 금요일에, 완료 항목만 뽑아 표로 받아보기까지만 해본다</td></tr>
      </tbody>
    </table></div>`));

  app.appendChild(el(`
    <p style="margin-top:2rem">
      <button class="primary" onclick="window.print()">인쇄 / PDF로 저장</button>
    </p>`));
})();

// 분 × 횟수 = 주당 소요시간
function weeklyTotal() {
  const box = el(`<div class="note" id="weekly"></div>`);
  const paint = () => {
    const m = Number(getValue('clinic.min_per')) || 0;
    const t = Number(getValue('clinic.times')) || 0;
    const total = m * t;
    box.innerHTML = total
      ? `주당 소요시간 <b>약 ${total}분</b>${total < 30 ? ' — 주 30분 미만이면 자동화보다 그냥 하는 게 빠를 수 있습니다. 다른 업무를 골라보세요.' : ''}`
      : '분과 횟수를 입력하면 주당 소요시간이 계산됩니다.';
  };
  paint();
  document.addEventListener('input', e => {
    if (e.target.id === 'f_clinic_min_per' || e.target.id === 'f_clinic_times') paint();
  });
  return box;
}
