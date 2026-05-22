/**
 * SOFA Service
 *
 * - GET /icu-stays/{stayId}/sofa → wire (시점별 row) → view-model (organ별 column).
 * - 응답이 V4 spec 과 일치하지 않으면 (예: sofa_trend 키 누락) crash 대신
 *   console.warn + 빈 trend 반환. 진짜 네트워크 실패는 여전히 throw.
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
    observedAt: w.timestamp,
    sofaTotal: w.total_sofa,
    components: {
      cardiovascular: w.cardiovascular,
      respiration: w.respiration,
      cns: w.cns,
      liver: w.liver,
      renal: w.renal,
      coagulation: w.coagulation,
    },
  };
}

/** Spec 준수 응답인지 검증. sofa_trend 가 배열이어야 함. */
function isValidSofaResponse(w: unknown): w is WireSofaResponse {
  if (!w || typeof w !== 'object') return false;
  const o = w as Record<string, unknown>;
  return Array.isArray(o.sofa_trend);
}

/** wire response → view-model (rows → SofaTrend) */
export function sofaResponseToTrend(w: WireSofaResponse): SofaTrend {
  if (!isValidSofaResponse(w)) {
    const receivedKeys =
      w && typeof w === 'object' ? Object.keys(w as Record<string, unknown>) : null;
    // TODO: 프로덕션 정리 시 일괄 제거.
    console.warn(
      '[sofaService] /icu-stays/{stayId}/sofa 응답이 V4 spec 과 일치하지 않습니다. ' +
        '빈 trend 로 처리합니다. (필수 키: sofa_trend)',
      { receivedKeys },
    );
    return emptySofaTrend();
  }

  const rows = w.sofa_trend.map(mapRow).filter((r) => typeof r.observedAt === 'string' && r.observedAt.length > 0);
  const sorted = rows.slice().sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const refIso = sorted.length > 0 ? sorted[sorted.length - 1].observedAt : new Date().toISOString();
  const times = sorted.map((r) => toRelativeLabel(r.observedAt, refIso));
  const isoTimes = sorted.map((r) => r.observedAt);

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
    isoTimes,
    scores,
    totals: sorted.map((r) => r.sofaTotal),
  };
}

export const emptySofaTrend = (): SofaTrend => ({
  times: [],
  isoTimes: [],
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
