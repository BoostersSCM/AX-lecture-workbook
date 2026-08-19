// js/setup.js — 연결 준비 체크리스트
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { SETUP, PROMPTS, requiredKeys } from './content.js';
import { el, progressBar, renderField, renderPrompt } from './render.js';

const app = document.getElementById('app');

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">START HERE · 연결 준비</div>
      <h1>${esc(SETUP.title)}</h1>
      <p class="lede">${esc(SETUP.intro)}</p>
    </div>`));

  app.appendChild(el(`
    <figure class="lesson-visual setup-analogy">
      <div class="lesson-visual-art"><img src="/assets/water-to-pipeline.png" alt="우물에서 물을 길어 나르던 방식이 파이프 연결로 집 안까지 흐르는 모습" loading="eager"></div>
      <figcaption><span>연결의 비유</span><strong>매번 직접 옮기던 정보를, 필요한 도구까지 흐르게 만드는 준비입니다.</strong></figcaption>
    </figure>`));

  app.appendChild(progressBar(progressOf(requiredKeys('setup'), entries)));

  for (const g of SETUP.groups) {
    app.appendChild(el(`<h2>${esc(g.name)}</h2>`));

    for (const f of g.fields) {
      app.appendChild(renderField(f));

      // 연결 확인 항목 아래에 확인용 프롬프트를 바로 붙여줍니다
      if (f.key === 'setup.verify') {
        app.appendChild(renderPrompt({
          title: '연결 확인 프롬프트',
          note: '이걸 그대로 물어보세요. 페이지 제목이 나오면 성공입니다.',
          body: SETUP.verifyPrompt,
        }));
      }
    }
  }

  app.appendChild(el(`<h2>안 되면</h2>`));
  app.appendChild(el(`<div class="note">${esc(SETUP.planB)}</div>`));

  app.appendChild(el(`
    <h2>알아두시면 좋은 것</h2>
    <div class="field">
      <p style="margin:0 0 0.7rem"><b>AI가 우리 회사 노션을 다 들여다보나요?</b><br>
      <span style="color:var(--ink-soft)">아니요. 본인 계정 권한 범위까지만 봅니다. 내가 못 보는 페이지는 AI도 못 봅니다.</span></p>
      <p style="margin:0 0 0.7rem"><b>내가 올린 회사 자료가 외부 학습에 쓰이나요?</b><br>
      <span style="color:var(--ink-soft)">회사 계정(업무용 플랜)은 기본적으로 학습에 사용되지 않습니다. 다만 강의에서는 급여·평가·계약 단가 등 민감 정보를 아예 다루지 않습니다.</span></p>
      <p style="margin:0"><b>실습하다 노션을 망가뜨리면요?</b><br>
      <span style="color:var(--ink-soft)">연습용 복제 DB에서만 실습하므로 실제 데이터에 영향이 없습니다.</span></p>
    </div>`));

  app.appendChild(el(`<p style="margin-top:2rem"><a class="btn-link" href="/session?n=1">1회차 워크북으로 →</a></p>`));
})();
