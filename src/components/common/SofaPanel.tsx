// 실제 MIMIC-IV 데이터에서는 장기별 결측 패턴이 다름
// cardiovascular은 거의 매시간, respiration/coagulation/liver는 하루 1~2회 수준
// 결측 보간 없이 실제 측정값만 표시. connectNulls={false} 유지.

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSofaTrend } from '../../api/services/sofaService';
import { useAsync } from '../../hooks/useAsync';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import { useTheme } from '../../hooks/useTheme';
import type { OrganKey, SofaTrend } from '../../types';
import bodyDarkUrl from '../../assets/images/anatomy/body-silhouette-dark.png';
import bodyLightUrl from '../../assets/images/anatomy/body-silhouette-light.png';
import SofaBodySvg from './sofa/SofaBodySvg';
import { ORGANS, ORGAN_KEYS } from './sofa/sofaConfig';
import './SofaPanel.css';

interface SofaPanelProps {
  patientId: string;
}

/** null/NaN을 모두 결측으로 간주해 유효 값이 1개 이상인지 검사 */
function hasValidData(scores: Array<number | null>): boolean {
  return scores.some((v) => v != null && !Number.isNaN(v));
}

/** 가장 마지막 유효 값 반환. 모두 결측이면 null. */
function findLatestValid(scores: Array<number | null>): number | null {
  for (let i = scores.length - 1; i >= 0; i--) {
    const v = scores[i];
    if (v != null && !Number.isNaN(v)) return v;
  }
  return null;
}

const ORGAN_LEGEND_LABEL: Record<OrganKey, string> = {
  cardio: '심혈관',
  resp: '호흡기',
  cns: 'CNS',
  hepatic: '간',
  renal: '신장',
  coag: '응고계',
};

const EMPTY_TREND: SofaTrend = {
  times: [],
  scores: { cardio: [], resp: [], cns: [], hepatic: [], renal: [], coag: [] },
};

export default function SofaPanel({ patientId }: SofaPanelProps) {
  const { data: trendData, loading, error, refetch } = useAsync(
    () => getSofaTrend(patientId),
    [patientId],
  );
  const trend: SofaTrend = trendData ?? EMPTY_TREND;
  const theme = useTheme();
  const [selected, setSelected] = useState<OrganKey | null>(null);

  const silhouetteSrc = theme === 'light' ? bodyLightUrl : bodyDarkUrl;

  const chartData = useMemo(
    () =>
      trend.times.map((t, i) => ({
        t,
        cardio: trend.scores.cardio[i],
        resp: trend.scores.resp[i],
        cns: trend.scores.cns[i],
        hepatic: trend.scores.hepatic[i],
        renal: trend.scores.renal[i],
        coag: trend.scores.coag[i],
      })),
    [trend],
  );

  const latestScores = ORGAN_KEYS.reduce<Record<OrganKey, number | null>>(
    (acc, key) => {
      acc[key] = findLatestValid(trend.scores[key]);
      return acc;
    },
    { cardio: null, resp: null, cns: null, hepatic: null, renal: null, coag: null },
  );

  const selectedHasNoData =
    selected !== null && !hasValidData(trend.scores[selected]);

  const handleOrganClick = (key: OrganKey) => {
    setSelected((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="sofa-panel">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="sofa-panel">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="sofa-panel">
      <SofaBodySvg
        silhouetteSrc={silhouetteSrc}
        selected={selected}
        latestScores={latestScores}
        onOrganClick={handleOrganClick}
      />

      <div className="sofa-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              stroke="var(--border)"
            />
            <YAxis
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              stroke="var(--border)"
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--text)',
              }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              formatter={(value, name) => [
                `${value}점`,
                ORGAN_LEGEND_LABEL[name as OrganKey] ?? String(name),
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
              formatter={(value) =>
                ORGAN_LEGEND_LABEL[value as OrganKey] ?? String(value)
              }
            />
            {ORGANS.map((o) => {
              const isFocused = selected === o.key;
              const dimmed = selected !== null && !isFocused;
              return (
                <Line
                  key={o.key}
                  type="monotone"
                  dataKey={o.key}
                  name={o.key}
                  stroke={o.color}
                  strokeWidth={isFocused ? 3 : 2}
                  strokeOpacity={dimmed ? 0.2 : 1}
                  dot={{ r: 3, fill: o.color, strokeOpacity: dimmed ? 0.2 : 1 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        {selectedHasNoData && selected !== null && (
          <div className="sofa-chart__empty" role="status">
            최근 24시간 내 {ORGAN_LEGEND_LABEL[selected]} 측정 데이터가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
