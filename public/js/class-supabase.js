// js/class-supabase.js — 클래스 플랫폼(class_posts) 전용 Supabase 클라이언트
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLASS_SUPABASE_URL = window.__ENV__?.CLASS_SUPABASE_URL || 'https://utoczgjuaiwdattgchcx.supabase.co';
const CLASS_SUPABASE_ANON_KEY = window.__ENV__?.CLASS_SUPABASE_ANON_KEY || '';

export const classSupabase = CLASS_SUPABASE_ANON_KEY
  ? createClient(CLASS_SUPABASE_URL, CLASS_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'ax-workbook-class-auth',
      },
    })
  : null;

export const CLASS_TARGET = {
  classId: window.__ENV__?.CLASS_PLATFORM_CLASS_ID || 'cb639d18-11fc-44cf-ac5b-67b8e6be6d4e',
  session2Id: window.__ENV__?.CLASS_PLATFORM_SESSION_2_ID || '8752d859-2cb8-4a31-a622-d6dc748c2100',
  session2Url: 'https://ax.boosters-labs.com/classes?class=cb639d18-11fc-44cf-ac5b-67b8e6be6d4e',
};

export function classConfigReady() {
  return Boolean(classSupabase);
}

export async function getClassSession() {
  if (!classSupabase) return null;
  const { data: { session } } = await classSupabase.auth.getSession();
  return session || null;
}

export async function getClassProfile(session) {
  if (!classSupabase || !session?.user?.id) return null;
  const { data } = await classSupabase
    .from('profiles')
    .select('id, name, dept, email')
    .eq('id', session.user.id)
    .maybeSingle();
  return data || null;
}

export async function signInToClass(returnTo = '/session?n=2') {
  if (!classSupabase) return { error: new Error('클래스 플랫폼 연결값이 아직 설정되지 않았습니다.') };
  // 복귀 경로는 localStorage로 넘깁니다 — redirectTo에 쿼리스트링이 붙으면
  // 클래스 플랫폼 Supabase의 Redirect URLs 허용 목록과 매칭이 깨질 수 있습니다.
  try { localStorage.setItem('axwb.classReturnTo', returnTo); } catch {}
  const callback = `${location.origin}/class-auth-callback.html`;
  const { error } = await classSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback,
      queryParams: { hd: 'boosters.kr', prompt: 'select_account' },
    },
  });
  return { error };
}

// 클래스 플랫폼 Supabase(강사 소유 아님)의 Redirect URLs에 등록되어야 하는 주소.
// 등록이 안 되어 있으면 로그인 후 이 워크북으로 돌아오지 못하고
// 클래스 사이트(Site URL)로 이동해버립니다. UI 안내문에서 사용합니다.
export function classCallbackUrl() {
  return `${location.origin}/class-auth-callback.html`;
}

export async function listTargetSessionPosts() {
  if (!classSupabase) return { data: [], error: new Error('클래스 플랫폼 연결값이 아직 설정되지 않았습니다.') };
  const { data, error } = await classSupabase
    .from('class_posts')
    .select('id, body, created_at, session_id, user_id, author:profiles!class_posts_user_id_fkey ( id, name, dept )')
    .eq('class_id', CLASS_TARGET.classId)
    .eq('session_id', CLASS_TARGET.session2Id)
    .order('created_at', { ascending: false })
    .limit(10);
  return { data: data || [], error };
}

export async function addTargetSessionPost(body) {
  const session = await getClassSession();
  if (!classSupabase || !session) return { data: null, error: new Error('클래스 플랫폼 로그인이 필요합니다.') };
  const { data, error } = await classSupabase
    .from('class_posts')
    .insert({
      class_id: CLASS_TARGET.classId,
      user_id: session.user.id,
      body,
      mentions: [],
      attachment: null,
      session_id: CLASS_TARGET.session2Id,
    })
    .select('id, body, created_at, session_id, user_id')
    .single();
  return { data, error };
}
