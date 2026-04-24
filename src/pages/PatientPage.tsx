import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import type { ModelKey } from '../types';
import { getPatientById } from '../api/services/patientService';
import { getVitals } from '../api/services/vitalService';
import { getModelPredictions } from '../api/services/modelService';
import PatientHeader from '../components/common/PatientHeader';
import VitalChart from '../components/common/VitalChart';
import ModelCard from '../components/common/ModelCard';
import './PatientPage.css';

const MODEL_ORDER: ModelKey[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];
const LAST_UPDATED_MIN = 2;

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

export default function PatientPage() {
  const { id = '' } = useParams<{ id: string }>();
  const patient = useMemo(() => getPatientById(id), [id]);
  const vitals = useMemo(() => getVitals(id), [id]);
  const predictions = useMemo(() => getModelPredictions(id), [id]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleModelSelect = (key: ModelKey) => {
    console.log('[model select]', key);
  };

  if (!patient) {
    return (
      <div className="patient-page">
        <nav className="patient-page__nav">
          <Link to="/" className="patient-page__back">
            <ArrowLeft size={14} />
            ICU 현황
          </Link>
        </nav>
        <div className="patient-page__empty">
          환자를 찾을 수 없습니다. (id: {id || '없음'})
        </div>
      </div>
    );
  }

  return (
    <div className="patient-page">
      <nav className="patient-page__nav">
        <Link to="/" className="patient-page__back">
          <ArrowLeft size={14} />
          ICU 현황
        </Link>
        <span className="patient-page__clock">
          <Clock size={14} />
          {formatKstClock(now)}
        </span>
      </nav>

      <PatientHeader patient={patient} />

      <VitalChart vitals={vitals} />

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
              onSelect={handleModelSelect}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
