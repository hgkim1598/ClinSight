import { useRef, useState } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import type {
  AiInsightSection,
  ModelKey,
  ModelPrediction,
  RawMetric,
} from '../../types';
import { postAiInsight } from '../../api/services/aiInsightService';
import { useAsync } from '../../hooks/useAsync';
import { useClinicalData } from '../../context/useClinicalData';
import { useMeta } from '../../context/useMeta';
import Badge from './Badge';
import TrendBar from './TrendBar';
import ShapChart from './ShapChart';
import RawMetrics from './RawMetrics';
import EscalationCard from './EscalationCard';
import AiInsightButton from './AiInsightButton';
import AiInsightModal from './AiInsightModal';
import './ModelDetailView.css';

/** target_name → API model_key 매핑 — useMeta().modelByTarget으로 동적 lookup. */
function findApiModelKeyForTarget(
  target: ModelKey,
  modelByTarget: Record<string, { modelKey: string }>,
): string | null {
  return modelByTarget[target]?.modelKey ?? null;
}

interface ModelDetailViewProps {
  stayToken: string;
  selectedModel: ModelKey;
  predictions: Record<ModelKey, ModelPrediction>;
  onBack: () => void;
  onChangeModel: (key: ModelKey) => void;
}

const MODEL_ORDER: ModelKey[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];
const REFERENCE_TIME = '04-24 00:55 KST';

const SECTION_TITLES: Record<AiInsightSection, string> = {
  trend: '확률 추이',
  shap: 'SHAP 피처 기여도',
  rawMetrics: 'Raw 임상 지표',
  auxiliary: '보조지표: 치료 에스컬레이션 예측',
};

function currentProbability(p: ModelPrediction): number | null {
  if (p.trend.length === 0) return null;
  return p.trend[p.trend.length - 1].pct;
}

function buildDeltaText(p: ModelPrediction): string {
  const delta = p.trendWarn.delta?.trim();
  if (!delta) return '추세 데이터 부족';
  return `${delta} 6시간 변화`;
}

export default function ModelDetailView({
  stayToken,
  selectedModel,
  predictions,
  onBack,
  onChangeModel,
}: ModelDetailViewProps) {
  const shapRef = useRef<HTMLDivElement>(null);
  const [openSection, setOpenSection] = useState<AiInsightSection | null>(null);

  const prediction = predictions[selectedModel];
  const predictionId = prediction.predictionId;

  // AI 섹션 설명: 열린 섹션 + 선택 모델의 predictionId 기준으로 실제 API(postAiInsight) 호출.
  // predictionId 가 없으면(예측 데이터 없음) 호출하지 않고 null 로 둔다.
  const {
    data: insight,
    loading: insightLoading,
    error: insightError,
  } = useAsync(
    async () =>
      openSection && predictionId
        ? await postAiInsight(stayToken, predictionId, selectedModel, openSection)
        : null,
    [stayToken, predictionId, selectedModel, openSection],
  );

  // riskScorePct(서비스 매핑) 우선, 없으면 trend 마지막 값, 둘 다 없으면 null → "—"
  const prob = prediction.riskScorePct ?? currentProbability(prediction);
  const risk = prediction.riskLabel ?? null;
  // 예측 실패(riskLabel=null)면 tone과 무관하게 회색 표시.
  const displayTone = risk ? prediction.tone : 'unknown';
  const otherModels = MODEL_ORDER.filter((k) => k !== selectedModel);

  // Raw 임상지표: PatientPage가 캐싱한 ClinicalDataProvider에서 가져와 모델별로 가공.
  // 컨텍스트의 raw가 비어 있으면 prediction.raw (service 빌드 결과)로 fallback.
  const clinicalData = useClinicalData();
  const { modelByTarget } = useMeta();
  const apiModelKey = findApiModelKeyForTarget(selectedModel, modelByTarget);
  const rawFromContext: RawMetric[] = apiModelKey
    ? clinicalData.buildRawForModel(apiModelKey)
    : [];
  const rawMetrics: RawMetric[] =
    rawFromContext.length > 0 ? rawFromContext : prediction.raw;

  const showEscalation =
    (selectedModel === 'ards' || selectedModel === 'shock') && prediction.escalation != null;
  const bannerBgClass =
    prediction.tone === 'danger' ? 'detail-banner--danger' : 'detail-banner--warn';

  // 모달에 표시할 AI 설명 문자열: 예측 없음 / 로딩 / 에러 / 정상 분기.
  const insightText = !openSection
    ? ''
    : !predictionId
      ? '이 모델의 예측 데이터가 없어 AI 설명을 제공할 수 없습니다.'
      : insightLoading
        ? 'AI 설명을 불러오는 중...'
        : insightError
          ? 'AI 설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : (insight?.explanation ?? '');

  const scrollToShap = () => {
    shapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderModalBody = (section: AiInsightSection) => {
    switch (section) {
      case 'trend':
        return <TrendBar trend={prediction.trend} tone={prediction.tone} />;
      case 'shap':
        return <ShapChart features={prediction.shap} />;
      case 'rawMetrics':
        return <RawMetrics metrics={rawMetrics} />;
      case 'auxiliary':
        return prediction.escalation ? (
          <EscalationCard escalation={prediction.escalation} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="model-detail">
      <aside className="model-detail__left">
        <div className="model-detail__selected">
          <span className="model-detail__selected-label">선택 모델</span>
          <span className="model-detail__selected-title">{prediction.title}</span>
          <div className="model-detail__selected-value">
            <span className={`model-detail__selected-pct model-detail__selected-pct--${displayTone}`}>
              {prob != null ? prob : '—'}
              {prob != null && <span className="model-detail__selected-unit">%</span>}
            </span>
            <Badge level={risk} />
          </div>
          <div className="model-detail__gauge" aria-hidden="true">
            <div
              className={`model-detail__gauge-fill model-detail__gauge-fill--${displayTone}`}
              style={{ width: `${Math.min(100, prob ?? 0)}%` }}
            />
          </div>
        </div>

        <div className="model-detail__divider" role="separator" />

        <div className="model-detail__others">
          <span className="model-detail__others-label">다른 모델</span>
          <ul>
            {otherModels.map((key) => {
              const other = predictions[key];
              const otherPct = other.riskScorePct ?? currentProbability(other);
              const otherDisplayTone = other.riskLabel ? other.tone : 'unknown';
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="model-detail__mini"
                    onClick={() => onChangeModel(key)}
                  >
                    <span
                      className={`model-detail__mini-dot model-detail__mini-dot--${otherDisplayTone}`}
                      aria-hidden="true"
                    />
                    <span className="model-detail__mini-title">{other.title}</span>
                    <span className="model-detail__mini-pct">
                      {otherPct != null ? `${otherPct}%` : '—'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <button type="button" className="model-detail__back" onClick={onBack}>
          <ArrowLeft size={14} /> 전체 보기
        </button>
      </aside>

      <div className="model-detail__right">
        <header className="model-detail__header">
          <div>
            <h3 className="model-detail__title">{prediction.title}</h3>
            <span className="model-detail__time">데이터 기준: {REFERENCE_TIME}</span>
          </div>
          <div className="model-detail__header-value">
            <span className={`model-detail__header-pct model-detail__header-pct--${displayTone}`}>
              {prob != null ? `${prob}%` : '—'}
            </span>
            <Badge level={risk} />
          </div>
        </header>

        <section className="model-detail__section">
          <div className="model-detail__section-head">
            <h4 className="model-detail__section-title">{SECTION_TITLES.trend}</h4>
            <AiInsightButton onClick={() => setOpenSection('trend')} />
          </div>
          <TrendBar trend={prediction.trend} tone={prediction.tone} />
        </section>

        <section className={`detail-banner ${bannerBgClass}`}>
          <div className="detail-banner__body">
            <TrendingUp size={16} />
            <div>
              <div className="detail-banner__delta">{buildDeltaText(prediction)}</div>
              <div className="detail-banner__note">
                {prediction.trendWarn.note || '추가 관찰 및 평가 권장.'}
              </div>
            </div>
          </div>
          <button type="button" className="detail-banner__button" onClick={scrollToShap}>
            근거 보기 ↓
          </button>
        </section>

        <section className="model-detail__section" ref={shapRef}>
          <div className="model-detail__section-head">
            <h4 className="model-detail__section-title">{SECTION_TITLES.shap}</h4>
            <AiInsightButton onClick={() => setOpenSection('shap')} />
          </div>
          <ShapChart features={prediction.shap} />
        </section>

        <section className="model-detail__section">
          <div className="model-detail__section-head">
            <h4 className="model-detail__section-title">{SECTION_TITLES.rawMetrics}</h4>
            <AiInsightButton onClick={() => setOpenSection('rawMetrics')} />
          </div>
          <RawMetrics metrics={rawMetrics} />
        </section>

        {showEscalation && prediction.escalation && (
          <section className="model-detail__section">
            <div className="model-detail__section-head">
              <h4 className="model-detail__section-title">{SECTION_TITLES.auxiliary}</h4>
              <AiInsightButton onClick={() => setOpenSection('auxiliary')} />
            </div>
            <EscalationCard escalation={prediction.escalation} />
          </section>
        )}
      </div>

      <AiInsightModal
        open={openSection !== null}
        onClose={() => setOpenSection(null)}
        title={openSection ? SECTION_TITLES[openSection] : ''}
        insight={insightText}
      >
        {openSection ? renderModalBody(openSection) : null}
      </AiInsightModal>
    </div>
  );
}
