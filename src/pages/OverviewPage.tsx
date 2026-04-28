import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  BedDouble,
  Clock,
  Stethoscope,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { KpiData, Patient, RiskLevel } from '../types';
import { getPatients } from '../api/services/patientService';
import { getStaffing } from '../api/services/staffingService';
import Badge from '../components/common/Badge';
import KpiCard from '../components/common/KpiCard';
import AlertBell from '../components/common/AlertBell';
import './OverviewPage.css';

const PAGE_SIZE = 10;

type SortKey =
  | 'risk-desc'
  | 'risk-asc'
  | 'admit-desc'
  | 'admit-asc'
  | 'sofa-desc'
  | 'age-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'risk-desc', label: '위험도순 (높은순)' },
  { value: 'risk-asc', label: '위험도순 (낮은순)' },
  { value: 'admit-desc', label: '입실시간순 (최신순)' },
  { value: 'admit-asc', label: '입실시간순 (오래된순)' },
  { value: 'sofa-desc', label: 'SOFA 점수순 (높은순)' },
  { value: 'age-desc', label: '나이순 (높은순)' },
];

const RISK_RANK: Record<RiskLevel, number> = { high: 3, med: 2, low: 1 };

function sortPatients(list: Patient[], key: SortKey): Patient[] {
  const arr = [...list];
  switch (key) {
    case 'risk-desc':
      return arr.sort((a, b) => RISK_RANK[b.risk] - RISK_RANK[a.risk]);
    case 'risk-asc':
      return arr.sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk]);
    case 'admit-desc':
      return arr.sort((a, b) => b.admit.localeCompare(a.admit));
    case 'admit-asc':
      return arr.sort((a, b) => a.admit.localeCompare(b.admit));
    case 'sofa-desc':
      return arr.sort((a, b) => b.sofa - a.sofa);
    case 'age-desc':
      return arr.sort((a, b) => b.age - a.age);
  }
}

function formatKstClock(date: Date): string {
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${fmt.format(date)} KST`;
}

function formatAdmit(admit: string): string {
  const parts = admit.split(' ');
  if (parts.length !== 2) return admit;
  const date = parts[0].split('-').slice(1).join('-');
  return `${date} ${parts[1]}`;
}

function buildKpis(list: Patient[], totalBeds: number): KpiData[] {
  const total = list.length;
  const highCount = list.filter((p) => p.risk === 'high').length;
  const remaining = totalBeds - total;
  const occupancyPct = Math.round((total / totalBeds) * 100);

  return [
    {
      label: '총 환자 수',
      value: `${total}명`,
      sub: `병상 ${totalBeds}개 중`,
      tone: 'default',
    },
    {
      label: '병상 점유율',
      value: `${occupancyPct}%`,
      sub: `잔여 ${remaining} 병상`,
      tone: 'default',
    },
    {
      label: '고위험 환자',
      value: `${highCount}명`,
      sub: '즉각 모니터링 필요',
      tone: 'danger',
    },
  ];
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const patients = useMemo(() => getPatients(), []);
  const staffing = useMemo(() => getStaffing(), []);
  const kpis = useMemo(
    () => buildKpis(patients, staffing.totalBeds),
    [patients, staffing.totalBeds],
  );
  const [now, setNow] = useState(() => new Date());
  const [sortKey, setSortKey] = useState<SortKey>('risk-desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortedPatients = useMemo(
    () => sortPatients(patients, sortKey),
    [patients, sortKey],
  );

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedPatients = sortedPatients.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const kpiIcons = [
    <Users size={16} />,
    <BedDouble size={16} />,
    <AlertTriangle size={16} />,
  ];

  const nurseRatio = patients.length / staffing.nurses.onDuty;
  const nurseRatioLabel = `1 : ${
    Number.isInteger(nurseRatio) ? nurseRatio : nurseRatio.toFixed(1)
  }`;
  const nurseStatusOk = nurseRatio <= staffing.thresholds.maxPatientsPerNurse;
  const nurseStatusLabel = nurseStatusOk ? '권장 수준' : '주의';
  const nurseTagClass = nurseStatusOk
    ? 'capacity-tag capacity-tag--safe'
    : 'capacity-tag capacity-tag--warn';

  return (
    <div className="overview">
      <header className="overview__header">
        <h2 className="overview__title">ICU 현황</h2>
        <div className="overview__header-right">
          <span className="overview__clock">
            <Clock size={14} />
            {formatKstClock(now)}
          </span>
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
            <span className="capacity-card__value">
              {staffing.doctors.onDuty} / {staffing.doctors.total}명
            </span>
            {staffing.doctors.activities.map((activity) => (
              <span
                key={activity.label}
                className="capacity-tag capacity-tag--info"
              >
                <span className="capacity-tag__label">{activity.label}</span>
                <span className="capacity-tag__count">{activity.count}</span>
              </span>
            ))}
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
                <th>환자 ID</th>
                <th>나이/성별</th>
                <th>입실시간</th>
                <th>주진단</th>
                <th>SOFA</th>
                <th>패혈증 위험도</th>
              </tr>
            </thead>
            <tbody>
              {pagedPatients.map((p) => (
                <tr
                  key={p.id}
                  className={p.risk === 'high' ? 'is-high' : ''}
                  onClick={() => navigate(`/patient/${p.id}`)}
                >
                  <td className="cell-bed">{p.bed}</td>
                  <td className="cell-id">{p.id}</td>
                  <td>
                    {p.age}세/{p.sex}
                  </td>
                  <td className="cell-admit">{formatAdmit(p.admit)}</td>
                  <td className="cell-diag" title={p.diag}>
                    {p.diag}
                  </td>
                  <td className="cell-sofa">{p.sofa}</td>
                  <td>
                    <Badge level={p.risk} />
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
