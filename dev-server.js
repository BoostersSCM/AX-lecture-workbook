// dev-server.js — 로컬 개발 서버 (빌드 없음)
//   node dev-server.js  →  http://localhost:3000
//
// 하는 일:
//   1) .env.local 파싱 → public/env.js 생성 (Vercel의 buildCommand와 같은 역할)
//   2) public/ 정적 서빙 + cleanUrls (/setup → /setup.html)
//   3) html/js/css에 no-store 캐시 헤더
//
// 포트는 3000 고정 — Supabase의 리다이렉트 URL에 등록하는 주소와 맞춰야 합니다.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT   = 3000;
const PUBLIC = path.join(__dirname, 'public');

// ── 1. .env.local → public/env.js ────────────────────────────
function buildEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter(k => !env[k]);
  if (missing.length) {
    console.warn(`\n  ⚠️  .env.local 에 ${missing.join(', ')} 이(가) 없습니다.`);
    console.warn('     .env.local.example 를 복사해서 채워주세요.\n');
  }
  const js = `window.__ENV__={SUPABASE_URL:'${env.SUPABASE_URL || ''}',SUPABASE_ANON_KEY:'${env.SUPABASE_ANON_KEY || ''}',CLASS_SUPABASE_URL:'${env.CLASS_SUPABASE_URL || ''}',CLASS_SUPABASE_ANON_KEY:'${env.CLASS_SUPABASE_ANON_KEY || ''}',CLASS_PLATFORM_CLASS_ID:'${env.CLASS_PLATFORM_CLASS_ID || ''}',CLASS_PLATFORM_SESSION_2_ID:'${env.CLASS_PLATFORM_SESSION_2_ID || ''}'};`;
  fs.writeFileSync(path.join(PUBLIC, 'env.js'), js);
}
buildEnv(); // 시작 시 1회 — .env.local을 바꾸면 서버를 재시작하세요

// ── 2. 정적 서빙 ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  let filePath = path.join(PUBLIC, urlPath);

  // cleanUrls: /setup → /setup.html
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  // 디렉터리 이탈 방지
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1><p>' + urlPath + '</p>');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`\n  AX 워크북  →  http://localhost:${PORT}\n`);
});
