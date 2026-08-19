# AX 워크북

부스터스 사내 AX 강의 **「업무를 연결하는 AI」**의 참가자용 워크북입니다.

참가자는 회사 구글 계정으로 로그인해 회차별 실습을 기록하고, 마지막에 「내 업무 연결 설계서」를 작성합니다.
기록은 **본인과 강사만** 볼 수 있습니다.

**저장 정책** — 회차(1~4)와 설계서 페이지는 자동 저장하지 않습니다. 입력은 로컬 초안(localStorage)에 쌓이고,
화면 하단 저장 바의 **[모두 저장]** 버튼이 한 번의 일괄 upsert로 DB에 보냅니다(타이핑마다 DB에 쓰지 않음).
저장 없이 떠나려 하면 브라우저가 경고하고, 초안은 다음 방문 때 입력칸에 복원됩니다.
연결 준비(`/setup`) 페이지의 체크리스트는 예외적으로 자동 저장(디바운스)을 유지합니다.
연동 실습의 결과 저장 버튼(영수증)은 모드와 무관하게 즉시 저장됩니다.

- 운영: Vercel + Supabase
- 강의안 원본: [`docs/`](docs/) — 커리큘럼, 회차별 진행안, 프롬프트 카드, 사내봇 연결값, 샘플 회의록

---

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 홈 — 전체 진행률, 회차 카드 (잠긴 회차는 🔒) |
| `/onboarding` | 첫 로그인 가입 화면 — **기수(차수) + 소속 팀** 입력. 완료 전에는 다른 페이지로 못 갑니다 |
| `/setup` | 연결 준비 체크리스트 (강의 전 배포) |
| `/session?n=1..4` | 회차별 워크북 — **강사가 기수별로 연 회차만** 접근 가능 |
| `/clinic` | 내 업무 연결 설계서 (4회차와 함께 열림) |
| `/prompts` | 프롬프트 카드 — 연동 변환 레시피·초보자 도움말·복사 버튼 |
| `/my` | 마이페이지 — 내 정보(팀·기수) 수정, 내 기록 열람, md 내보내기 |
| `/admin` | 강사 전용 — **기수별 회차 개방 관리**, 참가자 진행 현황·답변 열람 |

Vercel API:

- `/api/integrations/asana/tasks` — 인증된 Asana 프로젝트 태스크 읽기·생성·기존 태스크 수정
- `/api/integrations/notion/page` — 인증된 Notion 페이지·블록 읽기·문단 추가·기존 블록 수정
- `/api/integrations/slack/send` — 인증된 Slack 채널·DM 발송 및 봇 메시지 수정
- `/api/slack/events` — Slack Events API 수신·서명 검증 (채널 범위는 각 사용자의 워크북 설정으로 관리)

실습의 기본 동작은 `SaaS에서 가져오기 → 워크북에서 수정 → 변경 전후 검토 → 같은 SaaS 항목에 저장 → 다시 읽기`입니다. 프롬프트 카드는 변환 규칙을 참고하는 자료이고, 수강생은 별도 MCP 설정 없이 워크북에서 기존 Asana 태스크·Notion 문단·Slack 봇 메시지를 수정합니다. 외부 도구에 쓰는 동작은 미리보기 후 한 번 더 확인해야 실행됩니다.

「AX 실습장」은 강사가 사전에 만드는 Notion 템플릿입니다. 원본 회의록·수정 실습 문단·결과 기록 영역을 포함하고, 수강생은 각자 복제한 페이지에 기존 Notion 앱을 연결합니다. 앱에는 Read content와 Update content 권한이 필요합니다.

3회차 Slack 실습은 `A. Slack으로 보내기`와 `B. Slack에서 받기`로 분리됩니다. A 카드에서는 보낼 메시지를 직접 작성하고 미리보기 후 봇으로 전송합니다. B 카드에서는 사람이 Slack 채널에 직접 쓴 메시지를 Events API로 받아 확인합니다. 수신 이벤트는 `SUPABASE_SERVICE_ROLE_KEY`가 설정되면 `slack_events`에 저장되고, 수강생이 지정한 Channel ID 범위만 표시됩니다. 이 키는 Vercel 서버에만 둡니다.

---

## 기술 스택

boosters-ax의 구조를 그대로 따랐습니다.

- **프론트**: 순수 HTML5 + ES Modules + CSS. **프레임워크·빌드·번들러 없음**
- **외부 라이브러리는 ESM CDN으로만**: `@supabase/supabase-js@2` (esm.sh). 클라이언트에 npm 패키지 추가 금지
- **DB·인증**: Supabase (PostgreSQL + RLS + Google OAuth). 클라이언트가 RLS에 의존해 직접 쿼리
- **호스팅**: Vercel. `vercel.json`의 buildCommand 한 줄이 빌드의 전부 (`public/env.js` 생성)

데이터 모델은 테이블 세 개입니다.

```
profiles(id, email, name, team, cohort, role)  -- cohort: 기수 / role: member | instructor
entries(user_id, item_key, value)              -- 워크북의 모든 입력
slack_events(event_id, channel_id, ...)        -- 3회차 B실습: Events API로 받은 Slack 메시지
course_settings(key, value)                    -- 기수별 회차 개방: open_sessions_by_cohort = {"1":[1,2]}
```

`entries`가 key-value인 이유: **문항을 추가·수정해도 DB 마이그레이션이 필요 없게** 하기 위해서입니다.
문항 정의는 전부 [`public/js/content.js`](public/js/content.js) 한 파일에 있습니다.

---

## 셋업

### 1. Supabase

1. 프로젝트 생성 (현재 연결: `https://xxusvukjjxmcnmbvwybz.supabase.co`)
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행
3. **이미 운영 중인 DB라면** [`supabase/002_course_settings.sql`](supabase/002_course_settings.sql)을 실행
   — `profiles.cohort` 컬럼과 `course_settings` 테이블을 추가합니다.
   ⚠️ **이 SQL 없이 새 코드를 배포하면 수강생이 가입(기수 선택)에서 막힙니다. 배포보다 먼저 실행하세요.**
4. Google OAuth 연결 — 아래 [Google OAuth 설정](#2-google-oauth-설정) 참고

### 기수·회차 개방 운영

- 참가자는 첫 로그인 때 `/onboarding`에서 **기수(1기, 2기, …)와 팀**을 입력합니다
- 강사는 `/admin` 상단 **기수별 회차 개방**에서 기수를 고르고 회차 토글을 켭니다
  (새 기수 시작은 `＋ 기수` — 만들면 1회차가 열린 상태로 시작)
- **강의일 예약 개방** — 회차 카드에 강의일(KST)을 등록하면 **하루 전 0시(KST)**부터
  자동으로 열립니다(예습용). 최종 개방 = 수동 토글 ∪ 예약 도달.
  예약으로 열린 회차를 잠그려면 날짜를 지우세요. 판정은 브라우저 시계 기준(KST 환산)이라
  수강생이 PC 시계를 조작하면 이르게 열 수 있지만, 학습 게이트 목적에는 충분합니다
- 수강생은 자기 기수에 열린 회차만 들어올 수 있고, 잠긴 회차는 🔒 잠금 화면을 봅니다.
  강사 계정은 항상 전부 열려 있습니다
- 설정 테이블이 없으면(002 미실행) 전부 열림으로 동작하고 `/admin`에 경고가 뜹니다

### 2. Google OAuth 설정

**GCP 프로젝트는 boosters.kr 조직 소속으로 만듭니다.** 그러면 동의 화면을 Internal로 둘 수 있고,
구글이 조직 계정만 통과시켜 도메인 제한이 구글 단계에서 먼저 걸립니다.

**① 프로젝트 생성** — [console.cloud.google.com](https://console.cloud.google.com) → 새 프로젝트
- 이름 `ax-workbook`, **위치(조직)가 `boosters.kr`로 잡히는지 확인**

**② 동의 화면** — `APIs & Services` → `OAuth consent screen` (최근 UI는 *Google Auth Platform → Audience*)
- User Type: **Internal**
- 앱 이름 `AX 워크북`, 지원 이메일·개발자 연락처만 채우고 저장
- **스코프는 추가하지 않습니다.** Supabase가 요청하는 `openid`/`email`/`profile`은 민감 스코프가 아니라
  구글 심사가 필요 없습니다. Internal이므로 게시(Publish)도 불필요합니다

**③ 클라이언트 생성** — `Credentials` → `+ CREATE CREDENTIALS` → `OAuth client ID` → **Web application**

| 칸 | 값 |
|---|---|
| Authorized JavaScript origins | `http://localhost:3000` <br> `https://<배포주소>` (배포 후 추가) |
| Authorized redirect URIs | `https://xxusvukjjxmcnmbvwybz.supabase.co/auth/v1/callback` |

> redirect URI에는 **Supabase 콜백만** 넣습니다. 앱의 `/auth-callback.html`은 여기가 아니라 ⑤에 들어갑니다.
> 이걸 헷갈려서 `redirect_uri_mismatch`가 나는 경우가 가장 많습니다.

**④ Supabase에 연결** — Authentication → **Sign In / Providers** → Auth Providers 목록에서 Google
- Enable 켜고 ③에서 받은 Client ID / Client Secret 붙여넣기 → Save
- 이 화면에 있는 **Callback URL (for OAuth)** 가 ③의 redirect URI에 넣을 값입니다

> 메뉴 이름이 예전에는 `Providers`였습니다. 현재 UI는 좌측 CONFIGURATION 섹션의 **`Sign In / Providers`** 입니다.

**⑤ Redirect URLs** — Authentication → **URL Configuration**

| 항목 | 값 |
|---|---|
| Site URL | `http://localhost:3000` → 배포 후 Vercel 주소로 변경 |
| Redirect URLs | `http://localhost:3000/auth-callback.html` <br> `https://<배포주소>/auth-callback.html` |

#### 도메인 제한은 4중입니다

| 층 | 위치 | 하는 일 |
|---|---|---|
| 0 | GCP 동의 화면 **Internal** | 조직 외 계정은 구글에서 차단 — 앱까지 오지 않음 |
| 1 | `auth.js` `hd: 'boosters.kr'` | 계정 선택 창에 회사 계정만 노출 |
| 2 | `schema.sql` `handle_new_user()` | 다른 도메인은 `INVALID_DOMAIN` 예외로 **가입 차단** |
| 3 | `auth-callback.html` + `requireAuth()` | 세션 이메일 재확인, 프로필 없으면 로그아웃 후 사유 안내 |

#### 세션 정책

**로그인 후 6시간이 지나면 자동 로그아웃**됩니다. 회차(90분)는 충분히 덮으면서 하루를 넘기지 않는 값입니다.

> Supabase의 `Authentication → Sessions` (Time-box user sessions)는 **Pro 플랜 전용**이라
> 무료 플랜에서는 쓸 수 없습니다. 그래서 [`auth.js`](public/js/auth.js)에서 직접 구현했습니다.

동작 방식:

- 로그인 성공 시 `localStorage`에 시각을 기록(`axwb.loginAt`) — `auth-callback.html`의 `stampLogin()`
- `requireAuth()`가 페이지 진입마다 경과 시간을 검사 → 초과면 `signOut` 후 `/login?e=session-expired`
- 페이지를 켜둔 채 넘기는 경우를 위해 `watchSessionExpiry()`가 **5분마다** 검사 (`shell.js`에서 기동)
- 수명은 `SESSION_MAX_MS` 상수 하나로 조절합니다

> `persistSession`도 같은 localStorage를 쓰기 때문에, 기산점만 지워서 우회하려 하면 세션 자체가 함께 사라집니다.
> 클라이언트 측 제한이라 Pro의 서버 강제만큼 엄밀하진 않지만, 실제 위협(공용 PC에 방치된 세션)에는 충분히 작동합니다.

세션이 끊겨도 참가자가 쓰던 내용을 잃지 않도록 [`store.js`](public/js/store.js)가 이렇게 막습니다.

1. 미저장 입력·저장 실패분은 **localStorage에 보관**(`axwb.pending`)
2. 세션이 끊긴 게 원인이면 *"로그인이 만료되어 저장하지 못했습니다"* 안내 + 재로그인 링크 표시
3. 다시 로그인해 페이지를 열면 — 자동 저장 페이지(`/setup`)는 보관분을 자동 재업로드하고,
   수동 저장 페이지(회차·설계서)는 입력칸에 복원한 뒤 저장 바에 "저장 안 된 변경 N개"로 보여줍니다

#### 증상별 해결

| 증상 | 원인 |
|---|---|
| `redirect_uri_mismatch` | ③의 redirect URI 오타. 끝에 슬래시가 없어야 합니다 |
| 로그인 후 `/auth-callback.html`에서 멈춤 | ⑤ Redirect URLs 누락 |
| "액세스 차단: 조직 내부용 앱" | 개인 계정으로 시도한 경우. 정상 동작입니다 |
| "부스터스 이메일만 들어올 수 있습니다" | 앱의 3층이 막은 것. 정상 동작입니다 |

### 3. 강사 권한

강사 계정으로 **한 번 로그인한 뒤**, SQL Editor에서 실행하세요.

```sql
update public.profiles set role = 'instructor' where email = 'ku.do@boosters.kr';
```

### 4. 로컬 실행

```bash
cp .env.local.example .env.local   # SUPABASE_ANON_KEY 채우기
node dev-server.js
```

http://localhost:3000 — **포트는 3000 고정**입니다 (Supabase 리다이렉트에 등록한 주소).
`.env.local`을 바꾸면 서버를 재시작해야 `public/env.js`가 다시 생성됩니다.

### 5. 배포

Vercel 프로젝트에 환경변수를 등록하고 배포합니다.

**클라이언트 노출** ([`build-env.js`](build-env.js)가 `public/env.js`로 주입):

| 키 | 값 |
|---|---|
| `SUPABASE_URL` | `https://xxusvukjjxmcnmbvwybz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `CLASS_SUPABASE_URL` | `https://utoczgjuaiwdattgchcx.supabase.co` |
| `CLASS_SUPABASE_ANON_KEY` | 클래스 플랫폼 Supabase의 anon public 키 |
| `CLASS_PLATFORM_CLASS_ID` / `CLASS_PLATFORM_SESSION_2_ID` | 비우면 코드의 기본값 사용 |

**서버 전용** (`api/*`만 사용 — Vercel Sensitive로 등록, 브라우저에 절대 노출 금지):

| 키 | 용도 |
|---|---|
| `AX_INTEGRATION_SECRET` | `/api/integrations/*` 호출 인증 비밀값 |
| `ASANA_TOKEN_BOT` | Asana 태스크 읽기·생성·수정 |
| `NOTION_TOKEN` (+ 선택 `NOTION_VERSION`) | Notion 페이지·블록 읽기·추가·수정 |
| `SLACK_BOT_TOKEN` | Slack 발송·봇 메시지 수정 (`chat:write` 등) |
| `SLACK_SIGNING_SECRET` | `/api/slack/events` 서명 검증 |
| `SUPABASE_SERVICE_ROLE_KEY` | Slack 수신 이벤트를 `slack_events`에 기록 |

2회차의 `class_posts` 글 저장을 사용하려면 클래스 플랫폼 Supabase의 Authentication → URL Configuration → Redirect URLs에 아래 주소도 추가합니다.

```text
https://ax-lecture-workbook.vercel.app/class-auth-callback.html
http://localhost:3000/class-auth-callback.html
```

워크북의 기존 로그인과 클래스 플랫폼 로그인은 서로 다른 Supabase 프로젝트 세션으로 분리됩니다. 2회차의 흐름은 아래와 같습니다.

1. **워크북 2회차에서 `클래스 계정 연결` 클릭** — 클래스 플랫폼의 Google 로그인 화면으로 이동합니다.
2. **로그인 완료** — [`class-auth-callback.html`](public/class-auth-callback.html)이 로그인 응답을 처리하고 자동으로 워크북 `/session?n=2`로 돌아옵니다. 클래스 사이트를 먼저 방문할 필요는 없습니다.
3. **워크북에서 글 작성 후 `2회차 글 저장` 클릭** — 이 브라우저에 유지된 클래스 Supabase 세션으로 원격 `class_posts` 테이블에 직접 저장합니다.
4. **클래스 플랫폼 2회차 링크 열기** — 같은 `class_posts`를 읽는 클래스 사이트에서 저장된 글을 확인합니다.

워크북과 클래스 사이트는 서로 다른 도메인이므로 브라우저 로그인 세션이 자동으로 공유된다고 가정하지 않습니다. 클래스 사이트가 다시 로그인을 요구할 수 있지만, 워크북에서 이미 저장한 글은 그대로 남고 두 사이트 모두 같은 원격 DB의 데이터를 봅니다.

```bash
vercel deploy --prod
```

> 환경변수만 바꾸면 자동 재배포되지 않습니다. 다시 배포해야 `env.js`가 갱신됩니다.

---

## 워크북 내용 수정하기

문항을 바꾸려면 [`public/js/content.js`](public/js/content.js)만 고치면 됩니다. DB는 건드리지 않습니다.

- `SETUP` — 연결 준비 체크리스트
- `SESSIONS` — 1~4회차 (블록 배열: `head` / `note` / `field` / `prompt` / `link`)
- `CLINIC` — 케이스 클리닉 설계서
- `PROMPTS` — 프롬프트 카드 (회차별 `session` 번호로 묶임)

필드 종류: `text` `textarea` `number` `check` `checks` `radio` `grid`

> ⚠️ **`key`는 한 번 정하면 바꾸지 마세요.** 이미 입력된 답이 그 key로 저장돼 있습니다.
> key를 바꾸면 기존 답변이 화면에서 사라집니다(데이터는 남지만 연결이 끊깁니다).

---

## 주의사항

**ESM 문법 검증** — `node --check`는 브라우저가 거부하는 ESM 오류(문자열 안의 실제 개행 등)를 통과시킵니다.
증상은 "페이지가 무한 로딩되고 헤더가 안 뜸"입니다. `.mjs`로 복사한 뒤 검사하세요.

```bash
for f in public/js/*.js; do cp "$f" /tmp/c.mjs && node --check /tmp/c.mjs || echo "FAIL $f"; done
```

**개인정보** — 워크북에는 참가자가 자기 업무를 적습니다. 급여·평가·계약 단가 같은 민감 정보는
강의에서 다루지 않으며, 참가자에게도 적지 말라고 안내합니다.
