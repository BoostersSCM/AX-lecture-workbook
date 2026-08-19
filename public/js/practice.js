// 회차별 실제 연동 실습 패널
import { getValue, loadEntries } from './store.js';
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
        <span class="practice-status">실습 버튼</span>
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

function addNotionReader(panel) {
  const page = valueOf('setup.notion_target', 's3.notion_page');
  const card = actionCard('Notion 원본 불러오기', page ? `연결 대상: ${page}` : '연결 준비에서 Notion 페이지 URL 또는 ID를 먼저 적습니다.', '읽어오기');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    if (!page) return showOutput(panel, 'Notion 연결값 필요', '연결 준비 화면에서 Notion 페이지 URL 또는 Page ID를 먼저 입력하세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const result = await callIntegration('/api/integrations/notion/page?pageId=' + encodeURIComponent(page));
      const lines = [`페이지: ${notionTitle(result.page)}`, `블록 수: ${result.blocks?.length || 0}`, '', ...(result.blocks || []).slice(0, 8).map(block => `• ${block.text || '(텍스트 없음)'}`)];
      showOutput(panel, 'Notion에서 읽어온 결과', lines.join('\n'));
    } catch (error) { showError(panel, error); }
    finally { card.querySelector('button').disabled = false; }
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

function addClassPostWriter(panel) {
  const card = el(`
    <article class="practice-action practice-class-post">
      <div>
        <h3>클래스 2회차에 글 남기기</h3>
        <p>작성한 글을 클래스 플랫폼의 <code>class_posts</code>에 저장합니다. 저장 후 실제 클래스의 2회차 탭에서 확인할 수 있습니다.</p>
      </div>
      <div class="class-post-auth"></div>
      <div class="class-post-list" aria-live="polite"></div>
    </article>`);
  panel.querySelector('.practice-actions').appendChild(card);

  const authBox = card.querySelector('.class-post-auth');
  const listBox = card.querySelector('.class-post-list');

  function renderPosts(posts) {
    listBox.innerHTML = posts.length
      ? `<div class="class-post-list-title">2회차에 이미 남긴 글</div>${posts.map(post => `
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
        <p class="class-post-hint">클래스 플랫폼 계정을 한 번 연결하면 이 워크북에서 바로 2회차 글을 저장할 수 있습니다.</p>
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
      <div class="class-post-user">${esc(profile?.name || session.user.email || '클래스 계정')}으로 연결됨</div>
      <textarea class="practice-input class-post-input" rows="4" maxlength="2000" placeholder="예: 오늘 회의록에서 근거문장을 남기면 AI 결과를 검수하기 쉬워진다는 걸 확인했습니다."></textarea>
      <button class="practice-button" type="button">2회차 글 저장</button>
      <p class="class-post-hint"><a href="${CLASS_TARGET.session2Url}" target="_blank" rel="noopener">클래스 플랫폼의 2회차에서 확인하기 ↗</a></p>`;

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
        await loadPosts();
      }
      button.disabled = false;
      button.textContent = '2회차 글 저장';
    });
  }

  renderAuth();
  loadPosts();
}

function addAsanaReader(panel) {
  const project = valueOf('setup.asana_target', 's3.asana_project');
  const card = actionCard('Asana 태스크 불러오기', project ? `연결 대상: ${project}` : '연결 준비에서 Asana 프로젝트 URL 또는 GID를 먼저 적습니다.', '태스크 3개 읽기');
  panel.querySelector('.practice-actions').appendChild(card);
  card.querySelector('button').addEventListener('click', async () => {
    if (!project) return showOutput(panel, 'Asana 연결값 필요', '연결 준비 화면에서 Asana 프로젝트 URL 또는 Project GID를 먼저 입력하세요.', 'error');
    try {
      card.querySelector('button').disabled = true;
      const result = await callIntegration('/api/integrations/asana/tasks?projectGid=' + encodeURIComponent(project));
      const lines = [`프로젝트: ${result.project?.name || '이름 미확인'}`, '', ...(result.tasks || []).map(task => `• ${task.name || '(이름 없음)'} / ${task.completed ? '완료' : '진행 중'} / ${task.due_on || '마감일 없음'}`)];
      showOutput(panel, 'Asana에서 읽어온 결과', lines.join('\n'));
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

function addSlackSender(panel, { target = '', title = 'Slack 메시지 보내기', detail = '메시지를 미리 본 뒤 확인하면 지정 채널로 봇이 보냅니다.', placeholder = '예: AX 실습 연결 테스트입니다.' } = {}) {
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
      showOutput(panel, 'Slack 전송 완료', `채널: ${result.channel}\nts: ${result.ts}`);
      button.dataset.confirm = '';
      button.textContent = '미리보기';
    } catch (error) { showError(panel, error); }
    finally { button.disabled = false; }
  });
}

export function renderPracticePanel(n) {
  if (n === 1) {
    const panel = panelShell(n, '원본을 직접 불러오기', '프롬프트를 복사하기 전에, 연결된 Notion 페이지에서 실제 원본이 들어오는지 버튼으로 먼저 확인합니다.');
    addNotionReader(panel);
    return panel;
  }
  if (n === 2) {
    const panel = panelShell(n, '내 입력이 DB에 들어갔는지 확인하기', '아래 답변을 입력하면 Supabase에 저장됩니다. 버튼을 눌러 지금 저장된 행을 다시 읽어봅니다.');
    addClassPostWriter(panel);
    addEntriesReader(panel, n, 'Supabase entries 다시 읽기', 's2.');
    return panel;
  }
  if (n === 3) {
    const panel = panelShell(n, '세 도구를 실제로 움직이기', '읽기는 바로 실행하고, 생성·전송은 미리보기 다음에 한 번 더 확인해야 실제로 실행됩니다.');
    addAsanaReader(panel);
    addAsanaCreator(panel);
    addNotionReader(panel);
    addSlackSender(panel);
    addSlackSender(panel, {
      target: valueOf('setup.slack_user_id'),
      title: 'Slack 개인 DM 보내기',
      detail: '내 Slack User ID(U...)로 봇이 직접 메시지를 보냅니다. 먼저 미리보기 후 확인합니다.',
      placeholder: '예: 내 개인 DM으로 도착할 AX 알림 테스트입니다.',
    });
    return panel;
  }
  const panel = panelShell(n, '내 워크북 데이터가 쌓인 모습 확인하기', '1~4회차 동안 입력한 답변을 Supabase에서 다시 읽어보며, 화면의 한 칸이 DB의 한 행으로 남는 흐름을 확인합니다.');
  addEntriesReader(panel, n, 'Supabase에 쌓인 내 워크북 기록 보기', ['s1.', 's2.', 's3.', 's4.']);
  return panel;
}
