// scripts/gen-seed-sql.mjs — content.js를 읽어 connect-ai 강의 콘텐츠 시드 SQL 생성
//   node scripts/gen-seed-sql.mjs  →  supabase/006b_seed_connect_ai.sql
//
// content.js는 이제 "시드 원본"입니다. 문항을 크게 고칠 일이 있으면
// content.js 수정 → 이 스크립트 재실행 → 생성된 SQL 재실행(멱등)으로 반영합니다.

import { writeFileSync } from 'node:fs';
import { SESSIONS, SETUP, CLINIC, PROMPTS, PROMPT_HELP, RESCUE, VISUALS, AX_FLOW, INTEGRATIONS, DATA_MODEL, COURSE } from '../public/js/content.js';

const COURSE_ID = `md5('course:connect-ai')::uuid`;
const sessionId = (n) => `md5('connect-ai:session:${n}')::uuid`;
const blockId = (n, i) => `md5('connect-ai:block:${n}:${i}')::uuid`;

// SQL 문자열 리터럴 이스케이프 (jsonb는 $$ 달러 인용으로 안전하게)
function jsonLit(obj) {
  const s = JSON.stringify(obj);
  if (s.includes('$json$')) throw new Error('달러 인용 충돌');
  return `$json$${s}$json$::jsonb`;
}

const lines = [];
lines.push('-- ============================================================');
lines.push('-- 006b — connect-ai 강의 콘텐츠 시드 (자동 생성: scripts/gen-seed-sql.mjs)');
lines.push('-- 006_platform.sql 실행 후에 실행하세요. 재실행해도 안전합니다(전량 교체).');
lines.push('-- ============================================================');
lines.push('');

// 회차 블록 — 전량 교체 방식(멱등)
lines.push('-- 블록 전량 교체');
lines.push(`delete from public.blocks where session_id in (select id from public.sessions where course_id = ${COURSE_ID});`);
lines.push('');
for (const s of SESSIONS) {
  s.blocks.forEach((b, i) => {
    const { type, ...payload } = b;
    lines.push(
      `insert into public.blocks (id, session_id, position, type, payload) values (` +
      `${blockId(s.n, i)}, ${sessionId(s.n)}, ${i + 1}, '${type}', ${jsonLit(payload)});`
    );
  });
  lines.push('');
}

// 강의 문서(kind별 upsert)
const DOCS = {
  meta: { course: COURSE, flow: AX_FLOW, integrations: INTEGRATIONS, data_model: DATA_MODEL, visuals: VISUALS },
  setup: SETUP,
  clinic: CLINIC,
  prompts: PROMPTS,
  prompt_help: PROMPT_HELP,
  rescue: RESCUE,
};
lines.push('-- 강의 문서 upsert');
for (const [kind, payload] of Object.entries(DOCS)) {
  lines.push(
    `insert into public.course_docs (course_id, kind, payload) values (${COURSE_ID}, '${kind}', ${jsonLit(payload)})` +
    ` on conflict (course_id, kind) do update set payload = excluded.payload, updated_at = now();`
  );
}
lines.push('');
lines.push('-- 확인: select kind, length(payload::text) from public.course_docs order by kind;');
lines.push('--       select s.position, count(b.id) from public.sessions s left join public.blocks b on b.session_id = s.id group by 1 order by 1;');
lines.push('');

writeFileSync(new URL('../supabase/006b_seed_connect_ai.sql', import.meta.url), lines.join('\n'), 'utf8');
console.log('생성 완료: supabase/006b_seed_connect_ai.sql');
console.log('블록 수:', SESSIONS.reduce((a, s) => a + s.blocks.length, 0), '/ 문서:', Object.keys(DOCS).join(', '));
