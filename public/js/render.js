// js/render.js — 문항을 화면으로 그리고 입력을 저장에 연결
import { getValue, saveValue } from './store.js';
import { PROMPTS, VISUALS } from './content.js';
import { esc, mini } from './shell.js';
import { toast } from './supabase.js';

// 블록 하나를 그려서 반환
export function renderBlock(b) {
  switch (b.type) {
    case 'head':   return el(`<h2>${mini(b.text)}</h2>`);
    case 'note':   return el(`<div class="note">${mini(b.text)}</div>`);
    case 'visual': return renderVisual(VISUALS[b.id]);
    case 'link':   return el(`<p style="margin:1.2rem 0"><a class="btn-link" href="${b.href}">${esc(b.text)}</a></p>`);
    case 'prompt': return renderPrompt(PROMPTS[b.id]);
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
    return { run: 'Slack 테스트 채널에 메시지 작성', result: 'Vercel 로그 확인 → 아래 결과 칸에 기록' };
  }
  if (title.includes('Asana')) {
    return { run: 'Claude + 연결된 Asana 도구', result: 'Claude 대화창과 Asana 프로젝트에서 확인' };
  }
  if (title.includes('Notion')) {
    return { run: 'Claude + 연결된 Notion 도구', result: 'Claude 대화창과 Notion 페이지에서 확인' };
  }
  if (title.includes('Slack')) {
    return { run: 'Claude + 연결된 Slack 도구/API', result: 'Claude 대화창과 Slack 채널에서 확인' };
  }
  return { run: 'Claude 대화창', result: 'Claude 결과 확인 → 아래 워크북 칸에 기록' };
}

export function renderPrompt(p) {
  if (!p) return document.createComment('missing prompt');
  const guide = promptGuide(p);
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
      </div>
      ${p.note ? `<div class="prompt-note">${mini(p.note)}</div>` : ''}
      <div class="prompt-guide" aria-label="프롬프트 실행 안내">
        <div><span>실행 위치</span><strong>${esc(guide.run)}</strong></div>
        <div><span>결과 확인</span><strong>${esc(guide.result)}</strong></div>
      </div>
      <pre></pre>
    </div>`);
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
      saveValue(f.key, e.target.checked ? 'true' : 'false', { immediate: true });
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
        saveValue(f.key, [...chosen].join(''), { immediate: true });
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
        if (e.target.checked) saveValue(f.key, opt, { immediate: true });
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
  input.addEventListener('input', () => saveValue(f.key, input.value));
  input.addEventListener('blur',  () => saveValue(f.key, input.value, { immediate: true }));
  box.appendChild(input);
  return box;
}

// HTML 문자열 → 엘리먼트
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// 진행률 바
export function progressBar({ done, total, pct }) {
  return el(`
    <div class="prog">
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      <span class="prog-num mono">${done}/${total}</span>
    </div>`);
}
