// js/clinic.js — 케이스 클리닉 설계서 (/c/{slug}/clinic) — 마지막 회차와 함께 열립니다
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus, getValue, setManualSave, mountSaveBar, onSaved } from './store.js';
import { el, progressBar, renderField } from './render.js';
import {
  C, initCourse, ensureCourseUrl, coursePath, requiredKeys,
  isSessionOpen, openSessionsForMe, lockedNotice, scheduledDateFor, enrollNotice,
} from './courseState.js';

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
  mountStatus(document.getElementById('savestate'));

  const CLINIC = C.CLINIC;
  if (!CLINIC.groups?.length) {
    app.appendChild(el(`<div class="empty-state">이 강의는 설계서 단계가 없습니다. <a href="${coursePath()}">강의 홈으로</a></div>`));
    return;
  }
  document.title = `${CLINIC.title || '업무 설계서'} · ${C.course.title || 'AX 워크북'}`;

  // 이 페이지의 워크북 입력은 자동 저장하지 않습니다 — 하단 [모두 저장] 버튼으로 일괄 저장
  setManualSave(true);
  mountSaveBar();

  // 설계서는 마지막 회차와 함께 열립니다
  const lastN = C.SESSIONS.at(-1)?.n ?? 4;
  if (!isSessionOpen(lastN, me)) {
    if (C.course.id && !C.myCohort) app.appendChild(enrollNotice());
    else app.appendChild(lockedNotice(lastN, openSessionsForMe(me), scheduledDateFor(lastN)));
    return;
  }

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">${lastN}회차 · 업무 설계</div>
      <h1>${esc(CLINIC.title)}</h1>
      <p class="lede">${esc(CLINIC.intro)}</p>
    </div>`));

  const bar = progressBar(progressOf(requiredKeys('clinic'), entries));
  app.appendChild(bar);
  onSaved(() => {
    const p = progressOf(requiredKeys('clinic'));
    bar.querySelector('.prog-fill').style.width = p.pct + '%';
    bar.querySelector('.prog-num').textContent = `${p.done}/${p.total}`;
  });

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
        <tr><th>가져오기</th><td>노션 우리 팀 업무 DB / 이번 주 업데이트분 / 민감정보 없음</td></tr>
        <tr><th>다듬기</th><td>작업 이름·담당자·상태·마감일·지연사유 5칸. 지연사유는 원본에 없음 → <b>빈칸으로 두고 내가 채움</b></td></tr>
        <tr><th>반영하기</th><td>완료/진행/지연 3분류 슬랙 메시지 15줄을 미리보기 후 저장</td></tr>
        <tr><th>이어쓰기</th><td>팀 채널 / 매주 금 16시 / 실행 기록은 Supabase / 최종 게시는 내가 직접</td></tr>
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
