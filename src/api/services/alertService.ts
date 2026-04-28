import type { Alert } from '../../types';
import { mockAlerts } from '../mock/alerts';

/**
 * 알림 서비스 — 알림 누적 페이지와 토스트 모달이 모두 이걸 통해 데이터를 가져온다.
 * 백엔드 연결 시 이 파일의 함수만 fetch 호출로 교체.
 */

/** 전체 알림 (최신순). 나중에 GET /alerts 로 교체 */
export function getAlerts(): Alert[] {
  return mockAlerts;
}

/** 미확인(new) 알림 수 — 종 버튼 배지에 사용 */
export function getNewAlertCount(): number {
  return mockAlerts.filter((a) => a.status === 'new').length;
}

function formatNowKr(): string {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 알림 확인 처리. 나중에 POST /alerts/{id}/acknowledge 로 교체 */
export function acknowledgeAlert(alertId: string, by: string): Alert | null {
  const alert = mockAlerts.find((a) => a.id === alertId);
  if (!alert) return null;
  alert.status = 'acknowledged';
  alert.acknowledgedBy = by;
  alert.acknowledgedAt = formatNowKr();
  return alert;
}

/** 알림 종료 처리. 나중에 POST /alerts/{id}/resolve 로 교체 */
export function resolveAlert(alertId: string): Alert | null {
  const alert = mockAlerts.find((a) => a.id === alertId);
  if (!alert) return null;
  alert.status = 'resolved';
  alert.resolvedAt = formatNowKr();
  return alert;
}
