import { useRef, useState } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import type { AiInsightSection, ModelKey, ModelPrediction, RiskLevel, RiskTone } from '../../types';
import { getAiInsight } from '../../api/services/aiInsightService';
import Badge from './Badge';
import TrendBar from './TrendBar';
import ShapChart from './ShapChart';
import RawMetrics from './RawMetrics';
import EscalationCard from './EscalationCard';
import AiInsightButton from './AiInsightButton';
import AiInsightModal from './AiInsightModal';
import './ModelDetailView.css';

interface ModelDetailViewProps {
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

function toneFallbackPct(tone: RiskTone): number {
  if (tone === 'danger') return 72;
  if (tone === 'warn') return 45;
  return 18;
}

function toneToRisk(tone: RiskTone): RiskLevel {
  if (tone === 'danger') return 'high';
  if (tone === 'warn') return 'med';
  return 'low';
}

function buildDeltaText(p: ModelPrediction): string {
  const delta = p.trendWarn.delta?.trim();
  if (!delta) return '추세 데이터 부족';
  return `${delta} 6시간 변화`;
}

export default function ModelDetailView({
  selectedModel,
  predictions,
  onBack,
  onChangeModel,
}: ModelDetailViewProps) {
  const shapRef = useRef<HTMLDivElement>(null);
  const [openSection, setOpenSection] = useState<AiInsightSection | null>(null);

  const prediction = predictions[selectedModel];
  const prob = currentProbability(prediction) ?? toneFallbackPct(prediction.tone);
  const risk = toneToRisk(prediction.tone);
  const otherModels = MODEL_ORDER.filter((k) => k !== selectedModel);

  const showEscalation =
    (selectedModel === 'ards' || selectedModel === 'shock') && prediction.escalation != null;
  const bannerBgClass =
    prediction.tone === 'danger' ? 'detail-banner--danger' : 'detail-banner--warn';

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
        return <RawMetrics metrics={prediction.raw} />;
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
            <span className={`model-detail__selected-pct model-detail__selected-pct--${prediction.tone}`}>
              {prob}
              <span className="model-detail__selected-unit">%</span>
            </span>
            <Badge level={risk} />
          </div>
          <div className="model-detail__gauge" aria-hidden="true">
            <div
              className={`model-detail__gauge-fill model-detail__gauge-fill--${prediction.tone}`}
              style={{ width: `${Math.min(100, prob)}%` }}
            />
          </div>
        </div>

        <div className="model-detail__divider" role="separator" />

        <div className="model-detail__others">
          <span className="model-detail__others-label">다른 모델</span>
          <ul>
            {otherModels.map((key) => {
              const other = predictions[key];
              const otherPct = currentProbability(other) ?? toneFallbackPct(other.tone);
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="model-detail__mini"
                    onClick={() => onChangeModel(key)}
                  >
                    <span
                      className={`model-detail__mini-dot model-detail__mini-dot--${other.tone}`}
                      aria-hidden="true"
                    />
                    <span className="model-detail__mini-title">{other.title}</span>
                    <span className="model-detail__mini-pct">{otherPct}%</span>
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
            <span className={`model-detail__header-pct model-detail__header-pct--${prediction.tone}`}>
              {prob}%
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
          <RawMetrics metrics={prediction.raw} />
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
        insight={openSection ? getAiInsight(selectedModel, openSection) : ''}
      >
        {openSection ? renderModalBody(openSection) : null}
      </AiInsightModal>
    </div>
  );
}
