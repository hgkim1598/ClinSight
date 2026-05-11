/**
 * GET /icu-stays/{stayId}/sofa 응답을 모사한 mock.
 *
 * V4 API는 시점별 row 구조 (`sofa_trend: [{ observed_at, sofa_total, components: {...} }]`).
 * organ key는 풀네임(cardiovascular/respiration/cns/liver/renal/coagulation).
 * 프론트 view-model(SofaTrend)은 service 레이어에서 organ별 column으로 pivot 변환.
 */

export interface WireSofaComponents {
  respiration: number | null;
  coagulation: number | null;
  liver: number | null;
  cardiovascular: number | null;
  cns: number | null;
  renal: number | null;
}

export interface WireSofaTrendRow {
  observed_at: string;
  sofa_total: number;
  components: WireSofaComponents;
}

export interface WireSofaResponse {
  stay_token: string;
  sofa_trend: WireSofaTrendRow[];
}

const REFERENCE_NOW = '2026-05-11T08:45:00+09:00';
const HOUR_MS = 3600_000;

function isoOffsetHours(hoursAgo: number): string {
  return new Date(new Date(REFERENCE_NOW).getTime() - hoursAgo * HOUR_MS).toISOString();
}

const HOURS = [24, 21, 18, 15, 12, 9, 6, 3, 0];

interface OrganSeries {
  cardiovascular: number[];
  respiration: number[];
  cns: number[];
  liver: number[];
  renal: number[];
  coagulation: number[];
}

function buildResponse(stayToken: string, s: OrganSeries): WireSofaResponse {
  const rows: WireSofaTrendRow[] = HOURS.map((h, i) => {
    const components: WireSofaComponents = {
      cardiovascular: s.cardiovascular[i],
      respiration: s.respiration[i],
      cns: s.cns[i],
      liver: s.liver[i],
      renal: s.renal[i],
      coagulation: s.coagulation[i],
    };
    const total = Object.values(components).reduce<number>(
      (sum, v) => sum + (v ?? 0),
      0,
    );
    return {
      observed_at: isoOffsetHours(h),
      sofa_total: total,
      components,
    };
  });
  return { stay_token: stayToken, sofa_trend: rows };
}

const PT19482: OrganSeries = {
  cardiovascular: [1, 1, 2, 2, 3, 3, 4, 4, 4],
  respiration:    [1, 1, 2, 2, 2, 3, 3, 3, 3],
  cns:            [0, 1, 1, 1, 2, 2, 2, 2, 2],
  liver:          [0, 0, 0, 1, 1, 1, 1, 2, 2],
  renal:          [0, 0, 1, 1, 2, 2, 3, 3, 3],
  coagulation:    [0, 0, 0, 0, 1, 1, 1, 2, 2],
};

const PT20314: OrganSeries = {
  cardiovascular: [2, 2, 2, 2, 2, 3, 3, 3, 3],
  respiration:    [2, 2, 3, 3, 3, 3, 3, 3, 3],
  cns:            [1, 1, 1, 1, 1, 1, 2, 2, 2],
  liver:          [0, 0, 0, 1, 1, 1, 1, 1, 1],
  renal:          [0, 1, 1, 1, 1, 2, 2, 2, 2],
  coagulation:    [1, 1, 2, 2, 2, 2, 2, 2, 2],
};

const PT20781: OrganSeries = {
  cardiovascular: [1, 1, 1, 1, 2, 2, 2, 2, 2],
  respiration:    [1, 1, 2, 2, 2, 2, 2, 2, 2],
  cns:            [0, 0, 0, 1, 1, 1, 1, 1, 1],
  liver:          [1, 1, 1, 2, 2, 2, 2, 2, 2],
  renal:          [0, 0, 0, 0, 1, 1, 1, 1, 1],
  coagulation:    [0, 0, 0, 0, 0, 1, 1, 1, 1],
};

const STABLE: OrganSeries = {
  cardiovascular: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  respiration:    [0, 0, 1, 1, 1, 1, 1, 1, 1],
  cns:            [0, 0, 0, 0, 0, 0, 0, 0, 0],
  liver:          [0, 0, 0, 0, 0, 0, 0, 0, 0],
  renal:          [0, 0, 0, 0, 0, 1, 1, 1, 1],
  coagulation:    [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export const mockSofaByStay: Record<string, WireSofaResponse> = {
  'ST-19482': buildResponse('ST-19482', PT19482),
  'ST-20314': buildResponse('ST-20314', PT20314),
  'ST-20781': buildResponse('ST-20781', PT20781),
  'ST-21005': buildResponse('ST-21005', STABLE),
  'ST-21219': buildResponse('ST-21219', STABLE),
  'ST-21442': buildResponse('ST-21442', STABLE),
  'ST-21508': buildResponse('ST-21508', STABLE),
  'ST-21603': buildResponse('ST-21603', STABLE),
};

export const emptySofaResponse = (stayToken: string): WireSofaResponse => ({
  stay_token: stayToken,
  sofa_trend: [],
});
