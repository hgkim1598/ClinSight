import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ModelKey, ModelPrediction } from '../types';
import { getPatientDetail } from '../api/services/patientService';
import { observationsToVitalData } from '../api/services/vitalService';
import { getModelPredictions } from '../api/services/modelService';
import { getPatientReport } from '../api/services/reportService';
import { getSchedule, getTimeline } from '../api/services/timelineService';
import { formatPatientName } from '../utils/formatPatientName';
import { ClinicalDataProvider } from '../context/ClinicalDataContext';
import { useClinicalData } from '../context/useClinicalData';
import Breadcrumb from '../components/common/Breadcrumb';
import PatientHeader from '../components/common/PatientHeader';
import VitalChart from '../components/common/VitalChart';
import ModelCard from '../components/common/ModelCard';
import ModelDetailView from '../components/common/ModelDetailView';
import ClinicalTimeline from '../components/common/ClinicalTimeline';
import FloatingChatButton from '../components/common/FloatingChatButton';
import PatientReportModal from '../components/common/PatientReportModal';
import ReportLoadingOverlay from '../components/common/report/ReportLoadingOverlay';
import Clock from '../components/common/Clock';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { useAsync } from '../hooks/useAsync';
import './PatientPage.css';

const MODEL_ORDER: ModelKey[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];
const LAST_UPDATED_MIN = 2;

/**
 * Provider 밖에서 stayId를 잡아 ClinicalDataProvider 트리를 세팅.
 * `key={stayId}` 로 stay 전환 시 Provider가 자연 remount되어 캐시가 깨끗하게 리셋된다.
 */
export default function PatientPage() {
  const { stayId = '' } = useParams<{ stayId: string }>();
  return (
    <ClinicalDataProvider key={stayId} stayId={stayId}>
      <PatientPageContent stayId={stayId} />
    </ClinicalDataProvider>
  );
}

interface PatientPageContentProps {
  stayId: string;
}

function PatientPageContent({ stayId }: PatientPageContentProps) {
  const navigate = useNavigate();

  // /clinical-data는 ClinicalDataProvider가 소유. 본 컴포넌트는 소비만.
  const clinical = useClinicalData();

  // 각 API 호출을 독립적으로. 하나가 실패해도 다른 섹션은 정상 렌더.
  // patient + clinical 만 critical — 페이지-레벨 loading/error 분기.
  // predictions/timeline/schedule 는 optional — 섹션별 처리.
  const patientQ = useAsync(() => getPatientDetail(stayId), [stayId]);
  const predictionsQ = useAsync(() => getModelPredictions(stayId), [stayId]);
  const timelineQ = useAsync(() => getTimeline(stayId), [stayId]);
  const scheduleQ = useAsync(() => getSchedule(stayId), [stayId]);

  // VitalChart용 view-model은 observations에서 즉시 파생.
  const vitals = useMemo(
    () => observationsToVitalData(clinical.observations),
    [clinical.observations],
  );

  const [selectedModel, setSelectedModel] = useState<ModelKey | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const {
    data: report,
    error: reportError,
    refetch: refetchReport,
  } = useAsync(
    async () => (reportOpen ? await getPatientReport(stayId) : null),
    [stayId, reportOpen],
  );

  const retryTimelineAndSchedule = useCallback(() => {
    timelineQ.refetch();
    scheduleQ.refetch();
  }, [timelineQ, scheduleQ]);

  // patient + clinical 만 페이지 전체 차단. 나머지는 섹션별로 처리.
  if (patientQ.loading || clinical.loading) {
    return (
      <div className="patient-page">
        <LoadingState />
      </div>
    );
  }
  if (patientQ.error) {
    return (
      <div className="patient-page">
        <ErrorState onRetry={patientQ.refetch} />
      </div>
    );
  }
  if (clinical.error) {
    return (
      <div className="patient-page">
        <ErrorState onRetry={clinical.refetch} />
      </div>
    );
  }

  const patient = patientQ.data;
  if (!patient) {
    return (
      <div className="patient-page">
        <nav className="patient-page__nav">
          <div className="patient-page__nav-left">
            <button
              type="button"
              className="patient-page__back"
              onClick={() => navigate('/')}
              aria-label="ICU 현황으로 돌아가기"
            >
              <ChevronLeft size={20} />
            </button>
            <Breadcrumb
              items={[
                { label: 'ICU 대시보드', path: '/' },
                { label: '환자 상세' },
              ]}
            />
          </div>
        </nav>
        <div className="patient-page__empty">
          환자를 찾을 수 없습니다. (stayId: {stayId || '없음'})
        </div>
      </div>
    );
  }

  const predictions = predictionsQ.data ?? null;
  const timeline = timelineQ.data ?? [];
  const schedule = scheduleQ.data ?? [];
  const timelineSectionError = !!(timelineQ.error || scheduleQ.error);

  const displayName = formatPatientName(patient.patientToken);
  const isDetail = selectedModel != null;

  return (
    <div className={`patient-page ${isDetail ? 'patient-page--detail' : ''}`}>
      <nav className="patient-page__nav">
        <div className="patient-page__nav-left">
          <button
            type="button"
            className="patient-page__back"
            onClick={() => navigate('/')}
            aria-label="ICU 현황으로 돌아가기"
          >
            <ChevronLeft size={20} />
          </button>
          <Breadcrumb
            items={[
              { label: 'ICU 대시보드', path: '/' },
              { label: `${displayName} (${patient.currentBedLabel})` },
            ]}
          />
        </div>
        <Clock className="patient-page__clock" />
      </nav>

      <PatientHeader patient={patient} onSummaryClick={() => setReportOpen(true)} />

      {isDetail ? (
        predictionsQ.error ? (
          <section className="patient-page__section-error">
            <ErrorState
              message="예측 데이터를 불러올 수 없습니다"
              onRetry={predictionsQ.refetch}
            />
          </section>
        ) : predictionsQ.loading ? (
          <LoadingState />
        ) : predictions ? (
          <ModelDetailView
            selectedModel={selectedModel}
            predictions={predictions}
            onBack={() => setSelectedModel(null)}
            onChangeModel={(k) => setSelectedModel(k)}
          />
        ) : (
          <section className="patient-page__section-error">
            <ErrorState
              message="예측 데이터가 없습니다"
              onRetry={predictionsQ.refetch}
            />
          </section>
        )
      ) : (
        <>
          <VitalChart vitals={vitals} patientId={stayId} />

          <section className="patient-page__models">
            <header className="patient-page__models-head">
              <h3 className="patient-page__models-title">예측 모델</h3>
              <span className="patient-page__models-meta">
                클릭하여 모델 상세 분석 · 마지막 갱신 {LAST_UPDATED_MIN}분 전
              </span>
            </header>
            {predictionsQ.error ? (
              <ErrorState
                message="예측 데이터를 불러올 수 없습니다"
                onRetry={predictionsQ.refetch}
              />
            ) : predictionsQ.loading ? (
              <LoadingState />
            ) : (
              <div className="patient-page__models-grid">
                {MODEL_ORDER.map((key) => {
                  const pred: ModelPrediction | null = predictions?.[key] ?? null;
                  return (
                    <ModelCard
                      key={key}
                      modelKey={key}
                      prediction={pred}
                      onSelect={(k) => setSelectedModel(k)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {timelineSectionError ? (
            <section className="patient-page__section-error">
              <ErrorState
                message="타임라인을 불러올 수 없습니다"
                onRetry={retryTimelineAndSchedule}
              />
            </section>
          ) : timelineQ.loading || scheduleQ.loading ? (
            <LoadingState />
          ) : (
            <ClinicalTimeline events={timeline} schedule={schedule} />
          )}
        </>
      )}

      <FloatingChatButton stayToken={patient.stayToken} />

      {reportOpen && report && (
        <PatientReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          report={report}
        />
      )}
      {reportOpen && !report && !reportError && (
        <ReportLoadingOverlay onClose={() => setReportOpen(false)} />
      )}
      {reportOpen && !report && reportError && (
        <ReportLoadingOverlay
          error
          onClose={() => setReportOpen(false)}
          onRetry={refetchReport}
        />
      )}
    </div>
  );
}
