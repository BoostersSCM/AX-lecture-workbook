// js/setup.js — 연결 준비 체크리스트
import { requireAuth } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus, saveValue } from './store.js';
import { toast, supabase } from './supabase.js';
import { SETUP, PROMPT_HELP, PROMPTS, requiredKeys } from './content.js';
import { el, progressBar, renderField, renderPrompt } from './render.js';

const app = document.getElementById('app');

function renderPlaygroundGuide(guide) {
  const section = el(`
    <section class="setup-playground">
      <div class="setup-playground-head">
        <div><span class="eyebrow">PRE-CLASS TEMPLATE</span><h3>${esc(guide.title)}</h3></div>
        <button class="copy" type="button">템플릿 문구 복사</button>
      </div>
      <p>${esc(guide.intro)}</p>
      <div class="setup-playground-roles">
        <div><strong>강사가 준비할 것</strong><ol>${guide.instructor.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
        <div><strong>수강생이 준비할 것</strong><ol>${guide.student.map(item => `<li>${esc(item)}</li>`).join('')}</ol></div>
      </div>
      <pre>${esc(guide.template)}</pre>
    </section>`);
  const button = section.querySelector('button');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(guide.template);
      button.textContent = '복사됨 ✓';
      toast('AX 실습장 템플릿 문구를 복사했습니다.');
      setTimeout(() => { button.textContent = '템플릿 문구 복사'; }, 1600);
    } catch {
      toast('복사하지 못했습니다. 템플릿 영역을 직접 선택해주세요.', 'error');
    }
  });
  return section;
}

// 내 Claude 연결 가이드 + 실측 확인 — "했다고 믿는 것"과 "실제 연결"을 구분해줍니다
function renderMcpGuide() {
  const card = el(`
    <section class="field mcp-setup-guide">
      <b style="font-size:0.95rem">내 Claude에 연결하는 순서 (회사 팀 플랜 기준)</b>
      <ol style="margin:0.6rem 0 0.9rem;padding-left:1.2rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.92rem;color:var(--ink-soft,#3C4A47)">
        <li>Claude(claude.ai) → <b>설정 → 커넥터</b>에서 <b>「AX 워크북」</b>을 켭니다</li>
        <li>워크북 승인 페이지가 열리면 <b>부스터스 구글 로그인</b> 후 <b>[승인하고 연결]</b></li>
        <li>Claude 새 대화에서 <i>“워크북 커넥터에서 list_exercises 실행해줘”</i>로 확인</li>
      </ol>
      <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap">
        <button class="primary" type="button" data-mcp-check>연결 상태 확인</button>
        <span class="mcp-status-line" aria-live="polite"></span>
      </div>
      <p class="fhint" style="margin-top:0.7rem">커넥터 목록에 「AX 워크북」이 아직 없다면 관리자 등록 대기 중입니다 —
      그동안은 <a href="/my">마이페이지</a>의 개인 연결 키로 커스텀 커넥터를 직접 추가해도 됩니다(개인 플랜용 대안).</p>
    </section>`);

  const button = card.querySelector('[data-mcp-check]');
  const line = card.querySelector('.mcp-status-line');

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '확인 중…';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mcp-status', {
        headers: { Authorization: 'Bearer ' + (session?.access_token || '') },
      });
      const st = await res.json();
      if (!res.ok || !st.ok) throw new Error(st.error || ('확인 실패 (' + res.status + ')'));

      if (st.connected) {
        const how = st.oauthTokens > 0 ? `조직 커넥터 승인 ${st.oauthTokens}건` : '개인 키 발급됨';
        line.textContent = `✅ 연결되어 있습니다 (${how})`;
        line.style.color = 'var(--ok, #1F7A4D)';
        // 실측 성공 → 체크박스 자동 체크 + 저장
        const box = document.getElementById('f_setup_mcp');
        if (box && !box.checked) {
          box.checked = true;
          await saveValue('setup.mcp', 'true', { immediate: true });
        }
        toast('Claude 연결이 확인되었습니다.');
      } else {
        line.textContent = '⛔ 아직 연결 기록이 없습니다 — 위 순서대로 커넥터를 켜고 승인해주세요.';
        line.style.color = 'var(--warn, #9A4A22)';
      }
    } catch (error) {
      line.textContent = '⚠️ ' + (error.message || '확인에 실패했습니다.');
      line.style.color = 'var(--warn, #9A4A22)';
    } finally {
      button.disabled = false;
      button.textContent = '연결 상태 확인';
    }
  });

  return card;
}

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

    if (g.name.startsWith('3.') && SETUP.playgroundGuide) {
      app.appendChild(renderPlaygroundGuide(SETUP.playgroundGuide));
    }

    for (const f of g.fields) {
      app.appendChild(renderField(f));

      // Claude 커넥터 항목 아래에 켜는 순서 + 실측 확인 버튼을 붙여줍니다
      if (f.key === 'setup.mcp') {
        app.appendChild(renderMcpGuide());
      }

      // 연결 확인 항목 아래에 확인용 프롬프트를 바로 붙여줍니다
      if (f.key === 'setup.verify') {
        app.appendChild(renderPrompt({
          title: '연결 확인 프롬프트 (선택)',
          note: '어디에 물어보나요? 사내 AI 도구(예: Claude)에 이 문장을 붙여넣으면 됩니다. AI 도구가 없다면 건너뛰고, 1회차 작업대의 「수정할 문단 불러오기」 버튼이 같은 확인을 대신합니다.',
          body: SETUP.verifyPrompt,
        }, PROMPT_HELP.setup));
      }
    }

    if (g.fields.some(f => f.key === 'setup.asana_target')) {
      const saveBox = el(`
        <div class="setup-save">
          <div>
            <strong>연결 준비를 마쳤나요?</strong>
            <span>입력한 Asana·Notion·Slack 대상을 한 번에 저장합니다.</span>
          </div>
          <button class="primary" type="button">연결 준비 저장</button>
        </div>`);
      const button = saveBox.querySelector('button');
      button.addEventListener('click', async () => {
        const values = g.fields.map(f => ({
          key: f.key,
          value: document.getElementById('f_' + f.key.replace(/[^\w]/g, '_'))?.value.trim() || '',
          required: f.required,
        }));
        const missing = values.filter(item => item.required && !item.value);
        if (missing.length) {
          toast('필수 연결 정보를 먼저 입력해주세요.', 'error');
          document.getElementById('f_' + missing[0].key.replace(/[^\w]/g, '_'))?.focus();
          return;
        }

        button.disabled = true;
        button.textContent = '저장 중…';
        try {
          const results = await Promise.all(values.map(item => saveValue(item.key, item.value, { immediate: true })));
          if (results.some(result => result !== true)) throw new Error('save failed');
          button.textContent = '저장 완료 ✓';
          button.classList.add('saved');
          toast('연결 준비 정보가 저장되었습니다.');
          setTimeout(() => {
            button.textContent = '연결 준비 저장';
            button.classList.remove('saved');
            button.disabled = false;
          }, 1800);
        } catch {
          button.textContent = '다시 저장';
          button.disabled = false;
          toast('저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
      });
      app.appendChild(saveBox);
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
      <span style="color:var(--ink-soft)">강사가 배포한 「AX 실습장」을 각자 복제해 사용합니다. 3회차 수정 저장은 변경 전후 미리보기와 확인 뒤 내 복제본·샘플 태스크·봇 메시지에만 실행합니다.</span></p>
    </div>`));

  app.appendChild(el(`<p style="margin-top:2rem"><a class="btn-link" href="/session?n=1">1회차 워크북으로 →</a></p>`));
})();
