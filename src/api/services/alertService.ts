/**
 * Alert Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/alerts.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /alerts (전체 / 상태별 GSI Query)
 *      - GET /alerts?status=new&select=count (미확인 카운트)
 *      - POST /alerts/{id}/acknowledge
 *      - POST /alerts/{id}/resolve
 *
 * 참고: docs/DYNAMO_SCHEMA.md §11 Alerts
 */
import type { Alert } from '../../types';
import { mockAlerts } from '../mock/alerts';

/** 전체 알림 (최신순). 나중에 GET /alerts 로 교체 */
export async function getAlerts(): Promise<Alert[]> {
  return mockAlerts;
}

/** 미확인(new) 알림 수 — 종 버튼 배지에 사용 */
export async function getNewAlertCount(): Promise<number> {
  return mockAlerts.filter((a) => a.status === 'new').length;
}

function formatNowKr(): string {
  // TODO: API 전환 시 ISO 8601 문자열로 교체. 표시용 변환은 utils/time.ts의 formatTime() 사용.
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 알림 확인 처리. 나중에 POST /alerts/{id}/acknowledge 로 교체 */
export async function acknowledgeAlert(
  alertId: string,
  by: string,
): Promise<Alert | null> {
  // TODO: API 전환 시 POST /alerts/{id}/acknowledge로 교체하고 mock mutation 제거
  const alert = mockAlerts.find((a) => a.id === alertId);
  if (!alert) return null;
  alert.status = 'acknowledged';
  alert.acknowledgedBy = by;
  alert.acknowledgedAt = formatNowKr();
  return alert;
}

/** 알림 종료 처리. 나중에 POST /alerts/{id}/resolve 로 교체 */
export async function resolveAlert(alertId: string): Promise<Alert | null> {
  // TODO: API 전환 시 POST /alerts/{id}/resolve로 교체하고 mock mutation 제거
  const alert = mockAlerts.find((a) => a.id === alertId);
  if (!alert) return null;
  alert.status = 'resolved';
  alert.resolvedAt = formatNowKr();
  return alert;
}
