import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Alert, AlertPriority } from '../types';
import { acknowledgeAlert, getAlerts } from '../api/services/alertService';
import Breadcrumb from '../components/common/Breadcrumb';
import AlertCard from '../components/alerts/AlertCard';
import './AlertsPage.css';

type FilterKey = 'all' | AlertPriority;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' },
];

const PRIORITY_RANK: Record<AlertPriority, number> = { critical: 2, warning: 1 };

function sortNewAlerts(list: Alert[]): Alert[] {
  return [...list].sort((a, b) => {
    if (a.priority !== b.priority) {
      return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    }
    // 같은 우선순위 내에서는 timestamp 내림차순 (HH:MM 문자열은 lex 비교 OK)
    return b.timestamp.localeCompare(a.timestamp);
  });
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlerts());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showResolved, setShowResolved] = useState(false);

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id, 'Dr. 사용자');
    setAlerts([...getAlerts()]);
  };

  const filtered = alerts.filter((a) => filter === 'all' || a.priority === filter);
  const newAlerts = sortNewAlerts(filtered.filter((a) => a.status === 'new'));
  const ackAlerts = filtered.filter((a) => a.status === 'acknowledged');
  const resolvedAlerts = filtered.filter((a) => a.status === 'resolved');

  const totalNewCount = alerts.filter((a) => a.status === 'new').length;
  const isAllEmpty = alerts.length === 0;

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
          {totalNewCount > 0 && (
            <span className="alerts-page__count" aria-label={`미확인 알림 ${totalNewCount}건`}>
              {totalNewCount}건 미확인
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
                  {newAlerts.length}
                </span>
              </header>
              {newAlerts.length === 0 ? (
                <div className="alerts-empty">새로운 알림이 없습니다.</div>
              ) : (
                <div className="alerts-list">
                  {newAlerts.map((a) => (
                    <AlertCard key={a.id} alert={a} onAcknowledge={handleAcknowledge} />
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
                    <AlertCard key={a.id} alert={a} onAcknowledge={handleAcknowledge} />
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
                      <AlertCard key={a.id} alert={a} onAcknowledge={handleAcknowledge} />
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
