// js/content.js — 워크북 문항 정의 (데이터)
//
// 여기만 고치면 워크북이 바뀝니다. DB는 건드릴 필요 없습니다.
// key는 한 번 정하면 바꾸지 마세요 — 이미 입력된 답이 그 key로 저장돼 있습니다.
//
// 필드 kind:
//   text | textarea | number | check | checks | radio | grid

export const COURSE = {
  title: '업무를 연결하는 AI',
  subtitle: '사내 도구와 데이터를 연결해 반복 업무를 줄이는 4주',
  promise: '업무 도구의 값을 가져와 고치고, 원래 도구에 다시 저장합니다.',
  intro: '이 워크북을 편집 작업대로 사용합니다. Notion·Asana·Slack의 값을 가져오고, 사람이 확인해 수정한 뒤 각 SaaS에 다시 반영하는 흐름을 만듭니다.',
};

export const AX_FLOW = [
  { n: '01', verb: '가져오기', en: 'COLLECT', title: '원본이 있는 곳을 연결합니다', text: 'Notion 페이지, Slack 채널·DM, Asana 프로젝트에서 실제 값을 워크북으로 가져옵니다.', tool: 'Notion · Slack · Asana', tone: 'teal' },
  { n: '02', verb: '다듬기', en: 'STRUCTURE', title: '수정할 모양과 기준을 정합니다', text: '근거 문장, 담당자, 상태, 마감일처럼 사람이 확인하고 고칠 칸을 분명히 만듭니다.', tool: 'Database · Page · Task', tone: 'brass' },
  { n: '03', verb: '반영하기', en: 'SYNC', title: '고친 값을 원래 SaaS에 저장합니다', text: '기존 태스크·문단·봇 메시지를 미리보기로 확인한 뒤 같은 위치에 수정 저장합니다.', tool: 'Asana · Notion · Slack', tone: 'coral' },
  { n: '04', verb: '이어쓰기', en: 'REUSE', title: '저장된 결과를 다음 업무에 씁니다', text: 'Supabase 기록을 다시 읽고, 연결 레시피와 데스크톱 자동화로 반복 실행할 구조를 남깁니다.', tool: 'Supabase · Recipe · Desktop', tone: 'ink' },
];

export const INTEGRATIONS = [
  { name: 'Notion', eyebrow: '원본 / 기록', title: '문단을 가져와 같은 자리에 저장', text: '페이지의 기존 문단을 워크북으로 불러와 고친 뒤 같은 Notion 블록에 다시 반영합니다.', icon: 'N', tone: 'notion' },
  { name: 'Slack', eyebrow: '대화 / 전달', title: '보낸 메시지를 다시 수정', text: '봇으로 채널·DM에 메시지를 보내고, 워크북에서 고친 문구를 같은 메시지에 업데이트합니다.', icon: '#', tone: 'slack' },
  { name: 'Asana', eyebrow: '실행 / 추적', title: '기존 태스크를 수정 저장', text: '프로젝트 태스크의 이름·마감일·완료 상태를 가져와 검토한 뒤 실제 태스크에 반영합니다.', icon: 'A', tone: 'asana' },
  { name: 'Supabase', eyebrow: '저장 / 재조회', title: '학습 결과를 다시 꺼내기', text: '가져온 원본과 검토한 결과를 내 기록으로 저장하고, 다음 회차에 다시 불러옵니다.', icon: 'S', tone: 'supabase' },
];

export const DATA_MODEL = [
  { name: 'profiles', label: '누구의 데이터인가', text: '로그인한 사람을 한 줄로 표현합니다. 이름·이메일·팀·역할을 담고, auth.users와 1:1로 연결됩니다.', tone: 'identity' },
  { name: 'entries', label: '무엇을 저장하는가', text: '워크북 입력 하나를 한 행으로 저장합니다. user_id + item_key가 주소이고, value가 실제 답입니다.', tone: 'record' },
  { name: 'RLS', label: '누가 볼 수 있는가', text: '본인은 자기 답을 읽고 쓰고, 강사는 읽기만 합니다. 연결할수록 권한 규칙이 먼저입니다.', tone: 'guard' },
];

export const VISUALS = {
  connector: {
    src: '/assets/analogy-connector-keys.png',
    label: '비유 01 · 커넥터는 열쇠 꾸러미',
    caption: 'AI에게 회사 전체 열쇠를 주는 것이 아닙니다. 내가 가진 열쇠로 열 수 있는 방만 함께 봅니다.',
    alt: '열쇠를 든 사람이 문이 있는 사무실에서 일부 방만 밝히고 있는 일러스트',
  },
  schema: {
    src: '/assets/analogy-db-drawers.png',
    label: '비유 02 · DB는 라벨이 붙은 서랍장',
    caption: '칸을 먼저 정하면 회의록도 매번 같은 모양으로 쌓이고, 다음 업무에서 다시 꺼내 쓸 수 있습니다.',
    alt: '흩어진 메모를 라벨이 붙은 서랍과 정돈된 기록으로 바꾸는 일러스트',
  },
  delivery: {
    src: '/assets/analogy-delivery-hub.png',
    label: '비유 03 · 봇은 사내 우편 분류소',
    caption: '같은 원본도 Slack에는 짧은 메시지, Notion에는 기록, Asana에는 실행 태스크로 모양을 바꿔 도착합니다.',
    alt: '하나의 문서가 세 가지 목적지로 분류되어 전달되는 사내 우편 분류소 일러스트',
  },
  recipe: {
    src: '/assets/analogy-automation-recipe.png',
    label: '비유 04 · 자동화는 다시 쓰는 레시피',
    caption: '재료·순서·검수·도착지를 적어두면, 다음 주에도 같은 결과를 다시 만들 수 있습니다.',
    alt: '자료와 규칙을 레시피처럼 조합해 반복 가능한 결과를 만드는 일러스트',
  },
};

// ── 연결 준비 체크리스트 ──────────────────────────────────────
export const SETUP = {
  title: '연결 준비',
  intro: '첫 수업 전에 끝내주세요. 운영자는 봇·앱 토큰과 「AX 실습장」 템플릿을 준비하고, 수강생은 템플릿을 복제한 뒤 연결할 Asana 프로젝트·Notion 페이지·Slack 채널을 정합니다.',
  playgroundGuide: {
    title: '「AX 실습장」은 강사가 먼저 준비합니다',
    intro: '빈 페이지로 시작하지 않습니다. 강사가 아래 구조의 Notion 템플릿을 배포하고, 수강생은 자기 복제본에 기존 Notion 앱을 연결합니다. 복제가 어려우면 같은 구조를 가진 안전한 개인 연습용 페이지로 대체합니다.',
    instructor: [
      'Notion에 「AX 실습장 — 템플릿」 페이지를 만들고 아래 내용을 붙여넣습니다.',
      'Notion 앱에 Read content와 Update content 권한을 주고 템플릿 페이지에 연결합니다.',
      '수강생이 각자 복제할 수 있는 템플릿 링크를 배포합니다. 한 공용 페이지를 함께 수정하지 않습니다.',
    ],
    student: [
      '템플릿을 「AX 실습장 — 내 이름」으로 복제합니다.',
      '페이지 오른쪽 위 ··· → 연결 추가에서 강사가 안내한 기존 앱을 선택합니다.',
      '복제한 페이지 URL을 아래 Notion 연결 대상에 저장합니다.',
    ],
    template: `# AX 실습장 — [내 이름]

## 01. 원본 회의록
회의 일시: 2026-08-19
결정사항: 다음 주 수요일까지 캠페인 결과 초안을 공유한다.
담당자: 김OO
확인 필요: 최종 공유 채널

## 02. 수정 실습 문단
이 문장은 워크북으로 불러온 뒤 내용을 고쳐 같은 Notion 문단에 다시 저장합니다.

## 03. 결과 기록
수정 전·수정 후와 사람이 확인한 내용을 이 아래에 남깁니다.`,
  },
  groups: [
    {
      name: '1. 계정과 권한',
      fields: [
        { key: 'setup.login', kind: 'check', label: '사내에서 쓰는 AI 도구에 **회사 계정**으로 로그인했다', hint: '개인 계정에는 회사 노션·슬랙을 연결할 수 없습니다.' },
      ]
    },
    {
      name: '2. 업무 도구 연결',
      fields: [
        { key: 'setup.notion', kind: 'check', label: '노션 연결 — 접근 범위에 내가 보는 팀 페이지를 포함' },
        { key: 'setup.slack',  kind: 'check', label: '슬랙 연결' },
        { key: 'setup.asana',  kind: 'check', label: '아사나 연결 — 실습 프로젝트 또는 태스크 접근 권한 포함' },
        { key: 'setup.verify', kind: 'check', label: '읽기 범위 확인이 끝났다', hint: '연결 준비에서는 접근 범위만 확인합니다. 원본을 가져와 워크북에 저장하는 일은 1회차 실습 패널에서 진행합니다.' },
      ]
    },
    {
      name: '3. AX 실습장 준비',
      fields: [
        { key: 'setup.playground', kind: 'check', label: '강사가 배포한 「AX 실습장」을 내 페이지로 복제했다', hint: '공용 원본을 함께 수정하지 않습니다. 복제가 어렵다면 안전한 개인 연습용 페이지를 준비합니다.' },
        { key: 'setup.db',         kind: 'check', label: '원본 회의록·수정 실습 문단·결과 기록 영역이 보인다', hint: 'Notion DB가 없어도 됩니다. 실제로 고쳐볼 텍스트 문단 하나는 반드시 있어야 합니다.' },
        { key: 'setup.minutes',    kind: 'check', label: '복제한 페이지에 기존 Notion 앱을 연결했다', hint: '앱에는 Read content와 Update content 권한이 필요합니다.' },
      ]
    },
    {
      name: '4. 워크북과 다른 SaaS 확인',
      fields: [
        { key: 'setup.channel',    kind: 'check', label: '슬랙 실습 채널에 들어와 있다' },
        { key: 'setup.asana_project', kind: 'check', label: '아사나 봇을 초대한 프로젝트 또는 샘플 태스크가 열린다', hint: '연동이 막힌 경우 3회차는 샘플 태스크 CSV로 읽기 실습을 진행할 수 있습니다.' },
        { key: 'setup.persisted', kind: 'check', label: '워크북에 짧은 답을 적고 새로고침해도 다시 보인다', hint: '내 입력이 Supabase entries에 저장되고 다시 읽히는지 확인합니다.' },
      ]
    },
    {
      name: '5. 연결할 대상 정하기',
      fields: [
        { key: 'setup.asana_target', kind: 'text', required: true,
          label: 'Asana — 봇을 초대할 프로젝트 URL 또는 Project GID',
          hint: '프로젝트 링크의 숫자 ID를 써도 됩니다. 토큰은 입력하지 않습니다.' },
        { key: 'setup.notion_target', kind: 'text', required: true,
          label: 'Notion — 앱을 연결할 페이지 URL 또는 Page ID',
          hint: '페이지 우측 상단 ··· → 연결 추가에서 기존 앱을 먼저 초대합니다.' },
        { key: 'setup.slack_target', kind: 'text', required: true,
          label: 'Slack — 내가 연결할 채널',
          hint: 'C로 시작하는 Channel ID를 적습니다. 이 값은 내 워크북에만 저장되며, 운영자 환경변수가 아닙니다.' },
        { key: 'setup.slack_user_id', kind: 'text', required: true,
          label: 'Slack — 봇이 DM을 보낼 내 사용자 ID',
          hint: 'U로 시작하는 Slack User ID를 적습니다. 프로필 메뉴 → 프로필 보기 → ··· → 멤버 ID 복사에서 확인합니다.' },
      ]
    },
    {
      name: '6. 실습 환경',
      fields: [
        { key: 'setup.laptop', kind: 'check', label: '노트북 + 충전기 지참, 사내 와이파이 확인' },
      ]
    },
    {
      name: '7. 첫 업무 후보',
      fields: [
        { key: 'setup.think', kind: 'textarea', rows: 3, required: true,
          label: '내가 매주 반복하는 업무 중, 없어졌으면 하는 것 하나는?',
          hint: '1회차 체크인에서 물어봅니다. 4회차에 이 업무의 연결 흐름을 실제로 설계합니다. 한 줄이면 충분합니다.' },
        { key: 'setup.trouble', kind: 'textarea', rows: 2,
          label: '연결이 안 되거나 막힌 것이 있다면 적어주세요',
          hint: '강사가 강의 전에 보고 미리 준비합니다.' },
      ]
    },
  ],
  verifyPrompt: '노션에서 연결 준비 때 지정한 페이지와 데이터베이스 중 내가 접근할 수 있는 항목의 이름만 보여줘. 지정한 대상이 없거나 비어 있으면 그렇게 표시하고, 아직 본문 내용은 읽지 마.',
  planB: '연결이 끝내 안 되어도 수업은 들을 수 있습니다. Asana는 프로젝트 URL과 화면 내보내기, Notion은 페이지 PDF/Markdown, Slack은 샘플 이벤트 JSON으로 같은 흐름을 연습합니다.',
};

// ── 회차별 워크북 ────────────────────────────────────────────
export const SESSIONS = [
  {
    n: 1,
    title: 'AI에게 업무 원본을 읽히는 날',
    tag: '연결',
    goal: '내 권한 안에서 Notion 원본을 가져오고, 출처와 범위를 확인한 뒤 작은 수정을 같은 문단에 다시 저장합니다.',
    blocks: [
      { type: 'note', text: '오늘의 중심은 프롬프트를 복사하는 일이 아니라, 연결된 원본을 실제로 가져와 확인하고 다시 저장하는 일입니다. 「AX 실습장」의 수정 실습 문단을 불러와 작은 변경을 만든 뒤 같은 Notion 블록에 반영합니다.' },
      { type: 'visual', id: 'connector' },
      { type: 'note', text: '**비유를 기억하세요.** 커넥터는 AI에게 회사 전체 열쇠를 주는 일이 아니라, 내가 열 수 있는 업무 자료실의 문만 함께 여는 일입니다.' },

      { type: 'field', key: 's1.checkin', kind: 'textarea', rows: 2, required: true,
        label: '체크인 — 내가 매주 반복하는 업무 중 없어졌으면 하는 것',
        hint: '4회차에 이 업무의 연결 흐름을 실제로 설계합니다.' },

      { type: 'head', text: '실습 1 — 내 접근 범위 안의 원본 찾기' },
      { type: 'note', text: '강사가 배포한 「AX 실습장」 복제본으로 시작합니다. 원본 회의록·수정 실습 문단·결과 기록 영역이 준비되어 있으므로 빈 페이지에서 찾지 않습니다. 복제본에 Notion 앱을 연결하고 민감한 실제 업무 원본은 사용하지 않습니다.' },
      { type: 'prompt', id: 's1a' },
      { type: 'field', key: 's1.source_list', kind: 'textarea', rows: 5, required: true,
        label: '내가 실제로 접근 가능한 원본과 범위',
        hint: '페이지·데이터베이스 이름과 위치, 이번 실습에서 읽지 않을 범위를 함께 적습니다.' },
      { type: 'field', key: 's1.source_snapshot', kind: 'textarea', rows: 6,
        label: '버튼으로 가져온 원본 확인 결과',
        hint: '실습 패널이 AX 실습장의 수정 가능한 문단과 block ID를 저장합니다.' },
      { type: 'field', key: 's1.notion_update', kind: 'textarea', rows: 4,
        label: '같은 Notion 문단에 다시 저장한 결과',
        hint: '수정 전후 미리보기를 확인한 뒤 저장하면 page ID·block ID·최종 문장이 기록됩니다.' },

      { type: 'head', text: '실습 2 — 페이지 하나를 읽고 업무 맥락으로 바꾸기' },
      { type: 'field', key: 's1.page_name', kind: 'text', required: true,
        label: '이번에 읽을 Notion 페이지명',
        hint: 'Notion에서 페이지 제목을 그대로 복사해 붙여넣으세요. 페이지 URL 또는 ID를 함께 적으면 더 정확하게 찾을 수 있습니다.' },
      { type: 'prompt', id: 's1b' },
      { type: 'field', key: 's1.context', kind: 'textarea', rows: 7, required: true,
        label: '업무 맥락 요약',
        hint: '이 자료의 목적·핵심 내용·이미 정해진 일·아직 정해지지 않은 일을 나눠 적습니다.' },

      { type: 'head', text: '실습 3 — 근거와 빈칸 확인하기' },
      { type: 'prompt', id: 's1c' },
      { type: 'field', key: 's1.evidence', kind: 'textarea', rows: 6, required: true,
        label: '요약의 근거 문장과 비어 있는 정보',
        hint: '각 핵심 내용이 어느 원문에서 나왔는지 적고, 원본에서 확인할 수 없는 값은 빈칸으로 남깁니다.' },

      { type: 'head', text: '정리' },
      { type: 'field', key: 's1.stuck', kind: 'textarea', rows: 2,
        label: '오늘 막혔던 지점이 있다면' },
      { type: 'note', text: '**숙제는 원본 하나를 골라 작은 읽기 실험을 설계하는 시간입니다.** 아래 네 가지를 구체적으로 적어두면 다음 회차에 바로 연결할 수 있습니다.' },
      { type: 'field', key: 's1.homework', kind: 'textarea', rows: 3,
        label: '숙제 요약 — 어떤 원본을 읽힐 것인가',
        hint: '원본 위치·페이지명과 선택 이유를 한 문장으로 적습니다.' },
      { type: 'field', key: 's1.homework_source', kind: 'text', required: true,
        label: '1) 원본 위치와 범위',
        hint: '예: Notion 「주간 캠페인 회고」 페이지의 7월 이후 블록만 / Slack #팀-운영 채널의 이번 주 메시지만' },
      { type: 'field', key: 's1.homework_goal', kind: 'textarea', rows: 2, required: true,
        label: '2) 줄이고 싶은 반복 업무',
        hint: '예: 매주 회의 후 결정사항과 담당자·기한을 다시 정리하는 데 걸리는 30분' },
      { type: 'field', key: 's1.homework_output', kind: 'textarea', rows: 2, required: true,
        label: '3) AI에게 받고 싶은 결과',
        hint: '예: 작업명 / 담당자 / 기한 / 근거 문장 4개 열의 표. 모르는 값은 미확인으로 표시' },
      { type: 'field', key: 's1.homework_safety', kind: 'checks',
        label: '4) 실험 전에 확인할 것',
        options: ['내가 실제로 접근할 수 있는 원본이다', '민감 정보·개인정보를 제외했다', '읽을 범위와 기간을 정했다', '근거 문장을 함께 남기도록 했다', '결과를 바로 외부에 보내지 않고 먼저 검토한다'] },
    ],
  },

  {
    n: 2,
    title: '흩어진 기록에 구조를 더하는 날',
    tag: '구조',
    goal: '근거·담당자·기한을 먼저 정하고, 회의록을 다시 꺼내 쓸 수 있는 업무 데이터로 바꿉니다.',
    blocks: [
      { type: 'note', text: '오늘의 중심은 액션아이템 개수가 아니라, 원본 후보가 최종 표로 바뀌고 그 표가 실제 DB에 저장·재조회되는 과정입니다. 별도 팀 DB에는 쓰지 않고 로그인한 본인의 Supabase `entries`에만 저장합니다.' },
      { type: 'visual', id: 'schema' },
      { type: 'note', text: '**비유를 기억하세요.** DB는 메모를 쌓아두는 창고가 아니라, 다음 사람이 다시 찾을 수 있도록 칸과 라벨을 정해둔 서랍장입니다.' },

      { type: 'head', text: '실습 0 — 이 워크북도 DB에 저장됩니다' },
      { type: 'note', text: '여러분이 여기에 적는 답변은 화면에만 남지 않습니다. Supabase의 **entries** 테이블에 `user_id / item_key / value` 한 행으로 저장되고, 로그인 정보는 **profiles**, 접근 권한은 **RLS**가 지킵니다.' },
      { type: 'prompt', id: 's2db' },
      { type: 'field', key: 's2.db_map', kind: 'grid',
        label: '내 입력 하나를 DB 한 행으로 번역해보기',
        hint: '예: “없어졌으면 하는 반복 업무” → item_key: s1.checkin → value: 내가 적은 문장',
        columns: ['내가 한 입력', 'item_key', 'value가 담는 것'], rows: 3,
        placeholders: ['예: 1회차 체크인', '예: s1.checkin', '내가 적은 문장'] },
      { type: 'field', key: 's2.db_reflection', kind: 'textarea', rows: 3, required: true,
        label: '내 업무에서 entries와 같은 역할을 할 데이터는?',
        hint: '예: 상담 기록 한 건, 고객 요청 한 건, 프로젝트 태스크 한 건. 반복해서 쌓이고 다시 꺼내 쓸 수 있는 단위를 적어보세요.' },

      { type: 'head', text: '실습 1 — 내 회의록에서 후보를 넓게 뽑기' },
      { type: 'note', text: '공용 샘플 회의록은 선택사항입니다. 아래에 내가 접근 가능한 회의록 URL·Notion 페이지·Slack permalink를 직접 넣고, 실제 원본의 분량과 형식에 맞춰 결과를 관찰합니다. 정해진 정답 개수는 없습니다.' },
      { type: 'field', key: 's2.source_urls', kind: 'textarea', rows: 3, required: true,
        label: '이번에 읽을 회의록 원본 URL 또는 페이지',
        hint: '1~3개를 줄바꿈으로 적습니다. Notion 페이지 URL이나 Slack 메시지 링크 등 내가 실제로 열 수 있는 원본을 사용하세요.' },
      { type: 'field', key: 's2.source_scope', kind: 'text',
        label: '읽을 범위와 제외할 범위',
        hint: '예: 8월 1일 이후 결정사항만 읽고, 개인정보가 있는 부록은 제외' },
      { type: 'prompt', id: 's2raw' },
      { type: 'field', key: 's2.count_before', kind: 'number', required: true,
        label: '규칙 없이 나온 후보 개수', hint: '실제 결과를 그대로 적습니다. 회의록 개수·길이에 따라 달라지며 정답 개수는 없습니다.' },
      { type: 'field', key: 's2.raw_candidates', kind: 'textarea', rows: 8, required: true,
        label: '규칙 없이 나온 후보 목록', hint: 'AI 결과를 붙여넣고, 각 후보가 진짜 액션인지 판정하기 전의 원본 상태로 남깁니다.' },
      { type: 'prompt', id: 's2rules' },
      { type: 'field', key: 's2.count_after', kind: 'number', required: true,
        label: '규칙 적용 후 남긴 액션아이템 개수', hint: '실제 결과를 적습니다. 개수보다 각 행에 근거가 있고 다음 행동이 분명한지가 중요합니다.' },
      { type: 'field', key: 's2.action_items', kind: 'textarea', rows: 10, required: true,
        label: '규칙 적용 후 최종 액션아이템 표',
        hint: '작업명 / 담당자 / 상태 / 마감일 / 우선순위 / 근거문장 / 출처를 포함합니다. 모르는 값은 빈칸 또는 미확인으로 둡니다.' },
      { type: 'field', key: 's2.rule_decisions', kind: 'textarea', rows: 5, required: true,
        label: '후보를 남기거나 제외한 판단의 근거',
        hint: '예: “검토해보겠다”는 결정이 아니어서 제외, 담당자가 원문에 없어 빈칸으로 둠처럼 적습니다.' },
      { type: 'field', key: 's2.diff', kind: 'textarea', rows: 3, required: true,
        label: '사라진 후보 중 하나를 골라, 왜 액션아이템이 아니었는지',
        hint: '회의록 원문과 연결해서 적습니다. “아직 정해진 건 없습니다”처럼 논의만 된 문장일 수 있습니다.' },

      { type: 'head', text: '실습 2 — 근거문장 검증' },
      { type: 'prompt', id: 's2verify' },
      { type: 'field', key: 's2.fabricated', kind: 'textarea', rows: 3,
        label: '근거를 못 찾아서 지운 행이 있다면 적어주세요',
        hint: '이게 AI가 지어낸 행입니다. 1회차 B 과제에서 재미로 봤던 그것입니다.' },

      { type: 'head', text: '실습 3 — Supabase에 내 학습 결과 남기기' },
      { type: 'note', text: '클래스 계정 연결은 **이 워크북에서** 아래 버튼으로 진행합니다. Google 로그인 후 자동으로 이 2회차로 돌아오며, 글 저장 버튼이 클래스 플랫폼의 `class_posts`에 직접 기록합니다. 클래스 사이트는 저장 후 결과를 확인하는 곳입니다. 두 사이트의 로그인 세션은 별도로 남을 수 있지만, 같은 원격 DB의 글은 서로 보입니다.' },
      { type: 'note', text: '최종 표를 완성한 뒤 위 실습 패널의 **최종 결과 저장** 버튼을 누르세요. 저장 위치와 다시 읽은 값이 화면에 나타나야 이 실습이 끝납니다.' },
      { type: 'field', key: 's2.entered', kind: 'number',
        label: '검수 후 최종 표에 남긴 행 수',
        hint: '이 숫자는 댓글의 본문이 아니라, 저장한 표를 확인하기 위한 보조 기록입니다.' },
      { type: 'field', key: 's2.traps', kind: 'checks',
        label: '내가 걸렸던 함정에 표시해주세요',
        options: [
          '논의만 되고 결정 안 된 것을 액션으로 잡음',
          '"다음 주까지"를 실제 날짜로 환산 안 함',
          '담당자를 참석자 중 임의로 배정함',
          '이미 처리된 건을 새 액션으로 잡음',
          '조건부 작업에 마감일을 못 박음',
          '초안과 최종 확정을 한 건으로 합침',
          '유형(태그)에 목록에 없는 값이 생김',
          '없음 — 다 피했습니다',
        ] },

      { type: 'head', text: '정리' },
      { type: 'field', key: 's2.homework', kind: 'textarea', rows: 3,
        label: '숙제 — 자기 팀 회의록으로 같은 작업을 해보고, **어디서 막혔는지**',
        hint: '잘 되는지가 아니라 막힌 지점을 봐 주세요. 3회차 시작할 때 같이 봅니다.' },
    ],
  },

  {
    n: 3,
    title: 'Asana·Notion·Slack을 실제로 연결하는 날',
    tag: '연동',
    goal: '운영자가 Vercel에 둔 봇 토큰을 노출하지 않고, SaaS 원본을 워크북으로 가져와 수정한 뒤 같은 프로젝트·페이지·메시지에 다시 저장합니다.',
    blocks: [
      { type: 'note', text: '오늘의 중심은 **워크북에서 고친 값이 원래 SaaS에 반영되는 경험**입니다. 기존 태스크·문단·봇 메시지를 가져오고, 수정 미리보기 후 같은 위치에 저장합니다. 토큰은 Vercel 서버에만 있습니다.' },
      { type: 'visual', id: 'delivery' },
      { type: 'note', text: '**비유를 기억하세요.** 봇은 마스터키가 아니라, 초대받은 방에서만 일하는 담당자입니다. 프로젝트·페이지·채널마다 초대와 권한을 따로 확인합니다.' },

      { type: 'head', text: '실습 0 — 서버 연결값은 운영자가, 대상은 수강생이' },
      { type: 'prompt', id: 's3config' },
      { type: 'field', key: 's3.db_flow', kind: 'checks',
        label: '오늘 확인한 연결',
        options: ['Asana 태스크 → 워크북 수정 → 같은 태스크 저장', 'Notion 문단 → 워크북 수정 → 같은 문단 저장', 'Slack 봇 메시지 → 워크북 수정 → 같은 메시지 저장', 'Slack 메시지 → Vercel 웹훅 받기'] },

      { type: 'head', text: '실습 1 — Asana: 기존 태스크를 가져와 수정 저장하기' },
      { type: 'note', text: '봇을 프로젝트 멤버로 초대한 뒤 기존 태스크를 가져옵니다. 워크북에서 이름·설명·마감일·완료 상태를 고치고, 미리보기 후 같은 태스크에 저장합니다.' },
      { type: 'prompt', id: 's3asana' },
      { type: 'field', key: 's3.asana_project', kind: 'text', required: true,
        label: '연결한 Asana 프로젝트 URL 또는 Project GID' },
      { type: 'field', key: 's3.asana_tasks', kind: 'textarea', rows: 6, required: true,
        label: 'Asana에서 가져온 태스크와 수정 대상',
        hint: '실습 패널이 프로젝트 태스크를 자동으로 저장합니다. 어떤 태스크를 어떻게 고칠지 확인합니다.' },
      { type: 'field', key: 's3.asana_ready', kind: 'check',
        label: '워크북에서 고친 값을 기존 Asana 태스크에 저장했다' },

      { type: 'head', text: '실습 2 — Notion: 기존 문단을 가져와 수정 저장하기' },
      { type: 'note', text: '「AX 실습장」 복제본에 앱을 연결하고 수정 실습 문단을 가져옵니다. 워크북에서 내용을 고친 뒤 같은 Notion 블록에 저장합니다. 기존 문단 전체가 바뀌므로 미리보기를 먼저 확인합니다.' },
      { type: 'prompt', id: 's3notion' },
      { type: 'field', key: 's3.notion_page', kind: 'text', required: true,
        label: '연결한 Notion 페이지 URL 또는 Page ID' },
      { type: 'field', key: 's3.report', kind: 'textarea', rows: 7, required: true,
        label: 'Notion에서 가져온 문단과 수정 대상',
        hint: '실습 패널이 페이지의 수정 가능한 문단을 자동으로 저장합니다.' },
      { type: 'field', key: 's3.notion_ready', kind: 'check',
        label: '워크북에서 고친 값을 기존 Notion 문단에 저장했다' },

      { type: 'head', text: '실습 3A — Slack으로 보내기: 메시지를 작성하고 봇으로 전송하기' },
      { type: 'note', text: 'A 카드의 「Slack에 보낼 메시지」 입력란에 내용을 직접 씁니다. Channel ID와 메시지를 미리보기로 확인한 뒤 봇이 전송하고, 필요하면 같은 channel·ts의 봇 메시지를 다시 수정합니다.' },
      { type: 'prompt', id: 's3slack_send' },
      { type: 'field', key: 's3.slack_channel', kind: 'text', required: true,
        label: 'A 카드에서 메시지를 보낼 Slack Channel ID' },
      { type: 'field', key: 's3.slack_draft', kind: 'textarea', rows: 4, required: true,
        label: 'A 카드에서 작성한 전송 메시지 초안',
        hint: '「Slack에 보낼 메시지」 입력란과 연결되어 자동 저장됩니다. 누구에게 어떤 행동을 요청하는지 확인합니다.' },
      { type: 'field', key: 's3.slack_message', kind: 'textarea', rows: 5, required: true,
        label: '봇이 보내고 수정 저장한 최종 메시지' },
      { type: 'field', key: 's3.dm_sent', kind: 'check',
        label: '봇 메시지를 보낸 뒤 같은 메시지에 수정 내용을 저장했다',
        hint: '채널에 봇이 초대되어 있어야 합니다.' },

      { type: 'head', text: '실습 3B — Slack에서 받기: 사람이 채널에 쓴 메시지를 수신하기' },
      { type: 'note', text: 'B 실습은 방향이 반대입니다. 사람이 Slack 테스트 채널에 직접 쓴 메시지를 Events API가 공개 Vercel 엔드포인트로 보내고, 서명 검증 후 수신함과 Supabase에 표시합니다. A에서 봇이 보낸 메시지는 중복 방지를 위해 제외될 수 있습니다.' },
      { type: 'prompt', id: 's3slack_event' },
      { type: 'field', key: 's3.slack_event', kind: 'textarea', rows: 6, required: true,
        label: '웹훅으로 받은 이벤트와 처리 결과',
        hint: 'channel_id·user·text·event_ts를 확인하고, 무시한 봇 메시지가 있다면 이유도 적습니다.' },
      { type: 'field', key: 's3.event_ready', kind: 'check',
        label: 'Slack에 쓴 테스트 메시지가 Vercel 웹훅에 도착했다' },

      { type: 'head', text: '실습 5 — 같은 원본을 세 목적지에 맞게 바꾸기' },
      { type: 'prompt', id: 's3flow' },
      { type: 'field', key: 's3.destinations', kind: 'checks',
        label: '목적지별 결과를 구분했다',
        options: ['Asana — 실행할 태스크', 'Notion — 다시 찾아볼 기록', 'Slack — 지금 읽을 메시지', 'Supabase — 연결 결과와 로그'] },
      { type: 'field', key: 's3.delay_text', kind: 'textarea', rows: 3,
        label: '사람이 마지막으로 확인해야 할 값',
        hint: '담당자·마감일·공개 범위처럼 AI가 확정하면 안 되는 값을 적습니다.' },

      { type: 'head', text: '정리 — 내 연결 레시피 저장 ★' },
      { type: 'prompt', id: 's3recipe' },
      { type: 'field', key: 's3.recipe', kind: 'textarea', rows: 8, required: true,
        label: '완성된 연결 레시피를 붙여넣으세요',
        hint: '원본·권한·목적지·확인 지점·실패 시 대체 경로까지 한 덩어리로 남깁니다.' },
      { type: 'field', key: 's3.recipe_where', kind: 'text', required: true,
        label: '이 레시피를 어디에 저장하셨나요?',
        hint: '개인 노션 페이지, 메모장, 어디든 좋습니다. 다음 주 월요일에 찾을 수 있는 곳이면 됩니다.' },

      { type: 'head', text: '정리' },
      { type: 'field', key: 's3.homework', kind: 'check',
        label: '숙제 — 다음 주에 같은 연결을 실제 업무 데이터로 1회 다시 실행한다' },
      { type: 'field', key: 's3.next_case', kind: 'textarea', rows: 2, required: true,
        label: '★ 4회차에 가져올 "내 업무" 하나를 지금 정해주세요',
        hint: '이게 없으면 4회차에 할 게 없습니다. 1회차 체크인에 적으신 것 그대로여도 됩니다.' },
    ],
  },

  {
    n: 4,
    title: '내 업무 흐름을 연결하는 날',
    tag: '정착',
    goal: '내 반복 업무와 파일 정리까지 연결해, 다음 주에도 다시 쓸 수 있는 연결 설계서를 완성합니다.',
    blocks: [
      { type: 'note', text: '오늘은 새 프롬프트를 만드는 날이 아니라, 1~3회차에 저장한 기록을 다시 읽어 다음 실행으로 묶는 날입니다. 실습 패널에서 DB 기록을 불러오고, 레시피 파일로 내보낸 뒤, 내 업무 설계서에 반영합니다.' },
      { type: 'head', text: '파트 1 — 개인 루틴' },
      { type: 'note', text: '지금까지는 회사 데이터라 승인이 필요했습니다. 이 세 개는 내 폴더, 내 기록입니다. 오늘 퇴근하고 바로 켤 수 있습니다.' },
      { type: 'visual', id: 'recipe' },
      { type: 'note', text: '**비유를 기억하세요.** 연결 설계서는 요리 레시피와 같습니다. 재료·순서·검수·도착지를 적어야 다음 주에도 다시 만들 수 있습니다.' },
      { type: 'field', key: 's4.routines', kind: 'checks',
        label: '오늘 따라해본 것',
        options: ['수신함 정리 (주 20분)', '일일 로그 (매일 10분)', '주간 회고 (주 30분)'] },
      { type: 'prompt', id: 's4inbox' },
      { type: 'prompt', id: 's4daily' },
      { type: 'field', key: 's4.routine_note', kind: 'textarea', rows: 3,
        label: '해보니 어땠나요? 바로 쓸 만한가요?' },

      { type: 'head', text: '파트 2 — 케이스 클리닉' },
      { type: 'note', text: '설계서는 별도 페이지에서 작성합니다. 아래 버튼을 눌러 이동하세요.' },
      { type: 'link', href: '/clinic', text: '내 업무 연결 설계서 작성하기 →' },

      { type: 'head', text: '파트 3 — 파일 정리까지 자동화해보기' },
      { type: 'note', text: '마지막 확장은 화면 밖의 파일입니다. 데스크톱 앱이 다운로드 폴더·카카오톡 받은 파일·프로젝트 폴더를 살펴보고, 규칙에 맞는 파일만 안전하게 정리하도록 설계합니다.' },
      { type: 'prompt', id: 's4desktop' },
      { type: 'field', key: 's4.desktop_plan', kind: 'textarea', rows: 5, required: true,
        label: '내 데스크톱 자동정리의 첫 규칙',
        hint: '예: 파일명에 “견적”이 들어간 PDF는 Downloads/_정리함/견적/YYYY-MM으로 이동 제안. 애매한 파일은 그대로 둔다.' },
      { type: 'field', key: 's4.desktop_safety', kind: 'checks',
        label: '자동화 전에 지킬 안전장치',
        options: ['Dry Run 결과를 먼저 본다', '최근 파일과 폴더는 건드리지 않는다', '애매한 파일은 보류한다', '삭제하지 않고 이동만 한다', '이동 기록과 undo 방법을 남긴다'] },

      { type: 'head', text: '마무리' },
      { type: 'field', key: 's4.takeaway', kind: 'textarea', rows: 3, required: true,
        label: '4주 동안 가장 크게 남은 것 한 가지' },
    ],
  },
];

// ── 4회차 케이스 클리닉 설계서 ────────────────────────────────
export const CLINIC = {
  title: '내 업무 연결 설계서',
  intro: '내 업무가 어디서 시작해 어떤 형태로 바뀌고 어디에 도착하는지 한 장으로 정리합니다. 작성 15분 → 상호 리뷰 10분.',
  groups: [
    {
      name: '0. 연결할 업무 고르기',
      fields: [
        { key: 'clinic.task', kind: 'textarea', rows: 2, required: true,
          label: '연결할 업무를 한 문장으로',
          hint: '예: 매주 금요일 팀 주간 진행상황을 정리해 팀 채널에 공유한다' },
        { key: 'clinic.min_per', kind: 'number', label: '1회에 걸리는 시간 (분)' },
        { key: 'clinic.times',   kind: 'number', label: '주당 횟수' },
        { key: 'clinic.freq_note', kind: 'note',
          text: '주 30분 미만이면 자동화보다 그냥 하는 게 빠를 수 있습니다. 솔직하게 적으세요.' },
      ]
    },
    {
      name: '1. 가져오기 — 무엇을 어디서 읽는가',
      fields: [
        { key: 'clinic.source', kind: 'textarea', rows: 2, required: true,
          label: '출처', hint: '노션 페이지명 / 시트 / 슬랙 채널 / 폴더' },
        { key: 'clinic.scope', kind: 'text', label: '범위 (기간·조건)' },
        { key: 'clinic.sensitive', kind: 'radio', label: '민감 정보가 있나요?',
          options: ['없다', '있다'] },
        { key: 'clinic.sensitive_how', kind: 'textarea', rows: 2,
          label: '있다면 어떻게 뺄 것인가' },
        { key: 'clinic.blockers', kind: 'checks', label: '막히는 지점',
          options: [
            '출처가 여러 군데 흩어져 있다 → 먼저 한 곳에 모으는 게 우선',
            '원본이 사람마다 형식이 다르다 → 형식을 더 빡빡하게 정해야 함',
            '원본이 종이·이미지·구두다 → 난이도가 확 올라감. 상담 필요',
          ] },
      ]
    },
      {
      name: '2. 다듬기 — 어떤 형식으로 고치는가',
        fields: [
        { key: 'clinic.store', kind: 'radio', label: '결과를 어디에 쌓을까?',
          hint: '지금 선택한 도구가 영원한 정답은 아닙니다. 반복해서 꺼내 쓸 필요가 있는지부터 봅니다.',
          options: ['Notion DB / 페이지', 'Asana 프로젝트 / 태스크', 'Supabase 테이블', '파일 / 문서', '아직 결정하지 않음'] },
        { key: 'clinic.cols', kind: 'grid', required: true,
          label: '결과물의 칸 (최소 3개, 많아도 8개)',
          hint: '"원본에 없으면?" 칸이 제일 중요합니다. 여기를 안 정해두면 AI가 지어냅니다.',
          columns: ['칸 이름', '값의 종류', '원본에 없으면?'],
          rows: 5,
          placeholders: ['작업 이름', '텍스트', '빈칸으로'] },
      ]
    },
    {
      name: '3. 반영하기 — 누가 어떤 결과를 확인하는가',
      fields: [
        { key: 'clinic.output', kind: 'checks', label: '결과물 형태',
          options: ['표 / 목록', '요약 글', '노션 DB 항목', '슬랙 메시지', '기타'] },
        { key: 'clinic.reader', kind: 'text', required: true, label: '읽는 사람은 누구인가' },
        { key: 'clinic.decision', kind: 'text', label: '그 사람이 이걸 보고 무엇을 판단해야 하나' },
      ]
    },
    {
      name: '4. 이어쓰기 — 어디에 저장하고 다시 쓰는가',
      fields: [
        { key: 'clinic.dest', kind: 'text', required: true, label: '도착지', hint: '노션 DB / 슬랙 채널 / 문서 / 내 폴더' },
        { key: 'clinic.cycle', kind: 'text', label: '주기', hint: '매일 / 매주 O요일 / 필요할 때' },
        { key: 'clinic.who_sends', kind: 'radio', label: '최종 발송 버튼은 누가 누르나',
          options: ['내가 직접', '자동'] },
        { key: 'clinic.send_note', kind: 'note',
          text: '사람이 읽는 채널로 나가는 것은 반드시 사람이 최종 확인합니다.' },
      ]
    },
    {
      name: '5. 사람의 확인 지점',
      fields: [
        { key: 'clinic.safety', kind: 'checks', label: 'AI를 믿으면 안 되는 곳',
          options: [
            '원본을 제대로 읽었는지 (출처 확인)',
            '지어낸 항목이 섞이지 않았는지 (근거 문장 확인)',
            '숫자가 맞는지 (금액·수량·날짜)',
            '사람 이름·담당자가 맞는지',
            '남에게 나가기 전 문구 (톤·오탈자·멘션)',
          ] },
        { key: 'clinic.undo', kind: 'textarea', rows: 2, required: true,
          label: '잘못 만들어졌을 때 어떻게 되돌리나' },
      ]
    },
    {
      name: '6. 연결 설계 리뷰',
      fields: [
        { key: 'clinic.review_note', kind: 'note',
          text: '짝에게 이 세 가지만 물어보세요. ① 이거 진짜 매주 하는 일 맞아요? ② 여기서 AI가 틀리면 누가 피해를 보나요? ③ 원본에 없는 값이 나오면 어떻게 되나요?' },
        { key: 'clinic.review', kind: 'textarea', rows: 4,
          label: '짝에게 받은 피드백' },
      ]
    },
    {
      name: '7. 다음 주 첫 연결',
      fields: [
        { key: 'clinic.step1', kind: 'textarea', rows: 3, required: true,
          label: '전체를 다 만들려 하지 말고, 가장 작은 한 조각만',
          hint: '예: 다음 주 금요일에, 완료 항목만 뽑아 표로 받아보기까지만 해본다' },
      ]
    },
  ],
};

// ── 프롬프트 카드 ────────────────────────────────────────────
export const PROMPTS = {
  frame: {
    session: 0, title: '모든 프롬프트의 공통 골격',
    note: '좋은 요청은 이 네 칸이 다 채워져 있습니다. 막히면 어느 칸이 비었는지 먼저 확인하세요.',
    body: `[어디서]  노션 「내 업무(연습용)」 DB에서
[무엇을]  이번 주 마감인 항목만
[어떤 형식으로]  작업 이름 / 담당자 / 상태 / 마감일 4개 열의 표로
[어디로]  화면에 먼저 보여줘 (아직 아무데도 쓰지 마)

목적지가 정해지면 이 형식으로 바꿔서 보낸다:
- Slack: 채널 또는 DM용 메시지
- Notion: 특정 페이지 또는 DB의 한 항목
- Asana: 프로젝트의 태스크
- Supabase: 테이블의 한 행 (필드와 권한을 먼저 확인)`
  },

  setup: {
    session: 0, title: '연결 확인',
    body: `연결 준비에서 지정한 노션 페이지와 데이터베이스 중 내가 접근할 수 있는 항목의 이름만 보여줘.
지정한 대상이 없거나 비어 있으면 그렇게 표시해줘.
아직 본문 내용은 읽지 마.`
  },

  s1a: {
    session: 1, title: '1 — 읽을 수 있는 원본 찾기',
    note: '첫날부터 「AX 실습장」 원본을 실제로 가져오고, 작은 수정을 같은 Notion 문단에 저장합니다. 공용 템플릿이 아니라 각자 복제본에서 진행합니다.',
    body: `노션에서 내가 현재 접근할 수 있는 페이지와 데이터베이스를 찾아줘.

연결 준비에서 지정한 페이지와 그 하위 항목을 기준으로 찾아줘. 지정한 대상이 없거나 비어 있으면 그렇게 알려줘.

본문 내용은 아직 읽지 말고 아래 표로만 보여줘:
- 원본 이름
- 도구와 위치
- 자료 유형 (페이지 / 데이터베이스 / 회의록 / 기타)
- 마지막 수정일 (확인할 수 있을 때)
- 다음 단계에서 읽어볼 이유

내 권한 밖의 자료는 추측해서 채우지 말고 '접근 불가'라고 표시해줘. 페이지가 비어 있으면 '내용 없음'이라고 표시해줘.
이번 실습에서 읽지 않을 자료도 마지막에 따로 적어줘.`
  },

  s1b: {
    session: 1, title: '2 — 원본을 업무 맥락으로 요약하기',
    body: `노션 「[페이지명]」 한 페이지만 읽어줘.

아래 순서로 업무 맥락을 요약해줘:
1. 이 자료의 목적
2. 핵심 내용 3~5개
3. 이미 정해진 일
4. 아직 정해지지 않은 일
5. 다음 단계에서 확인할 질문

원본에 직접 적힌 내용만 사용하고, 담당자·날짜·수량을 추측해서 채우지 마.
각 항목 뒤에 근거가 된 원문 문장을 함께 붙여줘.
확인할 수 없는 값은 '미확인'으로 표시해줘.`
  },

  s1c: {
    session: 1, title: '3 — 근거와 빈칸 확인하기',
    body: `방금 만든 업무 맥락 요약을 원본과 대조해서 검수해줘.

표의 열은 [요약 항목 / 근거 원문 / 확인 상태 / 사람이 확인할 질문]으로 해줘.

반드시 확인해줘:
- 원본에 없는 내용이 섞이지 않았는가?
- 서로 다른 페이지의 내용이 합쳐지지 않았는가?
- 담당자·날짜·수량이 실제 원문에 있는가?
- 근거를 찾지 못한 항목은 빈칸 또는 '미확인'으로 남겼는가?

근거가 없는 항목은 삭제하지 말고 '확인 필요'로 표시해줘.`
  },

  s2raw: {
    session: 2, title: '1 — 규칙 없이 후보를 넓게 뽑기',
    note: '원본마다 결과 개수는 달라집니다. 먼저 넓게 뽑고, 다음 단계에서 근거와 실행 가능성을 기준으로 줄입니다.',
    body: `내가 입력한 회의록 원본 [회의록 원본]을 읽고 액션아이템 후보를 넓게 뽑아줘.

아직 엄격하게 걸러내지 말고, 각 후보에 출처 회의록과 근거가 된 원문 문장을 붙여줘.
논의·결정·요청·참고사항이 섞여 있을 수 있으니, 마지막에 각 후보의 임시 유형도 표시해줘.`
  },

  s2db: {
    session: 2, title: '0 — 이 워크북의 DB 구조 읽기',
    note: '화면 뒤에 어떤 행이 생기는지 상상해보는 미니랩입니다.',
    body: `이 워크북의 Supabase 구조를 비개발자도 이해할 수 있게 설명해줘.

반드시 이 세 가지를 포함해:
1. profiles — 로그인한 사람의 이름·팀·역할을 저장하는 테이블
2. entries — user_id / item_key / value로 워크북 입력을 저장하는 테이블
3. RLS — 본인은 자기 답을 읽고 쓰고, 강사는 읽기만 하도록 막는 규칙

그리고 내가 적은 '1회차 체크인' 답변이 entries에 들어간다면
item_key와 value가 어떤 모습일지 예시 한 행으로 보여줘.
마지막으로 이 구조를 우리 팀의 반복 업무에 옮긴다면,
'한 행'이 무엇이 될지 질문 하나를 던져줘.`
  },

  s2rules: {
    session: 2, title: '2 — 근거와 실행 가능성으로 다시 고르기',
    body: `내가 입력한 회의록 원본 [회의록 원본]만 읽고, 액션아이템으로 볼 수 있는 항목만 표로 만들어줘.

표의 열은 액션아이템을 다시 꺼내 쓸 수 있는 업무 데이터 형식으로:
작업 이름 / 담당자 / 상태 / 마감일 / 우선순위 / 유형 / 세부내용 / 근거문장 / 출처 회의록

작성 규칙:
- 작업 이름은 동사로 끝맺기 ("장소 예약 확인", "견적서 요청")
- 상태는 시작 전 / 진행 중 / 완료 중 하나. 회의록에 안 나오면 '시작 전'
- 담당자는 회의록에 이름이 명시된 경우만. 없으면 빈칸
- 마감일: "다음 주까지" 같은 표현은 그 회의의 날짜를 기준으로 실제 날짜로 환산.
  기준이 없으면 빈칸
- 우선순위는 긴급/높음/보통/낮음 중 하나. 명시 없으면 '보통'
- 유형은 반드시 이 목록 안에서만 고를 것:
  회의, 업무요청, 확인·검토, 자료작성, 외부협의, 일정조율, 승인대기, 기타
- 근거문장: 이 항목이 나온 회의록 원문 문장을 그대로 복사해서 넣을 것
- 출처 회의록: 회의록 제목과 날짜

추가로 반드시 지켜줘:
1. 추측해서 채우지 마라. 모르면 빈칸으로 두라.
   근거문장을 못 채우는 항목은 아예 표에 넣지 마라.
2. 논의만 되고 결정되지 않은 것은 액션아이템이 아니다.
   "검토해보겠다", "다음에 얘기하자", "아직 정해진 건 없다"로 끝난 항목은 빼라.
3. 원본에 없는 날짜·담당자·우선순위를 만들지 마라.
4. 이번 결과의 총 개수는 미리 맞추려 하지 말고, 원본의 분량에 따라 그대로 산출하라.`
  },

  s2verify: {
    session: 2, title: '3 — 근거문장 검증',
    note: '오늘 배우는 유일한 기술입니다. 근거를 같이 내놓게 하고, 근거를 확인한다.',
    body: `방금 만든 표에서, 근거문장이 회의록에 실제로 있는지 다시 확인해줘.
원문에서 못 찾은 행이 있으면 그 행만 따로 알려줘.`
  },

  s2insert: {
    session: 2, title: '3 — 저장되는 한 행을 확인하기',
    body: `방금 만든 최종 액션아이템 표가 이 워크북의 Supabase entries에 저장된다고 가정하고,
다음 구조를 비개발자도 이해할 수 있게 한 건만 예시로 보여줘.

- user_id: 로그인한 수강생의 ID
- item_key: s2.action_items
- value: 내가 입력한 최종 액션아이템 표

표 안의 각 액션아이템은 아직 별도 테이블의 행으로 쪼개지지 않고,
이번 회차에서는 한 입력 묶음으로 안전하게 저장된다는 점도 설명해줘.
실제 팀 DB에는 쓰지 말고, 오늘은 워크북의 Supabase entries에만 저장해.
3회차부터는 각자가 지정한 Asana 프로젝트·Notion 페이지·Slack 채널에 미리보기와 확인을 거친 뒤 보낼 수 있어.`
  },

  s3config: {
    session: 3, title: '0 — 토큰은 서버에, 대상은 내가 정하기',
    note: '토큰 값은 화면이나 프롬프트에 적지 않습니다. 설정 여부와 대상 ID만 확인합니다.',
    body: `운영자가 Vercel 환경변수에 다음 값을 설정했다고 가정해줘:
- ASANA_TOKEN_BOT
- NOTION_TOKEN
- SLACK_BOT_TOKEN
- SLACK_SIGNING_SECRET
- SUPABASE_SERVICE_ROLE_KEY

토큰의 실제 값은 절대 보여주지 말고, 각 연결이 준비되었는지 확인하는 체크리스트만 만들어줘.
수강생이 직접 준비할 값은 다음 네 가지로 구분해줘:
- Asana Project GID
- Notion Page ID
- Slack Channel ID
- Slack User ID (개인 DM을 보낼 때)
Slack Events API Request URL은 운영자가 제공하고, 수강생은 입력하지 않아도 된다고 안내해줘.`
  },

  s3asana: {
    session: 3, title: '1 — Asana 기존 태스크를 가져와 수정 저장하기',
    note: '봇 토큰은 서버가 가지고 있습니다. 수강생은 프로젝트에 봇을 초대한 뒤 Project GID만 전달합니다.',
    body: `Asana에서 다음 프로젝트의 기존 태스크를 읽고, 워크북에서 수정한 뒤 같은 태스크에 저장하는 흐름으로 진행해줘.
프로젝트 URL 또는 Project GID: [여기에 입력]

운영자 서버의 ASANA_TOKEN_BOT을 사용하되, 토큰 값은 절대 노출하지 마.
1. 프로젝트 이름과 워크스페이스를 확인
2. 이 프로젝트의 태스크를 최대 3개 가져오기
3. 각 태스크를 [태스크명 / 담당자 / 마감일 / 완료 여부 / Asana URL]로 보여주기
4. 읽지 못한 값은 추측하지 말고 '미확인'으로 표시

봇이 프로젝트 멤버로 초대되지 않았다면 필요한 권한과 다음 조치를 알려줘.
먼저 수정할 태스크의 기존 값과 수정 후 값을 나란히 보여줘. 내가 확인하기 전에는 태스크를 수정하지 마.
확인하면 task GID를 기준으로 이름·설명·마감일·완료 상태 중 내가 바꾼 필드만 같은 태스크에 저장하고 URL을 알려줘.`
  },

  s3notion: {
    session: 3, title: '2 — Notion 기존 문단을 가져와 수정 저장하기',
    note: 'Notion 페이지의 ··· → 연결 추가에서 기존 앱을 먼저 선택해야 합니다.',
    body: `Notion에서 다음 페이지의 기존 문단을 읽고, 워크북에서 수정한 뒤 같은 블록에 저장하는 흐름으로 진행해줘.
페이지 URL 또는 Page ID: [여기에 입력]

운영자 서버의 NOTION_TOKEN을 사용하되, 토큰 값은 절대 노출하지 마.
1. 페이지 제목과 페이지 ID를 확인
2. 본문 블록을 읽어 핵심 내용 3~5개로 요약
3. 데이터베이스라면 행 3개를 [제목 / 상태 / 담당자 / 날짜]로 보여주기
4. 페이지에 연결되지 않았거나 Read content·Update content 권한이 없으면 원인과 해결 방법을 알려주기

먼저 선택한 block ID의 기존 문장과 수정 후 문장을 나란히 보여줘. 내가 확인하기 전에는 페이지를 수정하지 마.
확인하면 같은 block ID의 rich_text를 수정하고, 저장된 최종 문장을 다시 읽어 보여줘.`
  },

  s3slack_send: {
    session: 3, title: '3 — Slack 봇 메시지를 보내고 다시 수정하기',
    body: `Slack Channel ID [여기에 입력]에 다음 메시지를 보내는 작업을 설계해줘.

운영자 서버의 SLACK_BOT_TOKEN을 사용하되, 토큰 값은 절대 노출하지 마.
1. 먼저 최종 메시지를 화면에 미리 보여주기
2. 내가 확인하면 chat.postMessage로 지정한 Channel ID에 보내기
3. 성공 응답에서 channel과 ts를 기록하기
4. 보낸 뒤 내가 문구를 고치면 같은 channel과 ts로 chat.update 실행하기
5. 봇이 채널에 들어와 있지 않거나 권한이 없으면 실제 전송하지 말고 해결 방법을 알려주기

메시지는 제목 1줄 + 핵심 불릿 3~5개로 짧게 만들어줘.`
  },

  s3slack_event: {
    session: 3, title: '4 — Slack 메시지를 Vercel 웹훅으로 받기',
    note: 'Events API는 공개 Request URL로 POST를 보냅니다. 서명 검증과 봇 자기 메시지 제외가 필수입니다.',
    body: `Slack Events API 실습용 서버 흐름을 설계해줘.

Request URL: [Vercel의 /api/slack/events 엔드포인트]
대상 Channel ID: [여기에 입력]

운영자 서버의 SLACK_SIGNING_SECRET으로 요청 서명을 검증하고, SLACK_BOT_TOKEN은 필요한 경우에만 사용해줘.
반드시 포함할 것:
1. Slack의 url_verification challenge를 200으로 응답하는 처리
2. 실제 event_callback에서 channel_id, user, text, event_ts 추출
3. 받은 channel_id가 내가 연결 준비에 적은 Channel ID와 일치하는지 확인
4. 봇이 보낸 메시지는 다시 처리하지 않기
5. 처리한 이벤트의 event_id와 결과를 로그로 남기기
6. Slack에 200 응답을 빠르게 반환하고 오래 걸리는 작업은 분리하기

테스트 메시지 "AX-WEBHOOK-TEST"를 보낸 뒤, 받은 이벤트에서 어떤 값이 확인되어야 성공인지 알려줘.`
  },

  s3flow: {
    session: 3, title: '5 — 같은 원본을 목적지별로 바꾸기',
    body: `한 개의 업무 원본을 아래 세 목적지에 맞게 변환하는 표를 만들어줘.

원본: [Asana에서 읽은 태스크 또는 Notion에서 읽은 페이지]

열은 [원본 필드 / Asana에 남길 값 / Notion에 기록할 값 / Slack에 보낼 문장 / 사람이 확인할 지점]으로 해줘.
규칙:
- Asana는 실행할 태스크 중심
- Notion은 나중에 다시 찾을 기록 중심
- Slack은 지금 읽고 행동할 메시지 중심
- 담당자·마감일·공개 범위가 원본에 없으면 추측하지 말고 '확인 필요'로 표시`
  },

  s3recipe: {
    session: 3, title: '6 — 연결 레시피로 저장',
    body: `방금 한 연결 실습을 다음 사람이 다시 실행할 수 있는 한 덩어리의 레시피로 정리해줘.

반드시 포함해:
- 원본과 범위: 어떤 Asana 프로젝트 또는 Notion 페이지를 읽는가
- 권한: 봇·앱이 어디에 초대되어 있어야 하는가
- 목적지: 어떤 Slack Channel ID·Notion Page ID·Asana Project GID로 보내는가
- Vercel 환경변수 이름: 실제 토큰 값은 쓰지 않기
- 사람이 미리 확인할 항목
- 실패했을 때 파일 업로드·샘플 JSON 등으로 전환하는 방법

매번 바뀌는 값은 [Project GID], [Page ID], [Channel ID], [이번 주]처럼 대괄호 자리표시자로 남겨줘.`
  },

  s4inbox: {
    session: 4, title: '수신함 정리',
    body: `[다운로드 폴더 / 카톡 받은 파일] 안에 있는 파일들을 살펴보고,
어떤 종류가 반복해서 들어오는지 분류 규칙을 제안해줘.

- 파일명 패턴 → 이동할 폴더 형태로
- 애매한 건 '판단 필요'로 따로 빼줘
- 아직 옮기지는 마. 규칙안만 먼저 보여줘`
  },

  s4daily: {
    session: 4, title: '일일 로그',
    body: `오늘 내가 작업한 흔적을 모아서 하루 기록을 만들어줘.

- 오늘 수정한 프로젝트 파일
- 오늘 받은 파일
- 오늘 노션에서 내가 만들거나 수정한 페이지

형식은 [오늘 한 일 / 받은 자료 / 결정·메모 / 내일 할 일] 4단락으로.
추측은 넣지 말고, 흔적으로 확인되는 것만.`
  },

  s4desktop: {
    session: 4, title: '마지막 확장 — 데스크톱 파일 자동정리',
    note: 'AI에게 바로 이동시키지 말고, 관찰 → 계획 → 승인 → 실행의 순서로 설계합니다.',
    body: `내 데스크톱에 다운로드 파일이 쌓이는 문제를 안전하게 자동화하는 설계안을 만들어줘.

대상은 다음과 같아:
- Downloads 폴더
- 카카오톡 받은 파일 폴더
- 내가 지정한 프로젝트 폴더

반드시 다음 순서로 답해줘:
1. 먼저 파일명·확장자·수정일을 관찰하는 목록
2. 반복 패턴을 찾아 카테고리와 이동 목적지 제안
3. 최근 파일, 폴더, 임시 파일, 애매한 파일은 보호하거나 보류
4. 실제 이동 전에 Dry Run 표를 보여주고 사람의 승인을 받기
5. 삭제는 하지 않고 이동만 하며, 이동 기록과 undo 방법 남기기

마지막에 '지금 바로 실행해도 되는 규칙'과 '사람 확인이 필요한 규칙'을 나눠줘.`
  },
};

// 프롬프트 카드 아래에 보여줄 초보자용 설명과 실행 순서
export const PROMPT_HELP = {
  frame: {
    summary: '좋은 프롬프트는 원본·범위·결과 모양·도착지를 미리 정한 업무 요청서입니다.',
    terms: [
      ['원본', 'AI가 읽을 실제 자료입니다. Notion 페이지, Slack 채널, Asana 프로젝트처럼 위치를 특정해야 합니다.'],
      ['범위', '자료 전체가 아니라 기간·상태·조건으로 어디까지 읽을지 정하는 것입니다.'],
      ['도착지', '결과를 먼저 화면에서 볼지, Notion·Asana·Slack에 보낼지 정하는 곳입니다.'],
    ],
    steps: ['먼저 화면에 결과를 보여달라고 요청합니다.', '결과의 열·문장·필드를 정합니다.', '사람이 확인한 뒤에만 실제 도구에 씁니다.'],
  },
  setup: {
    summary: '연결이 되었는지 확인하는 읽기 전용 테스트입니다. 아직 내용을 수정하거나 보내지 않습니다.',
    terms: [['연결 범위', 'AI가 접근할 수 있도록 허용한 페이지·채널의 범위입니다. 연결되어도 권한이 없는 자료는 읽을 수 없습니다.']],
    steps: ['강사가 배포한 「AX 실습장」을 복제하고 기존 Notion 앱을 연결합니다.', '1회차의 수정할 문단 불러오기 버튼을 눌러 페이지 제목·block ID·기존 문장을 확인합니다.', '워크북에서 문장을 조금 고치고 미리보기 후 같은 Notion 블록에 저장합니다.'],
  },
  s1a: {
    summary: '첫 단계는 본문을 읽는 것이 아니라, 내가 접근할 수 있는 자료의 목록과 경계를 확인하는 일입니다.',
    terms: [['접근 불가', '권한이 없거나 연결 범위에 포함되지 않아 읽을 수 없는 상태입니다. 추측해서 채우면 안 됩니다.'], ['데이터베이스', '페이지처럼 보이지만 여러 행과 열을 반복해서 저장하는 구조입니다.']],
    steps: ['연결 준비에서 정한 실제 연습용 페이지를 기준으로 합니다.', '원본 가져오기 버튼으로 목록과 범위를 확인합니다.', '결과에 자료 이름·위치·읽지 않을 범위를 기록하고 저장합니다.'],
  },
  s1b: {
    summary: '페이지 하나를 넓게 요약하지 않고, 목적·결정·미결정·다음 질문으로 나눠 업무 맥락을 파악합니다.',
    terms: [['근거 문장', '요약이 원문에 실제로 적혀 있다는 것을 보여주는 문장입니다.'], ['미확인', '원본에서 찾지 못했으므로 사람이 추가 확인해야 한다는 표시입니다.']],
    steps: ['실습 2의 페이지명 또는 URL 입력란에 「AX 실습장」 복제본을 적습니다.', '실습 패널에서 해당 페이지의 문단을 가져옵니다.', '카드의 문장은 버튼 뒤에서 필요한 요약 규칙을 이해하는 참고 자료로 읽고, 근거와 미확인 값을 워크북에 기록합니다.'],
  },
  s1c: {
    summary: 'AI가 요약한 문장을 다시 원본과 대조해, 다른 자료가 섞였거나 지어낸 내용이 없는지 확인합니다.',
    terms: [['대조', 'AI 결과와 원본을 나란히 놓고 같은 내용인지 확인하는 작업입니다.'], ['확인 필요', '지금 바로 확정하지 않고 사람이 원본을 다시 봐야 하는 상태입니다.']],
    steps: ['요약의 핵심 문장 하나를 고릅니다.', '원본에서 같은 뜻의 문장을 찾습니다.', '찾지 못하면 삭제하지 말고 확인 필요로 표시합니다.'],
  },
  s2db: {
    summary: '워크북에 입력한 답변이 Supabase에서 어떤 한 행으로 저장되는지 이해하는 미니랩입니다.',
    terms: [['item_key', '어떤 질문에 대한 답인지 알려주는 주소입니다. 예: s1.checkin'], ['value', '실제로 입력한 답변 내용입니다.'], ['RLS', '누가 어떤 행을 읽고 쓸 수 있는지 막아주는 데이터베이스 규칙입니다.']],
    steps: ['내 답변 하나를 고릅니다.', 'item_key에는 질문의 키를 적습니다.', 'value에는 실제 답변이 들어간다고 생각해봅니다.'],
  },
  s2raw: {
    summary: '회의록에서 실행 후보를 넓게 뽑는 단계입니다. 이 단계의 결과는 일부러 아직 정제하지 않습니다.',
    terms: [['후보', '액션아이템일 수도 있지만, 아직 결정 여부와 근거를 확인하지 않은 항목입니다.'], ['permalink', 'Slack의 특정 메시지로 바로 이동하는 고유 링크입니다.']],
    steps: ['회의록 URL이나 Notion 페이지를 입력합니다.', '원본 범위를 적습니다.', '워크북에서 가져온 원문을 기준으로 후보를 기록하고, 카드의 문장은 후보를 만드는 규칙을 이해하는 데 사용합니다.'],
  },
  s2rules: {
    summary: '후보를 업무 데이터로 바꾸는 단계입니다. 실행할 일인지, 근거가 있는지, 모르는 값은 비워두는지를 판단합니다.',
    terms: [['액션아이템', '누가 무엇을 할지 정해진 실행 항목입니다. 논의나 아이디어만으로는 부족합니다.'], ['근거문장', '그 항목이 원본에 실제로 있었다는 증거 문장입니다.']],
    steps: ['작업명·담당자·상태·마감일 등의 열을 확인합니다.', '원문에 없는 값은 만들지 않습니다.', '결과 개수를 맞추지 말고 남긴 이유와 제외한 이유를 기록합니다.'],
  },
  s2verify: {
    summary: '최종 표의 근거문장이 실제 회의록에 존재하는지 마지막으로 검사합니다.',
    terms: [['검증', '결과를 믿기 전에 원본과 다시 비교하는 절차입니다.'], ['지어낸 행', '원본에서 근거를 찾을 수 없는데 AI가 추가한 항목입니다.']],
    steps: ['표의 행 하나를 선택합니다.', '근거문장을 원본에서 검색합니다.', '없으면 확인 필요로 표시하고 최종 표에서 제외할지 사람이 결정합니다.'],
  },
  s2insert: {
    summary: '최종 표가 워크북 Supabase entries에 어떤 형태로 남는지 확인합니다. 실제 팀 DB에는 쓰지 않습니다.',
    terms: [['한 행', '이번 워크북에서는 질문 하나와 그 답변 하나가 한 행입니다.'], ['Supabase', '로그인·입력·권한을 관리하는 이 워크북의 데이터 저장소입니다.']],
    steps: ['최종 액션아이템 표를 s2.action_items 입력란에 붙여넣습니다.', '2회차 실습 패널에서 최종 결과 저장 버튼을 누릅니다.', '저장 위치와 다시 읽은 값이 같은지 확인합니다.'],
  },
  s3asana: {
    summary: 'Asana 봇을 특정 프로젝트에 초대한 뒤 기존 태스크를 가져와 수정하고, 같은 태스크에 저장하는 실습입니다.',
    setup: ['운영자: Vercel Production에 ASANA_TOKEN_BOT이 설정되어 있고 태스크 읽기·쓰기 권한이 있어야 합니다. 토큰 값은 수강생에게 공유하지 않습니다.', '수강생: 사용할 Asana 프로젝트를 정하고 프로젝트 멤버에 기존 봇을 초대합니다.', '수강생: 수정해도 되는 샘플 태스크를 1건 이상 만들고 프로젝트 URL 또는 Project GID만 워크북에 입력합니다.'],
    terms: [['Project GID', 'Asana 프로젝트를 API에서 식별하는 고유 숫자 ID입니다.'], ['미리보기', '외부 도구에 쓰기 전에 사람이 결과를 확인하는 화면입니다.']],
    steps: ['Asana 프로젝트의 멤버 메뉴에서 봇을 초대합니다.', '프로젝트 URL 또는 GID를 입력합니다.', '수정할 태스크 불러오기 버튼으로 기존 값을 가져옵니다.', '이름·설명·마감일·완료 상태를 워크북에서 고칩니다.', '수정 전후 미리보기를 확인한 뒤 같은 태스크에 저장합니다.', '403·project not found가 나오면 봇 초대와 프로젝트 접근 범위를 다시 확인합니다.'],
  },
  s3config: {
    summary: '토큰의 실제 값은 보지 않고, 운영자 서버에 연결이 준비됐는지만 확인하는 단계입니다.',
    setup: ['운영자: Vercel Production에 ASANA_TOKEN_BOT·NOTION_TOKEN·SLACK_BOT_TOKEN·SLACK_SIGNING_SECRET을 설정합니다.', '운영자: Slack 이벤트를 워크북 수신함과 Supabase에 저장하려면 SUPABASE_SERVICE_ROLE_KEY도 서버에만 설정합니다.', '수강생: Project GID·Page ID·Channel ID·필요하면 Slack User ID만 입력합니다. 토큰과 Request URL은 입력하지 않습니다.', 'Slack Request URL은 운영자가 제공하는 https://ax-lecture-workbook.vercel.app/api/slack/events 를 Slack 앱 설정에 등록합니다.'],
    terms: [['토큰', '서비스에 접근할 수 있게 해주는 비밀 열쇠입니다. 화면이나 프롬프트에 적지 않습니다.'], ['환경변수', '토큰을 서버 설정에 보관하는 이름입니다.']],
    steps: ['운영자가 Vercel 환경변수를 Production에 저장합니다.', '환경변수를 새로 넣거나 바꿨다면 다시 배포합니다.', '수강생은 연결할 대상 ID만 워크북에 저장합니다.', '토큰 값이 화면·프롬프트·워크북 답변에 노출되지 않는지 확인합니다.'],
  },
  s3notion: {
    summary: 'Notion 앱을 「AX 실습장」 복제본에 연결한 뒤 기존 문단을 가져와 수정하고, 같은 블록에 저장하는 실습입니다.',
    setup: ['운영자: Vercel Production에 NOTION_TOKEN이 설정되어 있고 앱에 Read content와 Update content 권한이 있어야 합니다.', '강사: 원본 회의록·수정 실습 문단·결과 기록 영역이 있는 「AX 실습장」 템플릿을 미리 배포합니다.', '수강생: 템플릿을 복제하고 페이지 오른쪽 위 ··· → 연결 추가에서 기존 앱을 선택한 뒤 Page ID를 입력합니다.'],
    terms: [['Page ID', 'Notion 페이지를 API에서 식별하는 ID입니다. URL 안에 들어 있거나 URL에서 확인할 수 있습니다.'], ['연결 추가', '페이지의 권한 메뉴에서 기존 앱이 이 페이지를 읽고 수정하도록 허용하는 절차입니다.']],
    steps: ['「AX 실습장」을 내 페이지로 복제합니다.', '페이지 오른쪽 위 ··· → 연결 추가에서 기존 앱을 선택합니다.', '페이지 URL 또는 ID를 입력합니다.', '수정할 문단 불러오기 버튼으로 block ID와 기존 문장을 가져옵니다.', '수정 전후 미리보기를 확인한 뒤 같은 Notion 블록에 저장합니다.', 'object_not_found·unauthorized가 나오면 앱의 Update content 권한과 페이지 연결을 다시 확인합니다.'],
  },
  s3slack_send: {
    summary: '봇이 지정한 Slack 채널에 메시지를 보내고, 워크북에서 고친 문구를 같은 메시지에 다시 저장하는 실습입니다.',
    setup: ['운영자: Slack 앱 OAuth & Permissions의 Bot Token Scopes에 chat:write를 추가합니다.', '개인 DM 실습까지 하려면 conversations.open을 위한 im:write도 추가하고, 권한을 바꾼 뒤 Slack 앱을 Workspace에 다시 설치합니다.', '수강생: 공개·비공개 채널에 봇을 초대하고 C로 시작하는 Channel ID를 준비합니다. 개인 DM은 U로 시작하는 Slack User ID를 사용합니다.'],
    terms: [['Channel ID', 'Slack 채널을 API에서 식별하는 C로 시작하는 ID입니다.'], ['chat.postMessage', 'Slack 채널이나 DM에 메시지를 보내는 API 동작입니다.']],
    steps: ['Slack 앱 권한을 추가했다면 Workspace에 다시 설치합니다.', '봇을 대상 채널에 초대하거나 DM 대상 User ID를 확인합니다.', '메시지를 미리 본 뒤 확인하고 전송합니다.', '워크북에서 문구를 고친 뒤 같은 channel과 ts로 수정 저장합니다.', '봇이 작성한 메시지만 수정할 수 있으며 cant_update_message가 나오면 작성자를 확인합니다.', 'not_in_channel·missing_scope가 나오면 초대와 권한을 다시 확인합니다.'],
  },
  s3slack_event: {
    summary: 'Slack에서 작성한 메시지가 Vercel 웹훅을 거쳐 Supabase 수신함에 들어오는 흐름을 확인합니다.',
    setup: ['운영자: Vercel Production에 SLACK_SIGNING_SECRET을 설정합니다. 이벤트를 Supabase에 저장하려면 SUPABASE_SERVICE_ROLE_KEY도 필요합니다.', 'Slack 앱: Event Subscriptions를 On으로 켜고 Request URL에 https://ax-lecture-workbook.vercel.app/api/slack/events 를 입력합니다.', 'Slack 앱: Verified가 되면 대상에 맞는 Bot Event만 추가합니다 — 공개 채널은 message.channels, 비공개 채널은 message.groups, 앱과의 DM은 message.im입니다.', 'Slack 앱: 이벤트 종류에 맞는 history 권한을 추가하고 권한을 바꿨다면 앱을 Workspace에 다시 설치합니다.', '수강생: 연결 준비에 적은 Channel ID와 같은 채널에서 테스트합니다. Request URL은 수강생별로 적는 값이 아닙니다.'],
    terms: [['웹훅', '어떤 일이 발생했을 때 다른 시스템의 URL로 자동 알림을 보내는 방식입니다.'], ['Request URL', 'Slack이 이벤트를 POST로 보내는 공개 서버 주소입니다.'], ['challenge', 'Slack이 URL의 소유권을 확인할 때 보내는 테스트 문자열입니다.'], ['event_callback', '실제 메시지 이벤트가 도착했을 때 사용하는 Slack 이벤트 포장 형식입니다.'], ['서명 검증', '요청 헤더와 서버의 Signing Secret으로 진짜 Slack 요청인지 확인하는 절차입니다.']],
    steps: ['Event Subscriptions를 켜고 Request URL을 등록합니다.', 'Verified 표시를 확인한 뒤 대상 Bot Event와 권한을 맞춥니다.', '봇을 대상 채널에 초대한 뒤 사람이 Slack 채널에 AX-WEBHOOK-TEST를 직접 작성합니다.', '워크북 3회차 B. Slack에서 받기 카드에서 channel_id·text·event_ts·작성자 ID를 확인합니다.', 'A 카드에서 봇이 보낸 메시지나 subtype 메시지가 무시되었다면 정상적인 중복 방지인지 확인합니다.'],
  },
  s3recipe: {
    summary: '한 번 성공한 연결을 다음 사람도 반복할 수 있도록 원본·권한·목적지·검수 절차로 정리합니다.',
    terms: [['연결 레시피', '업무 자동화를 다시 실행하기 위한 재현 가능한 설명서입니다.'], ['환경변수', '토큰처럼 코드에 직접 쓰지 않고 서버 설정에 보관하는 값입니다.']],
    steps: ['원본과 범위를 적습니다.', '필요한 권한과 ID를 적되 토큰 값은 쓰지 않습니다.', '실패 시 대체 경로와 사람 확인 지점을 남깁니다.'],
  },
  s3flow: {
    summary: '같은 원본도 도착지에 따라 실행 태스크·기록·짧은 알림으로 모양을 바꿔야 한다는 실습입니다.',
    terms: [['목적지', '결과가 최종적으로 도착하는 도구나 채널입니다.'], ['공개 범위', '누가 그 결과를 볼 수 있는지 정하는 조건입니다.']],
    steps: ['원본 필드를 먼저 확인합니다.', 'Asana·Notion·Slack용 결과를 각각 작성합니다.', '사람이 확인해야 할 담당자·마감일·공개 범위를 표시합니다.'],
  },
  s4inbox: {
    summary: '파일을 바로 옮기지 않고, 반복되는 이름·확장자·위치를 관찰해 정리 규칙을 제안받습니다.',
    terms: [['패턴', '비슷한 파일에서 반복되는 이름·확장자·날짜의 특징입니다.'], ['판단 필요', '자동화 규칙으로 확정하기 전에 사람이 봐야 하는 파일입니다.']],
    steps: ['파일 목록을 읽기 전용으로 확인합니다.', '반복 패턴과 예외를 나눕니다.', '이동은 하지 않고 규칙안만 먼저 검토합니다.'],
  },
  s4daily: {
    summary: '오늘의 작업 흔적을 근거가 있는 일일 로그로 묶어, 다음 업무의 시작점으로 남깁니다.',
    terms: [['작업 흔적', '수정된 파일·받은 자료·변경된 페이지처럼 실제로 확인되는 기록입니다.'], ['추측 금지', '기억이나 그럴듯한 내용을 사실처럼 추가하지 않는 원칙입니다.']],
    steps: ['확인 가능한 흔적을 모읍니다.', '오늘 한 일·결정·내일 할 일로 나눕니다.', '근거가 없는 내용은 기록하지 않습니다.'],
  },
  s4desktop: {
    summary: '파일 자동정리는 바로 이동시키지 않고 관찰·제안·승인·실행 순서로 안전하게 설계합니다.',
    terms: [['Dry Run', '실제로 파일을 옮기지 않고, 옮길 결과만 미리 보여주는 시험 실행입니다.'], ['undo', '잘못 옮겼을 때 원래 위치로 되돌리는 방법입니다.']],
    steps: ['파일 목록과 반복 패턴을 먼저 관찰합니다.', '이동 규칙과 예외를 제안합니다.', 'Dry Run을 확인하고 승인한 뒤에만 이동합니다.'],
  },
};

// 막혔을 때 쓰는 문장 (프롬프트 카드 페이지 하단)
export const RESCUE = [
  ['엉뚱한 걸 가져왔다', '어디서 가져온 건지 출처를 먼저 알려줘'],
  ['결과가 너무 길다', '핵심만 5줄로 줄여줘'],
  ['형식이 매번 다르다', '지금 형식을 템플릿으로 고정하고, 앞으로 이 형식으로만 답해'],
  ['지어낸 것 같다', '근거가 된 원문 문장을 각 항목마다 붙여줘'],
  ['실수로 뭔가 썼다', '방금 만든 항목들 목록을 보여줘 → 노션에서 직접 삭제'],
  ['아예 접근이 안 된다', '커넥터 연결 상태 확인 → 안 되면 파일 다운로드 후 업로드'],
];

// ── 진행률 계산용: 필수 항목 키 목록 ─────────────────────────
export function requiredKeys(scope) {
  const out = [];
  if (scope === 'setup' || scope === 'all') {
    for (const g of SETUP.groups)
      for (const f of g.fields) if (f.kind === 'check' || f.required) out.push(f.key);
  }
  if (scope === 'clinic' || scope === 'all') {
    for (const g of CLINIC.groups)
      for (const f of g.fields) if (f.required) out.push(f.key);
  }
  if (typeof scope === 'number') {
    const s = SESSIONS.find(x => x.n === scope);
    if (s) for (const b of s.blocks) if (b.type === 'field' && b.required) out.push(b.key);
  }
  if (scope === 'all') {
    for (const s of SESSIONS)
      for (const b of s.blocks) if (b.type === 'field' && b.required) out.push(b.key);
  }
  return out;
}
