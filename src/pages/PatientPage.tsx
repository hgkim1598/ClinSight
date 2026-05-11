import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ModelKey } from '../types';
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

  // 그 외 환자 상세 묶음은 한 번에 fetch.
  const { data: bundle, loading, error, refetch } = useAsync(async () => {
    const [patient, predictions, timeline, schedule] = await Promise.all([
      getPatientDetail(stayId),
      getModelPredictions(stayId),
      getTimeline(stayId),
      getSchedule(stayId),
    ]);
    return { patient, predictions, timeline, schedule };
  }, [stayId]);

  // VitalChart용 view-model은 observations에서 즉시 파생.
  const vitals = useMemo(
    () => observationsToVitalData(clinical.observations),
    [clinical.observations],
  );

  const [selectedModel, setSelectedModel] = useState<ModelKey | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: report } = useAsync(
    async () => (reportOpen ? await getPatientReport(stayId) : null),
    [stayId, reportOpen],
  );

  // clinical 데이터와 bundle 모두 준비된 후 렌더.
  if (loading || clinical.loading) {
    return (
      <div className="patient-page">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="patient-page">
        <ErrorState onRetry={refetch} />
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
  if (!bundle) return null;

  const { patient, predictions, timeline, schedule } = bundle;

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
        <ModelDetailView
          selectedModel={selectedModel}
          predictions={predictions}
          onBack={() => setSelectedModel(null)}
          onChangeModel={(k) => setSelectedModel(k)}
        />
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
            <div className="patient-page__models-grid">
              {MODEL_ORDER.map((key) => (
                <ModelCard
                  key={key}
                  modelKey={key}
                  prediction={predictions[key]}
                  onSelect={(k) => setSelectedModel(k)}
                />
              ))}
            </div>
          </section>

          <ClinicalTimeline events={timeline} schedule={schedule} />
        </>
      )}

      <FloatingChatButton stayToken={patient.stayToken} />

      {report && (
        <PatientReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          report={report}
        />
      )}
    </div>
  );
}
