import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Alert, AlertSeverity } from '../types';
import {
  acknowledgeAlert,
  getAlerts,
  resolveAlert,
} from '../api/services/alertService';
import Breadcrumb from '../components/common/Breadcrumb';
import AlertCard from '../components/alerts/AlertCard';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { useAsync } from '../hooks/useAsync';
import { usePatients } from '../context/usePatients';
import './AlertsPage.css';

type FilterKey = 'all' | AlertSeverity;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
];

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function sortActiveAlerts(list: Alert[]): Alert[] {
  return [...list].sort((a, b) => {
    if (a.severity !== b.severity) {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const { data: alerts, loading, error, refetch } = useAsync(
    () => getAlerts(),
    [],
  );
  // 이미 캐시된 환자 목록으로 stay_id → 환자(이름/병실) 매칭 (추가 API 호출 없음).
  const { patientByStayId } = usePatients();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showResolved, setShowResolved] = useState(false);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    refetch();
  };

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
    refetch();
  };

  const handleRead = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="alerts-page">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="alerts-page">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const allAlerts: Alert[] = alerts ?? [];
  const filtered = allAlerts.filter(
    (a) => filter === 'all' || a.severity === filter,
  );
  const activeAlerts = sortActiveAlerts(filtered.filter((a) => a.status === 'active'));
  const ackAlerts = filtered.filter((a) => a.status === 'acknowledged');
  const resolvedAlerts = filtered.filter((a) => a.status === 'resolved');

  const totalActiveCount = allAlerts.filter((a) => a.status === 'active').length;
  const isAllEmpty = allAlerts.length === 0;

  return (
    <div className="alerts-page">
      <header className="alerts-page__header">
        <div className="alerts-page__nav-row">
          <button
            type="button"
            className="alerts-page__back"
            onClick={() => navigate(-1)}
            aria-label="돌아가기"
          >
            <ChevronLeft size={20} />
          </button>
          <Breadcrumb
            items={[
              { label: 'ICU 대시보드', path: '/' },
              { label: '알림 센터' },
            ]}
          />
        </div>

        <div className="alerts-page__title-row">
          <h1 className="alerts-page__title">알림 센터</h1>
          {totalActiveCount > 0 && (
            <span className="alerts-page__count" aria-label={`미확인 알림 ${totalActiveCount}건`}>
              {totalActiveCount}건 미확인
            </span>
          )}
        </div>

        <div className="alerts-filter" role="tablist" aria-label="우선순위 필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`alerts-filter__btn ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="alerts-page__content">
        {isAllEmpty ? (
          <div className="alerts-empty">알림 내역이 없습니다.</div>
        ) : (
          <>
            <section className="alerts-section">
              <header className="alerts-section__head">
                <span className="alerts-section__label">미확인</span>
                <span className="alerts-section__count alerts-section__count--danger">
                  {activeAlerts.length}
                </span>
              </header>
              {activeAlerts.length === 0 ? (
                <div className="alerts-empty">새로운 알림이 없습니다.</div>
              ) : (
                <div className="alerts-list">
                  {activeAlerts.map((a) => (
                    <AlertCard
                      key={a.alertId}
                      alert={a}
                      patient={patientByStayId.get(a.stayToken)}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                      onRead={handleRead}
                    />
                  ))}
                </div>
              )}
            </section>

            {ackAlerts.length > 0 && (
              <section className="alerts-section">
                <header className="alerts-section__head">
                  <span className="alerts-section__label">확인됨</span>
                  <span className="alerts-section__count">{ackAlerts.length}</span>
                </header>
                <div className="alerts-list">
                  {ackAlerts.map((a) => (
                    <AlertCard
                      key={a.alertId}
                      alert={a}
                      patient={patientByStayId.get(a.stayToken)}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                      onRead={handleRead}
                    />
                  ))}
                </div>
              </section>
            )}

            {resolvedAlerts.length > 0 && (
              <section className="alerts-section">
                <button
                  type="button"
                  className="alerts-section__toggle"
                  onClick={() => setShowResolved((v) => !v)}
                  aria-expanded={showResolved}
                >
                  <span className="alerts-section__label">해소됨</span>
                  <span className="alerts-section__count">{resolvedAlerts.length}</span>
                  {showResolved ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showResolved && (
                  <div className="alerts-list">
                    {resolvedAlerts.map((a) => (
                      <AlertCard
                      key={a.alertId}
                      alert={a}
                      patient={patientByStayId.get(a.stayToken)}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                      onRead={handleRead}
                    />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
