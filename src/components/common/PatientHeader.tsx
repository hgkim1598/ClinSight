import { FileText } from 'lucide-react';
import type { PatientDetail } from '../../types';
import { patientLocalData } from '../../data/patientLocalData';
import { formatDateTime } from '../../utils/time';
import './PatientHeader.css';

interface PatientHeaderProps {
  patient: PatientDetail;
  onSummaryClick?: () => void;
}

function hoursSinceIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

/**
 * ISO → 경과 일수. HOD/ICU Day(startFromOne=true) 는 당일을 1일로,
 * Onset Day(false) 는 0일로 표기. 빈 문자열 · Invalid Date 면 null.
 * 절대 ms 기반(86400000) — 자정 경계가 아닌 24h 단위.
 */
function calcDaysSince(isoDate: string, startFromOne: boolean): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  return startFromOne ? days + 1 : days;
}

export default function PatientHeader({ patient, onSummaryClick }: PatientHeaderProps) {
  // 로컬 매핑(PHI 분리 정책상 이름/실연령/체중·신장·BMI는 프론트 보관).
  // 없으면 백엔드가 보낸 값으로 폴백, 그것도 없으면 "—".
  const local = patientLocalData[patient.patientToken];
  const displayName = local?.name ?? patient.patientToken;
  const ageDisplay = local?.age ?? patient.ageGroup ?? '—';
  const avatarLetter = displayName.charAt(0) || '?';

  // 체류 일수 뱃지 — HOD(병원 입원일째) / ICU D(ICU 입실일째, 당일=1) / Onset D(패혈증 발생일째, 당일=0).
  // hospitalAdmitAt 이 빈 문자열이거나 sepsisOnsetAt 이 null 이면 해당 뱃지는 표시하지 않음.
  const hodDay = calcDaysSince(patient.hospitalAdmitAt, true);
  const icuDay = calcDaysSince(patient.icuInAt, true);
  const onsetDay = patient.sepsisOnsetAt
    ? calcDaysSince(patient.sepsisOnsetAt, false)
    : null;

  // fields grid — 나이/성별·체중·신장·BMI(신체 정보 줄로 이동) / 재실(ICU Day 뱃지로 대체) 제거.
  // 첫 항목 '환자' 더미 + .slice(1) 패턴은 기존 구조 그대로 유지.
  const fields: Array<{ label: string; value: string }> = [
    { label: '환자', value: patient.patientToken },
    { label: '병상', value: patient.currentBedLabel },
    { label: '입실시간', value: formatDateTime(patient.icuInAt) },
    { label: '주진단', value: patient.primaryDiagnosisText },
    {
      label: 'SEPSIS ONSET',
      value: patient.sepsisOnsetAt ? formatDateTime(patient.sepsisOnsetAt) : '—',
    },
  ];

  // 신체 보조 정보 (2줄) — 나이/성별은 항상, 체중/신장/BMI 는 local 데이터 있을 때만.
  const weightKg = local?.weightKg ?? null;
  const heightCm = local?.heightCm ?? null;
  const bmi = local?.bmi ?? null;

  return (
    <section className="patient-header">
      <div className="patient-header__avatar" aria-hidden="true">
        {avatarLetter}
      </div>
      <div className="patient-header__main">
        {/* 1단: 이름 + PT 토큰 + 체류 일수 뱃지 */}
        <div className="patient-header__name">
          <span className="patient-header__name-text">{displayName}</span>
          <span className="patient-header__name-id">{patient.patientToken}</span>
          {(hodDay != null || icuDay != null || onsetDay != null) && (
            <div className="patient-header__day-badges" aria-label="체류 일수">
              {hodDay != null && (
                <span
                  className="patient-header__day-badge patient-header__day-badge--hod"
                  title={`Hospital Day ${hodDay}`}
                >
                  HOD {hodDay}
                </span>
              )}
              {icuDay != null && (
                <span
                  className="patient-header__day-badge patient-header__day-badge--icu"
                  title={`ICU Day ${icuDay}`}
                >
                  ICU D{icuDay}
                </span>
              )}
              {onsetDay != null && (
                <span
                  className="patient-header__day-badge patient-header__day-badge--onset"
                  title={`Sepsis onset day ${onsetDay}`}
                >
                  Onset D{onsetDay}
                </span>
              )}
            </div>
          )}
        </div>
        {/* 2단: 나이/성별 + 신체 보조 정보 (체중·신장·BMI 는 데이터 있을 때만) */}
        <div className="patient-header__body-info">
          <span>
            {String(ageDisplay)} / {patient.sex === 'M' ? 'M' : 'F'}
          </span>
          {weightKg != null && <span>체중 {weightKg.toFixed(1)} kg</span>}
          {heightCm != null && <span>신장 {Math.round(heightCm)} cm</span>}
          {bmi != null && <span>BMI {bmi.toFixed(1)}</span>}
        </div>

        {/* 3단: 임상 핵심 정보 grid (병상 · 입실시간 · 주진단 · SEPSIS ONSET) */}
        <dl className="patient-header__grid">
          {fields.slice(1).map((f) => (
            <div className="patient-header__field" key={f.label}>
              <dt>{f.label}</dt>
              <dd title={f.value}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {onSummaryClick && (
        <button
          type="button"
          className="patient-header__summary"
          onClick={onSummaryClick}
          aria-label="환자 상태 요약 보고서 열기"
        >
          <FileText size={16} aria-hidden="true" />
          <span className="patient-header__summary-label">요약 보고서</span>
        </button>
      )}
    </section>
  );
}
