import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ConsultationRequest, ConsultStatus } from '../types';
import { getConsultations } from '../api/services/consultService';
import { getPatientReport } from '../api/services/reportService';
import Breadcrumb from '../components/common/Breadcrumb';
import PatientReportModal from '../components/common/PatientReportModal';
import './ConsultationsPage.css';

type FilterKey = 'all' | ConsultStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'accepted', label: '수락됨' },
  { key: 'completed', label: '완료' },
];

const STATUS_LABEL: Record<ConsultStatus, string> = {
  pending: '대기중',
  accepted: '수락됨',
  completed: '완료',
};

interface ConsultRowProps {
  consult: ConsultationRequest;
  patientCount: number;
  onOpenReport: (patientId: string) => void;
}

function ConsultRow({ consult, patientCount, onOpenReport }: ConsultRowProps) {
  const navigate = useNavigate();
  const toRecipients = consult.recipients.filter((r) => r.role === 'to');
  const primary = toRecipients[0];
  const moreCount = toRecipients.length - 1;

  return (
    <tr className="consult-row">
      <td>
        <span
          className={`consult-row__status consult-row__status--${consult.status}`}
        >
          {STATUS_LABEL[consult.status]}
        </span>
      </td>
      <td>
        <div className="consult-row__patient">
          <span className="consult-row__patient-name">
            {consult.patientName} · {consult.patientBed}
          </span>
          <span
            className="consult-row__patient-count"
            aria-label={`이 환자의 협진 요청 ${patientCount}건`}
          >
            {patientCount}회
          </span>
        </div>
      </td>
      <td className="consult-row__recipient">
        {primary ? (
          <>
            {primary.name} ({primary.department})
            {moreCount > 0 && (
              <span className="consult-row__recipient-more"> 외 {moreCount}명</span>
            )}
          </>
        ) : (
          '—'
        )}
      </td>
      <td>
        {consult.priority === 'urgent' && (
          <span className="consult-row__priority">긴급</span>
        )}
      </td>
      <td className="consult-row__time">{consult.requestedAt}</td>
      <td>
        <div className="consult-row__actions">
          <button
            type="button"
            className="consult-row__action"
            onClick={() => onOpenReport(consult.patientId)}
          >
            요청 내용
          </button>
          <span className="consult-row__sep" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            className="consult-row__action"
            onClick={() => navigate(`/patient/${consult.patientId}`)}
          >
            환자 보기
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const consultations = useMemo(() => getConsultations(), []);

  const countByPatient = useMemo(
    () =>
      consultations.reduce<Record<string, number>>((acc, c) => {
        acc[c.patientId] = (acc[c.patientId] || 0) + 1;
        return acc;
      }, {}),
    [consultations],
  );

  const filtered =
    filter === 'all'
      ? consultations
      : consultations.filter((c) => c.status === filter);

  const report = useMemo(
    () => (reportOpen && selectedPatientId ? getPatientReport(selectedPatientId) : null),
    [reportOpen, selectedPatientId],
  );

  const handleOpenReport = (patientId: string) => {
    setSelectedPatientId(patientId);
    setReportOpen(true);
  };

  const handleCloseReport = () => {
    setReportOpen(false);
    setSelectedPatientId(null);
  };

  const isAllEmpty = consultations.length === 0;

  return (
    <div className="consultations-page">
      <header className="consultations-page__header">
        <div className="consultations-page__nav-row">
          <button
            type="button"
            className="consultations-page__back"
            onClick={() => navigate(-1)}
            aria-label="돌아가기"
          >
            <ChevronLeft size={20} />
          </button>
          <Breadcrumb
            items={[
              { label: 'ICU 대시보드', path: '/' },
              { label: '협진 요청' },
            ]}
          />
        </div>

        <div className="consultations-page__title-row">
          <h1 className="consultations-page__title">협진 요청</h1>
          <span className="consultations-page__count">
            총 {consultations.length}건
          </span>
        </div>

        <div className="consultations-filter" role="tablist" aria-label="상태 필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`consultations-filter__btn ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="consultations-page__content">
        {isAllEmpty ? (
          <div className="consultations-empty">협진 요청 내역이 없습니다.</div>
        ) : filtered.length === 0 ? (
          <div className="consultations-empty">
            해당 상태의 협진 요청이 없습니다.
          </div>
        ) : (
          <div className="consultations-table-wrap">
            <table className="consultations-table">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>환자</th>
                  <th>수신</th>
                  <th>우선순위</th>
                  <th>요청 시각</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ConsultRow
                    key={c.id}
                    consult={c}
                    patientCount={countByPatient[c.patientId] ?? 1}
                    onOpenReport={handleOpenReport}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {report && (
        <PatientReportModal
          open={reportOpen}
          onClose={handleCloseReport}
          report={report}
          hideConsultButton
        />
      )}
    </div>
  );
}
