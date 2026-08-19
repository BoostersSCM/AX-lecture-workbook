// 회차별 실제 연동 실습 패널
import { getValue, loadEntries, saveValue } from './store.js';
import { callIntegration } from './integrations.js';
import { el } from './render.js';
import { esc } from './shell.js';
import { toast } from './supabase.js';
import {
  CLASS_TARGET,
  classConfigReady,
  getClassProfile,
  getClassSession,
  signInToClass,
  listTargetSessionPosts,
  addTargetSessionPost,
} from './class-supabase.js';

function valueOf(...keys) {
  for (const key of keys) {
    const value = String(getValue(key) || '').trim();
    if (value) return value;
  }
  return '';
}

function panelShell(n, title, intro) {
  return el(`
    <section class="practice-panel">
      <div class="practice-panel-head">
        <div>
          <div class="eyebrow">CLICK TO CONNECT · ${String(n).padStart(2, '0')}</div>
          <h2>${esc(title)}</h2>
        </div>
        <span class="practice-status">연결 실험</span>
      </div>
      <p class="practice-intro">${esc(intro)}</p>
      <div class="practice-actions"></div>
      <div class="practice-output" aria-live="polite"><p class="practice-empty">버튼을 누르면 결과가 여기에 나타납니다.</p></div>
    </section>`);
}

function actionCard(title, detail, buttonText) {
  const card = el(`
    <article class="practice-action">
      <div><h3>${esc(title)}</h3><p>${esc(detail)}</p></div>
      <button class="practice-button" type="button">${esc(buttonText)}</button>
    </article>`);
  return card;
}

function showOutput(panel, title, value, tone = '') {
  const output = panel.querySelector('.practice-output');
  output.className = 'practice-output ' + tone;
  output.innerHTML = `<div class="practice-output-title">${esc(title)}</div><pre>${esc(value)}</pre>`;
}

function showError(panel, error) {
  showOutput(panel, '연동을 확인해주세요', error.message || String(error), 'error');
  toast(error.message || '연동 요청에 실패했습니다.', 'error');
}

function notionTitle(page) {
  const title = page?.properties?.title?.title || page?.properties?.Name?.title || [];
  return title.map(item => item.plain_text || '').join('') || '제목을 확인할 수 없습니다.';
}

function setFieldValue(key, value) {
  const id = 'f_' + key.replace(/[^\w]/g, '_');
  const input = document.getElementById(id);
  if (input) input.value = value;
}

function addNotionReader(panel, { storeKey = '' } = {}) {
  const page = valueOf('setup.notion_target', 's3.notion_page');
  const card = actionCard('Notion 원본 불러오기', page ? `연결 대상: ${page}` : '연결 준비에서 Notion 페이지 URL 또는 ID를 먼저 적습니다.', '읽어오기');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    if (!page) return showOutput(panel, 'Notion 연결값 필요', '연결 준비 화면에서 Notion 페이지 URL 또는 Page ID를 먼저 입력하세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const result = await callIntegration('/api/integrations/notion/page?pageId=' + encodeURIComponent(page));
      const lines = [`페이지: ${notionTitle(result.page)}`, `블록 수: ${result.blocks?.length || 0}`, '', ...(result.blocks || []).slice(0, 8).map(block => `• ${block.text || '(텍스트 없음)'}`)];
      const output = lines.join('\n');
      if (storeKey) {
        const saved = await saveValue(storeKey, output, { immediate: true });
        if (!saved) throw new Error('원본 확인 결과를 워크북에 저장하지 못했습니다.');
        setFieldValue(storeKey, output);
      }
      showOutput(panel, storeKey ? 'Notion 원본 확인·저장 완료' : 'Notion에서 읽어온 결과', output);
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addSaveEntryButton(panel, key, title, detail, buttonText = '결과 저장') {
  const card = actionCard(title, detail, buttonText);
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    const value = valueOf(key);
    if (!value) return showOutput(panel, '저장할 결과 필요', '아래 워크북 입력칸을 먼저 작성해주세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const saved = await saveValue(key, value, { immediate: true });
      if (!saved) throw new Error('Supabase 저장에 실패했습니다. 화면 상단 저장 상태를 확인해주세요.');
      showOutput(panel, '워크북 결과 저장 완료', `저장 위치: entries\nitem_key: ${key}\n\n${value}`);
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addWorkbookExport(panel) {
  const card = actionCard('1~4회차 연결 기록 내보내기', 'Supabase에서 내 기록을 다시 읽어 Markdown 파일로 저장합니다. 4회차 레시피의 재료로 사용하세요.', '설계서 파일 저장');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    try {
      card.querySelector('button').disabled = true;
      const entries = await loadEntries({ fresh: true });
      const rows = Object.entries(entries)
        .filter(([key, value]) => /^(s[1-4]\.|clinic\.)/.test(key) && String(value || '').trim())
        .map(([key, value]) => `## ${key}\n\n${value}`);
      if (!rows.length) throw new Error('내보낼 기록이 아직 없습니다. 회차별 결과를 먼저 저장해주세요.');
      const markdown = `# 내 업무 연결 기록\n\n${rows.join('\n\n')}`;
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ax-workbook-connection-notes.md';
      link.click();
      URL.revokeObjectURL(url);
      showOutput(panel, '연결 기록 파일 저장 완료', `파일명: ${link.download}\n항목 수: ${rows.length}`);
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addNotionAppender(panel) {
  const page = valueOf('setup.notion_target', 's3.notion_page');
  const card = el(`
    <article class="practice-action practice-create">
      <div><h3>Notion 페이지에 결과 추가</h3><p>${page ? `연결 대상: ${esc(page)} · 미리보기 후 페이지 하단에 문단을 추가합니다.` : '연결 준비에서 Notion 페이지 URL 또는 ID를 먼저 적습니다.'}</p></div>
      <textarea class="practice-input" rows="4" placeholder="예: 이번 회차 확인 결과와 다음 액션을 적어보세요." aria-label="Notion에 추가할 결과"></textarea>
      <button class="practice-button" type="button">미리보기</button>
    </article>`);
  panel.querySelector('.practice-actions').appendChild(card);
  const input = card.querySelector('textarea');
  const button = card.querySelector('button');
  button.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!page) return showOutput(panel, 'Notion 연결값 필요', '연결 준비에서 Notion 페이지 URL 또는 Page ID를 먼저 입력하세요.', 'error');
    if (!text) return showOutput(panel, '추가할 결과 필요', 'Notion 페이지에 남길 결과를 먼저 입력하세요.', 'error');
    if (button.dataset.confirm !== 'yes') {
      showOutput(panel, 'Notion 추가 전 미리보기', `페이지: ${page}\n추가할 문단:\n${text}\n\n문제가 없으면 아래 버튼을 한 번 더 눌러 실제 페이지에 추가하세요.`);
      button.dataset.confirm = 'yes';
      button.textContent = '확인하고 추가';
      return;
    }
    try {
      button.disabled = true;
      const result = await callIntegration('/api/integrations/notion/page?pageId=' + encodeURIComponent(page), { method: 'POST', body: { pageId: page, text } });
      showOutput(panel, 'Notion 페이지에 추가 완료', `페이지: ${page}\n추가된 블록 수: ${result.appended_blocks || 0}`);
      input.value = '';
      button.dataset.confirm = '';
      button.textContent = '미리보기';
    } catch (error) { showError(panel, error); }
    finally { button.disabled = false; }
  });
}

function addEntriesReader(panel, n, title, prefix) {
  const prefixes = Array.isArray(prefix) ? prefix : [prefix];
  const card = actionCard(title, '지금까지 이 회차에서 저장한 답변을 Supabase에서 다시 읽습니다.', 'DB에서 불러오기');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    try {
      card.querySelector('button').disabled = true;
      const entries = await loadEntries({ fresh: true });
      const rows = Object.entries(entries).filter(([key, value]) => prefixes.some(item => key.startsWith(item)) && String(value || '').trim());
      showOutput(panel, `${n}회차 Supabase 입력`, rows.length ? rows.map(([key, value]) => `${key}\n${value}`).join('\n\n') : '아직 저장된 답변이 없습니다. 아래 워크북 입력칸부터 채워보세요.');
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addSupabaseCommitter(panel) {
  const card = actionCard('최종 액션아이템 표를 Supabase에 저장', 's2.action_items에 작성한 최종 표를 내 entries에 명시적으로 저장하고, 바로 다시 읽어 확인합니다.', '최종 결과 저장');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    const value = valueOf('s2.action_items');
    if (!value) return showOutput(panel, '저장할 결과 필요', '아래 최종 액션아이템 표를 먼저 작성해주세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const saved = await saveValue('s2.action_items', value, { immediate: true });
      if (!saved) throw new Error('Supabase 저장에 실패했습니다. 화면 상단 저장 상태를 확인해주세요.');
      const entries = await loadEntries({ fresh: true });
      showOutput(panel, 'Supabase 저장 완료', `저장 위치: entries\nitem_key: s2.action_items\n\n${entries['s2.action_items'] || value}`);
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addClassPostWriter(panel) {
  const card = el(`
    <article class="practice-action practice-class-post">
      <div>
        <h3>2회차 학습 기록을 클래스에 남기기</h3>
        <p>액션아이템 숫자만 남기지 않습니다. 원본·후보·판단·배운 점을 짧게 정리해 같은 원격 <code>class_posts</code>에 기록합니다.</p>
      </div>
      <div class="class-post-flow" aria-label="클래스 글 저장 흐름">
        <div><span>01</span><strong>연결</strong><p>아래 버튼으로 클래스 계정 로그인</p></div>
        <div><span>02</span><strong>복귀</strong><p>로그인 후 이 워크북 2회차로 자동 복귀</p></div>
        <div><span>03</span><strong>저장</strong><p>아래 글 저장 버튼으로 class_posts에 기록</p></div>
        <div><span>04</span><strong>확인</strong><p>클래스 사이트 2회차에서 결과 확인</p></div>
      </div>
      <div class="class-post-auth"></div>
      <div class="class-post-list" aria-live="polite"></div>
    </article>`);
  panel.querySelector('.practice-actions').appendChild(card);

  const authBox = card.querySelector('.class-post-auth');
  const listBox = card.querySelector('.class-post-list');

  function renderPosts(posts) {
    listBox.innerHTML = posts.length
      ? `<div class="class-post-list-title">원격 class_posts에서 다시 읽은 2회차 글</div>${posts.map(post => `
          <article class="class-post-item">
            <div><strong>${esc(post.author?.name || '클래스 참여자')}</strong><span>${esc(new Date(post.created_at).toLocaleString('ko-KR'))}</span></div>
            <p>${esc(post.body || '')}</p>
          </article>`).join('')}`
      : '<p class="class-post-empty">아직 2회차 글이 없습니다. 첫 기록을 남겨보세요.</p>';
  }

  async function loadPosts() {
    const { data, error } = await listTargetSessionPosts();
    if (error) {
      listBox.innerHTML = '<p class="class-post-empty">클래스 글을 불러오지 못했습니다. 클래스 계정과 참여 권한을 확인해주세요.</p>';
      return;
    }
    renderPosts(data);
  }

  async function renderAuth() {
    if (!classConfigReady()) {
      authBox.innerHTML = '<p class="class-post-empty">클래스 플랫폼 연결값이 아직 설정되지 않았습니다. 강사에게 알려주세요.</p>';
      return;
    }

    const session = await getClassSession();
    if (!session) {
      authBox.innerHTML = `
        <p class="class-post-hint"><strong>1단계 · 클래스 계정 연결</strong><br>버튼을 누르면 클래스 플랫폼의 Google 로그인 화면으로 이동합니다. 로그인에 성공하면 별도 조작 없이 이 워크북의 2회차로 돌아옵니다.</p>
        <button class="practice-button" type="button">클래스 계정 연결</button>`;
      authBox.querySelector('button').addEventListener('click', async (event) => {
        event.currentTarget.disabled = true;
        const { error } = await signInToClass('/session?n=2');
        if (error) {
          event.currentTarget.disabled = false;
          toast(error.message || '클래스 계정 연결에 실패했습니다.', 'error');
        }
      });
      return;
    }

    const profile = await getClassProfile(session);
    authBox.innerHTML = `
      <div class="class-post-user"><span class="class-post-badge">연결됨</span> ${esc(profile?.name || session.user.email || '클래스 계정')}</div>
      <p class="class-post-hint"><strong>2단계 · 이 워크북에서 작성</strong><br>연결 상태는 이 브라우저에 남습니다. 아래 글을 저장하면 클래스 플랫폼의 <code>class_posts</code>에 바로 기록됩니다. 클래스 사이트에 먼저 들어갈 필요는 없습니다.</p>
      <textarea class="practice-input class-post-input" rows="6" maxlength="2000" placeholder="원본: 어떤 회의록을 읽었는지\n후보 → 최종: 몇 개가 남았는지\n판단: 제외하거나 미확인으로 둔 이유\n배운 점: 다음 업무에서 바꿀 점"></textarea>
      <button class="practice-button" type="button">2회차 글 저장</button>
      <p class="class-post-hint"><strong>3단계 · 클래스 사이트에서 확인</strong><br>저장 후 아래 링크를 새 탭으로 열어 2회차 글을 확인하세요. 두 사이트의 로그인 세션은 별도일 수 있어 클래스 사이트가 다시 로그인을 요구할 수 있지만, 이미 저장한 글은 그대로 남습니다.<br><a href="${CLASS_TARGET.session2Url}" target="_blank" rel="noopener">클래스 플랫폼의 2회차에서 확인하기 ↗</a></p>
      <p class="class-post-save-status" aria-live="polite"></p>`;

    const input = authBox.querySelector('textarea');
    const button = authBox.querySelector('button');
    button.addEventListener('click', async () => {
      const body = input.value.trim();
      if (!body) {
        toast('남길 글을 먼저 입력해주세요.', 'error');
        input.focus();
        return;
      }
      button.disabled = true;
      button.textContent = '저장 중…';
      const { error } = await addTargetSessionPost(body);
      if (error) {
        toast(error.message || '클래스 글 저장에 실패했습니다. 수강 참여 권한을 확인해주세요.', 'error');
      } else {
        input.value = '';
        toast('클래스 2회차에 글이 저장되었습니다.');
        authBox.querySelector('.class-post-save-status').textContent = '저장 완료 · 클래스 사이트의 2회차에서 같은 글을 확인할 수 있습니다.';
        await loadPosts();
      }
      button.disabled = false;
      button.textContent = '2회차 글 저장';
    });
  }

  renderAuth();
  loadPosts();
}

function addAsanaReader(panel, { storeKey = '' } = {}) {
  const project = valueOf('setup.asana_target', 's3.asana_project');
  const card = actionCard('Asana 태스크 불러오기', project ? `연결 대상: ${project}` : '연결 준비에서 Asana 프로젝트 URL 또는 GID를 먼저 적습니다.', '태스크 3개 읽기');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    if (!project) return showOutput(panel, 'Asana 연결값 필요', '연결 준비 화면에서 Asana 프로젝트 URL 또는 Project GID를 먼저 입력하세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const result = await callIntegration('/api/integrations/asana/tasks?projectGid=' + encodeURIComponent(project));
      const lines = [`프로젝트: ${result.project?.name || '이름 미확인'}`, '', ...(result.tasks || []).map(task => `• ${task.name || '(이름 없음)'} / 담당자: ${task.assignee?.name || '미확인'} / ${task.completed ? '완료' : '진행 중'} / ${task.due_on || '마감일 없음'}${task.permalink_url ? ` / ${task.permalink_url}` : ''}`)];
      const output = lines.join('\n');
      if (storeKey) {
        const saved = await saveValue(storeKey, output, { immediate: true });
        if (!saved) throw new Error('Asana 확인 결과를 워크북에 저장하지 못했습니다.');
        setFieldValue(storeKey, output);
      }
      showOutput(panel, storeKey ? 'Asana 원본 확인·저장 완료' : 'Asana에서 읽어온 결과', output);
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
  });
}

function addAsanaCreator(panel) {
  const project = valueOf('setup.asana_target', 's3.asana_project');
  const card = el(`
    <article class="practice-action practice-create">
      <div><h3>Asana 태스크 1건 만들기</h3><p>먼저 이름을 입력하고 미리보기 후 확인하면 실제 프로젝트에 생성합니다.</p></div>
      <input class="practice-input" type="text" placeholder="예: AX 실습 후속 확인" aria-label="Asana 새 태스크 이름">
      <button class="practice-button" type="button">미리보기</button>
    </article>`);
  panel.querySelector('.practice-actions').appendChild(card);
  const input = card.querySelector('input');
  const button = card.querySelector('button');
  button.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!project) return showOutput(panel, 'Asana 연결값 필요', '연결 준비 화면에서 Asana 프로젝트 URL 또는 Project GID를 먼저 입력하세요.', 'error');
    if (!name) return showOutput(panel, '태스크 이름 필요', '먼저 만들 태스크 이름을 입력하세요.', 'error');
    if (button.dataset.confirm !== 'yes') {
      showOutput(panel, '생성 전 미리보기', `프로젝트: ${project}\n새 태스크: ${name}\n\n문제가 없으면 아래 버튼을 한 번 더 눌러 실제 생성하세요.`);
      button.dataset.confirm = 'yes';
      button.textContent = '확인하고 생성';
      return;
    }
    try {
      button.disabled = true;
      const result = await callIntegration('/api/integrations/asana/tasks?projectGid=' + encodeURIComponent(project), { method: 'POST', body: { projectGid: project, name } });
      showOutput(panel, 'Asana 태스크 생성 완료', `${result.task?.name || name}\nGID: ${result.task?.gid || '확인 필요'}`);
      button.dataset.confirm = '';
      button.textContent = '미리보기';
    } catch (error) { showError(panel, error); }
    finally { button.disabled = false; }
  });
}

function addSlackSender(panel, { target = '', title = 'Slack 메시지 보내기', detail = '메시지를 미리 본 뒤 확인하면 지정 채널로 봇이 보냅니다.', placeholder = '예: AX 실습 연결 테스트입니다.', storeKey = '' } = {}) {
  const channel = target || valueOf('setup.slack_target', 's3.slack_channel');
  const card = el(`
    <article class="practice-action practice-create">
      <div><h3>${esc(title)}</h3><p>${esc(detail)}</p></div>
      <textarea class="practice-input" rows="3" placeholder="${esc(placeholder)}" aria-label="Slack 메시지"></textarea>
      <button class="practice-button" type="button">미리보기</button>
    </article>`);
  panel.querySelector('.practice-actions').appendChild(card);
  const input = card.querySelector('textarea');
  const button = card.querySelector('button');
  button.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!channel) return showOutput(panel, 'Slack 연결값 필요', title.includes('DM') ? '연결 준비 화면에서 Slack User ID를 먼저 입력하세요.' : '연결 준비 화면에서 Slack Channel ID를 먼저 입력하세요.', 'error');
    if (!text) return showOutput(panel, '메시지 필요', '먼저 보낼 메시지를 입력하세요.', 'error');
    if (button.dataset.confirm !== 'yes') {
      showOutput(panel, '전송 전 미리보기', `채널: ${channel}\n메시지:\n${text}\n\n문제가 없으면 아래 버튼을 한 번 더 눌러 전송하세요.`);
      button.dataset.confirm = 'yes';
      button.textContent = '확인하고 전송';
      return;
    }
    try {
      button.disabled = true;
      const result = await callIntegration('/api/integrations/slack/send', { method: 'POST', body: { channel, text } });
      if (storeKey) {
        await saveValue(storeKey, text, { immediate: true });
        setFieldValue(storeKey, text);
      }
      showOutput(panel, 'Slack 전송 완료', `채널: ${result.channel}\nts: ${result.ts}`);
      button.dataset.confirm = '';
      button.textContent = '미리보기';
    } catch (error) { showError(panel, error); }
    finally { button.disabled = false; }
  });
}

export function renderPracticePanel(n) {
  if (n === 1) {
    const panel = panelShell(n, '원본을 직접 불러오고 근거 남기기', '연결된 Notion 페이지에서 실제 원본을 가져온 뒤, 확인한 내용과 근거를 워크북에 저장합니다.');
    addNotionReader(panel, { storeKey: 's1.source_snapshot' });
    addSaveEntryButton(panel, 's1.evidence', '읽기 결과와 근거 저장', '아래 근거 입력란을 완성한 뒤 명시적으로 저장합니다.');
    addEntriesReader(panel, n, '1회차 기록 다시 읽기', 's1.');
    return panel;
  }
  if (n === 2) {
    const panel = panelShell(n, '결과를 저장하고 다시 읽기', '자동 저장에만 의존하지 않고, 최종 액션아이템 표를 직접 저장한 뒤 Supabase에서 다시 읽어 데이터 흐름을 확인합니다.');
    addClassPostWriter(panel);
    addSupabaseCommitter(panel);
    addEntriesReader(panel, n, 'Supabase entries 다시 읽기', 's2.');
    return panel;
  }
  if (n === 3) {
    const panel = panelShell(n, '원본을 읽고 실제 도구에 쓰기', '프롬프트 카드는 참고 자료입니다. 아래 버튼으로 원본을 가져오고, 결과를 검토한 뒤 Asana·Notion·Slack에 직접 기록합니다.');
    addAsanaReader(panel, { storeKey: 's3.asana_tasks' });
    addAsanaCreator(panel);
    addNotionReader(panel, { storeKey: 's3.report' });
    addNotionAppender(panel);
    addSlackSender(panel, { storeKey: 's3.slack_message' });
    addSlackSender(panel, {
      target: valueOf('setup.slack_user_id'),
      title: 'Slack 개인 DM 보내기',
      detail: '내 Slack User ID(U...)로 봇이 직접 메시지를 보냅니다. 먼저 미리보기 후 확인합니다.',
      placeholder: '예: 내 개인 DM으로 도착할 AX 알림 테스트입니다.',
    });
    addSaveEntryButton(panel, 's3.recipe', '연결 레시피를 워크북에 저장', '실제로 성공한 원본·권한·목적지·검수 절차를 레시피로 남깁니다.');
    return panel;
  }
  const panel = panelShell(n, '기록을 다시 읽고 다음 실행으로 내보내기', '1~4회차 동안 쌓인 결과를 Supabase에서 다시 읽고, 다음 업무에 재사용할 수 있는 파일로 저장합니다.');
  addEntriesReader(panel, n, 'Supabase에 쌓인 내 워크북 기록 보기', ['s1.', 's2.', 's3.', 's4.']);
  addSaveEntryButton(panel, 's4.desktop_plan', '내 자동정리 규칙 저장', '파일 자동정리 규칙을 완성한 뒤 명시적으로 저장합니다.');
  addWorkbookExport(panel);
  return panel;
}
