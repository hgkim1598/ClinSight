/// <reference types="vite/client" />

/**
 * Cognito SDK가 localStorage에 저장한 세션을 동기적으로 읽는 얇은 래퍼.
 *
 * - 자체 저장소를 두지 않는다. `amazon-cognito-identity-js` 가 이미 관리하는
 *   `CognitoIdentityServiceProvider.<clientId>.*` 키를 그대로 읽는다.
 * - client.ts 의 fetch 직전 헤더 주입 경로에서 **동기 호출이 필요**하므로
 *   SDK 의 비동기 `getSession` 대신 저장된 ID Token JWT 의 `exp` 만 동기 검사한다.
 *   만료 토큰의 refresh 는 AuthContext / cognito.restoreSession 흐름에서 처리.
 */

const STORAGE_PREFIX = 'CognitoIdentityServiceProvider';

function getClientId(): string | null {
  const id = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
  return id && id.length > 0 ? id : null;
}

function getLastAuthUser(clientId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`${STORAGE_PREFIX}.${clientId}.LastAuthUser`);
}

/** JWT payload 의 `exp` (epoch seconds) 추출. 파싱 실패 시 null. */
function parseJwtExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * 현재 유효한 ID Token. 없거나 만료됐으면 null.
 * client.ts 가 Authorization 헤더 주입 직전에 호출한다.
 */
export function getIdToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  const clientId = getClientId();
  if (!clientId) return null;
  const username = getLastAuthUser(clientId);
  if (!username) return null;

  const token = localStorage.getItem(
    `${STORAGE_PREFIX}.${clientId}.${username}.idToken`,
  );
  if (!token) return null;

  const exp = parseJwtExp(token);
  if (exp === null) return null;
  if (Date.now() / 1000 >= exp) return null;
  return token;
}

/** 다른 탭에서 로그인/로그아웃이 발생했을 때 알림 받기. AuthContext 에서 구독. */
type Listener = () => void;
const listeners = new Set<Listener>();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
    listeners.forEach((fn) => fn());
  });
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
