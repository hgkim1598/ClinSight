import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ModelKey } from '../types';
import { getPatientById } from '../api/services/patientService';
import { getVitals } from '../api/services/vitalService';
import { getModelPredictions } from '../api/services/modelService';
import { getPatientReport } from '../api/services/reportService';
import { getTimeline } from '../api/services/timelineService';
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

export default function PatientPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: bundle, loading, error, refetch } = useAsync(async () => {
    const [patient, vitals, predictions, timeline] = await Promise.all([
      getPatientById(id),
      getVitals(id),
      getModelPredictions(id),
      getTimeline(id),
    ]);
    return { patient, vitals, predictions, timeline };
  }, [id]);

  const [selectedModel, setSelectedModel] = useState<ModelKey | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: report } = useAsync(
    async () => (reportOpen ? await getPatientReport(id) : null),
    [id, reportOpen],
  );

  if (loading) {
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
  if (!bundle) return null;

  const { patient, vitals, predictions, timeline } = bundle;

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
          환자를 찾을 수 없습니다. (id: {id || '없음'})
        </div>
      </div>
    );
  }

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
              { label: `${patient.name} (${patient.bed})` },
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
          <VitalChart vitals={vitals} patientId={id} />

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

          <ClinicalTimeline events={timeline} />
        </>
      )}

      <FloatingChatButton patientId={patient.id} />

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
