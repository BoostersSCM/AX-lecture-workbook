// js/render.js — 문항을 화면으로 그리고 입력을 저장에 연결
import { getValue, saveValue } from './store.js';
import { PROMPTS, PROMPT_HELP, VISUALS, SESSIONS, SETUP, CLINIC } from './content.js';
import { esc, mini } from './shell.js';
import { toast } from './supabase.js';
import { callIntegration } from './integrations.js';

// item_key → 라벨 (AI 실행 재료의 섹션 제목용)
const FIELD_LABELS = (() => {
  const m = {};
  for (const g of SETUP.groups) for (const f of g.fields) if (f.key) m[f.key] = f.label || f.key;
  for (const s of SESSIONS) for (const b of s.blocks) if (b.type === 'field') m[b.key] = b.label;
  for (const g of CLINIC.groups) for (const f of g.fields) if (f.key) m[f.key] = f.label || f.key;
  return m;
})();

// 블록 하나를 그려서 반환
export function renderBlock(b) {
  switch (b.type) {
    case 'head':   return el(`<h2>${mini(b.text)}</h2>`);
    case 'note':   return el(`<div class="note">${mini(b.text)}</div>`);
    case 'visual': return renderVisual(VISUALS[b.id]);
    case 'link':   return el(`<p style="margin:1.2rem 0"><a class="btn-link" href="${b.href}">${esc(b.text)}</a></p>`);
    case 'prompt': return renderPrompt(PROMPTS[b.id], PROMPT_HELP[b.id]);
    case 'field':  return renderField(b);
    default:       return document.createComment('unknown block');
  }
}

function renderVisual(v) {
  if (!v) return document.createComment('missing visual');
  return el(`
    <figure class="lesson-visual">
      <div class="lesson-visual-art"><img src="${esc(v.src)}" alt="${esc(v.alt)}" loading="lazy"></div>
      <figcaption><span>${esc(v.label)}</span><strong>${esc(v.caption)}</strong></figcaption>
    </figure>`);
}

// 프롬프트 카드 (읽기 전용 + 복사)
function promptGuide(p) {
  const title = String(p.title || '');
  if (title.includes('웹훅으로 받기')) {
    return { run: 'Slack 테스트 채널에 메시지 작성', result: '3회차 수신함에서 확인 → 저장 상태 점검' };
  }
  if (title.includes('Asana')) {
    return { run: '3회차 Asana 수정 작업대', result: '변경 전후 확인 → 같은 Asana 태스크에서 확인' };
  }
  if (title.includes('Notion')) {
    return { run: `${p.session === 1 ? '1회차' : '3회차'} Notion 수정 작업대`, result: '변경 전후 확인 → 같은 Notion 문단에서 확인' };
  }
  if (title.includes('Slack')) {
    return { run: '3회차 Slack 전송·수정 작업대', result: '변경 전후 확인 → 같은 Slack 메시지에서 확인' };
  }
  return { run: '해당 회차의 연동 작업대', result: '결과 검토 → 워크북 또는 같은 SaaS에 저장' };
}

function openPromptHelp(help, title) {
  if (!help) return;
  const modal = el(`
    <div class="prompt-help-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-help-title">
      <div class="prompt-help-backdrop" data-close-help></div>
      <section class="prompt-help-box">
        <div class="prompt-help-head">
          <div><span class="eyebrow">BEGINNER GUIDE</span><h2 id="prompt-help-title"></h2></div>
          <button class="prompt-help-close" type="button" aria-label="도움말 닫기">×</button>
        </div>
        <p class="prompt-help-summary"></p>
        <div class="prompt-help-section prompt-help-setup"><h3>먼저 설정할 것</h3><ul></ul></div>
        <div class="prompt-help-section prompt-help-terms"><h3>용어를 풀어보면</h3><dl></dl></div>
        <div class="prompt-help-section prompt-help-steps"><h3>실제로 하는 순서</h3><ol></ol></div>
      </section>
    </div>`);
  modal.querySelector('#prompt-help-title').textContent = title || '프롬프트 도움말';
  modal.querySelector('.prompt-help-summary').textContent = help.summary || '';
  const setup = modal.querySelector('.prompt-help-setup ul');
  setup.innerHTML = (help.setup || []).map(item => `<li>${esc(item)}</li>`).join('');
  modal.querySelector('.prompt-help-setup').hidden = !help.setup?.length;
  const terms = modal.querySelector('.prompt-help-terms dl');
  terms.innerHTML = (help.terms || []).map(([term, description]) => `<dt>${esc(term)}</dt><dd>${esc(description)}</dd>`).join('');
  modal.querySelector('.prompt-help-terms').hidden = !help.terms?.length;
  const steps = modal.querySelector('.prompt-help-steps ol');
  steps.innerHTML = (help.steps || []).map(step => `<li>${esc(step)}</li>`).join('');
  modal.querySelector('.prompt-help-steps').hidden = !help.steps?.length;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    modal.remove();
  };
  const onKey = (event) => { if (event.key === 'Escape') close(); };
  modal.querySelector('.prompt-help-close').addEventListener('click', close);
  modal.querySelector('[data-close-help]').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(modal);
  modal.querySelector('.prompt-help-close').focus();
}

export function renderPrompt(p, help = null) {
  if (!p) return document.createComment('missing prompt');
  const guide = promptGuide(p);
  const helpInfo = help || {
    summary: '이 프롬프트는 원본에서 필요한 정보를 읽고, 정해진 형식으로 결과를 만드는 요청입니다.',
    setup: ['대괄호 안의 값을 내 업무에 맞게 준비합니다.'],
    terms: [['원본', 'AI가 읽을 실제 자료입니다.'], ['범위', '어디까지 읽을지 정하는 조건입니다.']],
    steps: ['대괄호 안에 어떤 대상과 범위가 필요한지 확인합니다.', '회차의 연동 작업대에서 원본을 가져와 수정합니다.', '변경 전후를 검토한 뒤 저장 버튼을 누르고 같은 SaaS 항목을 다시 확인합니다.'],
  };
  const personalizeBody = () => {
    const replacements = {
      '[페이지명]': String(getValue('s1.page_name') || '').trim() || '[여기에 Notion 페이지명 입력]',
      '[회의록 원본]': String(getValue('s2.source_urls') || '').trim() || '[여기에 회의록 URL 또는 페이지 입력]',
    };
    return Object.entries(replacements).reduce((body, [token, value]) => body.replaceAll(token, value), String(p.body || ''));
  };
  // 재료(원문) — 작업대가 가져와 저장해둔 값들을 프롬프트 뒤에 동봉
  const buildMaterials = () => {
    const parts = [];
    for (const key of p.context || []) {
      const v = String(getValue(key) || '').trim();
      if (v && v !== 'false') parts.push(`【${FIELD_LABELS[key] || key}】\n${v}`);
    }
    return parts.join('\n\n');
  };

  // context/output이 있으면 "워크북에서 AI 실행" 카드 — 복붙 셔틀 없이 루프가 닫힙니다
  const runnable = Boolean(p.context?.length || p.output);

  const wrap = el(`
    <div class="prompt${runnable ? ' prompt-runnable' : ''}">
      <div class="prompt-head">
        <span class="prompt-title">${esc(p.title)}</span>
        ${runnable ? '<button class="prompt-run" type="button">워크북에서 AI 실행</button>' : '<button class="copy" type="button">복사</button>'}
        <button class="prompt-help-button" type="button" aria-label="${esc(p.title)} 초보자 도움말">?</button>
      </div>
      ${p.note ? `<div class="prompt-note">${mini(p.note)}</div>` : ''}
      <div class="prompt-guide" aria-label="프롬프트 실행 안내">
        <div><span>실행 위치</span><strong>${runnable ? '이 카드 — 버튼 한 번' : esc(guide.run)}</strong></div>
        <div><span>결과 확인</span><strong>${runnable ? '아래 결과를 사람이 검토 → 기록 칸에 넣기' : esc(guide.result)}</strong></div>
      </div>
      <div class="prompt-beginner"><span>초보자 메모</span><p></p></div>
      <div class="ai-result" hidden>
        <div class="ai-result-head"><span>AI 결과 — 그대로 믿지 말고 검토하세요</span></div>
        <pre></pre>
        <div class="ai-result-actions">
          ${p.output ? '<button class="ai-insert" type="button">결과를 아래 기록 칸에 넣기</button>' : ''}
          <button class="ai-copy copy" type="button">결과 복사</button>
        </div>
      </div>
      ${runnable ? `
      <details class="prompt-source">
        <summary>버튼 뒤 요청문 보기 — 직접 복사해 다른 AI에서 실행할 수도 있습니다</summary>
        <pre></pre>
        <button class="copy" type="button">요청문 복사</button>
      </details>` : '<pre></pre>'}
    </div>`);
  wrap.querySelector('.prompt-beginner p').textContent = helpInfo.summary || '';
  const pre = wrap.querySelector(runnable ? '.prompt-source pre' : ':scope > pre');
  const refreshPrompt = () => { pre.textContent = personalizeBody(); };
  refreshPrompt();
  document.getElementById('f_s1_page_name')?.addEventListener('input', refreshPrompt);
  document.getElementById('f_s2_source_urls')?.addEventListener('input', refreshPrompt);

  // 복사 버튼(요청문) — 러너블이면 재료까지 동봉해 복사 (다른 AI 폴백용)
  wrap.querySelector('button.copy:not(.ai-copy)')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const materials = buildMaterials();
    const text = personalizeBody() + (materials ? `\n\n──── 아래는 워크북에서 가져온 재료(원문) ────\n${materials}` : '');
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '복사됨';
      btn.classList.add('done');
      setTimeout(() => { btn.textContent = runnable ? '요청문 복사' : '복사'; btn.classList.remove('done'); }, 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('직접 복사해주세요 (Ctrl+C)');
    }
  });

  // 워크북 안에서 AI 실행
  if (runnable) {
    const runBtn = wrap.querySelector('.prompt-run');
    const resultBox = wrap.querySelector('.ai-result');
    const resultPre = resultBox.querySelector('pre');

    runBtn.addEventListener('click', async () => {
      const materials = buildMaterials();
      if (p.context?.length && !materials) {
        toast('재료가 비어 있습니다 — 먼저 작업대에서 원본을 가져오거나 위 칸을 채워주세요.', 'error');
        return;
      }
      runBtn.disabled = true;
      runBtn.textContent = 'AI 실행 중…';
      try {
        const res = await callIntegration('/api/ai/transform', {
          method: 'POST',
          body: { prompt: personalizeBody(), materials },
        });
        resultPre.textContent = res.text;
        resultBox.hidden = false;
      } catch (error) {
        if (/AI_NOT_CONFIGURED/.test(error.message || '')) {
          toast('워크북 AI가 아직 설정되지 않았습니다(운영자: ANTHROPIC_API_KEY). 아래 요청문 복사로 각자 AI에서 실행하세요.', 'error');
          wrap.querySelector('.prompt-source')?.setAttribute('open', '');
        } else {
          toast(error.message || 'AI 실행에 실패했습니다.', 'error');
        }
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '워크북에서 AI 실행';
      }
    });

    resultBox.querySelector('.ai-insert')?.addEventListener('click', (e) => {
      const text = resultPre.textContent.trim();
      if (!text) return;
      saveValue(p.output, text); // 수동 저장 모드 — 초안으로 들어가고 [모두 저장]으로 확정
      const field = document.getElementById('f_' + p.output.replace(/[^\w]/g, '_'));
      if (field) { field.value = text; field.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      e.currentTarget.textContent = '넣었습니다 — 검토 후 [모두 저장]';
      toast('기록 칸에 넣었습니다. 사람이 다듬은 뒤 하단 [모두 저장]으로 확정하세요.');
    });

    resultBox.querySelector('.ai-copy').addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(resultPre.textContent);
        e.currentTarget.textContent = '복사됨';
        setTimeout(() => { e.currentTarget && (e.currentTarget.textContent = '결과 복사'); }, 1500);
      } catch { toast('직접 복사해주세요 (Ctrl+C)'); }
    });
  }

  wrap.querySelector('.prompt-help-button').addEventListener('click', () => openPromptHelp(helpInfo, p.title));
  return wrap;
}

// 입력 필드
export function renderField(f) {
  if (f.kind === 'note') return el(`<div class="note">${mini(f.text)}</div>`);

  const box = el('<div class="field"></div>');
  const id  = 'f_' + f.key.replace(/[^\w]/g, '_');

  if (f.kind === 'check') {
    const on = getValue(f.key) === 'true';
    box.appendChild(el(`
      <div class="checkrow">
        <input type="checkbox" id="${id}" ${on ? 'checked' : ''}>
        <label for="${id}">${mini(f.label)}
          ${f.hint ? `<span class="sub">${mini(f.hint)}</span>` : ''}
        </label>
      </div>`));
    box.querySelector('input').addEventListener('change', e => {
      saveValue(f.key, e.target.checked ? 'true' : 'false');
    });
    return box;
  }

  // 라벨 + 힌트
  box.appendChild(el(`<label class="flabel" for="${id}">${mini(f.label)}${f.required ? '<span class="req">*</span>' : ''}</label>`));
  if (f.hint) box.appendChild(el(`<p class="fhint">${mini(f.hint)}</p>`));

  if (f.kind === 'checks') {
    const chosen = new Set((getValue(f.key) || '').split('').filter(Boolean));
    f.options.forEach((opt, i) => {
      const oid = id + '_' + i;
      const row = el(`
        <div class="checkrow">
          <input type="checkbox" id="${oid}" ${chosen.has(opt) ? 'checked' : ''}>
          <label for="${oid}">${mini(opt)}</label>
        </div>`);
      row.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) chosen.add(opt); else chosen.delete(opt);
        saveValue(f.key, [...chosen].join(''));
      });
      box.appendChild(row);
    });
    return box;
  }

  if (f.kind === 'radio') {
    const cur = getValue(f.key);
    f.options.forEach((opt, i) => {
      const oid = id + '_' + i;
      const row = el(`
        <div class="checkrow">
          <input type="radio" name="${id}" id="${oid}" value="${esc(opt)}" ${cur === opt ? 'checked' : ''}>
          <label for="${oid}">${mini(opt)}</label>
        </div>`);
      row.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) saveValue(f.key, opt);
      });
      box.appendChild(row);
    });
    return box;
  }

  if (f.kind === 'grid') {
    const raw = getValue(f.key);
    const data = raw ? JSON.parse(raw) : [];
    const cols = f.columns;
    const rows = f.rows || 5;

    const tbl = el(`
      <div class="tablewrap"><table>
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody></tbody>
      </table></div>`);
    const tbody = tbl.querySelector('tbody');

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols.length; c++) {
        const td = document.createElement('td');
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = data[r]?.[c] ?? '';
        if (r === 0 && f.placeholders?.[c]) inp.placeholder = f.placeholders[c];
        inp.addEventListener('input', () => {
          if (!data[r]) data[r] = [];
          data[r][c] = inp.value;
          saveValue(f.key, JSON.stringify(data));
        });
        td.appendChild(inp);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    box.appendChild(tbl);
    return box;
  }

  // text / number / textarea
  let input;
  if (f.kind === 'textarea') {
    input = document.createElement('textarea');
    input.rows = f.rows || 3;
  } else {
    input = document.createElement('input');
    input.type = f.kind === 'number' ? 'number' : 'text';
  }
  input.id = id;
  input.value = getValue(f.key);
  if (f.readonly) {
    // 작업대가 자동 기록하는 영수증 칸 — 직접 입력하는 곳이 아님을 분명히
    input.readOnly = true;
    input.classList.add('auto-filled');
    input.placeholder = '작업대 버튼을 실행하면 자동으로 기록됩니다';
  } else {
    input.addEventListener('input', () => saveValue(f.key, input.value));
    input.addEventListener('blur',  () => saveValue(f.key, input.value));
  }
  box.appendChild(input);
  return box;
}

// HTML 문자열 → 엘리먼트
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// 최상위 요소가 여러 개인 템플릿용 — el()은 첫 요소만 반환하므로
// 형제 <section>들을 한 번에 붙일 때는 반드시 이걸 쓴다.
export function frag(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content; // DocumentFragment — appendChild 시 자식 전부가 붙는다
}

// 진행률 바
export function progressBar({ done, total, pct }) {
  return el(`
    <div class="prog">
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      <span class="prog-num mono">${done}/${total}</span>
    </div>`);
}
