import type { RawMetric } from '../../types';
import './RawMetrics.css';

interface RawMetricsProps {
  metrics: RawMetric[];
  maxCards?: number;
}

function latestTime(metrics: RawMetric[]): string {
  // 기준 시각: 가장 "최근" 라벨을 찾되, mock이 상대시각이라 첫 번째를 사용
  const input = metrics.find((m) => m.isModelInput);
  return input?.time ?? metrics[0]?.time ?? '—';
}

/**
 * 문자열 값 표시 포맷. 숫자로 파싱 가능하면 정수는 그대로, 소수는 toFixed(1).
 * 숫자가 아닌 문자열(예: 'Yes', '없음')이면 원본 그대로 반환.
 */
function formatValue(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export default function RawMetrics({ metrics, maxCards = 3 }: RawMetricsProps) {
  const modelInputs = metrics.filter((m) => m.isModelInput).slice(0, maxCards);
  if (modelInputs.length === 0) {
    return (
      <div className="raw-metrics raw-metrics--empty">Raw 지표 데이터가 없습니다.</div>
    );
  }

  return (
    <div className="raw-metrics">
      <div className="raw-metrics__head">
        <span className="raw-metrics__title">모델 입력 피처 (참고용 실제 측정값)</span>
        <span className="raw-metrics__time">최근 측정값 · {latestTime(metrics)}</span>
      </div>
      <div className="raw-metrics__grid">
        {modelInputs.map((m) => (
          <div key={m.label} className="raw-metrics__cell">
            <span className="raw-metrics__cell-tag">Model input</span>
            <span className="raw-metrics__cell-label">{m.label}</span>
            <span className="raw-metrics__cell-value">
              {formatValue(m.value)}
              {m.unit && <span className="raw-metrics__cell-unit"> {m.unit}</span>}
            </span>
            <span className="raw-metrics__cell-time">{m.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
