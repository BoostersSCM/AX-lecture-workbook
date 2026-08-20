// js/my.js — 마이페이지: 내 정보 수정 + 강의별 내 기록 열람·활용 + Claude 연결
import { requireAuth, isInstructor, isActualInstructor, startMemberPreview, stopMemberPreview, saveProfileBits } from './auth.js';
import { mountShell, esc } from './shell.js';
import { loadEntries, loadAllMyEntries, progressOf, mountStatus } from './store.js';
import { el, progressBar } from './render.js';
import { toast, supabase } from './supabase.js';
import { C, initCourse, labelMapOf, loadCourseShape, DEFAULT_SLUG } from './courseState.js';

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
      <div class="note" style="margin:0 0 0.9rem">
        <b>회사 Claude(팀 플랜)를 쓰는 경우 — 키가 필요 없습니다.</b><br>
        관리자가 등록한 조직 커넥터 <b>「AX 워크북」</b>을 Claude 설정 → 커넥터에서 켜기만 하면,
        첫 사용 때 부스터스 구글 로그인으로 본인 확인을 거쳐 <b>내 기록에만</b> 연결됩니다.
        아래 개인 키는 개인 플랜이거나 조직 커넥터가 아직 없을 때의 대안입니다.
      </div>
      <p class="fhint" style="margin-top:0">강의에서 쌓은 내 기록(레시피·액션아이템·설계서)을 <b>내 Claude</b>에서 불러오고, 다듬은 결과를 워크북에 되돌려 놓을 수 있습니다.
      개인 키도 <b>내 기록에만</b> 접근합니다 — 다른 사람 것은 보이지 않습니다.</p>
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

// 문항 구조에서 필수 키 전체 (강의별 진행 요약용)
function requiredOf(shape) {
  const out = [];
  for (const g of shape.SETUP?.groups || []) for (const f of g.fields || []) if (f.required) out.push(f.key);
  for (const s of shape.SESSIONS || []) for (const b of s.blocks || []) if (b.type === 'field' && b.required) out.push(b.key);
  for (const g of shape.CLINIC?.groups || []) for (const f of g.fields || []) if (f.required) out.push(f.key);
  return out;
}

(async function main() {
  const me = await requireAuth();
  if (!me) return;
  await mountShell(); // 마이페이지는 플랫폼 네비
  mountStatus(document.getElementById('savestate'));

  app.appendChild(el(`
    <div class="page-head">
      <div class="eyebrow">MY PAGE</div>
      <h1>${esc(me.name)} 님</h1>
      <p class="lede">내 정보를 수정하고, 강의별로 기록한 내용을 한 곳에서 봅니다. 기록 원문 수정은 각 강의 페이지에서 합니다.</p>
    </div>`));

  // ── 내 정보 ────────────────────────────────────────────────
  app.appendChild(el('<h2>내 정보</h2>'));
  const roleLabel = me._preview ? '강사 · 수강생 뷰' : (isInstructor(me) ? '강사' : '수강생');
  const info = el(`
    <div class="field my-profile">
      <div class="my-profile-grid">
        <div><span class="my-label">이름</span><b>${esc(me.name)}</b></div>
        <div><span class="my-label">이메일</span><b>${esc(me.email)}</b></div>
        <div><span class="my-label">역할</span><b>${roleLabel}</b></div>
      </div>
      ${me._preview ? '<p class="fhint">수강생 뷰 사용 중에는 정보 수정을 잠급니다 — 상단 배너의 [강사로 돌아가기] 후 수정하세요.</p>' : `
      <div class="my-edit">
        <label class="ob-field"><span>소속 팀</span>
          <input type="text" id="my-team" maxlength="40" value="${esc(me.team === '미지정' ? '' : me.team)}" placeholder="예: SCM본부 / People">
        </label>
        <button class="primary" id="my-save" type="button">정보 저장</button>
      </div>
      <p class="fhint">이름과 이메일은 구글 계정에서 옵니다. 어느 강의를 몇 기로 듣는지는 각 강의 홈의 [참여하기]로 관리됩니다.</p>`}
    </div>`);
  info.querySelector('#my-save')?.addEventListener('click', async (e) => {
    const team = info.querySelector('#my-team').value.trim();
    if (!team) { toast('팀 이름을 입력해주세요.', 'error'); return; }
    e.currentTarget.disabled = true;
    const saved = await saveProfileBits({ team });
    e.currentTarget.disabled = false;
    if (saved) { toast('내 정보를 저장했습니다.'); setTimeout(() => location.reload(), 600); }
  });
  app.appendChild(info);

  // ── 수강생 뷰 (실제 강사 전용) ─────────────────────────────
  // DB의 role은 바꾸지 않습니다 — 이 브라우저에서만 수강생의 눈으로 봅니다.
  if (isActualInstructor(me)) {
    app.appendChild(el('<h2>수강생 뷰</h2>'));
    const pv = el('<div class="field"></div>');

    if (me._preview) {
      pv.innerHTML = `
        <p style="margin:0 0 0.7rem">지금 <b>${me.cohort}기 수강생의 눈</b>으로 보고 있습니다 —
        홈 카드 🔒, 네비 자물쇠, 회차 잠금 화면이 수강생에게 보이는 그대로입니다.
        스튜디오는 이 상태에서 잠깁니다.</p>
        <button class="primary" id="pv-stop" type="button">강사로 돌아가기</button>`;
      pv.querySelector('#pv-stop').addEventListener('click', () => {
        stopMemberPreview();
        toast('강사 화면으로 돌아갑니다.');
        setTimeout(() => location.reload(), 400);
      });
    } else {
      pv.innerHTML = `
        <p style="margin:0 0 0.7rem">수강생에게 화면이 어떻게 보이는지 확인합니다.
        역할을 실제로 바꾸는 것이 아니라 <b>이 브라우저에서만</b> 수강생 시점으로 전환되며,
        상단 배너의 버튼으로 언제든 돌아올 수 있습니다.</p>
        <div style="display:flex;gap:0.6rem;align-items:flex-end;flex-wrap:wrap">
          <label class="ob-field" style="max-width:9rem"><span>볼 기수</span>
            <input type="number" id="pv-cohort" min="1" max="99" value="1">
          </label>
          <button class="primary" id="pv-start" type="button">수강생 뷰로 보기</button>
        </div>
        <p class="fhint" style="margin-top:0.6rem">그 기수에 열린 회차·강의일 예약까지 수강생 기준으로 적용됩니다.</p>`;
      pv.querySelector('#pv-start').addEventListener('click', () => {
        const c = Number(pv.querySelector('#pv-cohort').value) || 1;
        startMemberPreview(c);
        toast(`${c}기 수강생 뷰로 전환합니다.`);
        setTimeout(() => location.href = '/', 400);
      });
    }
    app.appendChild(pv);
  }

  // ── 내 Claude 연결 (MCP) ──────────────────────────────────
  app.appendChild(el('<h2>내 Claude에 연결하기 (MCP)</h2>'));
  app.appendChild(await renderMcpSection(me));

  // ── 내 기록 (강의별) ───────────────────────────────────────
  // 플랫폼 모드(006 이후)면 전 강의 기록을 강의별로 묶고,
  // 레거시 모드면 기존 단일 강의 기록을 그대로 보여줍니다.
  app.appendChild(el('<h2>내 기록</h2>'));

  // 버킷: [{ title, slug, shape, labels, entries }]
  const buckets = [];
  const rows = await loadAllMyEntries(); // 006 이전이면 오류로 [] (아래 레거시 폴백)

  if (rows.length) {
    const byCourse = new Map();
    for (const r of rows) {
      const cid = r.course_id || 'legacy';
      if (!byCourse.has(cid)) byCourse.set(cid, {});
      byCourse.get(cid)[r.item_key] = r.value;
    }
    for (const [cid, entries] of byCourse) {
      if (cid === 'legacy') {
        buckets.push({ title: '이전 기록', slug: DEFAULT_SLUG, shape: null, labels: {}, entries });
        continue;
      }
      const shape = await loadCourseShape(cid);
      if (!shape) continue; // 접근 불가(보관된 강의 등)
      buckets.push({ title: shape.course.title, slug: shape.course.slug, shape, labels: labelMapOf(shape), entries });
    }
  } else {
    // 레거시(006 이전) 또는 기록 없음 — 기존 방식으로 한 번 더 확인
    await initCourse(me);
    const entries = await loadEntries();
    if (Object.keys(entries).length) {
      buckets.push({ title: C.course?.title || '업무를 연결하는 AI', slug: C.course?.slug || DEFAULT_SLUG, shape: C, labels: labelMapOf(C), entries });
    }
  }

  const hasAny = buckets.some(b => Object.keys(b.entries).some(k => String(b.entries[k] || '').trim() && b.entries[k] !== 'false'));
  if (!hasAny) {
    app.appendChild(el('<div class="empty-state">아직 기록이 없습니다. <a href="/">강의 목록에서 시작해보세요.</a></div>'));
    return;
  }

  // 내보내기 — 모든 강의의 기록을 강의별 섹션으로
  const useBox = el(`
    <div class="my-actions" style="margin-bottom:1.2rem">
      <button class="primary" id="my-export" type="button">내 기록 파일로 내보내기 (.md)</button>
    </div>`);
  useBox.querySelector('#my-export').addEventListener('click', () => {
    const parts = [];
    for (const b of buckets) {
      const rows2 = Object.entries(b.entries)
        .filter(([key, value]) => (b.labels[key] || !b.shape) && String(value || '').trim() && value !== 'false')
        .map(([key, value]) => `## ${b.labels[key]?.group || '기록'} — ${b.labels[key]?.label || key}\n\n${displayValue(key, value)}`);
      if (rows2.length) parts.push(`# ${b.title}\n\n${rows2.join('\n\n')}`);
    }
    if (!parts.length) { toast('내보낼 기록이 아직 없습니다.', 'error'); return; }
    const markdown = `# ${me.name} — AX 워크북 기록\n\n${parts.join('\n\n---\n\n')}`;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ax-workbook-my-notes.md';
    link.click();
    URL.revokeObjectURL(url);
    toast('기록을 내보냈습니다.');
  });
  app.appendChild(useBox);

  for (const b of buckets) {
    const written = Object.keys(b.entries).filter(k => String(b.entries[k] || '').trim() && b.entries[k] !== 'false');
    if (!written.length) continue;

    const req = b.shape ? requiredOf(b.shape) : [];
    const prog = req.length ? progressOf(req, b.entries) : null;

    const head = el(`
      <div class="my-course-head">
        <div><span class="section-kicker">COURSE</span><h3><a href="/c/${encodeURIComponent(b.slug)}">${esc(b.title)} ↗</a></h3></div>
        ${prog ? `<span class="mono card-prog${prog.pct === 100 ? ' done' : ''}">${prog.done}/${prog.total}</span>` : ''}
      </div>`);
    app.appendChild(head);
    if (prog) app.appendChild(progressBar(prog));

    // 그룹 순서: labels에 정의된 그룹 순 → 그 외(라벨 없는 키)는 '기타'
    const groups = [];
    for (const k of written) {
      const g = b.labels[k]?.group || '기타';
      if (!groups.includes(g)) groups.push(g);
    }
    for (const group of groups) {
      const keys = written.filter(k => (b.labels[k]?.group || '기타') === group);
      if (!keys.length) continue;
      const first = b.labels[keys[0]];
      const href = first ? `/c/${encodeURIComponent(b.slug)}/${first.page}` : `/c/${encodeURIComponent(b.slug)}`;
      const sec = el(`
        <details class="my-group">
          <summary><b>${esc(group)}</b><span class="mono">${keys.length}건</span><a href="${href}">수정하러 가기 ↗</a></summary>
          <div class="my-items"></div>
        </details>`);
      const box = sec.querySelector('.my-items');
      for (const k of keys) {
        box.appendChild(el(`
          <div class="answer-item">
            <div class="answer-q">${esc(b.labels[k]?.label || k)}</div>
            <div class="answer-v">${esc(displayValue(k, b.entries[k]))}</div>
          </div>`));
      }
      app.appendChild(sec);
    }
  }
})();
