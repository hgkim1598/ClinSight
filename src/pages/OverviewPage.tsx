import { useEffect, useMemo, useState } from 'react';
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
  KpiData,
  RiskLevel,
} from '../types';
import { getDashboardPatients, type DashboardSort } from '../api/services/patientService';
import { getStaffing } from '../api/services/staffingService';
import { getAlerts } from '../api/services/alertService';
import { CURRENT_ICU_ID } from '../utils/constants';
import { usePatients } from '../context/usePatients';
import { patientLocalData } from '../data/patientLocalData';
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

/** UI 정렬 옵션 → 백엔드 정렬 파라미터. */
const SORT_PARAMS: Record<SortKey, DashboardSort> = {
  'risk-desc': { sortBy: 'latest_mortality_risk_score', sortOrder: 'desc' },
  'risk-asc': { sortBy: 'latest_mortality_risk_score', sortOrder: 'asc' },
  'recent-desc': { sortBy: 'last_observation_at', sortOrder: 'desc' },
  'recent-asc': { sortBy: 'last_observation_at', sortOrder: 'asc' },
  'sofa-desc': { sortBy: 'latest_sofa_total', sortOrder: 'desc' },
  'alert-desc': { sortBy: 'active_alert_count', sortOrder: 'desc' },
};

const RISK_RANK: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const rankOf = (lvl: RiskLevel | null) => (lvl ? RISK_RANK[lvl] : 0);

function sortPatients(list: DashboardPatient[], key: SortKey): DashboardPatient[] {
  const arr = [...list];
  switch (key) {
    case 'risk-desc':
      return arr.sort(
        (a, b) => rankOf(b.latestMortalityRiskLabel) - rankOf(a.latestMortalityRiskLabel),
      );
    case 'risk-asc':
      return arr.sort(
        (a, b) => rankOf(a.latestMortalityRiskLabel) - rankOf(b.latestMortalityRiskLabel),
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

function buildKpis(dashboard: DashboardResponse, activeAlertCount: number): KpiData[] {
  const totalPatients = dashboard.summary.totalPatients;
  // 고위험 환자는 환자행에서 파생(표와 일치). 활성 알림은 환자행 active_alert_count(누적 추정)
  // 합산이 부풀려져, 전용 알림 API(status==='active')에서 산출한 값을 인자로 받는다.
  const highRiskCount = dashboard.patients.filter(
    (p) => p.latestMortalityRiskLabel === 'high' || p.latestMortalityRiskLabel === 'critical',
  ).length;
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
      value: `${activeAlertCount}건`,
      sub: '현재 활성 알림',
      tone: activeAlertCount > 0 ? 'warn' : 'default',
    },
  ];
}

/** 간호사 1명당 담당 가능한 최대 환자 수 — 운영 임계치 (정책 hardcode). */
const MAX_PATIENTS_PER_NURSE = 2;

export default function OverviewPage() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('risk-desc');
  const [page, setPage] = useState(0);

  // 정렬은 서버에 위임 — sortKey 변경 시 sortBy/sortOrder 쿼리로 refetch.
  const {
    data: dashboard,
    loading,
    error,
    refetch,
  } = useAsync(
    () => getDashboardPatients(CURRENT_ICU_ID, SORT_PARAMS[sortKey]),
    [sortKey],
  );

  const { data: staffing } = useAsync(() => getStaffing(CURRENT_ICU_ID), []);

  // 활성 알림 KPI는 전용 알림 API에서 status='active' 개수로 산출(논블로킹).
  const { data: alerts } = useAsync(() => getAlerts(), []);
  const activeAlertCount = useMemo(
    () => (alerts ?? []).filter((a) => a.status === 'active').length,
    [alerts],
  );

  // 받아온 환자 목록을 캐시에 저장(write-through) → AlertsPage 등이 추가 호출 없이 재사용.
  const { setPatients } = usePatients();
  useEffect(() => {
    if (dashboard?.patients) setPatients(dashboard.patients);
  }, [dashboard, setPatients]);

  const kpis = useMemo(
    () => (dashboard ? buildKpis(dashboard, activeAlertCount) : []),
    [dashboard, activeAlertCount],
  );

  // Capacity 섹션 — staffing 역할별 가용 인원 + 간호사:환자 비율.
  const physicianCount = staffing?.physician.available ?? 0;
  const nurseCount = staffing?.nurse.available ?? 0;
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

        {sortedPatients.length === 0 ? (
          <div className="overview__empty" role="status">
            <span className="overview__empty-icon" aria-hidden="true">
              <Users size={24} />
            </span>
            <p className="overview__empty-title">현재 입실 환자가 없습니다</p>
            <p className="overview__empty-sub">신규 입실이 등록되면 자동으로 표시됩니다.</p>
          </div>
        ) : (
          <>
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
                  {pagedPatients.map((p, idx) => {
                    const local = patientLocalData[p.patientToken];
                    return (
                    <tr
                      key={p.stayId ?? p.stayToken ?? p.patientToken ?? `row-${idx}`}
                      className={p.latestMortalityRiskLabel === 'high' ? 'is-high' : ''}
                      onClick={() => navigate(`/patient/${p.stayId}`)}
                    >
                      <td className="cell-bed">{p.currentBedLabel}</td>
                      <td className="cell-id">
                        {local?.name ?? p.patientToken}
                        {local && <span className="cell-id__token"> · {p.patientToken}</span>}
                      </td>
                      <td>
                        {local?.age ?? p.ageGroup}/{p.sex}
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
                    );
                  })}
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
          </>
        )}
      </section>
    </div>
  );
}
