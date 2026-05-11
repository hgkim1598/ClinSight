/**
 * SOFA Service
 *
 * - GET /icu-stays/{stayId}/sofa → wire (시점별 row) → view-model (organ별 column).
 */
import type { OrganKey, SofaTrend, SofaTrendRow } from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  emptySofaResponse,
  mockSofaByStay,
  type WireSofaResponse,
  type WireSofaTrendRow,
} from '../mock/sofaScores';
import { toRelativeLabel } from '../../utils/time';

const ORGANS: OrganKey[] = [
  'cardiovascular',
  'respiration',
  'cns',
  'liver',
  'renal',
  'coagulation',
];

function mapRow(w: WireSofaTrendRow): SofaTrendRow {
  return {
    observedAt: w.observed_at,
    sofaTotal: w.sofa_total,
    components: { ...w.components },
  };
}

/** wire response → view-model (rows → SofaTrend) */
export function sofaResponseToTrend(w: WireSofaResponse): SofaTrend {
  const rows = w.sofa_trend.map(mapRow);
  const sorted = rows.slice().sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const refIso = sorted.length > 0 ? sorted[sorted.length - 1].observedAt : new Date().toISOString();
  const times = sorted.map((r) => toRelativeLabel(r.observedAt, refIso));

  const scores: Record<OrganKey, Array<number | null>> = {
    cardiovascular: [], respiration: [], cns: [], liver: [], renal: [], coagulation: [],
  };
  for (const r of sorted) {
    for (const organ of ORGANS) {
      scores[organ].push(r.components[organ]);
    }
  }
  return {
    times,
    scores,
    totals: sorted.map((r) => r.sofaTotal),
  };
}

export const emptySofaTrend = (): SofaTrend => ({
  times: [],
  scores: {
    cardiovascular: [], respiration: [], cns: [], liver: [], renal: [], coagulation: [],
  },
  totals: [],
});

/** GET /icu-stays/{stayId}/sofa */
export async function getSofaTrend(stayId: string): Promise<SofaTrend> {
  if (MOCK_MODE) {
    const wire = mockSofaByStay[stayId] ?? emptySofaResponse(stayId);
    return sofaResponseToTrend(wire);
  }
  const wire = await request<WireSofaResponse>(
    `/icu-stays/${encodeURIComponent(stayId)}/sofa`,
  );
  return sofaResponseToTrend(wire);
}
