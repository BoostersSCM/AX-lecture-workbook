-- ============================================================
-- AX 워크북 — Supabase 스키마
-- ============================================================
-- 새 Supabase 프로젝트의 SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.
-- boosters-ax의 인증 패턴(@boosters.kr 도메인 제한 + profiles 자동 생성)을 그대로 따릅니다.
-- ============================================================

-- ────────────────────────────────────────────
-- 0. instructor_emails — 강사 허용목록 (첫 로그인 시 자동 강사 승격)
-- ────────────────────────────────────────────
create table if not exists public.instructor_emails (
  email       text primary key,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.instructor_emails enable row level security; -- 정책 없음 = 서버·트리거 전용

insert into public.instructor_emails (email, note) values
  ('ku.do@boosters.kr', '강사'),
  ('ch.yoo@boosters.kr', '강사')
on conflict (email) do nothing;

-- ────────────────────────────────────────────
-- 1. profiles — auth.users 와 1:1
-- ────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  team        text not null default '미지정',
  cohort      int,                            -- 기수 (첫 로그인 온보딩에서 선택)
  role        text not null default 'member' check (role in ('member','instructor')),
  created_at  timestamptz not null default now()
);

-- 가입 시 자동으로 profiles 행 생성 + 도메인 제한
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~ '@boosters\.kr$' then
    raise exception 'INVALID_DOMAIN: 부스터스 이메일(@boosters.kr) 만 가입할 수 있습니다.';
  end if;

  insert into public.profiles (id, email, name, team, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'team', '미지정'),
    case when exists (select 1 from public.instructor_emails i where i.email = new.email)
         then 'instructor' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────
-- 2. entries — 워크북의 모든 입력 (key-value)
-- ────────────────────────────────────────────
-- 문항 정의는 프론트(public/js/content.js)에 있습니다.
-- 문항을 추가·수정해도 DB 마이그레이션이 필요 없도록 일부러 key-value로 만들었습니다.
--   item_key 예시:  s1.checkin  /  s2.trap.date  /  clinic.task  /  setup.notion
create table if not exists public.entries (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_key    text not null,
  value       text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_key)
);

create index if not exists entries_user_idx on public.entries(user_id);
create index if not exists entries_key_idx  on public.entries(item_key);

-- ────────────────────────────────────────────
-- 3. 강사 판별 헬퍼
-- ────────────────────────────────────────────
-- RLS 정책 안에서 profiles를 직접 조회하면 정책이 자기 자신을 다시 평가해
-- 무한 재귀가 납니다. security definer 함수로 우회합니다.
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'instructor'
  );
$$;

-- ────────────────────────────────────────────
-- 4. RLS — 본인 + 강사만
-- ────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- profiles: 본인은 읽기·수정, 강사는 전원 읽기
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_instructor());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- entries: 본인은 전권, 강사는 읽기만 (강사가 남의 답을 고칠 일은 없습니다)
drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries
  for select using (user_id = auth.uid() or public.is_instructor());

drop policy if exists entries_insert on public.entries;
create policy entries_insert on public.entries
  for insert with check (user_id = auth.uid());

drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists entries_delete on public.entries;
create policy entries_delete on public.entries
  for delete using (user_id = auth.uid());

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch
  before update on public.entries
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────
-- 5. slack_events — Slack 웹훅 수신함
-- ────────────────────────────────────────────
-- Vercel 서버가 service role로 넣고, 수강생은 자신의 setup.slack_target
-- 채널 이벤트만 읽습니다. 강사는 전체 이벤트를 읽을 수 있습니다.
create table if not exists public.slack_events (
  id             bigint generated by default as identity primary key,
  event_id       text not null unique,
  team_id        text not null default '',
  channel_id     text not null,
  slack_user_id  text not null default '',
  text           text not null default '',
  event_ts       text not null default '',
  received_at    timestamptz not null default now()
);

create index if not exists slack_events_channel_idx on public.slack_events(channel_id);
create index if not exists slack_events_received_idx on public.slack_events(received_at desc);

alter table public.slack_events enable row level security;

drop policy if exists slack_events_select on public.slack_events;
create policy slack_events_select on public.slack_events
  for select to authenticated
  using (
    public.is_instructor()
    or exists (
      select 1 from public.entries e
       where e.user_id = auth.uid()
         and e.item_key = 'setup.slack_target'
         and btrim(coalesce(e.value, '')) = btrim(slack_events.channel_id)
    )
  );

-- ============================================================
-- 셋업 마지막 단계 — 강사 권한 부여
-- ============================================================
-- 아래 한 줄은 해당 계정이 "한 번 로그인한 뒤에" 실행하세요.
-- (로그인해야 auth.users → profiles 행이 생깁니다)
--
--   update public.profiles set role = 'instructor' where email = 'ku.do@boosters.kr';
--
-- 확인:
--   select email, name, team, role from public.profiles order by created_at;
-- ============================================================

-- ────────────────────────────────────────────
-- 5. course_settings — 회차 개방 제어 (강사가 /admin에서 관리)
--    (기존 DB에는 002_course_settings.sql을 실행)
-- ────────────────────────────────────────────
create table if not exists public.course_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

alter table public.course_settings enable row level security;

drop policy if exists course_settings_select on public.course_settings;
create policy course_settings_select on public.course_settings
  for select using (auth.uid() is not null);

drop policy if exists course_settings_write on public.course_settings;
create policy course_settings_write on public.course_settings
  for all using (public.is_instructor()) with check (public.is_instructor());

drop trigger if exists course_settings_touch on public.course_settings;
create trigger course_settings_touch
  before update on public.course_settings
  for each row execute function public.touch_updated_at();

insert into public.course_settings (key, value)
values ('open_sessions_by_cohort', '{"1":[1]}')
on conflict (key) do nothing;
