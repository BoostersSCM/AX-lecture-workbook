// Vercel build step — 브라우저에 필요한 공개 환경값만 public/env.js로 주입합니다.
const fs = require('fs');

const keys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'CLASS_SUPABASE_URL',
  'CLASS_SUPABASE_ANON_KEY',
  'CLASS_PLATFORM_CLASS_ID',
  'CLASS_PLATFORM_SESSION_2_ID',
];

const values = Object.fromEntries(keys.map(key => [key, process.env[key] || '']));
fs.writeFileSync('public/env.js', `window.__ENV__=${JSON.stringify(values)};\n`);
