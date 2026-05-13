import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Activity,
  Stethoscope,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  DashboardPatient,
  DashboardResponse,
  DashboardStaffing,
  KpiData,
  RiskLevel,
} from '../types';
import { getDashboardPatients } from '../api/services/patientService';
import { getStaffing } from '../api/services/staffingService';
import { CURRENT_ICU_ID } from '../utils/constants';
import { formatPatientName } from '../utils/formatPatientName';
import Badge from '../components/common/Badge';
import KpiCard from '../components/common/KpiCard';
import AlertBell from '../components/common/AlertBell';
import Clock from '../components/common/Clock';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { useAsync } from '../hooks/useAsync';
import './OverviewPage.css';

const PAGE_SIZE = 10;

type SortKey =
  | 'risk-desc'
  | 'risk-asc'
  | 'recent-desc'
  | 'recent-asc'
  | 'sofa-desc'
  | 'alert-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'risk-desc', label: '위험도순 (높은순)' },
  { value: 'risk-asc', label: '위험도순 (낮은순)' },
  { value: 'recent-desc', label: '최근 관측순 (최신순)' },
  { value: 'recent-asc', label: '최근 관측순 (오래된순)' },
  { value: 'sofa-desc', label: 'SOFA 점수순 (높은순)' },
  { value: 'alert-desc', label: '알림 많은순' },
];

const RISK_RANK: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };

function sortPatients(list: DashboardPatient[], key: SortKey): DashboardPatient[] {
  const arr = [...list];
  switch (key) {
    case 'risk-desc':
      return arr.sort(
        (a, b) =>
          RISK_RANK[b.latestMortalityRiskLabel] - RISK_RANK[a.latestMortalityRiskLabel],
      );
    case 'risk-asc':
      return arr.sort(
        (a, b) =>
          RISK_RANK[a.latestMortalityRiskLabel] - RISK_RANK[b.latestMortalityRiskLabel],
      );
    case 'recent-desc':
      return arr.sort((a, b) => b.lastObservationAt.localeCompare(a.lastObservationAt));
    case 'recent-asc':
      return arr.sort((a, b) => a.lastObservationAt.localeCompare(b.lastObservationAt));
    case 'sofa-desc':
      return arr.sort((a, b) => b.latestSofaTotal - a.latestSofaTotal);
    case 'alert-desc':
      return arr.sort((a, b) => b.activeAlertCount - a.activeAlertCount);
  }
}

/**
 * 배정 assignments[]에서 role별로 고유 staff_id를 집계.
 * 한 의료진이 여러 환자에 배정될 수 있으므로 중복 제거 후 인원 카운트.
 */
function countUniqueStaff(
  staffing: DashboardStaffing | null,
  role: string,
): number {
  if (!staffing) return 0;
  const ids = new Set<string>();
  for (const a of staffing.assignments) {
    for (const s of a.assignedStaff) {
      if (s.role === role) ids.add(s.staffId);
    }
  }
  return ids.size;
}

function buildKpis(dashboard: DashboardResponse): KpiData[] {
  const { totalPatients, highRiskCount, criticalAlertCount } = dashboard.summary;
  return [
    {
      label: '입실 환자',
      value: `${totalPatients}명`,
      sub: `${dashboard.icuUnit.displayName}`,
      tone: 'default',
    },
    {
      label: '고위험 환자',
      value: `${highRiskCount}명`,
      sub: '즉각 모니터링 필요',
      tone: 'danger',
    },
    {
      label: '활성 알림',
      value: `${criticalAlertCount}건`,
      sub: '미처리 critical',
      tone: criticalAlertCount > 0 ? 'warn' : 'default',
    },
  ];
}

/** 간호사 1명당 담당 가능한 최대 환자 수 — 운영 임계치 (정책 hardcode). */
const MAX_PATIENTS_PER_NURSE = 2;

export default function OverviewPage() {
  const navigate = useNavigate();
  const {
    data: dashboard,
    loading,
    error,
    refetch,
  } = useAsync(() => getDashboardPatients(CURRENT_ICU_ID), []);

  const { data: staffing } = useAsync(() => getStaffing(CURRENT_ICU_ID), []);

  const [sortKey, setSortKey] = useState<SortKey>('risk-desc');
  const [page, setPage] = useState(0);

  const kpis = useMemo(
    () => (dashboard ? buildKpis(dashboard) : []),
    [dashboard],
  );

  // Capacity 섹션 — staffing 응답의 assignments에서 unique 인원 + 비율 파생.
  const physicianCount = countUniqueStaff(staffing ?? null, 'physician');
  const nurseCount = countUniqueStaff(staffing ?? null, 'nurse');
  const totalPatients = dashboard?.summary.totalPatients ?? 0;
  const nurseRatio = nurseCount > 0 ? totalPatients / nurseCount : 0;
  const nurseRatioLabel =
    nurseCount > 0
      ? `1 : ${Number.isInteger(nurseRatio) ? nurseRatio : nurseRatio.toFixed(1)}`
      : '—';
  const nurseStatusOk = nurseCount > 0 && nurseRatio <= MAX_PATIENTS_PER_NURSE;
  const nurseStatusLabel = nurseStatusOk ? '권장 수준' : '주의';
  const nurseTagClass = nurseStatusOk
    ? 'capacity-tag capacity-tag--safe'
    : 'capacity-tag capacity-tag--warn';

  const sortedPatients = useMemo(
    () => sortPatients(dashboard?.patients ?? [], sortKey),
    [dashboard, sortKey],
  );

  if (loading) {
    return (
      <div className="overview">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="overview">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }
  if (!dashboard) return null;

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedPatients = sortedPatients.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const kpiIcons = [
    <Users size={16} />,
    <AlertTriangle size={16} />,
    <Activity size={16} />,
  ];

  return (
    <div className="overview">
      <header className="overview__header">
        <h2 className="overview__title">ICU 현황</h2>
        <div className="overview__header-right">
          <Clock className="overview__clock" />
          <AlertBell />
        </div>
      </header>

      <section className="overview__kpis">
        {kpis.map((kpi, idx) => (
          <KpiCard key={kpi.label} data={kpi} icon={kpiIcons[idx]} />
        ))}
      </section>

      <section className="overview__capacity" aria-label="Capacity">
        <div className="capacity-card">
          <span className="capacity-card__icon">
            <Stethoscope size={16} />
          </span>
          <div className="capacity-card__body">
            <span className="capacity-card__label">담당 의사 가용</span>
            <span className="capacity-card__value">{physicianCount}명</span>
          </div>
        </div>
        <div className="capacity-card">
          <span className="capacity-card__icon">
            <UserCheck size={16} />
          </span>
          <div className="capacity-card__body">
            <span className="capacity-card__label">간호사 : 환자 비율</span>
            <span className="capacity-card__value">{nurseRatioLabel}</span>
            <span className={nurseTagClass}>{nurseStatusLabel}</span>
          </div>
        </div>
      </section>

      <section className="overview__section">
        <div className="overview__section-head">
          <h3 className="overview__section-title">환자 목록</h3>
          <div className="overview__section-meta">
            <span className="overview__section-count">{sortedPatients.length}명</span>
            <label className="overview__sort">
              <span className="overview__sort-label">정렬</span>
              <span className="overview__sort-control">
                <select
                  className="overview__sort-select"
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value as SortKey);
                    setPage(0);
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="overview__sort-chevron" />
              </span>
            </label>
          </div>
        </div>

        <div className="overview__table-wrap">
          <table className="patient-table">
            <thead>
              <tr>
                <th>병상</th>
                <th>환자</th>
                <th>나이/성별</th>
                <th>최근 관측</th>
                <th>알림</th>
                <th>SOFA</th>
                <th>패혈증 위험도</th>
              </tr>
            </thead>
            <tbody>
              {pagedPatients.map((p) => (
                <tr
                  key={p.stayToken}
                  className={p.latestMortalityRiskLabel === 'high' ? 'is-high' : ''}
                  onClick={() => navigate(`/patient/${p.stayToken}`)}
                >
                  <td className="cell-bed">{p.currentBedLabel}</td>
                  <td className="cell-id">
                    {formatPatientName(p.patientToken)}
                    <span className="cell-id__token"> · {p.patientToken}</span>
                  </td>
                  <td>
                    {p.ageGroup}/{p.sex}
                  </td>
                  <td className="cell-admit">
                    {new Date(p.lastObservationAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="cell-sofa">{p.activeAlertCount}</td>
                  <td className="cell-sofa">{p.latestSofaTotal}</td>
                  <td>
                    <Badge level={p.latestMortalityRiskLabel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overview__pagination">
          <button
            type="button"
            className="overview__page-btn"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="overview__page-info">
            {safePage + 1} / {totalPages} 페이지
          </span>
          <button
            type="button"
            className="overview__page-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="다음 페이지"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
