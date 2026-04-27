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
import { useTheme } from '../../hooks/useTheme';
import type { OrganKey } from '../../types';
import bodyDarkUrl from '../../assets/images/anatomy/body-silhouette-dark.png';
import bodyLightUrl from '../../assets/images/anatomy/body-silhouette-light.png';
import heartRaw from '../../assets/icons/organs/heart.svg?raw';
import lungsRaw from '../../assets/icons/organs/lungs.svg?raw';
import brainRaw from '../../assets/icons/organs/brain.svg?raw';
import liverRaw from '../../assets/icons/organs/liver.svg?raw';
import kidneysRaw from '../../assets/icons/organs/kidneys.svg?raw';
import bloodCellsRaw from '../../assets/icons/organs/blood-cells.svg?raw';
import './SofaPanel.css';

interface SofaPanelProps {
  patientId: string;
}

interface OrganDef {
  key: OrganKey;
  label: string;
  iconSvg: string;
  color: string;
  /** 버튼 위치 (실루엣 컨테이너 기준 %). 시계 방향 배치. */
  buttonPos: { top?: string; right?: string; bottom?: string; left?: string; transform?: string };
  /** 리더 라인 시작점(버튼 anchor). x/y는 SVG % 문자열. */
  anchor: { x: string; y: string };
  /** 리더 라인 끝점(실루엣 내부 장기 위치). */
  target: { x: string; y: string };
}

/**
 * 좌측 3 / 우측 3 두 컬럼으로 배치.
 * - anchor: 버튼 안쪽 가장자리 + 세로 중심.
 * - target: 실루엣 내부 해부학적 위치(전면 정면도, 이미지 우측 = 인체 좌측).
 *   심장은 흉부 중앙에서 약간 인체 좌측, 간은 인체 우측 늑골 아래, 신장은 허리 양쪽,
 *   응고계는 특정 장기 대신 복부 중앙에 배치.
 */
const ORGANS: OrganDef[] = [
  {
    key: 'cardio',
    label: '심혈관',
    iconSvg: heartRaw,
    color: '#E24B4A',
    buttonPos: { left: '0%', top: '10%' },
    anchor: { x: '14%', y: '22%' },
    target: { x: '52%', y: '50%' },
  },
  {
    key: 'hepatic',
    label: '간',
    iconSvg: liverRaw,
    color: '#EF9F27',
    buttonPos: { left: '0%', top: '40%' },
    anchor: { x: '14%', y: '52%' },
    target: { x: '46%', y: '58%' },
  },
  {
    key: 'coag',
    label: '응고계',
    iconSvg: bloodCellsRaw,
    color: '#D85A30',
    buttonPos: { left: '0%', top: '70%' },
    anchor: { x: '14%', y: '82%' },
    target: { x: '40%', y: '80%' },
  },
  {
    key: 'cns',
    label: 'CNS',
    iconSvg: brainRaw,
    color: '#7F77DD',
    buttonPos: { right: '0%', top: '10%' },
    anchor: { x: '86%', y: '22%' },
    target: { x: '50%', y: '14%' },
  },
  {
    key: 'resp',
    label: '호흡기',
    iconSvg: lungsRaw,
    color: '#378ADD',
    buttonPos: { right: '0%', top: '40%' },
    anchor: { x: '86%', y: '52%' },
    target: { x: '57%', y: '46%' },
  },
  {
    key: 'renal',
    label: '신장',
    iconSvg: kidneysRaw,
    color: '#5DCAA5',
    buttonPos: { right: '0%', top: '70%' },
    anchor: { x: '86%', y: '82%' },
    target: { x: '55%', y: '70%' },
  },
];

const ORGAN_KEYS: OrganKey[] = ORGANS.map((o) => o.key);

function scoreToToneClass(score: number): 'safe' | 'warn' | 'danger' {
  if (score >= 3) return 'danger';
  if (score === 2) return 'warn';
  return 'safe';
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

export default function SofaPanel({ patientId }: SofaPanelProps) {
  const trend = useMemo(() => getSofaTrend(patientId), [patientId]);
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

  return (
    <div className="sofa-panel">
      <div className="sofa-body">
        <svg
          className="sofa-body__leaders"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {ORGANS.map((o) => (
            <line
              key={o.key}
              x1={o.anchor.x}
              y1={o.anchor.y}
              x2={o.target.x}
              y2={o.target.y}
              stroke="var(--anatomy-line)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          ))}
        </svg>

        <img
          src={silhouetteSrc}
          alt=""
          aria-hidden="true"
          className="sofa-body__silhouette"
        />

        {ORGANS.map((o) => {
          const score = latestScores[o.key];
          const tone = score == null ? 'muted' : scoreToToneClass(score);
          const isSelected = selected === o.key;
          const scoreLabel = score == null ? '측정 데이터 없음' : `${score}점`;
          return (
            <button
              key={o.key}
              type="button"
              className={`sofa-organ sofa-organ--${o.key} ${
                isSelected ? 'is-selected' : ''
              }`}
              style={o.buttonPos}
              onClick={() => handleOrganClick(o.key)}
              aria-pressed={isSelected}
              aria-label={`${o.label} ${scoreLabel}${isSelected ? ' (선택됨)' : ''}`}
            >
              <span
                className="sofa-organ__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: o.iconSvg }}
              />
              <span className="sofa-organ__meta">
                <span className="sofa-organ__label">{o.label}</span>
                <span className={`sofa-organ__score sofa-organ__score--${tone}`}>
                  {score == null ? '—' : score}
                </span>
              </span>
            </button>
          );
        })}
      </div>

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
