import { FileText } from 'lucide-react';
import type { PatientDetail } from '../../types';
import { formatPatientName } from '../../utils/formatPatientName';
import {
  formatDateTime,
  hospitalDay,
  onsetDay,
  postOpDay,
} from '../../utils/time';
import './PatientHeader.css';

interface PatientHeaderProps {
  patient: PatientDetail;
  onSummaryClick?: () => void;
}

export default function PatientHeader({ patient, onSummaryClick }: PatientHeaderProps) {
  const displayName = formatPatientName(patient.patientToken);
  const avatarLetter = displayName.charAt(0) || patient.patientToken.charAt(0);

  // 재원 일수 — HOD에 수술 환자는 POD 인라인 부기 (피드백 §1-2)
  const hodLabel = (() => {
    const hod = hospitalDay(patient.hospitalAdmitAt);
    if (patient.surgeryAt) {
      return `HOD ${hod}일째 (POD ${postOpDay(patient.surgeryAt)})`;
    }
    return `HOD ${hod}일째`;
  })();

  // Sepsis Onset 일수 — 발병일 표시 (피드백 §6-3)
  const onsetLabel = patient.sepsisOnsetAt
    ? `${formatDateTime(patient.sepsisOnsetAt)} · Onset ${onsetDay(patient.sepsisOnsetAt)}일째`
    : '—';

  const fields: Array<{ label: string; value: string }> = [
    { label: '환자', value: patient.patientToken },
    { label: '나이/성별', value: `${patient.ageGroup} / ${patient.sex}` },
    { label: '병상', value: patient.currentBedLabel },
    { label: '입실시간', value: formatDateTime(patient.icuInAt) },
    { label: '주진단', value: patient.primaryDiagnosisText },
    { label: '재원', value: hodLabel },
    { label: 'SEPSIS ONSET', value: onsetLabel },
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
