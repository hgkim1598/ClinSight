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

export default function PatientHeader({ patient, onSummaryClick }: PatientHeaderProps) {
  // 로컬 매핑(PHI 분리 정책상 이름/실연령/체중·신장·BMI는 프론트 보관).
  // 없으면 백엔드가 보낸 값으로 폴백, 그것도 없으면 "—".
  const local = patientLocalData[patient.patientToken];
  const displayName = local?.name ?? patient.patientToken;
  const ageDisplay = local?.age ?? patient.ageGroup ?? '—';
  const hours = hoursSinceIso(patient.icuInAt);
  const avatarLetter = displayName.charAt(0) || '?';

  const fields: Array<{ label: string; value: string }> = [
    { label: '환자', value: patient.patientToken },
    { label: '나이/성별', value: `${String(ageDisplay)} / ${patient.sex}` },
    { label: '병상', value: patient.currentBedLabel },
    { label: '입실시간', value: formatDateTime(patient.icuInAt) },
    { label: '주진단', value: patient.primaryDiagnosisText },
    {
      label: '재실',
      value: hours != null ? `${hours}h` : '—',
    },
    {
      label: 'SEPSIS ONSET',
      value: patient.sepsisOnsetAt ? formatDateTime(patient.sepsisOnsetAt) : '—',
    },
    { label: '체중', value: local?.weightKg != null ? `${local.weightKg} kg` : '—' },
    { label: '신장', value: local?.heightCm != null ? `${local.heightCm} cm` : '—' },
    { label: 'BMI', value: local?.bmi != null ? `${local.bmi}` : '—' },
  ];

  return (
    <section className="patient-header">
      <div className="patient-header__avatar" aria-hidden="true">
        {avatarLetter}
      </div>
      <div className="patient-header__main">
        <div className="patient-header__name">
          <span className="patient-header__name-id">{patient.patientToken}</span>
          <span className="patient-header__name-text">{displayName}</span>
        </div>
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
