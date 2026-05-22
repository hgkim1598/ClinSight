import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type {
  ConsultationRequest,
  ConsultStatus,
  DashboardPatient,
} from '../types';
import { getConsultations } from '../api/services/consultationService';
import { DEPARTMENT_LABELS } from '../utils/departments';
import { getPatientReport } from '../api/services/reportService';
import { patientLocalData } from '../data/patientLocalData';
import { usePatients } from '../context/usePatients';
import { formatDateTime } from '../utils/time';
import Breadcrumb from '../components/common/Breadcrumb';
import PatientReportModal from '../components/common/PatientReportModal';
import ReportLoadingOverlay from '../components/common/report/ReportLoadingOverlay';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { useAsync } from '../hooks/useAsync';
import './ConsultationsPage.css';

type FilterKey = 'all' | ConsultStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'requested', label: '요청됨' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'completed', label: '완료' },
];

const STATUS_LABEL: Record<ConsultStatus, string> = {
  requested: '요청됨',
  in_progress: '진행 중',
  completed: '완료',
};

interface ConsultRowProps {
  consult: ConsultationRequest;
  patientCount: number;
  departmentMap: Record<string, string>;
  /** 캐시에서 stay_id 로 매칭된 환자 (이름/병실 표시용). 없으면 8자리 폴백. */
  patient?: DashboardPatient;
  onOpenReport: (stayToken: string) => void;
}

function ConsultRow({
  consult,
  patientCount,
  departmentMap,
  patient,
  onOpenReport,
}: ConsultRowProps) {
  const navigate = useNavigate();
  const toRecipients = consult.recipients.filter((r) => r.role === 'to');
  const primary = toRecipients[0];
  const moreCount = toRecipients.length - 1;
  // 캐시에 매칭된 환자가 있으면 이름(병실), 없으면 stay_id 앞 8자리만 (UUID 전체 노출 방지).
  const local = patient ? patientLocalData[patient.patientToken] : undefined;
  const localName = local?.name;
  const shortId = consult.stayToken ? `${consult.stayToken.slice(0, 8)}…` : '';
  const displayName = localName ?? shortId;
  const bedLabel = localName ? patient?.currentBedLabel : undefined;

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
            {displayName}
            {bedLabel ? ` (${bedLabel})` : ''}
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
            {departmentMap[primary.departmentCode] ?? primary.departmentCode}
            {moreCount > 0 && (
              <span className="consult-row__recipient-more"> 외 {moreCount}명</span>
            )}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="consult-row__subject">
        {consult.priority === 'urgent' && (
          <span className="consult-row__priority">긴급</span>
        )}
        {consult.subject || '—'}
      </td>
      <td className="consult-row__time">{formatDateTime(consult.createdAt)}</td>
      <td>
        <div className="consult-row__actions">
          <button
            type="button"
            className="consult-row__action"
            onClick={() => onOpenReport(consult.stayToken)}
          >
            요청 내용
          </button>
          <span className="consult-row__sep" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            className="consult-row__action"
            onClick={() => navigate(`/patient/${consult.stayToken}`)}
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
  const [selectedStayToken, setSelectedStayToken] = useState<string | null>(null);

  const {
    data: consultations,
    loading,
    error,
    refetch,
  } = useAsync(() => getConsultations(), []);

  // 부서 한글명은 정적 라벨 맵 사용 (/staff/departments 의존 제거).
  const departmentMap = DEPARTMENT_LABELS;
  // 이미 캐시된 환자 목록으로 stay_id → 환자(이름/병실) 매칭 (추가 API 호출 없음).
  const { patientByStayId } = usePatients();

  const {
    data: report,
    error: reportError,
    refetch: refetchReport,
  } = useAsync(
    async () =>
      reportOpen && selectedStayToken
        ? await getPatientReport(selectedStayToken)
        : null,
    [reportOpen, selectedStayToken],
  );

  const countByStay = useMemo(
    () =>
      (consultations ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.stayToken] = (acc[c.stayToken] || 0) + 1;
        return acc;
      }, {}),
    [consultations],
  );

  const handleOpenReport = (stayToken: string) => {
    setSelectedStayToken(stayToken);
    setReportOpen(true);
  };

  const handleCloseReport = () => {
    setReportOpen(false);
    setSelectedStayToken(null);
  };

  if (loading) {
    return (
      <div className="consultations-page">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="consultations-page">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const allConsultations: ConsultationRequest[] = consultations ?? [];
  const filtered =
    filter === 'all'
      ? allConsultations
      : allConsultations.filter((c) => c.status === filter);

  const isAllEmpty = allConsultations.length === 0;

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
            총 {allConsultations.length}건
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
                  <th>제목</th>
                  <th>요청 시각</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ConsultRow
                    key={c.consultationId}
                    consult={c}
                    patientCount={countByStay[c.stayToken] ?? 1}
                    departmentMap={departmentMap}
                    patient={patientByStayId.get(c.stayToken)}
                    onOpenReport={handleOpenReport}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {reportOpen && report && (
        <PatientReportModal
          open={reportOpen}
          onClose={handleCloseReport}
          report={report}
          hideConsultButton
        />
      )}
      {reportOpen && !report && !reportError && (
        <ReportLoadingOverlay onClose={handleCloseReport} />
      )}
      {reportOpen && !report && reportError && (
        <ReportLoadingOverlay
          error
          onClose={handleCloseReport}
          onRetry={refetchReport}
        />
      )}
    </div>
  );
}
