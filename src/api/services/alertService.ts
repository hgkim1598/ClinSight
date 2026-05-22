/**
 * Alert Service
 *
 *  - GET  /alerts             → getAlerts()
 *  - GET  /alerts/count       → getAlertCount() (total / unread / critical_unread)
 *  - POST /alerts/{id}/read         → markAlertRead()
 *  - POST /alerts/{id}/acknowledge  → acknowledgeAlert()
 *  - POST /alerts/{id}/resolve      → resolveAlert()
 *
 * read(per-user) vs acknowledge(시스템 전체)를 분리한다.
 */
import type { Alert, AlertCount } from '../../types';
import { MOCK_MODE, request } from '../client';
import { mockAlertsWire, type WireAlert } from '../mock/alerts';

function mapAlert(w: WireAlert): Alert {
  // 백엔드가 아직 v_alerts 뷰가 아닌 원본 alerts(flat)를 내려준다 — delivery 객체 없이
  // read_at/acknowledged_at 가 최상위로, stay_id/trigger_rule_key 등 다른 이름으로 옴.
  // 뷰 기준 필드가 오면 그걸 쓰고, 없으면 원본 필드로 폴백 → 뷰 전환 후에도 안 깨짐.
  // TODO: 백엔드 뷰 전환 완료 후 폴백 필드(stay_id/trigger_rule_key/read_at/acknowledged_at) 제거
  return {
    alertId: w.alert_id,
    stayToken: w.stay_token ?? w.stay_id ?? '',
    alertType: w.alert_type ?? '',
    alertSource: w.alert_source ?? w.trigger_rule_key ?? '',
    severity: w.severity,
    status: w.status,
    title: w.title,
    message: w.message,
    tags: w.tags_jsonb ?? [],
    confidence: w.confidence ?? null,
    createdAt: w.created_at,
    delivery: {
      deliveryId: w.delivery?.delivery_id ?? '',
      readAt: w.delivery?.read_at ?? w.read_at ?? null,
      acknowledgedAt: w.delivery?.acknowledged_at ?? w.acknowledged_at ?? null,
    },
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getAlerts(): Promise<Alert[]> {
  if (MOCK_MODE) {
    return mockAlertsWire.map(mapAlert);
  }
  // request()는 HTTP 4xx/5xx·네트워크 에러 시 ApiError throw → 에러 화면으로 전파(의도).
  const wire = await request<{ alerts: WireAlert[] }>('/alerts');
  // 200 OK 이후의 파싱 실패는 에러 화면이 아니라 빈 목록(→ 빈 상태 UI)으로 처리.
  if (!Array.isArray(wire?.alerts)) {
    // TODO: 프로덕션 정리 시 console.warn 제거.
    console.warn('[alertService] /alerts 응답에 alerts 배열이 없습니다. 빈 목록 처리:', wire);
    return [];
  }
  const mapped: Alert[] = [];
  for (const w of wire.alerts) {
    try {
      mapped.push(mapAlert(w));
    } catch (e) {
      // TODO: 프로덕션 정리 시 console.warn 제거. 파싱 실패 항목은 건너뛰고 경고만 남긴다.
      console.warn('[alertService] alert 항목 매핑 실패 — 건너뜀:', e, w);
    }
  }
  return mapped;
}

export async function getAlertCount(): Promise<AlertCount> {
  if (MOCK_MODE) {
    const total = mockAlertsWire.length;
    const unread = mockAlertsWire.filter((a) => a.delivery.read_at == null).length;
    const criticalUnread = mockAlertsWire.filter(
      (a) => a.delivery.read_at == null && a.severity === 'critical',
    ).length;
    return { total, unread, criticalUnread };
  }
  const w = await request<{ total: number; unread: number; critical_unread: number }>(
    '/alerts/count',
  );
  return { total: w.total, unread: w.unread, criticalUnread: w.critical_unread };
}

/** POST /alerts/{alertId}/read */
export async function markAlertRead(alertId: string): Promise<Alert | null> {
  if (MOCK_MODE) {
    const w = mockAlertsWire.find((a) => a.alert_id === alertId);
    if (!w) return null;
    if (!w.delivery.read_at) w.delivery.read_at = nowIso();
    return mapAlert(w);
  }
  await request<{ alert_id: string; read_at: string }>(
    `/alerts/${encodeURIComponent(alertId)}/read`,
    { method: 'POST' },
  );
  // 서버 응답은 메타뿐 — 전체 객체 재조회는 호출 측 책임
  const all = await getAlerts();
  return all.find((a) => a.alertId === alertId) ?? null;
}

/** POST /alerts/{alertId}/acknowledge */
export async function acknowledgeAlert(alertId: string): Promise<Alert | null> {
  if (MOCK_MODE) {
    const w = mockAlertsWire.find((a) => a.alert_id === alertId);
    if (!w) return null;
    w.status = 'acknowledged';
    const at = nowIso();
    w.delivery.acknowledged_at = at;
    if (!w.delivery.read_at) w.delivery.read_at = at;
    return mapAlert(w);
  }
  await request<{ alert_id: string; status: string; acknowledged_at: string }>(
    `/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: 'POST' },
  );
  const all = await getAlerts();
  return all.find((a) => a.alertId === alertId) ?? null;
}

/** POST /alerts/{alertId}/resolve */
export async function resolveAlert(alertId: string): Promise<Alert | null> {
  if (MOCK_MODE) {
    const w = mockAlertsWire.find((a) => a.alert_id === alertId);
    if (!w) return null;
    w.status = 'resolved';
    return mapAlert(w);
  }
  await request<{ alert_id: string; status: string; resolved_at: string }>(
    `/alerts/${encodeURIComponent(alertId)}/resolve`,
    { method: 'POST' },
  );
  const all = await getAlerts();
  return all.find((a) => a.alertId === alertId) ?? null;
}
