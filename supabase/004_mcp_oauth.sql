-- ============================================================
-- 004 — MCP OAuth (팀 플랜 조직 커넥터용)
-- ============================================================
-- 관리자가 조직 커넥터를 URL 하나로 등록하는 팀 플랜 시나리오에서,
-- 각 멤버가 켤 때 구글 로그인(워크북 계정)으로 본인 확인을 거쳐
-- 본인 전용 토큰을 발급받습니다. 개인 키(?key=, 003) 방식과 공존합니다.
--
-- 세 테이블 모두 서버(service role) 전용입니다 — RLS만 켜고 정책을 만들지
-- 않아 anon/사용자 접근은 전부 차단됩니다.
-- ============================================================

-- Claude가 동적 클라이언트 등록(DCR)으로 만든 클라이언트
create table if not exists public.mcp_clients (
  client_id     text primary key,
  client_name   text,
  redirect_uris text not null,          -- JSON 배열 문자열
  created_at    timestamptz not null default now()
);

-- 1회용 인가 코드 (5분 만료)
create table if not exists public.mcp_codes (
  code            text primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  client_id       text not null,
  redirect_uri    text not null,
  code_challenge  text not null,        -- PKCE S256
  expires_at      timestamptz not null
);

-- 발급된 액세스 토큰 (한 사람이 여러 기기 = 여러 토큰 가능)
create table if not exists public.mcp_tokens (
  token       text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  client_id   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens(user_id);

alter table public.mcp_clients enable row level security;
alter table public.mcp_codes   enable row level security;
alter table public.mcp_tokens  enable row level security;

-- 확인:
--   select client_name, created_at from public.mcp_clients;
--   select p.email, t.created_at from public.mcp_tokens t join public.profiles p on p.id = t.user_id;
-- 특정 사용자의 연결 전부 끊기:
--   delete from public.mcp_tokens where user_id = (select id from public.profiles where email = '...@boosters.kr');
