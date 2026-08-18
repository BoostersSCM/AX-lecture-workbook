# AX 워크북

부스터스 사내 AX 강의 **「연결해서 일하기 — 노션·슬랙·드라이브를 AI로 잇는 4주」**의 참가자용 워크북입니다.

참가자는 회사 구글 계정으로 로그인해 회차별 실습을 기록하고, 마지막에 「내 업무 자동화 설계서」를 작성합니다.
입력은 타이핑하는 즉시 자동 저장되며, **본인과 강사만** 볼 수 있습니다.

- 운영: Vercel + Supabase
- 강의안 원본: [`docs/`](docs/) — 커리큘럼, 회차별 진행안, 프롬프트 카드, 샘플 회의록

---

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 홈 — 전체 진행률, 회차 카드 |
| `/setup` | 사전 세팅 체크리스트 (강의 전 배포) |
| `/session?n=1..4` | 회차별 워크북 — 실습 기록·숙제 제출 |
| `/clinic` | 내 업무 자동화 설계서 (4회차) |
| `/prompts` | 프롬프트 카드 — 읽기 전용 + 복사 버튼 |
| `/admin` | 강사 전용 — 참가자 진행 현황·답변 열람 |

---

## 기술 스택

boosters-ax의 구조를 그대로 따랐습니다.

- **프론트**: 순수 HTML5 + ES Modules + CSS. **프레임워크·빌드·번들러 없음**
- **외부 라이브러리는 ESM CDN으로만**: `@supabase/supabase-js@2` (esm.sh). 클라이언트에 npm 패키지 추가 금지
- **DB·인증**: Supabase (PostgreSQL + RLS + Google OAuth). 클라이언트가 RLS에 의존해 직접 쿼리
- **호스팅**: Vercel. `vercel.json`의 buildCommand 한 줄이 빌드의 전부 (`public/env.js` 생성)

데이터 모델은 테이블 두 개뿐입니다.

```
profiles(id, email, name, team, role)      -- role: member | instructor
entries(user_id, item_key, value)          -- 워크북의 모든 입력
```

`entries`가 key-value인 이유: **문항을 추가·수정해도 DB 마이그레이션이 필요 없게** 하기 위해서입니다.
문항 정의는 전부 [`public/js/content.js`](public/js/content.js) 한 파일에 있습니다.

---

## 셋업

### 1. Supabase

1. 프로젝트 생성 (현재 연결: `https://xxusvukjjxmcnmbvwybz.supabase.co`)
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행
3. **Authentication → Providers → Google** 활성화
   - Google Cloud Console에서 OAuth 클라이언트를 만들고 Client ID/Secret 등록
   - 승인된 리디렉션 URI에 Supabase가 알려주는 콜백 URL 추가
4. **Authentication → URL Configuration**
   - Site URL: 배포 주소 (예: `https://ax-workbook.vercel.app`)
   - Redirect URLs에 아래 둘 다 추가
     - `http://localhost:3000/auth-callback.html`
     - `https://<배포주소>/auth-callback.html`

> 가입은 `@boosters.kr` 계정만 가능합니다. `handle_new_user()` 트리거가 도메인을 검증하고,
> 다른 도메인이면 `INVALID_DOMAIN` 예외로 막습니다.

### 2. 강사 권한

강사 계정으로 **한 번 로그인한 뒤**, SQL Editor에서 실행하세요.

```sql
update public.profiles set role = 'instructor' where email = 'ku.do@boosters.kr';
```

### 3. 로컬 실행

```bash
cp .env.local.example .env.local   # SUPABASE_ANON_KEY 채우기
node dev-server.js
```

http://localhost:3000 — **포트는 3000 고정**입니다 (Supabase 리다이렉트에 등록한 주소).
`.env.local`을 바꾸면 서버를 재시작해야 `public/env.js`가 다시 생성됩니다.

### 4. 배포

Vercel 프로젝트에 환경변수 두 개를 등록하고 배포합니다.

| 키 | 값 |
|---|---|
| `SUPABASE_URL` | `https://xxusvukjjxmcnmbvwybz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

```bash
vercel deploy --prod
```

> 환경변수만 바꾸면 자동 재배포되지 않습니다. 다시 배포해야 `env.js`가 갱신됩니다.

---

## 워크북 내용 수정하기

문항을 바꾸려면 [`public/js/content.js`](public/js/content.js)만 고치면 됩니다. DB는 건드리지 않습니다.

- `SETUP` — 사전 세팅 체크리스트
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
