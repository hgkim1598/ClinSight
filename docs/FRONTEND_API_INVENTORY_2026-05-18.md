# 프론트엔드 API 호출 인벤토리 (2026-05-18)

ClinSight 프론트엔드가 백엔드 API를 호출하는 모든 지점을 모아 정리한 문서.
**컴포넌트 → service 함수 → HTTP 호출** 흐름을 도메인별로 매핑하고, 각 엔드포인트가 envelope unwrap 후 기대하는 `data` 구조와 화면 사용처를 함께 표기한다.

## 공통 사항

- **응답 envelope**: 모든 API는 `{ success, data, error }` 형태. `src/api/client.ts` 의 `request<T>()` 가 envelope을 unwrap해 `data`만 반환한다. 본 문서의 모든 "응답 구조" 표는 **`data` 안쪽** 기준.
- **Mock 모드**: `VITE_USE_MOCK !== 'false'` 면 service 함수가 mock 데이터를 그대로 반환하고 HTTP 호출을 일절 하지 않는다.
- **인증**: `Authorization: Bearer <idToken>` 헤더는 `client.ts` 가 모든 요청에 자동 주입한다.
- **wire vs view-model**:
  - **wire**: API가 그대로 내려주는 `snake_case` 객체. `data` 안쪽 구조.
  - **view-model**: 컴포넌트가 소비하는 `camelCase` 객체. service 레이어의 `mapXxx()` 함수가 변환.
  - 본 문서는 wire 필드명을 기준으로 적되, 컴포넌트 사용처에는 view-model명을 병기한다.

## 인덱스

| 도메인 | 엔드포인트 |
|---|---|
| [Meta & Identity](#1-meta--identity) | `/me`, `/meta/metrics`, `/meta/models`, `/staff/departments`, `/staff` |
| [ICU Dashboard](#2-icu-dashboard) | `/dashboard/icu/{icuId}`, `/dashboard/icu/{icuId}/staffing` |
| [Patient Detail](#3-patient-detail) | `/icu-stays/{stayId}`, `/icu-stays/{stayId}/clinical-data`, `/icu-stays/{stayId}/sofa`, `/icu-stays/{stayId}/timeline`, `/icu-stays/{stayId}/schedule` |
| [Predictions](#4-predictions) | `/icu-stays/{stayId}/predictions`, `/icu-stays/{stayId}/predictions/{modelKey}`, `/icu-stays/{stayId}/predictions/{modelKey}/history` |
| [Alerts](#5-alerts) | `/alerts`, `/alerts/count`, `/alerts/{id}/read`, `/alerts/{id}/acknowledge`, `/alerts/{id}/resolve` |
| [Consultations](#6-consultations) | `/consultations` (GET/POST), `/consultations/{id}`, `/consultations/{id}/status` |
| [Reports](#7-reports) | `/icu-stays/{stayId}/report/latest`, `/icu-stays/{stayId}/reports` |
| [AI Insights & Chat](#8-ai-insights--chat) | `/ai/insights`, `/ai/chat/sessions`, `/ai/chat/sessions/{sessionKey}/messages` (GET/POST) |

---

## 1. Meta & Identity

### 1-1. `GET /me`

| 항목 | 값 |
|---|---|
| **URL** | `/me` |
| **HTTP method** | GET |
| **service 함수** | `getMe()` |
| **service 파일** | [src/api/services/metaService.ts:59-63](../src/api/services/metaService.ts#L59-L63) |
| **호출처** | `MetaProvider` — [src/context/MetaContext.tsx](../src/context/MetaContext.tsx) (앱 부팅 시 1회, status='authenticated' 직후) |
| **사용 화면** | 메타 컨텍스트로 앱 전역 보관 (`useMe()` hook). 현재 적극 사용 화면 없음 — 향후 사이드바 사용자명/협진 요청자 자동 채움 등에 활용 예정 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `staff_id` | `string` | `staffId` | 협진 요청 시 requester_staff_id로 사용 예정 |
| `cognito_sub` | `string` | `cognitoSub` | Cognito sub와 staff_id 매핑 확인 |
| `display_name` | `string` | `displayName` | 사이드바/헤더 사용자명 표시 |
| `role` | `string` | `role` | UI 권한 분기 (physician/nurse/admin) |
| `primary_department_code` | `string` | `primaryDepartmentCode` | 협진 요청자 부서 자동 채움 |
| `roles_jsonb` | `string[]` | `rolesJsonb` | 다중 역할 보유자 권한 확장 |
| `status` | `string` | `status` | 계정 활성 상태 |
| `last_login_at` | `string` (ISO) | `lastLoginAt` | 직전 로그인 시각 표시 |

---

### 1-2. `GET /meta/metrics`

| 항목 | 값 |
|---|---|
| **URL** | `/meta/metrics` |
| **HTTP method** | GET |
| **service 함수** | `getMetrics()` |
| **service 파일** | [src/api/services/metaService.ts:65-69](../src/api/services/metaService.ts#L65-L69) |
| **호출처** | `MetaProvider` — [src/context/MetaContext.tsx](../src/context/MetaContext.tsx) |
| **사용 화면** | 환자 상세의 Vital/Lab 차트 라벨·단위·정상범위 산출 / 모델 상세의 Raw 임상 지표 라벨 / SHAP feature display 조립 (`modelService.composeShapDisplay`) |

**Response `data` 구조**: `{ metrics: Metric[] }`

| 필드 (`metrics[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `config_key` | `string` | `configKey` | metric_code 매칭 키 (`hr`, `lactate`, ...) |
| `display_name` | `string` | `displayName` | 차트 축 라벨, Raw 카드 라벨 |
| `metric_group` | `'vital'\|'lab'\|'derived'\|'sofa'` | `metricGroup` | 차트 탭 그룹 분기 |
| `unit` | `string` | `unit` | "mmol/L" 등 단위 표시 |
| `normal_range_low` | `number\|null` | `normalRangeLow` | 차트 정상범위 상한선 |
| `normal_range_high` | `number\|null` | `normalRangeHigh` | 차트 정상범위 하한선 |
| `sort_order` | `number` | `sortOrder` | 정렬 |

---

### 1-3. `GET /meta/models`

| 항목 | 값 |
|---|---|
| **URL** | `/meta/models` |
| **HTTP method** | GET |
| **service 함수** | `getModels()` |
| **service 파일** | [src/api/services/metaService.ts:71-75](../src/api/services/metaService.ts#L71-L75) |
| **호출처** | `MetaProvider` — [src/context/MetaContext.tsx](../src/context/MetaContext.tsx) |
| **사용 화면** | 모델 카드 5개 + 보조지표 2개의 표시명/임계값/input_features. Raw 카드의 "Model input / Display only" 라벨 산출 근거 |

**Response `data` 구조**: `{ models: ModelMeta[] }`

| 필드 (`models[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `model_key` | `string` | `modelKey` | API path 식별자 (`mortality_48h` 등) |
| `model_version` | `string` | `modelVersion` | 모델 버전 표시 |
| `model_name` | `string` | `modelName` | 카드 제목 ("48시간 사망 위험도") |
| `model_type` | `string` | `modelType` | 모델 종류 (xgboost 등) |
| `target_name` | `string` | `targetName` | UI 그룹핑 키 (`mortality` 등) |
| `horizon_hours` | `number` | `horizonHours` | 예측 기간 |
| `endpoint_type` | `string` | `endpointType` | 추론 인프라 구분 |
| `default_threshold` | `number` | `defaultThreshold` | 위험 등급 임계값 |
| `input_features` | `string[]` | `inputFeatures` | Raw 카드 "Model input" 배지 표시 근거 |

---

### 1-4. `GET /staff/departments`

| 항목 | 값 |
|---|---|
| **URL** | `/staff/departments` |
| **HTTP method** | GET |
| **service 함수** | `getDepartments()` |
| **service 파일** | [src/api/services/consultationService.ts:86-92](../src/api/services/consultationService.ts#L86-L92) |
| **호출처** | `ConsultationsPage` — [src/pages/ConsultationsPage.tsx:140](../src/pages/ConsultationsPage.tsx#L140) / `ConsultRequestModal` — [src/components/common/ConsultRequestModal.tsx:36](../src/components/common/ConsultRequestModal.tsx#L36) |
| **사용 화면** | 협진 요청 모달의 수신자 부서 선택 트리, 협진 목록의 부서 표시 라벨 변환 |

**Response `data` 구조**: `{ departments: Department[] }`

| 필드 (`departments[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `config_key` | `string` | `configKey` | 부서 코드 (`pulmo`, `nephro` 등) |
| `display_name` | `string` | `displayName` | 부서 표시명 ("호흡기내과") |
| `sort_order` | `number` | `sortOrder` | 목록 정렬 |

---

### 1-5. `GET /staff`

| 항목 | 값 |
|---|---|
| **URL** | `/staff?department_code={code}&role={role}` (둘 다 옵션) |
| **HTTP method** | GET |
| **service 함수** | `getStaff(departmentCode?, role?)` |
| **service 파일** | [src/api/services/consultationService.ts:94-114](../src/api/services/consultationService.ts#L94-L114) |
| **호출처** | `DepartmentTree` — [src/components/common/consult/DepartmentTree.tsx:39](../src/components/common/consult/DepartmentTree.tsx#L39) (부서 펼치기 시 lazy load) |
| **사용 화면** | 협진 요청 모달의 부서 트리 하위 노드 — 부서별 의료진 목록 |

**Query string**
| 키 | 타입 | 비고 |
|---|---|---|
| `department_code` | `string` | 옵션. 특정 부서 소속만 |
| `role` | `string` | 옵션. 역할 필터 (physician/nurse 등) |

**Response `data` 구조**: `{ staff: StaffMember[] }`

| 필드 (`staff[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `staff_id` | `string` | `staffId` | recipients 선택 식별자 |
| `display_name` | `string` | `displayName` | 의료진 이름 표시 |
| `role` | `string` | `role` | 역할 배지 |
| `primary_department_code` | `string` | `primaryDepartmentCode` | 소속 부서 |
| `status` | `string` | `status` | 활성 여부 |

---

## 2. ICU Dashboard

### 2-1. `GET /dashboard/icu/{icuId}`

| 항목 | 값 |
|---|---|
| **URL** | `/dashboard/icu/{icuId}` |
| **HTTP method** | GET |
| **service 함수** | `getDashboardPatients(icuId)` |
| **service 파일** | [src/api/services/patientService.ts:82-92](../src/api/services/patientService.ts#L82-L92) |
| **호출처** | `OverviewPage` — [src/pages/OverviewPage.tsx:130](../src/pages/OverviewPage.tsx#L130) |
| **사용 화면** | ICU 현황 페이지 전체 — KPI 카드 3개 + 환자 목록 테이블 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `icu_unit.unit_code` | `string` | `icuUnit.unitCode` | 내부 식별자 |
| `icu_unit.display_name` | `string` | `icuUnit.displayName` | KPI 카드 부제 ("MICU A") |
| `summary.total_patients` | `number` | `summary.totalPatients` | KPI: 입실 환자 수, 간호사 비율 계산 |
| `summary.high_risk_count` | `number` | `summary.highRiskCount` | KPI: 고위험 환자 수 |
| `summary.critical_alert_count` | `number` | `summary.criticalAlertCount` | KPI: 활성 알림 수 |
| `patients[i]` | `DashboardPatient` | — | 환자 목록 테이블 행 (아래 표) |

**`patients[i]` (DashboardPatient)**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `stay_id` | `string` | `stayId` | 내부 ID |
| `stay_token` | `string` | `stayToken` | 환자 상세 라우팅 경로 `/patient/{stayToken}` |
| `patient_token` | `string` | `patientToken` | "환자" 열 표시 (formatPatientName) |
| `current_bed_label` | `string` | `currentBedLabel` | "병상" 열 |
| `age_group` | `string` | `ageGroup` | "나이/성별" 열 |
| `sex` | `'M'\|'F'` | `sex` | "나이/성별" 열 |
| `latest_mortality_risk_score` | `number` (0~1) | `latestMortalityRiskScore` | (현재 미사용, 라벨로 대신) |
| `latest_mortality_risk_label` | `'high'\|'medium'\|'low'` | `latestMortalityRiskLabel` | "패혈증 위험도" 배지 + 행 강조 + 정렬 |
| `latest_complication_risk_score` | `number` | `latestComplicationRiskScore` | (현재 미사용) |
| `latest_sofa_total` | `number` | `latestSofaTotal` | "SOFA" 열, 정렬 |
| `active_alert_count` | `number` | `activeAlertCount` | "알림" 열, 정렬 |
| `last_prediction_at` | `string` (ISO) | `lastPredictionAt` | (현재 미사용) |
| `last_observation_at` | `string` (ISO) | `lastObservationAt` | "최근 관측" 열 (HH:mm 표시), 정렬 |

---

### 2-2. `GET /dashboard/icu/{icuId}/staffing`

| 항목 | 값 |
|---|---|
| **URL** | `/dashboard/icu/{icuId}/staffing` |
| **HTTP method** | GET |
| **service 함수** | `getStaffing(icuId)` |
| **service 파일** | [src/api/services/staffingService.ts:48-56](../src/api/services/staffingService.ts#L48-L56) |
| **호출처** | `OverviewPage` — [src/pages/OverviewPage.tsx:132](../src/pages/OverviewPage.tsx#L132) |
| **사용 화면** | ICU 현황 페이지의 Capacity 섹션 (담당 의사 가용 수 / 간호사:환자 비율) |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `icu_unit_code` | `string` | `icuUnitCode` | 내부 식별자 |
| `assignments[i].stay_token` | `string` | `assignments[i].stayToken` | (현재 표시 안 함) |
| `assignments[i].patient_token` | `string` | `patientToken` | (현재 표시 안 함) |
| `assignments[i].current_bed_label` | `string` | `currentBedLabel` | (현재 표시 안 함) |
| `assignments[i].assigned_staff[j].staff_id` | `string` | `staffId` | role별 unique 카운트 |
| `assignments[i].assigned_staff[j].display_name` | `string` | `displayName` | (현재 표시 안 함) |
| `assignments[i].assigned_staff[j].role` | `string` | `role` | physician/nurse 분류 → Capacity 카드 |
| `summary.total_patients` | `number` | `summary.totalPatients` | (현재 dashboard.summary로 대체) |
| `summary.my_patients_count` | `number` | `summary.myPatientsCount` | (현재 미사용) |
| `summary.unassigned_count` | `number` | `summary.unassignedCount` | (현재 미사용) |

**비고**: `OverviewPage.countUniqueStaff()` 가 role별로 staff_id를 dedup해서 인원 카운트. 간호사 비율 = `dashboard.summary.totalPatients / nurseCount`.

---

## 3. Patient Detail

### 3-1. `GET /icu-stays/{stayId}`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}` |
| **HTTP method** | GET |
| **service 함수** | `getPatientDetail(stayId)` |
| **service 파일** | [src/api/services/patientService.ts:95-106](../src/api/services/patientService.ts#L95-L106) |
| **호출처** | `PatientPage` — [src/pages/PatientPage.tsx:56](../src/pages/PatientPage.tsx#L56) / `reportService.getPatientReport()` 내부 |
| **사용 화면** | 환자 상세 페이지 헤더 (이름/연령/성별/진단/입실 시각/패혈증 onset) + 보고서 환자 정보 섹션 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `stay_id` | `string` | `stayId` | 내부 ID |
| `stay_token` | `string` | `stayToken` | URL 표시용 |
| `patient_token` | `string` | `patientToken` | 환자 이름(formatPatientName으로 가명 변환) |
| `age_years` | `number` | `ageYears` | "67세 / M" 표시 |
| `age_group` | `string` | `ageGroup` | (현재 ageYears 사용) |
| `sex` | `'M'\|'F'` | `sex` | 헤더 표시 |
| `admission_type` | `string` | `admissionType` | 입실 유형 라벨 |
| `primary_diagnosis_code` | `string` | `primaryDiagnosisCode` | 진단 코드 |
| `primary_diagnosis_text` | `string` | `primaryDiagnosisText` | "주진단" 표시 |
| `hospital_admit_at` | `string` (ISO) | `hospitalAdmitAt` | 병원 입실 시각 |
| `icu_in_at` | `string` (ISO) | `icuInAt` | "ICU 입실: …" 표시 |
| `icu_out_at` | `string\|null` (ISO) | `icuOutAt` | (현재 미표시) |
| `current_unit_code` | `string` | `currentUnitCode` | (현재 미표시) |
| `current_bed_label` | `string` | `currentBedLabel` | "병상: A-12" 표시 |
| `status` | `string` | `status` | 입실 상태 |
| `sepsis_onset_at` | `string\|null` (ISO) | `sepsisOnsetAt` | 패혈증 onset 표시 / 보조지표 활성화 기준 |

---

### 3-2. `GET /icu-stays/{stayId}/clinical-data`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/clinical-data` |
| **HTTP method** | GET |
| **service 함수** | `getClinicalData(stayId)` → `getVitals(stayId)` (pivot view-model) |
| **service 파일** | [src/api/services/vitalService.ts:183-203](../src/api/services/vitalService.ts#L183-L203) |
| **호출처** | `ClinicalDataContext` — [src/context/ClinicalDataContext.tsx:104](../src/context/ClinicalDataContext.tsx#L104) (환자 상세 마운트 시 1회) / `reportService.getPatientReport()` 내부 |
| **사용 화면** | 환자 상세의 Vital Timeline 차트 6개 탭 (Cardio/Resp/Renal/CNS/Coag/Hepatic/Temp), Lab annotation (Lac/Cre/P/F/Plt/Bil), 보고서의 vital/lab 행 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `stay_token` | `string` | `stayToken` | 응답 검증 |
| `period.from` | `string` (ISO) | `period.from` | 데이터 범위 표시 |
| `period.to` | `string` (ISO) | `period.to` | 데이터 범위 표시 |
| `observations[i]` | `ClinicalObservation` | — | flat row (아래) |

**`observations[i]` (ClinicalObservation)**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `observation_id` | `string` | `observationId` | React key |
| `metric_group` | `'vital'\|'lab'\|'derived'` | `metricGroup` | series vs lab annotation 분기 |
| `metric_code` | `string` | `metricCode` | pivot 키 (`hr`, `lactate` 등) |
| `metric_name` | `string` | `metricName` | series label 폴백 |
| `numeric_value` | `number` | `numericValue` | 차트 y값 |
| `unit` | `string` | `unit` | 단위 표시 |
| `value_status` | `string` | `valueStatus` | (현재 표시 안 함, 보고서 status 산정에 활용 가능) |
| `normal_range_low` | `number\|null` | `normalRangeLow` | 차트 정상범위 |
| `normal_range_high` | `number\|null` | `normalRangeHigh` | 차트 정상범위 |
| `observed_at` | `string` (ISO) | `observedAt` | x축 시각, 상대시간 라벨 산출 |
| `quality_flag` | `string` | `qualityFlag` | (현재 미사용, 추후 품질 표시) |

---

### 3-3. `GET /icu-stays/{stayId}/sofa`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/sofa` |
| **HTTP method** | GET |
| **service 함수** | `getSofaTrend(stayId)` |
| **service 파일** | [src/api/services/sofaService.ts:64-73](../src/api/services/sofaService.ts#L64-L73) |
| **호출처** | `SofaPanel` — [src/components/common/SofaPanel.tsx:64](../src/components/common/SofaPanel.tsx#L64) |
| **사용 화면** | 환자 상세 SOFA 패널 — 총점 추이 라인 + 6개 장기별 점수 차트 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `sofa_trend[i].observed_at` | `string` (ISO) | `observedAt` | x축 시각 (상대시간 라벨로 변환) |
| `sofa_trend[i].sofa_total` | `number` | `sofaTotal` | 총점 추이 라인 |
| `sofa_trend[i].components.cardiovascular` | `number\|null` | `components.cardiovascular` | 심혈관 점수 |
| `sofa_trend[i].components.respiration` | `number\|null` | `components.respiration` | 호흡 점수 |
| `sofa_trend[i].components.cns` | `number\|null` | `components.cns` | 의식 점수 |
| `sofa_trend[i].components.liver` | `number\|null` | `components.liver` | 간 점수 |
| `sofa_trend[i].components.renal` | `number\|null` | `components.renal` | 신장 점수 |
| `sofa_trend[i].components.coagulation` | `number\|null` | `components.coagulation` | 응고 점수 |

**비고**: `null` 은 해당 시점 미측정. `connectNulls={false}` 로 점만 표시 (CLAUDE.md SOFA 규칙 참고).

---

### 3-4. `GET /icu-stays/{stayId}/timeline`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/timeline` |
| **HTTP method** | GET |
| **service 함수** | `getTimeline(stayId)` |
| **service 파일** | [src/api/services/timelineService.ts:66-75](../src/api/services/timelineService.ts#L66-L75) |
| **호출처** | `PatientPage` — [src/pages/PatientPage.tsx:58](../src/pages/PatientPage.tsx#L58) |
| **사용 화면** | 환자 상세의 임상 타임라인 패널 (실제 발생 이벤트: 예측/알림/처치) |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `timeline[i].item_id` | `string` | `id` | React key |
| `timeline[i].timeline_time` | `string` (ISO) | `time` ("14:20" 표시용) | 타임라인 항목 시각 |
| `timeline[i].title` | `string` | `title` | 항목 제목 |
| `timeline[i].summary` | `string` | `description` | 항목 설명 |
| `timeline[i].detail_category` | `string` | `category` | 아이콘/색 분기 (vitals/lab/alert/mortality 등) |
| `timeline[i].severity` | `string` | `severity` | 'critical'/'warning'/'info' 톤 |
| `timeline[i].item_type` | `'prediction'\|'alert'\|'event'` | `itemType` | 출처 분류 |

---

### 3-5. `GET /icu-stays/{stayId}/schedule`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/schedule` |
| **HTTP method** | GET |
| **service 함수** | `getSchedule(stayId)` |
| **service 파일** | [src/api/services/timelineService.ts:77-86](../src/api/services/timelineService.ts#L77-L86) |
| **호출처** | `PatientPage` — [src/pages/PatientPage.tsx:59](../src/pages/PatientPage.tsx#L59) |
| **사용 화면** | 환자 상세의 예정 일정 (모델 기반 후속 평가 시점 등 — 타임라인과 별개 영역) |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `scheduled_events[i].event_id` | `string` | `id` | React key |
| `scheduled_events[i].event_time` | `string` (ISO) | `time` | 예정 시각 |
| `scheduled_events[i].event_title` | `string` | `title` | 일정 제목 |
| `scheduled_events[i].event_description` | `string` | `description` | 설명 |
| `scheduled_events[i].event_category` | `string` | `category` | 분류 (timeline과 동일 enum) |
| `scheduled_events[i].derivation_basis` | `string` | `basis` | 근거 ("모델 X 예측에 기반" 등) |

---

## 4. Predictions

### 4-1. `GET /icu-stays/{stayId}/predictions`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/predictions` |
| **HTTP method** | GET |
| **service 함수** | `getLatestPredictions(stayId)` |
| **service 파일** | [src/api/services/modelService.ts:95-103](../src/api/services/modelService.ts#L95-L103) |
| **호출처** | `getModelPredictions()` 내부 → `PatientPage` — [src/pages/PatientPage.tsx:57](../src/pages/PatientPage.tsx#L57) |
| **사용 화면** | 환자 상세의 모델 카드 5개 (메인) + 보조지표 2개 (escalation) — 현재 위험점수, 등급, SHAP top factors |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `stay_token` | `string` | — | 검증 |
| `predictions[i]` | `LatestPrediction` | — | 모델별 최신 예측 (아래) |

**`predictions[i]` (LatestPrediction)**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `prediction_id` | `string` | `predictionId` | history와 dedup, AI insight 요청 key |
| `model_key` | `ApiModelKey` | `modelKey` | history 호출 path 매개변수 |
| `model_version` | `string` | `modelVersion` | (현재 미표시) |
| `target_name` | `'mortality'\|'aki'\|...\|'invasive_vent'\|'vasopressor'` | `targetName` | UI 카드 그룹핑 키 |
| `horizon_hours` | `number` | `horizonHours` | (모델명에 포함되어 별도 표시 안 함) |
| `risk_score` | `number` (0~1) | `riskScore` | × 100 → `riskScorePct` (카드 게이지, 추이 차트) |
| `risk_label` | `'high'\|'medium'\|'low'` | `riskLabel` | 카드 톤(danger/warn/safe), 보조지표 highNeed 파생 |
| `threshold` | `number` | `threshold` | (현재 미표시) |
| `predicted_at` | `string` (ISO) | `predictedAt` | "데이터 기준 시각" 표시, history dedup |
| `feature_window_start` | `string` (ISO) | `featureWindowStart` | (현재 미표시) |
| `feature_window_end` | `string` (ISO) | `featureWindowEnd` | (현재 미표시) |
| `top_factors_jsonb[]` | `ShapFactor[]` | `topFactors` | SHAP 상위 피처 (아래) |
| `status` | `string` | `status` | 모델 산출 상태 |

**`top_factors_jsonb[j]` (ShapFactor)**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `feature` | `string` | `feature` | metric_code (`lactate` 등) — display name 매핑 |
| `value` | `number` | `value` | feature의 실제 측정값 — display 문자열 합침 |
| `direction` | `'increase'\|'decrease'` | `direction` | UI bar 색상 (up=danger, down=safe) |
| `contribution` | `number` (0~1) | `contribution` | SHAP bar 크기 |

---

### 4-2. `GET /icu-stays/{stayId}/predictions/{modelKey}`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/predictions/{modelKey}` |
| **HTTP method** | GET |
| **service 함수** | `getLatestPrediction(stayId, modelKey)` |
| **service 파일** | [src/api/services/modelService.ts:105-117](../src/api/services/modelService.ts#L105-L117) |
| **호출처** | (현재 직접 호출처 없음 — 공개 API로 유지, 단일 모델 빠른 조회용) |
| **사용 화면** | 향후 모델 상세 화면에서 단일 카드 즉시 새로고침 등에 활용 예정 |

**Response `data` 구조**: 4-1의 `predictions[i]` 와 동일 (`LatestPrediction` 단일)

---

### 4-3. `GET /icu-stays/{stayId}/predictions/{modelKey}/history`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/predictions/{modelKey}/history` |
| **HTTP method** | GET |
| **service 함수** | `getPredictionHistory(stayId, modelKey)` |
| **service 파일** | [src/api/services/modelService.ts:119-137](../src/api/services/modelService.ts#L119-L137) |
| **호출처** | `getModelPredictions()` 내부 → `PatientPage` 진입 시 모델별로 N회 (최대 7) 호출 |
| **사용 화면** | 모델 상세의 확률 추이 차트 (6~7개 시점), trend warning (delta/note) 산출 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `stay_token` | `string` | `stayToken` | 검증 |
| `model_key` | `ApiModelKey` | `modelKey` | 검증 |
| `history[i].prediction_id` | `string` | `predictionId` | latest와 dedup 키 |
| `history[i].risk_score` | `number` (0~1) | `riskScore` | × 100 → 추이 차트 y값, trendWarn delta 계산 |
| `history[i].risk_label` | `'high'\|'medium'\|'low'` | `riskLabel` | (현재 추이 차트에서 색상 분기에 사용 안 함) |
| `history[i].predicted_at` | `string` (ISO) | `predictedAt` | x축 시각 (상대 라벨로 변환), 정렬/dedup |
| `history[i].status` | `string` | `status` | (현재 미표시) |

---

## 5. Alerts

### 5-1. `GET /alerts`

| 항목 | 값 |
|---|---|
| **URL** | `/alerts` |
| **HTTP method** | GET |
| **service 함수** | `getAlerts()` |
| **service 파일** | [src/api/services/alertService.ts:41-47](../src/api/services/alertService.ts#L41-L47) |
| **호출처** | `AlertsPage` — [src/pages/AlertsPage.tsx:44](../src/pages/AlertsPage.tsx#L44) (페이지 진입 시) / `alertService` 내부 `markAlertRead`/`acknowledgeAlert`/`resolveAlert` 후 재조회 |
| **사용 화면** | 알림 센터 페이지 — 알림 카드 목록 (severity별, status별) |

**Response `data` 구조**: `{ alerts: Alert[] }`

| 필드 (`alerts[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `alert_id` | `string` | `alertId` | React key, 읽음/확인/해결 POST path |
| `stay_token` | `string` | `stayToken` | "환자로 이동" 버튼 → `/patient/{stayToken}` |
| `alert_type` | `string` | `alertType` | 알림 종류 (`sepsis_risk_high` 등) |
| `alert_source` | `string` | `alertSource` | model_key 또는 trigger_rule_key |
| `severity` | `'info'\|'warning'\|'critical'` | `severity` | 카드 톤, 정렬 |
| `status` | `'active'\|'acknowledged'\|'resolved'` | `status` | 카드 상태 라벨, 액션 버튼 분기 |
| `title` | `string` | `title` | 카드 제목 |
| `message` | `string` | `message` | 카드 본문 |
| `tags_jsonb` | `string[]` | `tags` | 태그 칩 |
| `confidence` | `number\|null` | `confidence` | "신뢰도 0.82" 표시 (모델 출처만) |
| `created_at` | `string` (ISO) | `createdAt` | "n분 전" 표시 |
| `delivery.delivery_id` | `string` | `delivery.deliveryId` | per-user notification 행 식별 |
| `delivery.read_at` | `string\|null` (ISO) | `delivery.readAt` | 읽음 표시 / 미읽음 카운트 |
| `delivery.acknowledged_at` | `string\|null` (ISO) | `delivery.acknowledgedAt` | "확인됨" 라벨 |

---

### 5-2. `GET /alerts/count`

| 항목 | 값 |
|---|---|
| **URL** | `/alerts/count` |
| **HTTP method** | GET |
| **service 함수** | `getAlertCount()` |
| **service 파일** | [src/api/services/alertService.ts:49-62](../src/api/services/alertService.ts#L49-L62) |
| **호출처** | `AlertBell` — [src/components/common/AlertBell.tsx:9](../src/components/common/AlertBell.tsx#L9) (모든 보호 라우트에서 사이드바 종 아이콘 마운트 시) |
| **사용 화면** | 사이드바/헤더의 알림 종 아이콘 배지 (미읽음 카운트) |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `total` | `number` | `total` | (현재 미표시) |
| `unread` | `number` | `unread` | 종 아이콘 빨간 배지 숫자 (>99면 "99+") |
| `critical_unread` | `number` | `criticalUnread` | 향후 critical 강조 표시 |

---

### 5-3. `POST /alerts/{alertId}/read`

| 항목 | 값 |
|---|---|
| **URL** | `/alerts/{alertId}/read` |
| **HTTP method** | POST |
| **Body** | 없음 |
| **service 함수** | `markAlertRead(alertId)` |
| **service 파일** | [src/api/services/alertService.ts:65-79](../src/api/services/alertService.ts#L65-L79) |
| **호출처** | `AlertCard` — [src/components/alerts/AlertCard.tsx:66](../src/components/alerts/AlertCard.tsx#L66) (카드 hover/클릭 시 자동) |
| **사용 화면** | 알림 카드 — 읽음 상태 전환. 호출 후 `getAlerts()` 재조회로 목록 갱신 |

**Response `data` 구조**

| 필드 | 타입 | 용도 |
|---|---|---|
| `alert_id` | `string` | 동일 alert 확인 |
| `read_at` | `string` (ISO) | 읽음 시각 |

---

### 5-4. `POST /alerts/{alertId}/acknowledge`

| 항목 | 값 |
|---|---|
| **URL** | `/alerts/{alertId}/acknowledge` |
| **HTTP method** | POST |
| **Body** | 없음 |
| **service 함수** | `acknowledgeAlert(alertId)` |
| **service 파일** | [src/api/services/alertService.ts:82-98](../src/api/services/alertService.ts#L82-L98) |
| **호출처** | `AlertsPage` — [src/pages/AlertsPage.tsx:51](../src/pages/AlertsPage.tsx#L51) |
| **사용 화면** | 알림 카드의 "확인" 버튼 클릭 → 상태 `acknowledged`로 전환 (시스템 전체 의미) |

**Response `data` 구조**

| 필드 | 타입 | 용도 |
|---|---|---|
| `alert_id` | `string` | 동일 alert 확인 |
| `status` | `string` | `'acknowledged'` |
| `acknowledged_at` | `string` (ISO) | 확인 시각 |

---

### 5-5. `POST /alerts/{alertId}/resolve`

| 항목 | 값 |
|---|---|
| **URL** | `/alerts/{alertId}/resolve` |
| **HTTP method** | POST |
| **Body** | 없음 |
| **service 함수** | `resolveAlert(alertId)` |
| **service 파일** | [src/api/services/alertService.ts:101-114](../src/api/services/alertService.ts#L101-L114) |
| **호출처** | `AlertsPage` — [src/pages/AlertsPage.tsx:56](../src/pages/AlertsPage.tsx#L56) |
| **사용 화면** | 알림 카드의 "해결" 버튼 클릭 → 상태 `resolved`로 전환 |

**Response `data` 구조**

| 필드 | 타입 | 용도 |
|---|---|---|
| `alert_id` | `string` | 동일 alert 확인 |
| `status` | `string` | `'resolved'` |
| `resolved_at` | `string` (ISO) | 해결 시각 |

---

## 6. Consultations

### 6-1. `GET /consultations`

| 항목 | 값 |
|---|---|
| **URL** | `/consultations?stay_token={token}&status={status}` (둘 다 옵션) |
| **HTTP method** | GET |
| **service 함수** | `getConsultations(filter?)` |
| **service 파일** | [src/api/services/consultationService.ts:116-131](../src/api/services/consultationService.ts#L116-L131) |
| **호출처** | `ConsultationsPage` — [src/pages/ConsultationsPage.tsx:135](../src/pages/ConsultationsPage.tsx#L135) / `createConsultation` 직후 재조회 |
| **사용 화면** | 협진 페이지 — 요청 목록 카드 |

**Query string**
| 키 | 타입 | 비고 |
|---|---|---|
| `stay_token` | `string` | 옵션. 특정 환자 협진만 |
| `status` | `'requested'\|'in_progress'\|'completed'` | 옵션. 상태 필터 |

**Response `data` 구조**: `{ consultations: ConsultationRequest[] }`

| 필드 (`consultations[i]`) | 타입 | view-model | 용도 |
|---|---|---|---|
| `consultation_id` | `string` | `consultationId` | React key, 상세 라우팅 |
| `stay_token` | `string` | `stayToken` | 환자 표시 / 보고서 조합 |
| `subject` | `string` | `subject` | 카드 제목 |
| `priority` | `'urgent'\|'routine'` | `priority` | 카드 톤 |
| `status` | `'requested'\|'in_progress'\|'completed'` | `status` | 상태 라벨, 필터 |
| `requester_staff_id` | `string` | `requesterStaffId` | 요청자 표시 |
| `requester_department_code` | `string` | `requesterDepartmentCode` | 요청 부서 표시 |
| `recipients_jsonb[j].staff_id` | `string\|null` | `recipients[j].staffId` | 특정 의료진 지정 시 |
| `recipients_jsonb[j].department_code` | `string` | `recipients[j].departmentCode` | 수신 부서 라벨 |
| `recipients_jsonb[j].role` | `'to'\|'cc'` | `recipients[j].role` | 수신/참조 분류 |
| `attached_report_id` | `string\|null` | `attachedReportId` | 첨부 보고서 ID |
| `created_at` | `string` (ISO) | `createdAt` | "n시간 전" 표시, 정렬 |

---

### 6-2. `GET /consultations/{consultationId}`

| 항목 | 값 |
|---|---|
| **URL** | `/consultations/{consultationId}` |
| **HTTP method** | GET |
| **service 함수** | `getConsultationDetail(consultationId)` |
| **service 파일** | [src/api/services/consultationService.ts:133-144](../src/api/services/consultationService.ts#L133-L144) |
| **호출처** | (현재 직접 호출처 없음 — 향후 협진 상세 모달용 공개 API) |
| **사용 화면** | 협진 상세 모달 — 본문 + 노트 + 상태 이력 |

**Response `data` 구조** (`ConsultationDetail`): 6-1의 모든 필드 + 아래

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `message` | `string` | `message` | 협진 본문 |
| `notes` | `Array<{staff_id, note, created_at}>` | `notes` | 답변/메모 스레드 (현재 service에서 빈 배열로 채움 — 백엔드 응답 형태 정해지면 매핑 보강 필요) |
| `status_history` | `Array<{from, to, at, by}>` | `statusHistory` | 상태 변경 로그 (현재 service에서 빈 배열로 채움 — 동일) |
| `updated_at` | `string` (ISO) | `updatedAt` | 최종 수정 시각 |

---

### 6-3. `POST /consultations`

| 항목 | 값 |
|---|---|
| **URL** | `/consultations` |
| **HTTP method** | POST |
| **service 함수** | `createConsultation(payload)` |
| **service 파일** | [src/api/services/consultationService.ts:155-198](../src/api/services/consultationService.ts#L155-L198) |
| **호출처** | `ConsultRequestModal` — [src/components/common/ConsultRequestModal.tsx:129](../src/components/common/ConsultRequestModal.tsx#L129) |
| **사용 화면** | 협진 요청 모달의 "전송" 버튼 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `stay_token` | `string` | 대상 환자 |
| `subject` | `string` | 제목 |
| `message` | `string` | 본문 |
| `priority` | `'urgent'\|'routine'` | 우선순위 |
| `recipients[]` | `Array<{department_code, staff_id?, role}>` | 수신자 목록 |
| `attached_report_id` | `string\|null` | 첨부 보고서 |

**Response `data` 구조**

| 필드 | 타입 | 용도 |
|---|---|---|
| `consultation_id` | `string` | 생성된 협진 ID |
| `status` | `string` | 초기 상태 (`'requested'`) |
| `created_at` | `string` (ISO) | 생성 시각 |

**비고**: service는 응답 후 자동으로 `getConsultations({ stayToken })` 재조회해서 list 새로고침 — 모달 닫으면 목록에 즉시 반영.

---

### 6-4. `PATCH /consultations/{consultationId}/status`

| 항목 | 값 |
|---|---|
| **URL** | `/consultations/{consultationId}/status` |
| **HTTP method** | PATCH |
| **service 함수** | `updateConsultationStatus(consultationId, status, note?)` |
| **service 파일** | [src/api/services/consultationService.ts:200-221](../src/api/services/consultationService.ts#L200-L221) |
| **호출처** | (현재 직접 호출처 없음 — 향후 협진 상세 모달의 "수락/완료" 버튼용 공개 API) |
| **사용 화면** | 협진 상세 모달에서 상태 전환 시 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `status` | `'requested'\|'in_progress'\|'completed'` | 새 상태 |
| `note` | `string` (옵션) | 변경 사유/메모 |

**Response `data` 구조**

| 필드 | 타입 | 용도 |
|---|---|---|
| `consultation_id` | `string` | 동일 ID 확인 |
| `status` | `string` | 변경 후 상태 |
| `updated_at` | `string` (ISO) | 갱신 시각 |

---

## 7. Reports

### 7-1. `GET /icu-stays/{stayId}/report/latest`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/report/latest` |
| **HTTP method** | GET |
| **service 함수** | `getLatestSavedReport(stayId)` |
| **service 파일** | [src/api/services/reportService.ts:165-175](../src/api/services/reportService.ts#L165-L175) |
| **호출처** | (현재 직접 호출처 없음 — 향후 환자 상세 보고서 패널의 "저장된 보고서 보기" 진입 시) |
| **사용 화면** | 저장된 보고서의 HTML/PDF presigned URL 다운로드 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `report_id` | `string` | `reportId` | React key, 보고서 식별 |
| `stay_token` | `string` | `stayToken` | 환자 검증 |
| `report_type` | `string` | `reportType` | 보고서 종류 (`daily`, `ai_assisted` 등) |
| `report_title` | `string` | `reportTitle` | 제목 표시 |
| `report_status` | `string` | `reportStatus` | 발행 상태 |
| `generated_at` | `string` (ISO) | `generatedAt` | 생성 시각 |
| `generated_by_staff_id` | `string` | `generatedByStaffId` | 작성자 |
| `available_formats` | `Array<'html'\|'pdf'>` | `availableFormats` | 다운로드 버튼 분기 |
| `html_download_url` | `string` (presigned URL) | `htmlDownloadUrl` | HTML 다운로드 링크 |
| `pdf_download_url` | `string` (presigned URL) | `pdfDownloadUrl` | PDF 다운로드 링크 |

---

### 7-2. `POST /icu-stays/{stayId}/reports`

| 항목 | 값 |
|---|---|
| **URL** | `/icu-stays/{stayId}/reports` |
| **HTTP method** | POST |
| **service 함수** | `saveReport(stayId, payload)` |
| **service 파일** | [src/api/services/reportService.ts:185-205](../src/api/services/reportService.ts#L185-L205) |
| **호출처** | (현재 직접 호출처 없음 — 향후 환자 상세 보고서 패널의 "저장" 버튼) |
| **사용 화면** | ReportLambda가 S3에 PDF/HTML 저장 후 presigned URL 반환 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `report_type` | `'daily'\|'ai_assisted'\|string` | 보고서 종류 |
| `report_title` | `string` | 제목 |
| `observation_range.from` | `string` (ISO) | 관측 기간 시작 |
| `observation_range.to` | `string` (ISO) | 관측 기간 끝 |
| `include_predictions` | `boolean` (옵션) | 예측 결과 포함 여부 |
| `include_ai_summary` | `boolean` (옵션) | AI 설명 포함 여부 |

**Response `data` 구조**: 7-1과 동일 (`SavedReport`)

---

### 7-3. (BFF) `getPatientReport(stayId)` — 합성

| 항목 | 값 |
|---|---|
| **URL** | (없음 — 프론트 조합) |
| **service 함수** | `getPatientReport(stayId)` |
| **service 파일** | [src/api/services/reportService.ts:62-133](../src/api/services/reportService.ts#L62-L133) |
| **호출처** | `PatientPage` — [src/pages/PatientPage.tsx:74](../src/pages/PatientPage.tsx#L74) (보고서 패널 열 때) / `ConsultationsPage` — [src/pages/ConsultationsPage.tsx:160](../src/pages/ConsultationsPage.tsx#L160) (협진 첨부 시) |
| **사용 화면** | 환자 상태 요약 보고서 — vital 최신값 + lab 최신값 + 5개 모델 예측 |
| **내부 호출** | `getPatientDetail`(3-1) + `getVitals`(3-2) + `getModelPredictions`(4-1 + 4-3 × 7) |

별도 엔드포인트 호출이 아니라 기존 API 3종을 조합한 view-model `PatientReport`를 반환. 백엔드 1개 호출로 통합 의향이 있다면 `/icu-stays/{stayId}/report/preview` 같은 신규 endpoint가 필요.

---

## 8. AI Insights & Chat

### 8-1. `POST /ai/insights`

| 항목 | 값 |
|---|---|
| **URL** | `/ai/insights` |
| **HTTP method** | POST |
| **service 함수** | `postAiInsight(stayToken, predictionId, modelKey, forceRefresh?)` |
| **service 파일** | [src/api/services/aiInsightService.ts:48-76](../src/api/services/aiInsightService.ts#L48-L76) |
| **호출처** | (현재 직접 호출 없음 — 호환 어댑터 `getAiInsight()`가 mock 매트릭스에서 반환. 백엔드 연결 시 [src/components/common/ModelDetailView.tsx:77](../src/components/common/ModelDetailView.tsx#L77) 의 호출이 `postAiInsight`로 교체됨) |
| **사용 화면** | 모델 상세 화면의 AI 임상 설명 카드, 섹션별 AI 인사이트 모달 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `stay_token` | `string` | 대상 환자 |
| `prediction_id` | `string` | 설명할 예측 ID |
| `model_key` | `string` | 모델 식별자 |
| `force_refresh` | `boolean` | 캐시 무시 옵션 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `interaction_id` | `string` | `interactionId` | 추후 피드백 연결 |
| `interaction_type` | `string` | — | 분류 |
| `stay_token` | `string` | — | 검증 |
| `prediction_id` | `string` | — | 검증 |
| `explanation` | `string` | `explanation` | AI 설명 본문 표시 |
| `top_factors` | `unknown[]` | — | (현재 화면은 prediction.top_factors 사용) |
| `guardrail_result` | `unknown` | — | (현재 미표시) |
| `model_provider` | `string` | — | (출처 표시 예정) |
| `llm_model_id` | `string` | — | (출처 표시 예정) |
| `cached` | `boolean` | `cached` | "캐시 결과" 배지 표시 가능 |
| `created_at` | `string` (ISO) | — | (현재 미표시) |

---

### 8-2. `POST /ai/chat/sessions`

| 항목 | 값 |
|---|---|
| **URL** | `/ai/chat/sessions` |
| **HTTP method** | POST |
| **service 함수** | `createChatSession(stayToken, sessionTitle)` |
| **service 파일** | [src/api/services/aiInsightService.ts:94-117](../src/api/services/aiInsightService.ts#L94-L117) |
| **호출처** | `AiChatPanel` — [src/components/common/AiChatPanel.tsx:79](../src/components/common/AiChatPanel.tsx#L79), [108](../src/components/common/AiChatPanel.tsx#L108) (패널 첫 오픈 시) |
| **사용 화면** | AI 채팅 패널 — 환자/섹션별 세션 신규 생성 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `stay_token` | `string` | 대상 환자 |
| `session_title` | `string` | 세션 제목 (예: "환자 상태 질의") |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `interaction_id` | `string` | — | 추후 추적 |
| `interaction_type` | `string` | — | 분류 |
| `session_key` | `string` | `sessionKey` | 이후 메시지 POST/GET path 매개변수 |
| `created_at` | `string` (ISO) | `createdAt` | 세션 생성 시각 |

---

### 8-3. `POST /ai/chat/sessions/{sessionKey}/messages`

| 항목 | 값 |
|---|---|
| **URL** | `/ai/chat/sessions/{sessionKey}/messages` |
| **HTTP method** | POST |
| **service 함수** | `postChatMessage(sessionKey, message)` |
| **service 파일** | [src/api/services/aiInsightService.ts:152-174](../src/api/services/aiInsightService.ts#L152-L174) |
| **호출처** | `AiChatPanel` — [src/components/common/AiChatPanel.tsx:115](../src/components/common/AiChatPanel.tsx#L115) (사용자가 메시지 전송 시) |
| **사용 화면** | AI 채팅 패널 — 사용자 입력 → AI 응답 메시지 추가 |

**Request body**

| 필드 | 타입 | 의미 |
|---|---|---|
| `message` | `string` | 사용자 입력 메시지 본문 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `interaction_id` | `string` | — | 추후 추적 |
| `interaction_type` | `string` | — | 분류 |
| `session_key` | `string` | — | 검증 |
| `output_text` | `string` | `content` (role=`assistant`) | AI 응답 본문 — 채팅창 말풍선 |
| `guardrail_result` | `unknown` | — | (현재 미표시, 추후 안전 안내 강조에 활용) |
| `created_at` | `string` (ISO) | — | (현재 미표시) |

---

### 8-4. `GET /ai/chat/sessions/{sessionKey}/messages`

| 항목 | 값 |
|---|---|
| **URL** | `/ai/chat/sessions/{sessionKey}/messages` |
| **HTTP method** | GET |
| **service 함수** | `getChatMessages(sessionKey)` |
| **service 파일** | [src/api/services/aiInsightService.ts:176-196](../src/api/services/aiInsightService.ts#L176-L196) |
| **호출처** | (현재 직접 호출 없음 — `createChatSession` 직후 인트로만 표시. 향후 패널 재오픈 시 이전 메시지 복원에 사용 예정) |
| **사용 화면** | AI 채팅 패널 재진입 시 기존 대화 복원 |

**Response `data` 구조**

| 필드 | 타입 | view-model | 용도 |
|---|---|---|---|
| `session_key` | `string` | — | 검증 |
| `messages[i].interaction_id` | `string` | — | React key |
| `messages[i].role` | `'user'\|'assistant'` | `role` | 말풍선 좌/우 정렬 |
| `messages[i].content` | `string` | `content` | 본문 |
| `messages[i].created_at` | `string` (ISO) | — | (현재 미표시) |

---

## 부록 A — 페이지별 호출 요약

### A-1. 로그인 (`/login`)
백엔드 API 호출 없음. Cognito SDK가 `https://cognito-idp.ap-northeast-2.amazonaws.com/` 직접 호출 (SRP).

### A-2. ICU 현황 (`/`)
모든 보호 라우트 진입 시 공통:
- `GET /me`, `GET /meta/metrics`, `GET /meta/models` (MetaProvider, 인증 직후 1회)
- `GET /alerts/count` (AlertBell, 사이드바)

ICU 현황 페이지 자체:
- `GET /dashboard/icu/{icuId}`
- `GET /dashboard/icu/{icuId}/staffing`

### A-3. 환자 상세 (`/patient/:stayId`)
공통 4개에 더해:
- `GET /icu-stays/{stayId}`
- `GET /icu-stays/{stayId}/predictions`
- `GET /icu-stays/{stayId}/predictions/{modelKey}/history` × 7 (메인 5 + 보조 2)
- `GET /icu-stays/{stayId}/timeline`
- `GET /icu-stays/{stayId}/schedule`
- (ClinicalDataContext 마운트 시) `GET /icu-stays/{stayId}/clinical-data`
- (SofaPanel) `GET /icu-stays/{stayId}/sofa`
- (보고서 패널 열 때) `getPatientReport` → 위의 patient_detail + clinical-data + predictions 조합 재호출

### A-4. 모델 상세 (`/patient/:stayId/model/:modelKey`)
환자 상세와 같은 페이지 인스턴스 위에서 모달/뷰 전환. 추가 API 호출:
- (현재 mock) `getAiInsight` — 백엔드 연결 시 `POST /ai/insights` 1회

### A-5. 알림 센터 (`/alerts`)
공통 4개에 더해:
- `GET /alerts`
- (카드 액션 시) `POST /alerts/{id}/read` / `POST /alerts/{id}/acknowledge` / `POST /alerts/{id}/resolve` + 후속 `GET /alerts` 재조회

### A-6. 협진 (`/consultations`)
공통 4개에 더해:
- `GET /consultations`
- `GET /staff/departments`
- (요청 모달 열 때) `GET /staff/departments`, 부서 펼치기 시 `GET /staff?department_code={code}` 부서별 lazy load
- (요청 전송 시) `POST /consultations` + 후속 `GET /consultations` 재조회
- (환자 보고서 첨부 시) `getPatientReport` (BFF)

### A-7. AI 채팅 패널 (전역, 환자 상세에서 주로 사용)
- `POST /ai/chat/sessions` (패널 첫 오픈 시 1회)
- `POST /ai/chat/sessions/{sessionKey}/messages` (사용자 메시지 전송 시마다)
- (잠재) `GET /ai/chat/sessions/{sessionKey}/messages` (이전 대화 복원 시 — 현재 미호출)

---

## 부록 B — 현재 코드에 정의되어 있으나 직접 호출처가 없는 함수

다음은 service 레이어에 공개 API로 노출되어 있지만, 컴포넌트가 아직 직접 부르고 있지 않은 함수들. 백엔드 연결 검증 또는 향후 기능 추가 시점에 호출 예정:

| 함수 | 엔드포인트 | 향후 사용 예정 화면 |
|---|---|---|
| `getLatestPrediction(stayId, modelKey)` | GET `/icu-stays/{stayId}/predictions/{modelKey}` | 모델 상세의 단일 카드 즉시 새로고침 |
| `getConsultationDetail(id)` | GET `/consultations/{id}` | 협진 상세 모달 |
| `updateConsultationStatus(id, status)` | PATCH `/consultations/{id}/status` | 협진 상세 모달의 상태 전환 |
| `getLatestSavedReport(stayId)` | GET `/icu-stays/{stayId}/report/latest` | 환자 상세의 "저장된 보고서 보기" |
| `saveReport(stayId, payload)` | POST `/icu-stays/{stayId}/reports` | 환자 상세의 "보고서 저장" |
| `postAiInsight(...)` | POST `/ai/insights` | 모델 상세 (현재 mock 어댑터 `getAiInsight` 사용 중, 백엔드 연결 시 교체) |
| `getChatMessages(sessionKey)` | GET `/ai/chat/sessions/{sessionKey}/messages` | 채팅 패널 재진입 시 이전 대화 복원 |

---

## 부록 C — 서비스 호출 패턴 메모 (디버깅 참고)

1. **인증 헤더**: `getIdToken()`이 null을 반환하면 `Authorization` 헤더가 빠지고 서버는 401을 줄 가능성이 높다. tokenStore가 localStorage의 `CognitoIdentityServiceProvider.<CLIENT_ID>.<username>.idToken`을 직접 읽으므로, SDK가 세션을 저장한 직후부터만 헤더가 붙는다.
2. **401 자동 처리**: 401 응답은 `client.handle401()`이 cognito.signOut + `/login` 강제 이동. 이미 `/login`이면 no-op.
3. **MetaProvider 게이팅**: status가 `authenticated`로 바뀌어야 `/me`, `/meta/metrics`, `/meta/models` 3개가 호출된다. status가 `loading`/`unauthenticated`이면 호출 안 함 (의도된 동작 — 비인증 401 방지).
4. **모델 상세 비용**: 환자 상세 첫 진입에서 prediction history는 7회 호출된다 (메인 5 + 보조 2). 각각 limit=50 정도라 비용은 허용 범위지만, 같은 환자에 빠르게 재진입하면 N+1처럼 보일 수 있음.
5. **mock과 실 API의 응답 형태 차이 (실제 사례)**: 백엔드가 `data: { metrics: [...] }` 대신 다른 키로 응답하면 service의 `w.metrics.map(...)`에서 "Cannot read properties of undefined" 에러. 응답 envelope unwrap은 spec과 일치하므로 백엔드 응답 키 정합성 확인이 우선.
