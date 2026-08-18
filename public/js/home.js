// js/home.js — 홈 (진행 현황)
import { requireAuth, needsTeam, saveTeam } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { SESSIONS, SETUP, CLINIC, requiredKeys } from './content.js';
import { el, progressBar } from './render.js';

const app = document.getElementById('app');

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">연결해서 일하기 · 4주</div>
      <h1>${esc(me.name)} 님의 워크북</h1>
      <p class="lede">회차별 실습을 여기에 기록합니다. 입력하면 자동으로 저장되니 저장 버튼을 찾지 않으셔도 됩니다.</p>
    </div>`));

  // 팀이 미지정이면 한 번 물어봅니다
  if (needsTeam(me)) {
    const box = el(`
      <div class="field">
        <label class="flabel" for="team">소속 팀을 알려주세요</label>
        <p class="fhint">강사가 참가자 명단을 정리할 때 씁니다. 한 번만 입력하면 됩니다.</p>
        <div style="display:flex;gap:0.5rem">
          <input type="text" id="team" placeholder="예: SCM본부 / Beauty Design / People">
          <button class="primary" id="teamsave" style="white-space:nowrap">저장</button>
        </div>
      </div>`);
    box.querySelector('#teamsave').addEventListener('click', async () => {
      const v = box.querySelector('#team').value.trim();
      if (!v) return;
      await saveTeam(v);
      location.reload();
    });
    app.appendChild(box);
  }

  // 전체 진행률
  const all = progressOf(requiredKeys('all'), entries);
  app.appendChild(el('<h2>전체 진행률</h2>'));
  app.appendChild(progressBar(all));

  // 사전 세팅
  const setupP = progressOf(requiredKeys('setup'), entries);
  app.appendChild(el('<h2>준비</h2>'));
  app.appendChild(el(`
    <div class="cards">
      <a class="card" href="/setup">
        <span class="card-n">준비</span>
        <span class="card-body">
          <span class="card-title">${esc(SETUP.title)}</span>
          <span class="card-goal">${esc(SETUP.intro)}</span>
        </span>
        <span class="card-prog mono${setupP.pct === 100 ? ' done' : ''}">${setupP.done}/${setupP.total}</span>
      </a>
    </div>`));

  // 회차
  app.appendChild(el('<h2>회차</h2>'));
  const cards = el('<div class="cards"></div>');
  for (const s of SESSIONS) {
    const p = progressOf(requiredKeys(s.n), entries);
    cards.appendChild(el(`
      <a class="card" href="/session?n=${s.n}">
        <span class="card-n">${s.n}회차</span>
        <span class="card-body">
          <span class="card-title">${esc(s.title)} <span>· ${esc(s.tag)}</span></span>
          <span class="card-goal">${esc(s.goal)}</span>
        </span>
        <span class="card-prog mono${p.total && p.pct === 100 ? ' done' : ''}">${p.done}/${p.total}</span>
      </a>`));
  }
  app.appendChild(cards);

  // 설계서 + 프롬프트
  const clinicP = progressOf(requiredKeys('clinic'), entries);
  app.appendChild(el('<h2>산출물</h2>'));
  app.appendChild(el(`
    <div class="cards">
      <a class="card" href="/clinic">
        <span class="card-n">설계서</span>
        <span class="card-body">
          <span class="card-title">${esc(CLINIC.title)}</span>
          <span class="card-goal">4회차 케이스 클리닉 — 내 업무 하나를 실제로 설계합니다</span>
        </span>
        <span class="card-prog mono${clinicP.pct === 100 ? ' done' : ''}">${clinicP.done}/${clinicP.total}</span>
      </a>
      <a class="card" href="/prompts">
        <span class="card-n">카드</span>
        <span class="card-body">
          <span class="card-title">프롬프트 카드</span>
          <span class="card-goal">실습에서 그대로 복사해 쓰는 프롬프트 모음</span>
        </span>
        <span class="card-prog"></span>
      </a>
    </div>`));
})();
