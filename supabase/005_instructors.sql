-- ============================================================
-- 005 — 강사 허용목록 (자동 승격)
-- ============================================================
-- 문제: role 승격 UPDATE는 대상이 이미 로그인해 profiles 행이 있어야만 먹힌다
--       (로그인 전에 실행하면 0건 업데이트로 조용히 지나감).
-- 해결: 강사 이메일 허용목록을 두고,
--       ① 이미 가입한 사람은 즉시 승격
--       ② 아직 안 한 사람은 첫 로그인 때 트리거가 자동 승격
-- 앞으로 강사·조교 추가 = 이 테이블에 이메일 한 줄.
-- ============================================================

create table if not exists public.instructor_emails (
  email       text primary key,
  note        text,
  created_at  timestamptz not null default now()
);

-- 서버·트리거 전용 — RLS만 켜고 정책을 만들지 않아 클라이언트 접근 차단
alter table public.instructor_emails enable row level security;

insert into public.instructor_emails (email, note) values
  ('ku.do@boosters.kr', '강사'),
  ('ch.yoo@boosters.kr', '강사')
on conflict (email) do nothing;

-- ① 이미 가입한 사람 즉시 승격
update public.profiles p
   set role = 'instructor'
 where p.email in (select email from public.instructor_emails)
   and p.role <> 'instructor';

-- ② 신규 가입자는 첫 로그인 때 자동 승격 — handle_new_user 갱신
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

-- 확인:
--   select email, name, role from public.profiles where role = 'instructor';
--   select * from public.instructor_emails;
-- 강사 해제:
--   delete from public.instructor_emails where email = '...';
--   update public.profiles set role = 'member' where email = '...';
