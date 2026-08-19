// js/my.js — 마이페이지: 내 정보 수정 + 내 기록 열람·활용
import { requireAuth, isInstructor, saveProfileBits } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { SETUP, SESSIONS, CLINIC, requiredKeys } from './content.js';
import { el, progressBar } from './render.js';
import { toast, supabase } from './supabase.js';

// ── 내 Claude 연결 (MCP) — 개인 키 발급·관리 ────────────────
// 내 워크북 기록을 각자의 Claude에서 불러오고 되돌려 놓을 수 있게 하는 다리입니다.
// 같은 구글 계정이라도 자동으로 연동되지 않으므로, 이 키가 "누구의 기록인지"를 증명합니다.
async function renderMcpSection(me) {
  const box = document.createElement('div');
  box.className = 'field mcp-box';

  async function currentKey() {
    const { data, error } = await supabase.from('mcp_keys').select('key').eq('user_id', me.id).maybeSingle();
    if (error) return { error };
    return { key: data?.key || null };
  }

  function newKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return 'axk_' + [...bytes].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 40);
  }

  async function issue() {
    await supabase.from('mcp_keys').delete().eq('user_id', me.id); // 재발급 = 기존 키 폐기
    const key = newKey();
    const { error } = await supabase.from('mcp_keys').insert({ key, user_id: me.id });
    if (error) { toast('키 발급에 실패했습니다: ' + error.message, 'error'); return null; }
    return key;
  }

  async function paint() {
    const { key, error } = await currentKey();
    if (error) {
      box.innerHTML = '<p class="fhint">⚠️ MCP 키 저장소가 아직 준비되지 않았습니다. 운영자가 <code>supabase/003_mcp_keys.sql</code>을 실행하면 이 기능이 열립니다.</p>';
      return;
    }

    const url = key ? `${location.origin}/api/mcp?key=${key}` : '';
    box.innerHTML = `
      <p class="fhint" style="margin-top:0">4주간 쌓은 내 기록(레시피·액션아이템·설계서)을 <b>내 Claude</b>에서 불러오고, 다듬은 결과를 워크북에 되돌려 놓을 수 있습니다.
      아래 개인 키는 <b>내 기록에만</b> 접근합니다 — 다른 사람 것은 보이지 않습니다.</p>
      ${key ? `
        <label class="ob-field"><span>내 커넥터 주소 (Claude에 등록)</span>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <input type="text" readonly value="${url}" style="flex:1;min-width:16rem" onclick="this.select()">
            <button class="primary" data-copy-url type="button">주소 복사</button>
          </div>
        </label>
        <div class="my-actions" style="margin:0.7rem 0 0.4rem">
          <button data-rotate type="button">키 재발급 (기존 연결 끊김)</button>
          <button data-revoke type="button">연결 해제 (키 삭제)</button>
        </div>` : `
        <div class="my-actions" style="margin:0.4rem 0">
          <button class="primary" data-issue type="button">연결 키 발급하기</button>
        </div>`}
      <details class="prompt-source" style="margin-top:0.6rem">
        <summary>Claude에 등록하는 법</summary>
        <ol style="margin:0.6rem 0 0.3rem;padding-left:1.2rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem">
          <li>Claude(claude.ai 또는 데스크톱) → <b>설정 → 커넥터 → 커스텀 커넥터 추가</b></li>
          <li>위 <b>내 커넥터 주소</b>를 붙여넣고 저장 (인증 없음/None 선택)</li>
          <li>새 대화에서 커넥터를 켜고 이렇게 물어보세요 — <i>"내 워크북에서 연결 레시피 가져와서, 이번 주 회의록에 맞게 다듬어줘"</i></li>
          <li>다듬은 결과를 되돌려 놓기 — <i>"이걸 my.weekly_recipe로 워크북에 저장해줘"</i></li>
        </ol>
        <p class="fhint">키가 든 주소는 비밀번호처럼 다루세요. 유출이 의심되면 재발급하면 기존 주소는 즉시 무효화됩니다.</p>
      </details>`;

    box.querySelector('[data-copy-url]')?.addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(url); e.currentTarget.textContent = '복사됨 ✓'; setTimeout(() => paint(), 1200); }
      catch { toast('직접 복사해주세요.', 'error'); }
    });
    box.querySelector('[data-issue]')?.addEventListener('click', async () => {
      if (await issue()) { toast('연결 키를 발급했습니다.'); paint(); }
    });
    box.querySelector('[data-rotate]')?.addEventListener('click', async () => {
      if (await issue()) { toast('키를 재발급했습니다. 이전 주소는 무효화되었습니다.'); paint(); }
    });
    box.querySelector('[data-revoke]')?.addEventListener('click', async () => {
      await supabase.from('mcp_keys').delete().eq('user_id', me.id);
      toast('연결을 해제했습니다.');
      paint();
    });
  }

  await paint();
  return box;
}

const app = document.getElementById('app');

// item_key → { label, group } 매핑 — 내 기록을 사람이 읽는 목록으로
const META = (() => {
  const m = {};
  for (const g of SETUP.groups) for (const f of g.fields) if (f.key && f.kind !== 'note') m[f.key] = { label: f.label, group: '연결 준비', href: '/setup' };
  for (const s of SESSIONS) for (const b of s.blocks) if (b.type === 'field') m[b.key] = { label: b.label, group: `${s.n}회차 · ${s.title}`, href: `/session?n=${s.n}` };
  for (const g of CLINIC.groups) for (const f of g.fields) if (f.key && f.kind !== 'note') m[f.key] = { label: f.label, group: '내 업무 연결 설계서', href: '/clinic' };
  return m;
})();

const GROUP_ORDER = ['연결 준비', ...SESSIONS.map(s => `${s.n}회차 · ${s.title}`), '내 업무 연결 설계서'];

function displayValue(key, value) {
  if (value === 'true') return '✓ 체크함';
  if (key.endsWith('.cols') || key.endsWith('.db_map')) {
    try {
      const rows = JSON.parse(value).filter(r => Array.isArray(r) && r.some(c => String(c || '').trim()));
      return rows.map(r => r.join('  |  ')).join('\n');
    } catch { /* 원문 그대로 */ }
  }
  return value;
}

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell();
  mountStatus(document.getElementById('savestate'));

  const entries = await loadEntries();

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">MY PAGE</div>
      <h1>${esc(me.name)} 님</h1>
      <p class="lede">내 정보를 수정하고, 지금까지 기록한 내용을 한 곳에서 봅니다. 기록 원문 수정은 각 회차 페이지에서 합니다.</p>
    </div>`));

  // ── 내 정보 ────────────────────────────────────────────────
  app.appendChild(el('<h2>내 정보</h2>'));
  const info = el(`
    <div class="field my-profile">
      <div class="my-profile-grid">
        <div><span class="my-label">이름</span><b>${esc(me.name)}</b></div>
        <div><span class="my-label">이메일</span><b>${esc(me.email)}</b></div>
        <div><span class="my-label">역할</span><b>${isInstructor(me) ? '강사' : '수강생'}</b></div>
      </div>
      <div class="my-edit">
        <label class="ob-field"><span>소속 팀</span>
          <input type="text" id="my-team" maxlength="40" value="${esc(me.team === '미지정' ? '' : me.team)}" placeholder="예: SCM본부 / People">
        </label>
        ${isInstructor(me) ? '' : `
        <label class="ob-field"><span>기수</span>
          <input type="number" id="my-cohort" min="1" max="99" value="${Number.isInteger(me.cohort) ? me.cohort : ''}" placeholder="예: 1">
        </label>`}
        <button class="primary" id="my-save" type="button">정보 저장</button>
      </div>
      <p class="fhint">이름과 이메일은 구글 계정에서 옵니다. 기수를 바꾸면 열리는 회차도 그 기수 기준으로 바뀝니다.</p>
    </div>`);
  info.querySelector('#my-save').addEventListener('click', async (e) => {
    const team = info.querySelector('#my-team').value.trim();
    const cohortInput = info.querySelector('#my-cohort');
    const bits = {};
    if (team) bits.team = team;
    if (cohortInput) {
      const c = Number(cohortInput.value);
      if (Number.isInteger(c) && c >= 1) bits.cohort = c;
    }
    if (!Object.keys(bits).length) { toast('바꿀 내용이 없습니다.', 'error'); return; }
    e.currentTarget.disabled = true;
    const saved = await saveProfileBits(bits);
    e.currentTarget.disabled = false;
    if (saved) { toast('내 정보를 저장했습니다.'); setTimeout(() => location.reload(), 600); }
  });
  app.appendChild(info);

  // ── 진행 요약 ──────────────────────────────────────────────
  app.appendChild(el('<h2>진행 요약</h2>'));
  app.appendChild(progressBar(progressOf(requiredKeys('all'), entries)));

  // ── 활용하기 ──────────────────────────────────────────────
  app.appendChild(el('<h2>활용하기</h2>'));
  const useBox = el(`
    <div class="my-actions">
      <button class="primary" id="my-export" type="button">내 기록 파일로 내보내기 (.md)</button>
      <a class="btn-link" style="background:var(--surface-2);color:var(--ink)" href="/prompts">프롬프트 카드 열기</a>
      ${String(entries['s3.recipe'] || '').trim() ? '<button id="my-recipe" type="button">내 연결 레시피 복사</button>' : ''}
    </div>`);
  useBox.querySelector('#my-export').addEventListener('click', () => {
    const rows = Object.entries(entries)
      .filter(([key, value]) => META[key] && String(value || '').trim() && value !== 'false')
      .map(([key, value]) => `## ${META[key].group} — ${META[key].label}\n\n${displayValue(key, value)}`);
    if (!rows.length) { toast('내보낼 기록이 아직 없습니다.', 'error'); return; }
    const markdown = `# ${me.name} — AX 워크북 기록\n\n${rows.join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ax-workbook-my-notes.md';
    link.click();
    URL.revokeObjectURL(url);
    toast(`${rows.length}개 항목을 내보냈습니다.`);
  });
  useBox.querySelector('#my-recipe')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(entries['s3.recipe']);
      e.currentTarget.textContent = '복사됨 ✓';
      setTimeout(() => { e.currentTarget && (e.currentTarget.textContent = '내 연결 레시피 복사'); }, 1500);
    } catch { toast('복사하지 못했습니다. 3회차에서 직접 복사해주세요.', 'error'); }
  });
  app.appendChild(useBox);

  // ── 내 Claude 연결 (MCP) ──────────────────────────────────
  app.appendChild(el('<h2>내 Claude에 연결하기 (MCP)</h2>'));
  app.appendChild(await renderMcpSection(me));

  // ── 내 기록 ────────────────────────────────────────────────
  app.appendChild(el('<h2>내 기록</h2>'));
  const written = Object.keys(entries).filter(k => META[k] && String(entries[k] || '').trim() && entries[k] !== 'false');

  if (!written.length) {
    app.appendChild(el('<div class="empty-state">아직 기록이 없습니다. <a href="/session?n=1">1회차부터 시작해보세요.</a></div>'));
    return;
  }

  for (const group of GROUP_ORDER) {
    const keys = written.filter(k => META[k].group === group);
    if (!keys.length) continue;
    const sec = el(`
      <details class="my-group" ${group.startsWith('연결') ? '' : 'open'}>
        <summary><b>${esc(group)}</b><span class="mono">${keys.length}건</span><a href="${META[keys[0]].href}">수정하러 가기 ↗</a></summary>
        <div class="my-items"></div>
      </details>`);
    const box = sec.querySelector('.my-items');
    for (const k of keys) {
      box.appendChild(el(`
        <div class="answer-item">
          <div class="answer-q">${esc(META[k].label)}</div>
          <div class="answer-v">${esc(displayValue(k, entries[k]))}</div>
        </div>`));
    }
    app.appendChild(sec);
  }
})();
