/// <reference types="vite/client" />

/**
 * 공통 API 클라이언트.
 *
 * - API 응답은 `{ success, data, error }` envelope로 감싸져 있다 (CLINSIGHT_V4_API_SPEC §0.3).
 *   `request<T>`는 envelope를 풀어 `data`만 반환한다.
 * - snake_case → camelCase 변환은 본 클라이언트에서 일괄 처리하지 않는다.
 *   각 service가 응답 필드를 명시적으로 프론트 타입으로 매핑한다.
 *   이유: SOFA `components.cardiovascular`처럼 snake가 아닌 키가 있어 deep transform이 위험.
 * - 인증 헤더는 매 요청마다 tokenStore 에서 ID Token 을 읽어 자동 주입한다.
 *
 * Mock 모드 판정: `VITE_USE_MOCK === 'false'` 일 때만 실제 API 호출.
 * 그 외(미정의 / 'true' / 다른 값)는 모두 mock 으로 간주한다 (default-safe).
 * service 함수가 직접 mock 데이터를 반환하는 모드. 단, `request<T>`는 항상 활성화된 상태.
 */

import { signOut as cognitoSignOut } from '../lib/cognito';
import { getIdToken } from '../lib/tokenStore';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** mock 모드 여부. service 레이어 분기에 사용. */
export const MOCK_MODE = import.meta.env.VITE_USE_MOCK !== 'false';

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  body: string;
  constructor(status: number, message: string, code?: string, body = '') {
    super(`API Error ${status}${code ? ` [${code}]` : ''}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/**
 * 401 응답 처리: SDK 세션을 정리하고 /login 으로 이동.
 *
 * TODO: AuthContext 의 logout 으로 개선.
 *   현재는 client.ts 가 React 외부 모듈이라 useAuth() 호출이 불가능해
 *   localStorage 정리 + window.location 강제 이동으로 처리한다.
 *   추후 AuthContext 가 client.ts 에 logout 콜백을 주입하는 형태로 리팩토링.
 */
function handle401(): void {
  try {
    cognitoSignOut();
  } catch {
    // env 미설정 등으로 실패해도 라우팅은 강행.
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

/**
 * 표준 fetch 래퍼.
 * - JSON 응답을 envelope로 가정하고 `data`만 반환.
 * - HTTP non-2xx 또는 envelope.success === false 면 ApiError throw.
 * - 토큰이 있으면 `Authorization: Bearer <idToken>` 자동 첨부.
 * - 401 이면 세션 정리 + /login 리다이렉트 후 throw.
 *
 * 사용 예:
 *   const dashboard = await request<DashboardResponse>(`/dashboard/icu/${icuId}`);
 */
export async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  if (MOCK_MODE) {
    throw new ApiError(
      0,
      'request() called in MOCK_MODE. Service should branch to mock instead.',
      'MOCK_MODE',
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string> | undefined) ?? {}),
  };
  const idToken = getIdToken();
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handle401();
    throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const text = await res.text();

  if (!res.ok) {
    // 에러도 envelope일 수 있으니 최대한 파싱 시도.
    try {
      const parsed = JSON.parse(text) as ApiEnvelope<unknown>;
      const err = parsed.error;
      throw new ApiError(res.status, err?.message ?? text, err?.code, text);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(res.status, text, undefined, text);
    }
  }

  // 빈 응답(204 No Content 등) 방어: JSON.parse 호출 전에 가드. null 로 폴백.
  if (!text) {
    return null as T;
  }
  const envelope = JSON.parse(text) as ApiEnvelope<T>;
  if (!envelope.success || envelope.error) {
    throw new ApiError(
      res.status,
      envelope.error?.message ?? 'envelope.success=false',
      envelope.error?.code,
      text,
    );
  }
  if (envelope.data === null) {
    throw new ApiError(res.status, 'envelope.data is null', 'EMPTY_DATA', text);
  }
  return envelope.data;
}

export { API_BASE };
