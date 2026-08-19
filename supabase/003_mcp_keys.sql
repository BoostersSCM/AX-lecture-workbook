-- ============================================================
-- 003 — 개인 MCP 연결 키
-- ============================================================
-- 수강생이 마이페이지에서 발급받아, 자기 Claude(커스텀 커넥터)에
-- https://ax-lecture-workbook.vercel.app/api/mcp?key=<키> 로 등록합니다.
-- 서버(/api/mcp)는 SUPABASE_SERVICE_ROLE_KEY로 키→user_id를 확인한 뒤
-- 그 사용자의 entries만 읽고 씁니다.
-- ============================================================

create table if not exists public.mcp_keys (
  key         text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 1인 1키 (재발급 = 삭제 후 새로 발급)
create unique index if not exists mcp_keys_user_idx on public.mcp_keys(user_id);

alter table public.mcp_keys enable row level security;

-- 본인 키만 보고 만들고 지웁니다 (서버는 service role이라 RLS를 우회)
drop policy if exists mcp_keys_select on public.mcp_keys;
create policy mcp_keys_select on public.mcp_keys
  for select using (user_id = auth.uid());

drop policy if exists mcp_keys_insert on public.mcp_keys;
create policy mcp_keys_insert on public.mcp_keys
  for insert with check (user_id = auth.uid());

drop policy if exists mcp_keys_delete on public.mcp_keys;
create policy mcp_keys_delete on public.mcp_keys
  for delete using (user_id = auth.uid());

-- 확인:
--   select p.email, k.created_at from public.mcp_keys k join public.profiles p on p.id = k.user_id;
