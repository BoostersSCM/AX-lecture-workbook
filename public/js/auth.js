// js/auth.js — 로그인·세션·페이지 가드
import { supabase, toast, isBoostersEmail } from './supabase.js';

export const ALLOWED_DOMAIN = 'boosters.kr';

// ── 세션 수명 제한 (6시간) ───────────────────────────────────
// Supabase의 Time-box user sessions 는 Pro 플랜 기능이라 앱에서 직접 겁니다.
// 로그인 시각을 localStorage에 남기고 경과 시간을 검사합니다.
// persistSession 도 같은 localStorage 를 쓰므로, 이 값을 지우면 세션도 함께 사라집니다.
export const SESSION_MAX_MS = 6 * 60 * 60 * 1000;
const LOGIN_AT = 'axwb.loginAt';

export function stampLogin() {
  try { localStorage.setItem(LOGIN_AT, String(Date.now())); } catch {}
}
function loginAge() {
  const t = Number(localStorage.getItem(LOGIN_AT) || 0);
  if (!t) { stampLogin(); return 0; }   // 기록이 없으면 지금부터 셉니다
  return Date.now() - t;
}
export function sessionExpired() {
  return loginAge() > SESSION_MAX_MS;
}

let _me = null; // 페이지 수명 동안 캐시

// 세션은 있는데 프로필이 없거나 도메인이 다른 경우를 구분해서 알려줍니다.
// 반환: { profile } | { reason: 'no-session' | 'bad-domain' | 'no-profile' }
export async function getSessionState() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { reason: 'no-session' };

  // 6시간 초과 — 앱에서 거는 세션 수명 제한
  if (sessionExpired()) return { reason: 'session-expired', session };

  // 도메인 방어 — DB 트리거가 1차로 막지만, 앱 진입도 따로 막습니다
  if (!isBoostersEmail(session.user.email)) return { reason: 'bad-domain', session };

  const { data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) return { reason: 'no-profile', session };

  return { profile };
}

export async function getMe({ fresh = false } = {}) {
  if (_me && !fresh) return _me;
  const st = await getSessionState();
  if (!st.profile) return null;
  _me = st.profile;
  return _me;
}

// Google OAuth — hd 파라미터로 부스터스 계정만 뜨게 함 (최종 차단은 DB 트리거)
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth-callback.html',
      queryParams: { hd: 'boosters.kr', prompt: 'select_account' }
    }
  });
  if (error) toast(error.message, 'error');
}

export async function signOut() {
  await supabase.auth.signOut();
  try { localStorage.removeItem(LOGIN_AT); } catch {}
  _me = null;
  location.href = '/login';
}

// 페이지를 켜둔 채 6시간을 넘기는 경우를 위해 주기적으로 검사합니다.
// 튕기기 전에 저장 대기분은 store.js 가 localStorage 에 보관하므로 입력은 보존됩니다.
export function watchSessionExpiry(intervalMs = 5 * 60 * 1000) {
  setInterval(async () => {
    if (!sessionExpired()) return;
    await supabase.auth.signOut();
    try { localStorage.removeItem(LOGIN_AT); } catch {}
    location.replace('/login?e=session-expired');
  }, intervalMs);
}

export function isInstructor(me) {
  return me?.role === 'instructor';
}

// 팀이 아직 '미지정'이면 첫 진입으로 보고 팀을 물어봅니다
export function needsTeam(me) {
  return !me?.team || me.team === '미지정';
}

export async function saveTeam(team) {
  const me = await getMe();
  if (!me) return null;
  const { data, error } = await supabase
    .from('profiles').update({ team }).eq('id', me.id).select().single();
  if (error) { toast('팀 저장에 실패했습니다.', 'error'); return null; }
  _me = data;
  return data;
}

// 페이지 보호 — 로그인 필수
export async function requireAuth() {
  const st = await getSessionState();

  if (st.profile) { _me = st.profile; return st.profile; }

  // 세션 만료·남의 도메인·프로필 없음은 세션을 끊고 이유를 알려줍니다.
  // (이걸 안 하면 참가자가 이유도 모른 채 로그인 화면만 반복하게 됩니다)
  if (st.reason === 'session-expired' || st.reason === 'bad-domain' || st.reason === 'no-profile') {
    await supabase.auth.signOut();
    try { localStorage.removeItem(LOGIN_AT); } catch {}
    _me = null;
    location.replace('/login?e=' + st.reason);
    return null;
  }

  location.replace('/login');
  return null;
}

// 강사 전용 페이지 보호
export async function requireInstructor() {
  const me = await requireAuth();
  if (!me) return null;
  if (!isInstructor(me)) {
    toast('강사만 볼 수 있는 화면입니다.', 'error');
    setTimeout(() => location.href = '/', 1200);
    return null;
  }
  return me;
}
