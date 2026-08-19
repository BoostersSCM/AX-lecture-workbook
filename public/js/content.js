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
  promise: '흩어진 도구와 데이터를 연결해, 일의 흐름을 다시 설계합니다.',
  intro: '도구 하나를 잘 쓰는 법이 아니라, 원본 데이터가 사람이 보는 채널·페이지·태스크로 이어지는 구조를 설계합니다.',
};

export const AX_FLOW = [
  { n: '01', verb: '긁기', en: 'COLLECT', title: '원본이 있는 곳을 연결합니다', text: '노션 페이지, 슬랙 채널·DM, 드라이브 파일을 복붙하지 않고 AI가 직접 읽게 합니다.', tool: 'Notion · Slack · Drive', tone: 'teal' },
  { n: '02', verb: '정하기', en: 'STRUCTURE', title: '양식을 먼저 정합니다', text: '근거 문장, 담당자, 상태, 마감일처럼 결과가 들어갈 칸을 미리 정해 흔들림을 줄입니다.', tool: 'Database · Page · Task', tone: 'brass' },
  { n: '03', verb: '만들기', en: 'GENERATE', title: '반복 가능한 봇을 만듭니다', text: '정리된 데이터에서 주간 리포트, 회의 후속조치, 콘텐츠를 같은 규칙으로 생성합니다.', tool: 'Bot · Recipe · Prompt', tone: 'coral' },
  { n: '04', verb: '보내기', en: 'DELIVER', title: '사람이 보는 곳까지 보냅니다', text: '특정 페이지에 기록하고, Asana 프로젝트에 태스크를 만들고, Slack 채널에 초안을 배달합니다.', tool: 'Slack channel · Asana · Page', tone: 'ink' },
];

export const INTEGRATIONS = [
  { name: 'Notion', eyebrow: '원본 / 기록', title: '특정 페이지를 읽고 쓰기', text: '회의록을 읽어 액션아이템 DB에 넣거나, 만들어진 결과를 팀 페이지에 쌓습니다.', icon: 'N', tone: 'notion' },
  { name: 'Slack', eyebrow: '대화 / 전달', title: '채널과 DM을 목적지로 쓰기', text: '채널의 맥락을 읽고, 나에게 먼저 리허설한 뒤 #ax-실습 같은 채널에 초안을 보냅니다.', icon: '#', tone: 'slack' },
  { name: 'Asana', eyebrow: '실행 / 추적', title: '프로젝트와 태스크로 넘기기', text: '회의의 결정사항을 프로젝트 안 태스크로 만들고, 담당자·기한·상태까지 연결합니다.', icon: 'A', tone: 'asana' },
  { name: 'Drive', eyebrow: '파일 / 자료', title: '파일에서 필요한 것만 꺼내기', text: '여러 문서와 폴더를 읽어 요약·비교하고, 다음 행동이 보이도록 다시 정리합니다.', icon: '↗', tone: 'drive' },
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

// ── 사전 세팅 체크리스트 ──────────────────────────────────────
export const SETUP = {
  title: '사전 세팅',
  intro: '첫 수업 전에 끝내주세요. 10분이면 됩니다. 이게 안 되어 있으면 1회차에 실습을 못 합니다.',
  groups: [
    {
      name: '1. AI 도구 로그인',
      fields: [
        { key: 'setup.login', kind: 'check', label: '사내에서 쓰는 AI 도구에 **회사 계정**으로 로그인했다', hint: '개인 계정에는 회사 노션·슬랙을 연결할 수 없습니다.' },
      ]
    },
    {
      name: '2. 커넥터 연결',
      fields: [
        { key: 'setup.notion', kind: 'check', label: '노션 연결 — 접근 범위에 내가 보는 팀 페이지를 포함' },
        { key: 'setup.slack',  kind: 'check', label: '슬랙 연결' },
        { key: 'setup.asana',  kind: 'check', label: '아사나 연결 — 실습 프로젝트 또는 태스크 접근 권한 포함' },
        { key: 'setup.drive',  kind: 'check', label: '구글 드라이브 연결' },
        { key: 'setup.verify', kind: 'check', label: '연결 확인 프롬프트가 통과했다', hint: '아래 프롬프트를 복사해서 물어보고, 페이지 제목이 나오면 성공입니다.' },
      ]
    },
    {
      name: '3. 실습장 접근',
      fields: [
        { key: 'setup.playground', kind: 'check', label: '노션 「AX 실습장」 페이지가 열린다' },
        { key: 'setup.db',         kind: 'check', label: '그 안의 「내 업무(연습용)」 DB가 보인다' },
        { key: 'setup.minutes',    kind: 'check', label: '샘플 회의록 3건이 보인다', hint: '부스팅데이 준비 · 팝업스토어 킥오프 · 계정 권한 정비' },
        { key: 'setup.channel',    kind: 'check', label: '슬랙 실습 채널에 들어와 있다' },
        { key: 'setup.asana_project', kind: 'check', label: '아사나 실습 프로젝트 또는 샘플 태스크가 열린다', hint: '연동이 막힌 경우 3회차는 노션 페이지에 초안을 만드는 방식으로 진행할 수 있습니다.' },
        { key: 'setup.persisted', kind: 'check', label: '워크북에 짧은 답을 적고 새로고침해도 다시 보인다', hint: '내 입력이 Supabase entries에 저장되고 다시 읽히는지 확인합니다.' },
      ]
    },
    {
      name: '4. 노트북',
      fields: [
        { key: 'setup.laptop', kind: 'check', label: '노트북 + 충전기 지참, 사내 와이파이 확인' },
      ]
    },
    {
      name: '5. 미리 생각해 오기',
      fields: [
        { key: 'setup.think', kind: 'textarea', rows: 3, required: true,
          label: '내가 매주 반복하는 업무 중, 없어졌으면 하는 것 하나는?',
          hint: '1회차 체크인에서 물어봅니다. 4회차에 이걸 실제로 자동화합니다. 한 줄이면 충분합니다.' },
        { key: 'setup.trouble', kind: 'textarea', rows: 2,
          label: '연결이 안 되거나 막힌 것이 있다면 적어주세요',
          hint: '강사가 강의 전에 보고 미리 준비합니다.' },
      ]
    },
  ],
  verifyPrompt: '노션에서 「부스터스 크루 소개」 페이지를 찾아서, 제목만 알려줘.',
  planB: '커넥터 연결이 끝내 안 되어도 수업은 들을 수 있습니다. 노션 페이지를 PDF/Markdown으로 내보내서 가져오시면 파일을 직접 올려 같은 실습을 합니다.',
};

// ── 회차별 워크북 ────────────────────────────────────────────
export const SESSIONS = [
  {
    n: 1,
    title: 'AI에게 우리 팀을 소개하는 날',
    tag: '연결',
    goal: '내 권한 안에서 AI가 우리 팀의 원본을 읽게 합니다. 첫날은 쓰지 않고, 연결의 감각만 익힙니다.',
    blocks: [
      { type: 'note', text: '오늘 소재는 업무가 아니라 행사 콘텐츠입니다. 부담 0, 실패해도 손해 0. 첫 성공 경험을 만드는 게 목표입니다.' },
      { type: 'visual', id: 'connector' },
      { type: 'note', text: '**비유를 기억하세요.** 커넥터는 AI에게 회사 전체 열쇠를 주는 일이 아니라, 내 계정으로 열 수 있는 방만 함께 둘러보는 일입니다.' },

      { type: 'field', key: 's1.checkin', kind: 'textarea', rows: 2, required: true,
        label: '체크인 — 내가 매주 반복하는 업무 중 없어졌으면 하는 것',
        hint: '4회차에 이걸 실제로 설계합니다.' },

      { type: 'head', text: '실습 A — WHO AM I 15문항' },
      { type: 'prompt', id: 's1a' },
      { type: 'field', key: 's1.a', kind: 'textarea', rows: 6, required: true,
        label: '결과를 붙여넣으세요',
        hint: '전부 붙일 필요 없습니다. 잘 나온 3문항 정도면 충분합니다.' },

      { type: 'head', text: '실습 B — AI 예측 퀴즈' },
      { type: 'note', text: 'A는 "지어내면 안 되는" 과제였습니다. B는 반대로 **지어내는 게 목적**입니다.' },
      { type: 'prompt', id: 's1b' },
      { type: 'field', key: 's1.b', kind: 'textarea', rows: 5,
        label: '결과를 붙여넣으세요' },
      { type: 'field', key: 's1.b_insight', kind: 'textarea', rows: 3, required: true,
        label: '★ AI가 지어낸 것 중 가장 그럴듯했던 것은?',
        hint: '오늘은 이게 재미입니다. 그런데 다음 주에 회의록으로 같은 일이 벌어지면 어떻게 될까요? 그 답을 2회차에 봅니다.' },

      { type: 'head', text: '실습 C — 크로스 퀴즈' },
      { type: 'prompt', id: 's1c' },
      { type: 'field', key: 's1.c', kind: 'textarea', rows: 5,
        label: '결과를 붙여넣으세요 (시간이 없으면 비워두고 넘어가세요)' },

      { type: 'head', text: '정리' },
      { type: 'field', key: 's1.stuck', kind: 'textarea', rows: 2,
        label: '오늘 막혔던 지점이 있다면' },
      { type: 'field', key: 's1.homework', kind: 'textarea', rows: 3,
        label: '숙제 — 내 팀 노션에서 "AI에게 읽히면 편할 것 같은 페이지" 3개',
        hint: '페이지 이름만 적으면 됩니다.' },
    ],
  },

  {
    n: 2,
    title: '흩어진 기록에 구조를 더하는 날',
    tag: '구조',
    goal: '근거·담당자·기한을 먼저 정하고, 회의록을 다시 꺼내 쓸 수 있는 업무 데이터로 바꿉니다.',
    blocks: [
      { type: 'note', text: '실습은 각자 복제한 「내 업무(연습용)」 DB에서만 합니다. 실제 팀 DB에는 쓰지 않습니다.' },
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

      { type: 'head', text: '실습 1 — 규칙 없이 vs 규칙 넣고' },
      { type: 'prompt', id: 's2raw' },
      { type: 'field', key: 's2.count_before', kind: 'number', required: true,
        label: '규칙 없이 돌렸을 때 나온 액션아이템 개수', hint: '보통 20개가 넘습니다.' },
      { type: 'prompt', id: 's2rules' },
      { type: 'field', key: 's2.count_after', kind: 'number', required: true,
        label: '규칙을 넣고 다시 돌렸을 때 개수', hint: '13~15개가 적정입니다.' },
      { type: 'field', key: 's2.diff', kind: 'textarea', rows: 3, required: true,
        label: '사라진 항목 중 하나를 골라, 왜 액션아이템이 아니었는지 적어주세요',
        hint: '회의록 원문에서 근거를 찾아보세요. "아직 정해진 건 없습니다" 같은 문장이 있을 겁니다.' },

      { type: 'head', text: '실습 2 — 근거문장 검증' },
      { type: 'prompt', id: 's2verify' },
      { type: 'field', key: 's2.fabricated', kind: 'textarea', rows: 3,
        label: '근거를 못 찾아서 지운 행이 있다면 적어주세요',
        hint: '이게 AI가 지어낸 행입니다. 1회차 B 과제에서 재미로 봤던 그것입니다.' },

      { type: 'head', text: '실습 3 — 등재' },
      { type: 'prompt', id: 's2insert' },
      { type: 'field', key: 's2.entered', kind: 'number',
        label: '실제로 등재한 항목 수' },
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
    title: '한 번의 입력으로 여러 곳에 보내는 날',
    tag: '발행',
    goal: '하나의 DB를 Slack 메시지·Notion 기록·Asana 태스크로 바꿔, 사람이 보는 곳까지 보냅니다.',
    blocks: [
      { type: 'note', text: '오늘 소재는 2회차에 각자 채운 「내 업무(연습용)」 DB입니다. 2회차를 못 끝내셨으면 실습장의 완성본을 복제해서 쓰세요.' },
      { type: 'visual', id: 'delivery' },
      { type: 'note', text: '**비유를 기억하세요.** 자동화는 한 번에 같은 메시지를 뿌리는 일이 아니라, 같은 원본을 목적지에 맞는 형태로 포장해 보내는 분류소입니다.' },

      { type: 'head', text: '실습 0 — DB가 워크플로우의 중간 허브가 된다' },
      { type: 'note', text: 'DB는 최종 목적지가 아니라 중간 허브입니다. `entries`에서 읽은 데이터를 사람이 보는 Slack 메시지로 만들고, 특정 Notion 페이지에 기록하거나 Asana 태스크로 넘길 수 있습니다.' },
      { type: 'prompt', id: 's3db' },
      { type: 'field', key: 's3.db_flow', kind: 'checks',
        label: 'DB에서 꺼낸 데이터를 어디까지 연결해봤나요?',
        options: ['Supabase entries에서 읽기', 'Slack DM 또는 채널 초안 만들기', '특정 Notion 페이지에 기록하기', 'Asana 프로젝트 태스크로 넘기기'] },

      { type: 'head', text: '실습 1 — 주간 요약' },
      { type: 'prompt', id: 's3collect' },
      { type: 'prompt', id: 's3summary' },
      { type: 'field', key: 's3.report', kind: 'textarea', rows: 8, required: true,
        label: '나온 리포트 초안을 붙여넣으세요' },

      { type: 'head', text: '실습 2 — 지연 사유는 사람이' },
      { type: 'note', text: '지연 사유는 데이터에 없습니다. AI가 쓰면 지어냅니다. **빈칸으로 받아서 내가 채웁니다.**' },
      { type: 'field', key: 's3.delay_by_me', kind: 'check',
        label: '지연 사유를 내가 직접 채웠다' },
      { type: 'field', key: 's3.delay_text', kind: 'textarea', rows: 3,
        label: '내가 채운 지연 사유 (하나만 예시로)' },

      { type: 'head', text: '실습 3 — 같은 결과, 세 가지 목적지' },
      { type: 'note', text: '같은 리포트라도 목적지에 따라 모양이 달라집니다. 나에게는 DM으로 리허설하고, 팀에는 슬랙 채널 초안으로, 실행할 일은 특정 노션 페이지나 아사나 프로젝트의 태스크로 보냅니다.' },
      { type: 'prompt', id: 's3slack' },
      { type: 'field', key: 's3.dm_sent', kind: 'check',
        label: '나 자신에게 DM으로 리허설 발송했다',
        hint: '채널 게시는 슬랙에서 직접 하세요. 자동 채널 발송은 이 강의 범위 밖입니다.' },
      { type: 'field', key: 's3.destinations', kind: 'checks',
        label: '내 봇의 목적지로 연결해본 것',
        options: ['내 Slack DM — 리허설', 'Slack #ax-실습 채널 — 최종 확인 후', '특정 Notion 페이지', 'Asana 프로젝트의 태스크'] },

      { type: 'head', text: '실습 4 — 레시피로 저장 ★' },
      { type: 'prompt', id: 's3recipe' },
      { type: 'field', key: 's3.recipe', kind: 'textarea', rows: 8, required: true,
        label: '완성된 레시피를 붙여넣으세요',
        hint: '다음 주에 이걸 붙여넣기만 하면 리포트가 나옵니다.' },
      { type: 'field', key: 's3.recipe_where', kind: 'text', required: true,
        label: '이 레시피를 어디에 저장하셨나요?',
        hint: '개인 노션 페이지, 메모장, 어디든 좋습니다. 다음 주 월요일에 찾을 수 있는 곳이면 됩니다.' },

      { type: 'head', text: '정리' },
      { type: 'field', key: 's3.homework', kind: 'check',
        label: '숙제 — 다음 주에 저장한 레시피로 리포트를 실제로 1회 발행한다' },
      { type: 'field', key: 's3.next_case', kind: 'textarea', rows: 2, required: true,
        label: '★ 4회차에 가져올 "내 업무" 하나를 지금 정해주세요',
        hint: '이게 없으면 4회차에 할 게 없습니다. 1회차 체크인에 적으신 것 그대로여도 됩니다.' },
    ],
  },

  {
    n: 4,
    title: '내 업무 옆에 AI 동료를 두는 날',
    tag: '정착',
    goal: '내 반복 업무와 파일 정리까지 연결해, 다음 주에도 다시 쓸 수 있는 자동화 설계서를 완성합니다.',
    blocks: [
      { type: 'head', text: '파트 1 — 개인 루틴' },
      { type: 'note', text: '지금까지는 회사 데이터라 승인이 필요했습니다. 이 세 개는 내 폴더, 내 기록입니다. 오늘 퇴근하고 바로 켤 수 있습니다.' },
      { type: 'visual', id: 'recipe' },
      { type: 'note', text: '**비유를 기억하세요.** 자동화 설계서는 요리 레시피와 같습니다. 재료·순서·검수·도착지를 적어야 다음 주에도 다시 만들 수 있습니다.' },
      { type: 'field', key: 's4.routines', kind: 'checks',
        label: '오늘 따라해본 것',
        options: ['수신함 정리 (주 20분)', '일일 로그 (매일 10분)', '주간 회고 (주 30분)'] },
      { type: 'prompt', id: 's4inbox' },
      { type: 'prompt', id: 's4daily' },
      { type: 'field', key: 's4.routine_note', kind: 'textarea', rows: 3,
        label: '해보니 어땠나요? 바로 쓸 만한가요?' },

      { type: 'head', text: '파트 2 — 케이스 클리닉' },
      { type: 'note', text: '설계서는 별도 페이지에서 작성합니다. 아래 버튼을 눌러 이동하세요.' },
      { type: 'link', href: '/clinic', text: '내 업무 자동화 설계서 작성하기 →' },

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
  title: '내 업무 자동화 설계서',
  intro: '작성 15분 → 2인 1조 상호 리뷰 10분. 짝은 다른 팀 사람으로 묶습니다.',
  groups: [
    {
      name: '0. 어떤 업무인가',
      fields: [
        { key: 'clinic.task', kind: 'textarea', rows: 2, required: true,
          label: '한 문장으로',
          hint: '예: 매주 금요일 팀 주간 진행상황을 정리해 팀 채널에 공유한다' },
        { key: 'clinic.min_per', kind: 'number', label: '1회에 걸리는 시간 (분)' },
        { key: 'clinic.times',   kind: 'number', label: '주당 횟수' },
        { key: 'clinic.freq_note', kind: 'note',
          text: '주 30분 미만이면 자동화보다 그냥 하는 게 빠를 수 있습니다. 솔직하게 적으세요.' },
      ]
    },
    {
      name: '1. 긁기 — 무엇을 어디서 읽는가',
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
        name: '2. 정하기 — 어떤 형식으로 담는가',
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
      name: '3. 만들기 — 어떤 결과물인가',
      fields: [
        { key: 'clinic.output', kind: 'checks', label: '결과물 형태',
          options: ['표 / 목록', '요약 글', '노션 DB 항목', '슬랙 메시지', '기타'] },
        { key: 'clinic.reader', kind: 'text', required: true, label: '읽는 사람은 누구인가' },
        { key: 'clinic.decision', kind: 'text', label: '그 사람이 이걸 보고 무엇을 판단해야 하나' },
      ]
    },
    {
      name: '4. 보내기 — 어디로 도착하는가',
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
      name: '5. 사람이 꼭 봐야 하는 지점',
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
      name: '6. 상호 리뷰 (2인 1조)',
      fields: [
        { key: 'clinic.review_note', kind: 'note',
          text: '짝에게 이 세 가지만 물어보세요. ① 이거 진짜 매주 하는 일 맞아요? ② 여기서 AI가 틀리면 누가 피해를 보나요? ③ 원본에 없는 값이 나오면 어떻게 되나요?' },
        { key: 'clinic.review', kind: 'textarea', rows: 4,
          label: '짝에게 받은 피드백' },
      ]
    },
    {
      name: '7. 다음 주에 할 첫 한 걸음',
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
    body: `노션에서 「부스터스 크루 소개」 페이지를 찾아서, 어떤 데이터베이스들이 들어 있는지
목록만 알려줘. 내용은 아직 읽지 마.`
  },

  s1a: {
    session: 1, title: 'A — WHO AM I 15문항',
    body: `노션 「부스터스 크루 소개」의 크루 프로필 데이터를 읽어줘.

그걸로 'WHO AM I' 퀴즈를 15문항 만들어줘. 규칙은 이렇게:

- 한 문항 = 힌트 3개 + 정답 1명
- 힌트는 어려운 것 → 쉬운 것 순서로. 힌트①은 3점, 힌트②는 2점, 힌트③은 1점.
- 힌트에 이름, 부서명 전체, 연락처는 절대 넣지 말 것
- 소개글에 없는 내용은 지어내지 말 것. 힌트 3개를 못 채우면 그 사람은 건너뛰기
- 정답은 이니셜로 표기 (예: 도OO)

출력은 [번호 / 힌트①(3점) / 힌트②(2점) / 힌트③(1점) / 정답] 표로.`
  },

  s1b: {
    session: 1, title: 'B — AI 예측 퀴즈 10인',
    note: '이번엔 반대로, 지어내게 시키는 과제입니다.',
    body: `같은 크루 소개 데이터를 보고, 이번엔 반대로 해줘.

'AI가 예측하는 이 사람' 퀴즈를 10인분 만들어줘.
자기소개에 적혀 있지 않은 것을, 적혀 있는 내용으로부터 추측해서 쓰는 거야.

- 한 사람당: 소속 + "이 사람은 이럴 것 같습니다" 예측 3~4줄 + 정답(이니셜) + 재미 포인트
- 예측은 소개글의 단서에서 출발하되, 소개글에 없는 영역으로 확장할 것
- 무례하거나 외모·나이·가족에 대한 추측은 금지

출력은 [번호 / 소속 / AI의 예측 / 정답 / 재미 포인트] 표로.`
  },

  s1c: {
    session: 1, title: 'C — 크로스 퀴즈 10문항',
    body: `크루 소개 데이터 전체를 보고, 두 사람 이상의 '숨은 공통점'을 찾아줘.

- 한 문항 = 질문 + 정답(공통점과 해당 인물들)
- 억지로 만들지 말 것. 공통점마다 근거가 된 소개글 문장을 함께 붙여줘
- 근거를 못 붙이는 항목은 아예 빼

출력은 [번호 / 질문 / 정답(공통점·인물) / 근거 문장] 표로.`
  },

  s2raw: {
    session: 2, title: '1 — 규칙 없이 먼저 (일부러)',
    note: '이렇게 하면 20개가 넘게 나옵니다. 그게 오늘의 출발점입니다.',
    body: `「AX 실습장」의 샘플 회의록 3건 읽고 액션아이템 뽑아줘`
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
    session: 2, title: '2 — 규칙을 넣고 다시',
    body: `위 회의록 3건을 읽고, 액션아이템만 뽑아서 표로 만들어줘.

표의 열은 「내 업무(연습용)」 DB 형식에 맞춰서:
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

중요한 규칙 두 개:
1. 추측해서 채우지 마라. 모르면 빈칸으로 두라.
   근거문장을 못 채우는 항목은 아예 표에 넣지 마라.
2. 논의만 되고 결정되지 않은 것은 액션아이템이 아니다.
   "검토해보겠다", "다음에 얘기하자", "아직 정해진 건 없다"로 끝난 항목은 빼라.`
  },

  s2verify: {
    session: 2, title: '3 — 근거문장 검증',
    note: '오늘 배우는 유일한 기술입니다. 근거를 같이 내놓게 하고, 근거를 확인한다.',
    body: `방금 만든 표에서, 근거문장이 회의록에 실제로 있는지 다시 확인해줘.
원문에서 못 찾은 행이 있으면 그 행만 따로 알려줘.`
  },

  s2insert: {
    session: 2, title: '4 — 등재 (미리보기 → 1건 → 나머지)',
    body: `이제 이 항목들을 노션 [내가 복제한 「내 업무(연습용)」] DB에 등재할 거야.

먼저 1건만 등재해줘. 어떤 항목을 어떤 값으로 넣을지 먼저 보여주고,
내가 "진행"이라고 하면 그때 실제로 등재해.`
  },

  s3collect: {
    session: 3, title: '1 — 이번 주 데이터 긁기',
    body: `노션 「내 업무(연습용)」에서 다음을 가져와줘:

- 이번 주에 완료된 항목
- 현재 진행 중인 항목
- 마감일이 지났는데 완료가 아닌 항목

각각 작업 이름 / 담당자 / 마감일 / 상태로 표를 나눠서 보여줘.`
  },

  s3db: {
    session: 3, title: '0 — DB에서 목적지까지',
    body: `Supabase entries에서 반복해서 쌓이는 데이터를 업무 봇의 중간 재료로 쓴다고 가정해줘.

다음 흐름을 표로 설계해줘:
원본 행 → 필요한 필드만 추리기 → 목적지별 형식 변환 → 사람이 확인할 지점

목적지는 세 가지로 나눠:
- Slack DM 또는 채널 초안
- 특정 Notion 페이지
- Asana 프로젝트의 태스크

각 목적지에 어떤 필드가 필요하고, 어디서 사람이 최종 확인해야 하는지도 적어줘.`
  },

  s3summary: {
    session: 3, title: '2 — 주간 요약',
    note: '지연 사유를 빈칸으로 받는 것이 핵심입니다.',
    body: `위 데이터로 주간 업무 리포트 초안을 써줘. 구성은:

1. 이번 주 완료 (건수 + 목록, 한 줄씩)
2. 진행 중 (건수 + 목록, 예상 완료 시점 있으면 같이)
3. 지연 (건수 + 목록) — 각 건마다 '지연 사유'와 '다음 액션' 칸을 비워두고 만들어줘.
   사유는 데이터에 없으니 내가 채운다.

읽는 사람은 팀장이고, 30초 안에 상황 판단이 되어야 해.
숫자 없는 형용사("많이", "잘")는 쓰지 마.`
  },

  s3slack: {
    session: 3, title: '3 — 슬랙 문체 변환 + 리허설 발송',
    body: `이 리포트를 슬랙에 올릴 형태로 바꿔줘.

- 첫 줄은 제목 한 줄 (주차 + 팀명)
- 항목은 불릿으로, 각 줄 40자 이내
- 완료/진행/지연에 각각 이모지 하나씩
- 지연 항목의 담당자는 멘션 자리를 @이름 형태로 남겨줘
- 전체 15줄 이내

그리고 이 내용을 슬랙에서 나 자신에게 DM으로 보내줘.
보내기 전에 최종 문구를 한 번 더 보여줘.`
  },

  s3recipe: {
    session: 3, title: '4 — 레시피로 저장',
    body: `방금 우리가 한 1~3단계 전체를, 다음 주에 내가 한 번에 다시 쓸 수 있는
프롬프트 한 덩어리로 정리해줘.

날짜처럼 매주 바뀌는 부분은 [이번 주] 같은 대괄호 자리표시자로 남겨줘.`
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
