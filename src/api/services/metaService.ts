/**
 * Meta Service
 *  - GET /me            → getMe()
 *  - GET /meta/metrics  → getMetrics()
 *  - GET /meta/models   → getModels()
 *
 * 부트 시 1회 로드 후 MetaContext에서 메모리 캐싱.
 */
import type { Me, Metric, ModelMeta } from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockMe,
  mockMetrics,
  mockModels,
  type WireMe,
  type WireMetric,
  type WireModelMeta,
} from '../mock/meta';

function mapMe(w: WireMe): Me {
  return {
    staffId: w.staff_id,
    cognitoSub: w.cognito_sub,
    displayName: w.display_name,
    role: w.role,
    primaryDepartmentCode: w.primary_department_code,
    rolesJsonb: w.roles_jsonb,
    status: w.status,
    lastLoginAt: w.last_login_at,
  };
}

function mapMetric(w: WireMetric): Metric {
  return {
    configKey: w.config_key,
    displayName: w.display_name,
    metricGroup: w.metric_group,
    unit: w.unit,
    normalRangeLow: w.normal_range_low,
    normalRangeHigh: w.normal_range_high,
    sortOrder: w.sort_order,
  };
}

function mapModel(w: WireModelMeta): ModelMeta {
  return {
    modelKey: w.model_key,
    modelVersion: w.model_version,
    modelName: w.model_name,
    modelType: w.model_type,
    targetName: w.target_name,
    horizonHours: w.horizon_hours,
    endpointType: w.endpoint_type,
    defaultThreshold: w.default_threshold,
    inputFeatures: w.input_features,
  };
}

export async function getMe(): Promise<Me> {
  if (MOCK_MODE) return mapMe(mockMe);
  const w = await request<WireMe>('/me');
  return mapMe(w);
}

export async function getMetrics(): Promise<Metric[]> {
  if (MOCK_MODE) return mockMetrics.map(mapMetric);
  const w = await request<{ metrics: WireMetric[] }>('/meta/metrics');
  return w.metrics.map(mapMetric);
}

export async function getModels(): Promise<ModelMeta[]> {
  if (MOCK_MODE) return mockModels.map(mapModel);
  const w = await request<{ models: WireModelMeta[] }>('/meta/models');
  return w.models.map(mapModel);
}
