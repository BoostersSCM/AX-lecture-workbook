-- ============================================================
-- 006 — 플랫폼 전환: 강의 - 기수 - 회차 (docs/90_플랫폼_전환_계획.md)
-- ============================================================
-- 실행 순서: 이 파일(006) → 006b_seed_connect_ai.sql (강의 콘텐츠 시드)
-- 이 파일은 무손실입니다: 기존 profiles/entries/course_settings를 읽어
-- 새 구조(courses/cohorts/enrollments/gates)로 백필하고,
-- entries에는 course_id 축을 추가합니다.
-- ============================================================

-- ────────────────────────────────────────────
-- 1. 강의
-- ────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  subtitle    text,
  intro       text,
  status      text not null default 'draft' check (status in ('draft','active','archived')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.course_instructors (
  course_id   uuid not null references public.courses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'instructor' check (role in ('owner','instructor')),
  primary key (course_id, user_id)
);

-- ────────────────────────────────────────────
-- 2. 기수·수강 (자유 참여)
-- ────────────────────────────────────────────
create table if not exists public.cohorts (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  number      int not null,
  label       text,
  recruiting  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (course_id, number)
);

create table if not exists public.enrollments (
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

-- ────────────────────────────────────────────
-- 3. 회차·블록 (워크북 콘텐츠의 DB화)
-- ────────────────────────────────────────────
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  position    int not null,
  title       text not null,
  tag         text,
  goal        text,
  unique (course_id, position)
);

create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  position    int not null,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb
);
create index if not exists blocks_session_idx on public.blocks(session_id, position);

-- 강의 단위 문서(연결 준비·설계서·프롬프트·홈 카피 등) — 폼 편집기 밖의 구조는 여기로
create table if not exists public.course_docs (
  course_id   uuid not null references public.courses(id) on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (course_id, kind)
);

-- ────────────────────────────────────────────
-- 4. 기수×회차 개방 (course_settings 대체)
-- ────────────────────────────────────────────
create table if not exists public.gates (
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  open        boolean not null default false,
  open_date   date,                       -- 강의일(KST) — 하루 전 0시 자동 개방
  primary key (cohort_id, session_id)
);

-- ────────────────────────────────────────────
-- 5. Q&A (본인 + 강사진) / 기수 공지
-- ────────────────────────────────────────────
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  cohort_id   uuid references public.cohorts(id) on delete set null,
  session_id  uuid references public.sessions(id) on delete set null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  status      text not null default 'open' check (status in ('open','answered')),
  created_at  timestamptz not null default now()
);
create index if not exists questions_course_idx on public.questions(course_id, status, created_at);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────
-- 6. 권한 헬퍼
--    profiles.role='instructor' = 플랫폼 관리자 (기존 값 그대로 재해석)
--    강의별 강사는 course_instructors
-- ────────────────────────────────────────────
create or replace function public.is_course_instructor(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_instructor()
      or exists (select 1 from public.course_instructors ci
                  where ci.course_id = cid and ci.user_id = auth.uid());
$$;

-- ────────────────────────────────────────────
-- 7. RLS
-- ────────────────────────────────────────────
alter table public.courses            enable row level security;
alter table public.course_instructors enable row level security;
alter table public.cohorts            enable row level security;
alter table public.enrollments        enable row level security;
alter table public.sessions           enable row level security;
alter table public.blocks             enable row level security;
alter table public.course_docs        enable row level security;
alter table public.gates              enable row level security;
alter table public.questions          enable row level security;
alter table public.answers            enable row level security;
alter table public.announcements      enable row level security;

-- courses: active는 전원, draft/archived는 강사진·관리자
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select using (
  status = 'active' or public.is_course_instructor(id)
);
drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses for all
  using (public.is_instructor()) with check (public.is_instructor());
drop policy if exists courses_update_instr on public.courses;
create policy courses_update_instr on public.courses for update
  using (public.is_course_instructor(id)) with check (public.is_course_instructor(id));

-- course_instructors: 읽기 전원(강사 표시용), 쓰기 관리자
drop policy if exists ci_select on public.course_instructors;
create policy ci_select on public.course_instructors for select using (auth.uid() is not null);
drop policy if exists ci_write on public.course_instructors;
create policy ci_write on public.course_instructors for all
  using (public.is_instructor()) with check (public.is_instructor());

-- cohorts: 읽기 전원, 쓰기 강사진
drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts for select using (auth.uid() is not null);
drop policy if exists cohorts_write on public.cohorts;
create policy cohorts_write on public.cohorts for all
  using (public.is_course_instructor(course_id)) with check (public.is_course_instructor(course_id));

-- enrollments: 본인 등록(모집 중 기수만)·본인 조회, 강사진 조회
drop policy if exists enroll_select on public.enrollments;
create policy enroll_select on public.enrollments for select using (
  user_id = auth.uid()
  or public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id))
);
drop policy if exists enroll_insert on public.enrollments;
create policy enroll_insert on public.enrollments for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.cohorts c where c.id = cohort_id and c.recruiting)
);
drop policy if exists enroll_delete on public.enrollments;
create policy enroll_delete on public.enrollments for delete using (
  user_id = auth.uid()
  or public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id))
);

-- sessions/blocks/course_docs: 강의 노출 규칙을 따름, 쓰기는 강사진
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select using (
  exists (select 1 from public.courses c where c.id = course_id
          and (c.status = 'active' or public.is_course_instructor(c.id)))
);
drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions for all
  using (public.is_course_instructor(course_id)) with check (public.is_course_instructor(course_id));

drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks for select using (
  exists (select 1 from public.sessions s join public.courses c on c.id = s.course_id
          where s.id = session_id and (c.status = 'active' or public.is_course_instructor(c.id)))
);
drop policy if exists blocks_write on public.blocks;
create policy blocks_write on public.blocks for all
  using (exists (select 1 from public.sessions s where s.id = session_id
                 and public.is_course_instructor(s.course_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id
                      and public.is_course_instructor(s.course_id)));

drop policy if exists docs_select on public.course_docs;
create policy docs_select on public.course_docs for select using (
  exists (select 1 from public.courses c where c.id = course_id
          and (c.status = 'active' or public.is_course_instructor(c.id)))
);
drop policy if exists docs_write on public.course_docs;
create policy docs_write on public.course_docs for all
  using (public.is_course_instructor(course_id)) with check (public.is_course_instructor(course_id));

-- gates: 읽기 전원, 쓰기 강사진
drop policy if exists gates_select on public.gates;
create policy gates_select on public.gates for select using (auth.uid() is not null);
drop policy if exists gates_write on public.gates;
create policy gates_write on public.gates for all
  using (public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id)))
  with check (public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id)));

-- questions/answers: 작성자 본인 + 그 강의 강사진
drop policy if exists q_select on public.questions;
create policy q_select on public.questions for select using (
  user_id = auth.uid() or public.is_course_instructor(course_id)
);
drop policy if exists q_insert on public.questions;
create policy q_insert on public.questions for insert with check (user_id = auth.uid());
drop policy if exists q_update on public.questions;
create policy q_update on public.questions for update
  using (public.is_course_instructor(course_id)) with check (public.is_course_instructor(course_id));

drop policy if exists a_select on public.answers;
create policy a_select on public.answers for select using (
  exists (select 1 from public.questions q where q.id = question_id
          and (q.user_id = auth.uid() or public.is_course_instructor(q.course_id)))
);
drop policy if exists a_insert on public.answers;
create policy a_insert on public.answers for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.questions q where q.id = question_id
              and (q.user_id = auth.uid() or public.is_course_instructor(q.course_id)))
);

-- announcements: 해당 기수 수강생·강사진 읽기, 강사진 쓰기
drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements for select using (
  exists (select 1 from public.enrollments e where e.cohort_id = announcements.cohort_id and e.user_id = auth.uid())
  or public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id))
);
drop policy if exists ann_write on public.announcements;
create policy ann_write on public.announcements for all
  using (public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id)))
  with check (public.is_course_instructor((select course_id from public.cohorts c where c.id = cohort_id)));

-- ────────────────────────────────────────────
-- 8. 시드: 기존 강의 「업무를 연결하는 AI」 (slug: connect-ai)
-- ────────────────────────────────────────────
insert into public.courses (id, slug, title, subtitle, intro, status, created_by)
values (
  md5('course:connect-ai')::uuid,
  'connect-ai',
  '업무를 연결하는 AI',
  '사내 도구와 데이터를 연결해 반복 업무를 줄이는 4주',
  '이 워크북을 편집 작업대로 사용합니다. Notion·Asana·Slack의 값을 가져오고, 사람이 확인해 수정한 뒤 각 SaaS에 다시 반영하는 흐름을 만듭니다.',
  'active',
  (select id from public.profiles where email = 'ku.do@boosters.kr')
)
on conflict (slug) do nothing;

insert into public.course_instructors (course_id, user_id, role)
select md5('course:connect-ai')::uuid, p.id,
       case when p.email = 'ku.do@boosters.kr' then 'owner' else 'instructor' end
  from public.profiles p
 where p.email in ('ku.do@boosters.kr', 'ch.yoo@boosters.kr')
on conflict do nothing;

-- 회차 4개 (블록은 006b 시드가 채움) — 결정적 UUID로 006b와 연결
insert into public.sessions (id, course_id, position, title, tag, goal) values
  (md5('connect-ai:session:1')::uuid, md5('course:connect-ai')::uuid, 1, 'AI에게 업무 원본을 읽히는 날', '연결', '내 권한 안에서 Notion 원본을 가져오고, 출처와 범위를 확인한 뒤 작은 수정을 같은 문단에 다시 저장합니다.'),
  (md5('connect-ai:session:2')::uuid, md5('course:connect-ai')::uuid, 2, '흩어진 기록에 구조를 더하는 날', '구조', '근거·담당자·기한을 먼저 정하고, 회의록을 다시 꺼내 쓸 수 있는 업무 데이터로 바꿉니다.'),
  (md5('connect-ai:session:3')::uuid, md5('course:connect-ai')::uuid, 3, 'Asana·Notion·Slack을 실제로 연결하는 날', '연동', '운영자가 Vercel에 둔 봇 토큰을 노출하지 않고, SaaS 원본을 워크북으로 가져와 수정한 뒤 같은 프로젝트·페이지·메시지에 다시 저장합니다.'),
  (md5('connect-ai:session:4')::uuid, md5('course:connect-ai')::uuid, 4, '내 업무 흐름을 연결하는 날', '정착', '내 반복 업무와 파일 정리까지 연결해, 다음 주에도 다시 쓸 수 있는 연결 설계서를 완성합니다.')
on conflict (course_id, position) do nothing;

-- ────────────────────────────────────────────
-- 9. 백필: 기수·수강·개방 (기존 profiles.cohort / course_settings 에서)
-- ────────────────────────────────────────────
-- 9a. 기수 = 기존 profiles.cohort ∪ course_settings의 기수 키 ∪ {1}
insert into public.cohorts (id, course_id, number, label)
select md5('connect-ai:cohort:' || n)::uuid, md5('course:connect-ai')::uuid, n, n || '기'
from (
  select distinct cohort as n from public.profiles where cohort is not null
  union select 1
  union select (jsonb_object_keys(coalesce(
          (select value::jsonb from public.course_settings where key = 'open_sessions_by_cohort'),
          '{}'::jsonb)))::int
) t
on conflict (course_id, number) do nothing;

-- 9b. 수강 = 기존 profiles.cohort
insert into public.enrollments (cohort_id, user_id)
select md5('connect-ai:cohort:' || p.cohort)::uuid, p.id
  from public.profiles p
 where p.cohort is not null
on conflict do nothing;

-- 9c. 개방(수동) = open_sessions_by_cohort {"1":[1,2]}
insert into public.gates (cohort_id, session_id, open)
select md5('connect-ai:cohort:' || kv.key)::uuid,
       md5('connect-ai:session:' || sess.n)::uuid,
       true
  from (select key, value from jsonb_each(coalesce(
          (select value::jsonb from public.course_settings where key = 'open_sessions_by_cohort'),
          '{}'::jsonb))) kv,
       lateral (select jsonb_array_elements_text(kv.value)::int as n) sess
on conflict (cohort_id, session_id) do update set open = true;

-- 9d. 강의일 예약 = session_dates_by_cohort {"1":{"2":"2026-08-27"}}
insert into public.gates (cohort_id, session_id, open, open_date)
select md5('connect-ai:cohort:' || c.key)::uuid,
       md5('connect-ai:session:' || s.key)::uuid,
       false,
       (s.value #>> '{}')::date
  from (select key, value from jsonb_each(coalesce(
          (select value::jsonb from public.course_settings where key = 'session_dates_by_cohort'),
          '{}'::jsonb))) c,
       lateral jsonb_each(c.value) s
on conflict (cohort_id, session_id) do update set open_date = excluded.open_date;

-- ────────────────────────────────────────────
-- 10. entries에 course 축 추가 (건수 검증 포함)
-- ────────────────────────────────────────────
do $$
declare
  before_count bigint;
  after_count  bigint;
begin
  select count(*) into before_count from public.entries;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'entries' and column_name = 'course_id') then
    alter table public.entries add column course_id uuid references public.courses(id);
    update public.entries set course_id = md5('course:connect-ai')::uuid where course_id is null;
    alter table public.entries alter column course_id set not null;
    alter table public.entries drop constraint entries_pkey;
    alter table public.entries add primary key (user_id, course_id, item_key);
  end if;

  select count(*) into after_count from public.entries;
  if before_count <> after_count then
    raise exception 'entries 건수 불일치: % → %', before_count, after_count;
  end if;
  raise notice 'entries 마이그레이션 완료: % 건 (유실 0)', after_count;
end $$;

-- entries RLS: 강사 열람을 "그 강의 강사진"으로 좁힘
drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries for select using (
  user_id = auth.uid() or public.is_course_instructor(course_id)
);

-- ────────────────────────────────────────────
-- 확인 쿼리
-- ────────────────────────────────────────────
--   select slug, title, status from public.courses;
--   select number, label, recruiting from public.cohorts order by number;
--   select count(*) as enrolled from public.enrollments;
--   select s.position, g.open, g.open_date from public.gates g
--     join public.sessions s on s.id = g.session_id order by 1;
--   select count(*), count(course_id) from public.entries;  -- 두 값이 같아야 함
