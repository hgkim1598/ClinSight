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
  return {
    alertId: w.alert_id,
    stayToken: w.stay_token,
    alertType: w.alert_type,
    alertSource: w.alert_source,
    severity: w.severity,
    status: w.status,
    title: w.title,
    message: w.message,
    tags: w.tags_jsonb,
    confidence: w.confidence,
    createdAt: w.created_at,
    delivery: {
      deliveryId: w.delivery.delivery_id,
      readAt: w.delivery.read_at,
      acknowledgedAt: w.delivery.acknowledged_at,
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
  const wire = await request<{ alerts: WireAlert[] }>('/alerts');
  return wire.alerts.map(mapAlert);
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
