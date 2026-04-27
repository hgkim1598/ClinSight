import type { OrganKey, SofaTrend } from '../../types';

const times = [
  '-24h', '-21h', '-18h', '-15h', '-12h', '-9h', '-6h', '-3h', 'Now',
];

/** PT-19482 — 악화 추세 (SOFA 12 환자, 다발 장기부전 진행). */
const pt19482: SofaTrend = {
  times,
  scores: {
    cardio:  [1, 1, 2, 2, 3, 3, 4, 4, 4],
    resp:    [1, 1, 2, 2, 2, 3, 3, 3, 3],
    cns:     [0, 1, 1, 1, 2, 2, 2, 2, 2],
    hepatic: [0, 0, 0, 1, 1, 1, 1, 2, 2],
    renal:   [0, 0, 1, 1, 2, 2, 3, 3, 3],
    coag:    [0, 0, 0, 0, 1, 1, 1, 2, 2],
  },
};

/** PT-20314 — 외상 환자, 호흡기/응고 우세. */
const pt20314: SofaTrend = {
  times,
  scores: {
    cardio:  [2, 2, 2, 2, 2, 3, 3, 3, 3],
    resp:    [2, 2, 3, 3, 3, 3, 3, 3, 3],
    cns:     [1, 1, 1, 1, 1, 1, 2, 2, 2],
    hepatic: [0, 0, 0, 1, 1, 1, 1, 1, 1],
    renal:   [0, 1, 1, 1, 1, 2, 2, 2, 2],
    coag:    [1, 1, 2, 2, 2, 2, 2, 2, 2],
  },
};

/** PT-20781 — 췌장염, 완만한 변동. */
const pt20781: SofaTrend = {
  times,
  scores: {
    cardio:  [1, 1, 1, 1, 2, 2, 2, 2, 2],
    resp:    [1, 1, 2, 2, 2, 2, 2, 2, 2],
    cns:     [0, 0, 0, 1, 1, 1, 1, 1, 1],
    hepatic: [1, 1, 1, 2, 2, 2, 2, 2, 2],
    renal:   [0, 0, 0, 0, 1, 1, 1, 1, 1],
    coag:    [0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
};

/** 안정 환자용 기본값 — 대부분 0~1점, 일부 2점. */
function buildStableTrend(): SofaTrend {
  return {
    times,
    scores: {
      cardio:  [1, 1, 1, 1, 1, 1, 1, 1, 1],
      resp:    [0, 0, 1, 1, 1, 1, 1, 1, 1],
      cns:     [0, 0, 0, 0, 0, 0, 0, 0, 0],
      hepatic: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      renal:   [0, 0, 0, 0, 0, 1, 1, 1, 1],
      coag:    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  };
}

/** 빈 환자용 — 모든 장기 0. */
export function emptySofaTrend(): SofaTrend {
  const zeros = Array(times.length).fill(0);
  const scores = {
    cardio: [...zeros],
    resp: [...zeros],
    cns: [...zeros],
    hepatic: [...zeros],
    renal: [...zeros],
    coag: [...zeros],
  } as Record<OrganKey, number[]>;
  return { times: [...times], scores };
}

export const sofaTrendByPatient: Record<string, SofaTrend> = {
  'PT-19482': pt19482,
  'PT-20314': pt20314,
  'PT-20781': pt20781,
  'PT-21005': buildStableTrend(),
  'PT-21219': buildStableTrend(),
  'PT-21442': buildStableTrend(),
  'PT-21508': buildStableTrend(),
  'PT-21603': buildStableTrend(),
};
