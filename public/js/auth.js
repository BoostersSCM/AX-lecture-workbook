// js/auth.js — 로그인·세션·페이지 가드
import { supabase, toast } from './supabase.js';

let _me = null; // 페이지 수명 동안 캐시

export async function getMe({ fresh = false } = {}) {
  if (_me && !fresh) return _me;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (error) return null;

  _me = profile;
  return profile;
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
  _me = null;
  location.href = '/login';
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
  const me = await getMe();
  if (!me) { location.href = '/login'; return null; }
  return me;
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
