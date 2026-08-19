// js/my.js — 마이페이지: 내 정보 수정 + 내 기록 열람·활용
import { requireAuth, isInstructor, saveProfileBits } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, progressOf, mountStatus } from './store.js';
import { SETUP, SESSIONS, CLINIC, requiredKeys } from './content.js';
import { el, progressBar } from './render.js';
import { toast } from './supabase.js';

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
