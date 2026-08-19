// js/render.js — 문항을 화면으로 그리고 입력을 저장에 연결
import { getValue, saveValue } from './store.js';
import { PROMPTS, PROMPT_HELP, VISUALS } from './content.js';
import { esc, mini } from './shell.js';
import { toast } from './supabase.js';

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
  const wrap = el(`
    <div class="prompt">
      <div class="prompt-head">
        <span class="prompt-title">${esc(p.title)}</span>
        <button class="copy" type="button">복사</button>
        <button class="prompt-help-button" type="button" aria-label="${esc(p.title)} 초보자 도움말">?</button>
      </div>
      ${p.note ? `<div class="prompt-note">${mini(p.note)}</div>` : ''}
      <div class="prompt-guide" aria-label="프롬프트 실행 안내">
        <div><span>실행 위치</span><strong>${esc(guide.run)}</strong></div>
        <div><span>결과 확인</span><strong>${esc(guide.result)}</strong></div>
      </div>
      <div class="prompt-beginner"><span>초보자 메모</span><p></p></div>
      <pre></pre>
    </div>`);
  wrap.querySelector('.prompt-beginner p').textContent = helpInfo.summary || '';
  const pre = wrap.querySelector('pre');
  const refreshPrompt = () => { pre.textContent = personalizeBody(); };
  refreshPrompt();
  document.getElementById('f_s1_page_name')?.addEventListener('input', refreshPrompt);
  document.getElementById('f_s2_source_urls')?.addEventListener('input', refreshPrompt);

  wrap.querySelector('button.copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(personalizeBody());
      btn.textContent = '복사됨';
      btn.classList.add('done');
      setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('done'); }, 1600);
    } catch {
      // 클립보드 권한이 없으면 선택만 해줍니다
      const range = document.createRange();
      range.selectNodeContents(wrap.querySelector('pre'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('직접 복사해주세요 (Ctrl+C)');
    }
  });
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
