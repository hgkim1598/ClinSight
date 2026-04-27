import { FileText } from 'lucide-react';
import type { Patient } from '../../types';
import './PatientHeader.css';

interface PatientHeaderProps {
  patient: Patient;
  onSummaryClick?: () => void;
}

function hoursSince(admit: string): number | null {
  // "YYYY-MM-DD HH:mm" → Date
  const isoish = admit.replace(' ', 'T');
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  return hours;
}

function formatShort(ts?: string): string {
  if (!ts) return '—';
  const parts = ts.split(' ');
  if (parts.length !== 2) return ts;
  return `${parts[0].split('-').slice(1).join('-')} ${parts[1]}`;
}

export default function PatientHeader({ patient, onSummaryClick }: PatientHeaderProps) {
  const hours = hoursSince(patient.admit);
  const avatarLetter = patient.name.charAt(0);

  const fields: Array<{ label: string; value: string }> = [
    { label: '환자 ID', value: patient.id },
    { label: '나이/성별', value: `${patient.age}세 / ${patient.sex}` },
    { label: '병상', value: patient.bed },
    { label: '입실시간', value: formatShort(patient.admit) },
    { label: '주진단', value: patient.diag },
    {
      label: 'SOFA',
      value: hours != null ? `${patient.sofa} · 재실 ${hours}h` : `${patient.sofa}`,
    },
    { label: 'SEPSIS ONSET', value: formatShort(patient.sepsisOnset) },
  ];

  return (
    <section className="patient-header">
      <div className="patient-header__avatar" aria-hidden="true">
        {avatarLetter}
      </div>
      <div className="patient-header__main">
        <div className="patient-header__name">
          <span className="patient-header__name-id">{patient.id}</span>
          <span className="patient-header__name-text">{patient.name}</span>
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
