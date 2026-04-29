/// <reference types="vite/client" />

/**
 * 공통 API 클라이언트.
 *
 * 현재: mock 모드 — 각 서비스 함수가 mock 데이터를 직접 반환하므로 request()는 호출되지 않음.
 * API 전환 시:
 *   1. 각 서비스 파일에서 mock import 제거
 *   2. request<T>() 호출로 교체
 *   3. .env 파일에 `VITE_API_BASE=https://api.example.com` 추가
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * 표준 fetch 래퍼. API 전환 시 이 함수의 주석을 해제하면 즉시 활성화됨.
 *
 * 사용 예:
 *   const list = await request<Patient[]>('/patients');
 *   const created = await request<ConsultationRequest>('/consultations', {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   });
 */
export async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  // === 현재: mock 모드 (서비스가 직접 mock 반환) ===
  // 실제 API 연동 시 아래 주석을 해제하고 mock import를 제거.
  //
  // const res = await fetch(`${API_BASE}${endpoint}`, {
  //   headers: { 'Content-Type': 'application/json', ...options?.headers },
  //   ...options,
  // });
  // if (!res.ok) throw new ApiError(res.status, await res.text());
  // return (await res.json()) as T;

  void endpoint;
  void options;
  throw new Error('API client not configured — using mock mode');
}

export { API_BASE };
