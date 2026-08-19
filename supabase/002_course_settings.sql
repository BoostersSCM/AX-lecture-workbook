-- ============================================================
-- 002 — 기수(코호트) + 회차 개방 제어
-- ============================================================
-- 이미 운영 중인 Supabase에 이 파일만 SQL Editor에서 실행하세요.
-- (새로 세팅하는 경우에는 schema.sql에 같은 내용이 포함되어 있습니다)
--
-- - profiles.cohort: 참가자가 첫 로그인 때 선택하는 기수 (1, 2, …)
-- - course_settings.open_sessions_by_cohort: 기수별 열린 회차
--   예: '{"1":[1,2],"2":[1]}'  → 1기는 1·2회차, 2기는 1회차만 열림
-- 강사(role=instructor)가 /admin 화면에서 기수별로 열고 닫습니다.
-- ============================================================

-- 1) 기수 컬럼
alter table public.profiles add column if not exists cohort int;

-- 2) 설정 테이블
create table if not exists public.course_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

alter table public.course_settings enable row level security;

-- 읽기: 로그인한 전원 (수강생이 자기 기수의 개방 상태를 봐야 함)
drop policy if exists course_settings_select on public.course_settings;
create policy course_settings_select on public.course_settings
  for select using (auth.uid() is not null);

-- 쓰기: 강사만
drop policy if exists course_settings_write on public.course_settings;
create policy course_settings_write on public.course_settings
  for all using (public.is_instructor()) with check (public.is_instructor());

drop trigger if exists course_settings_touch on public.course_settings;
create trigger course_settings_touch
  before update on public.course_settings
  for each row execute function public.touch_updated_at();

-- 기본값: 1기의 1회차만 열림
insert into public.course_settings (key, value)
values ('open_sessions_by_cohort', '{"1":[1]}')
on conflict (key) do nothing;

-- 확인:
--   select * from public.course_settings;
--   select email, name, team, cohort, role from public.profiles order by cohort, name;
