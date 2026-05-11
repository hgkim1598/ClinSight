/// <reference types="vite/client" />

/**
 * 공통 API 클라이언트.
 *
 * - API 응답은 `{ success, data, error }` envelope로 감싸져 있다 (CLINSIGHT_V4_API_SPEC §0.3).
 *   `request<T>`는 envelope를 풀어 `data`만 반환한다.
 * - snake_case → camelCase 변환은 본 클라이언트에서 일괄 처리하지 않는다.
 *   각 service가 응답 필드를 명시적으로 프론트 타입으로 매핑한다.
 *   이유: SOFA `components.cardiovascular`처럼 snake가 아닌 키가 있어 deep transform이 위험.
 * - 인증 헤더(Cognito JWT)는 추후 Cognito 연동 시 주입한다.
 *
 * `VITE_API_BASE` 가 비어 있으면 `MOCK_MODE = true` 로 본 모듈은 사용되지 않는다.
 * service 함수가 직접 mock 데이터를 반환하는 모드. 단, `request<T>`는 항상 활성화된 상태.
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** API_BASE가 비어 있으면 mock 모드. service 레이어에서 분기에 사용. */
export const MOCK_MODE = API_BASE.length === 0;

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
 * 표준 fetch 래퍼.
 * - JSON 응답을 envelope로 가정하고 `data`만 반환.
 * - HTTP non-2xx 또는 envelope.success === false 면 ApiError throw.
 *
 * 사용 예:
 *   const dashboard = await request<DashboardResponse>(`/dashboard/icu/${icuId}`);
 *   const created = await request<CreateResult>('/consultations', {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   });
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

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

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
