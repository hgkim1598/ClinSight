import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  BedDouble,
  Clock,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import type { KpiData, Patient } from '../types';
import { getPatients } from '../api/services/patientService';
import Badge from '../components/common/Badge';
import KpiCard from '../components/common/KpiCard';
import './OverviewPage.css';

const TOTAL_BEDS = 20;
const DOCTORS_ON_DUTY = 3;
const DOCTORS_TOTAL = 4;
const NURSES_ON_DUTY = 4;

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
  // "2026-04-21 08:14" → "04-21 08:14"
  const parts = admit.split(' ');
  if (parts.length !== 2) return admit;
  const date = parts[0].split('-').slice(1).join('-');
  return `${date} ${parts[1]}`;
}

function buildKpis(list: Patient[]): KpiData[] {
  const total = list.length;
  const highCount = list.filter((p) => p.risk === 'high').length;
  const remaining = TOTAL_BEDS - total;
  const occupancyPct = Math.round((total / TOTAL_BEDS) * 100);

  return [
    {
      label: '총 환자 수',
      value: `${total}명`,
      sub: `병상 ${TOTAL_BEDS}개 중`,
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
  const kpis = useMemo(() => buildKpis(patients), [patients]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const kpiIcons = [
    <Users size={16} />,
    <BedDouble size={16} />,
    <AlertTriangle size={16} />,
  ];

  const nurseRatio = patients.length / NURSES_ON_DUTY;
  const nurseRatioLabel = `1 : ${Number.isInteger(nurseRatio) ? nurseRatio : nurseRatio.toFixed(1)}`;
  const nurseStatusLabel = nurseRatio <= 2 ? '권장 수준' : '주의';
  const nurseStatusClass = nurseRatio <= 2 ? 'capacity-card--ok' : 'capacity-card--warn';

  return (
    <div className="overview">
      <header className="overview__header">
        <h2 className="overview__title">ICU 현황</h2>
        <span className="overview__clock">
          <Clock size={14} />
          {formatKstClock(now)}
        </span>
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
              {DOCTORS_ON_DUTY} / {DOCTORS_TOTAL}명
            </span>
          </div>
        </div>
        <div className={`capacity-card ${nurseStatusClass}`}>
          <span className="capacity-card__icon">
            <UserCheck size={16} />
          </span>
          <div className="capacity-card__body">
            <span className="capacity-card__label">간호사 : 환자 비율</span>
            <span className="capacity-card__value">{nurseRatioLabel}</span>
            <span className="capacity-card__sub">{nurseStatusLabel}</span>
          </div>
        </div>
      </section>

      <section className="overview__section">
        <div className="overview__section-head">
          <h3 className="overview__section-title">환자 목록</h3>
          <span className="overview__section-count">{patients.length}명</span>
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
              {patients.map((p) => (
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
      </section>
    </div>
  );
}
