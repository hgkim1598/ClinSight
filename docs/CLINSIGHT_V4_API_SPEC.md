# ClinSight V4 API 명세서

> **기준 문서:** _CLINSIGHT_ARCHITECTURE_BUILD_SPEC_V4_FINAL_SYNTHESIS.md (빌드스펙)  
> **기준 DB:** CLINSIGHT_DB_SCHEMA_V4_FINAL_14TABLE_PATCHED.md (14개 테이블)  
> **대조 결과:** Claude Code Mock↔API 대조 보고서 (6개 페이지)  
> **총 API:** 35개 HTTP endpoint  
> - 빌드스펙 원본 31개 (AI Chat `POST/GET /ai/chat/sessions/*`를 3개 endpoint로 상세 분해하여 +2)  
> - 신규 보강 endpoint 2개: `GET /dashboard/icu/{icuId}/staffing`, `GET /staff`

---

# 0. 공통 사항

## 0.1 Base URL

```
https://{api-id}.execute-api.ap-northeast-2.amazonaws.com/{stage}
```

Private REST API Gateway이므로 VPC Endpoint 경유로만 접근 가능합니다.

**근거:** 빌드스펙 §9.1 — "API 유형: Private REST API Gateway. 외부 노출 없음. Hospital-Sim VPC에서 private endpoint로 접근."

## 0.2 인증

| 대상 | 방식 | 헤더 |
|---|---|---|
| 의료진 (Frontend) | Cognito JWT | `Authorization: Bearer {jwt_token}` |
| EMR Agent (Ingestion) | HMAC 서명 | `X-Agent-Id`, `X-Timestamp`, `X-Nonce`, `X-Body-Hash`, `X-Signature` |

**Agent HMAC 서명 규칙:**

```text
canonical_string = agent_id + "\n" + timestamp + "\n" + nonce + "\n" + body_hash
signature = HMAC_SHA256(agent_secret, canonical_string)
```

- `X-Timestamp`: ISO 8601 UTC. 서버는 ±5분 이내만 수락.
- `X-Nonce`: 재사용 공격 방지용 UUID. 서버는 중복 nonce 거부.
- `X-Body-Hash`: request body의 SHA-256 hex digest.
- `agent_secret`: Lambda 환경변수 또는 Secrets Manager에서 관리.

**근거:** 빌드스펙 §9.1 — "인증: Cognito Authorizer 또는 JWT Authorizer. Agent 인증: Lambda Authorizer 또는 Ingestion Lambda 내부 HMAC 검증."

## 0.3 공통 Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

에러 시:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "해당 ICU stay를 찾을 수 없습니다."
  }
}
```

**이 문서의 각 API별 Response 예시는 `data` 내부 객체 기준으로 작성합니다.** 실제 API Gateway/Lambda 응답은 위 공통 Response Envelope으로 감싸서 반환합니다. 프론트 service 레이어(`src/api/client.ts`)는 envelope을 unwrap한 뒤 `data`만 화면 계층에 전달합니다.

**근거 (대조 결과):** Claude Code 공통 전제 2 — "현재 mock service는 raw payload만 반환. service 레이어에서 unwrap하면 되는 사항."

## 0.4 공통 HTTP Status

| Status | 의미 |
|---|---|
| 200 | 성공 (조회/수정) |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 (idempotency key 충돌) |
| 429 | 요청 제한 초과 |
| 500 | 서버 오류 |

## 0.5 공통 Query Parameter

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `limit` | INT | 페이지 크기 (기본 20, 최대 100) |
| `offset` | INT | 페이지 오프셋 (기본 0) |
| `sort` | TEXT | 정렬 기준 (예: `created_at:desc`) |

## 0.6 Path Parameter 규칙

| 파라미터 | 의미 | 형식 | 근거 |
|---|---|---|---|
| `{stayId}` | ICU stay 식별자 | `stay_token` (TEXT) | DB 스키마 §12 "외부 API에는 stay_token 권장" |
| `{icuId}` | ICU unit 코드 | `config_items.config_key` (TEXT) | DB 스키마 §5.14 config_type='icu_unit' |
| `{modelKey}` | 모델 논리 키 | `model_registry.model_key` (TEXT) | DB 스키마 §5.6 model_key+horizon |
| `{alertId}` | 알림 ID | UUID | DB 스키마 §5.8 alert_id |
| `{consultationId}` | 협진 ID | UUID | DB 스키마 §5.10 consultation_id |
| `{reportId}` | 보고서 ID | UUID | DB 스키마 §5.11 report_id |
| `{sessionKey}` | AI 채팅 세션 키 | UUID | DB 스키마 §5.12 session_key |

## 0.7 Naming Convention

API 응답은 **`snake_case`**입니다. 프론트엔드는 `camelCase`를 사용하므로 프론트 service 레이어에서 일괄 변환합니다.

**근거 (대조 결과):** Claude Code 공통 전제 1 — "프론트는 camelCase, API/DB는 snake_case. 프론트 service 레이어에서 일괄 변환하는 게 일반적."

## 0.8 환자 식별 원칙

API 응답에 **환자 실명, MRN, 주민등록번호 등 직접 식별정보는 포함되지 않습니다.** `patient_token`과 `stay_token`만 사용합니다.

화면에 실명을 표시해야 하는 경우, Hospital-Sim VPC 내부의 매칭 서비스를 통해 token → display_name 변환합니다. (Phase 2 구축, 우선은 프론트 JSON 매칭 파일로 대체)

**근거 (대조 결과):** 대조 #1-2 — "mock Patient.name 제거. V4는 PHI 보호 정책으로 token만 노출."  
**근거 (빌드스펙):** §1 — "Hospital-Sim VPC 내부에만 원본 PHI 보관. Main VPC에는 가명 token과 임상 feature만 전송."

## 0.9 Endpoint URL 체계

빌드스펙 v3는 `/patients/{id}/...` 체계였으나, v4는 **ICU stay 중심 `/icu-stays/{stayId}/...`**으로 재편되었습니다.

**근거 (대조 결과):** Claude Code 공통 전제 3 — "v3 endpoint를 v4로 재편. service 함수 본문만 바꾸면 됨."  
**근거 (빌드스펙):** §9.2 — 모든 환자 관련 API가 `/icu-stays/{stayId}/`로 시작.

---

# 1. App Context (AppContextLambda)

## 1-1. GET /me

| 항목 | 내용 |
|---|---|
| **설명** | 현재 로그인한 사용자 정보를 조회합니다 |
| **Lambda** | AppContextLambda |
| **DB 조회** | `staff_users` WHERE `cognito_sub` = JWT subject |
| **프론트 페이지** | 모든 페이지 (앱 초기화 시) |
| **프론트 서비스** | 현재 미구현 — `CURRENT_USER` 상수로 하드코딩 |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "staff_id": "uuid",
  "cognito_sub": "cognito-sub-string",
  "display_name": "김내과",
  "role": "physician",
  "primary_department_code": "icu",
  "roles_jsonb": ["physician", "icu_attending"],
  "status": "active",
  "last_login_at": "2026-05-11T09:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #1 + DB 스키마 §5.3 staff_users 컬럼  
**대조 참고:** 미구현 endpoint — "Login 후 사용자 정보. 현재 CURRENT_USER 상수."

---

## 1-2. GET /meta/metrics

| 항목 | 내용 |
|---|---|
| **설명** | 시스템에서 사용하는 임상 지표 정의 목록을 조회합니다 |
| **Lambda** | AppContextLambda |
| **DB 조회** | `config_items` WHERE `config_type = 'metric_definition'` AND `is_active = true` |
| **프론트 페이지** | 환자 상세 (vital/lab 차트 라벨, 단위, 정상 범위), 모델 상세 (Raw 임상 지표) |
| **프론트 서비스** | 앱 부트 시 1회 로드, 메모리 캐싱 |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "metrics": [
    {
      "config_key": "hr",
      "display_name": "Heart Rate",
      "metric_group": "vital",
      "unit": "bpm",
      "normal_range_low": 60,
      "normal_range_high": 100,
      "sort_order": 1
    },
    {
      "config_key": "lactate",
      "display_name": "Lactate",
      "metric_group": "lab",
      "unit": "mmol/L",
      "normal_range_low": 0.5,
      "normal_range_high": 2.0,
      "sort_order": 10
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #2 + DB 스키마 §5.14 config_type='metric_definition'

---

## 1-3. GET /meta/models

| 항목 | 내용 |
|---|---|
| **설명** | 현재 활성 상태인 예측 모델 목록을 조회합니다 |
| **Lambda** | AppContextLambda |
| **DB 조회** | `model_registry` WHERE `is_active = true` |
| **프론트 페이지** | 모델 상세 (모델 목록), 환자 상세 (예측 카드) |
| **프론트 서비스** | 앱 부트 시 1회 로드, 메모리 캐싱 |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "models": [
    {
      "model_key": "mortality_48h",
      "model_version": "v6.1.0",
      "model_name": "48시간 사망 위험도",
      "model_type": "xgboost",
      "target_name": "mortality",
      "horizon_hours": 48,
      "endpoint_type": "cpu",
      "default_threshold": 0.5,
      "input_features": ["hr", "map", "lactate", "creatinine", "platelet", "bilirubin", "pao2_fio2", "gcs", "urine_output", "sofa_total"]
    },
    {
      "model_key": "invasive_vent_12h",
      "model_version": "v1.0.0",
      "model_name": "12시간 침습적 환기 필요",
      "model_type": "xgboost",
      "target_name": "invasive_vent",
      "horizon_hours": 12,
      "endpoint_type": "cpu",
      "default_threshold": 0.4,
      "input_features": ["pao2_fio2", "rr", "spo2", "fio2", "peep"]
    },
    {
      "model_key": "vasopressor_12h",
      "model_version": "v1.0.0",
      "model_name": "12시간 승압제 필요",
      "model_type": "xgboost",
      "target_name": "vasopressor",
      "horizon_hours": 12,
      "endpoint_type": "cpu",
      "default_threshold": 0.4,
      "input_features": ["map", "hr", "lactate", "norepinephrine_rate"]
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #3 + DB 스키마 §5.6 model_registry  
**변경 (대조 #3-1):** `model_key`에 horizon 포함 (mortality → mortality_48h). "같은 outcome이라도 horizon이 다른 모델이 공존할 수 있어 model_key에 시점 포함이 표준."  
**추가 (대조 #3-7):** `input_features` 필드 추가. "프론트 Raw 임상 지표의 'Model input' / 'Display only' 라벨 산출 근거. /meta/models에서 input_features를 제공하고 프론트에서 매칭."  
**DB 매핑:** `input_features`는 DB `model_registry` 테이블에 직접 컬럼이 아니라 `feature_schema_s3_uri`가 가리키는 S3 feature schema 파일에 저장. AppContextLambda가 S3에서 읽어와 응답에 포함합니다. 모델 feature schema는 버전별로 커질 수 있으므로 S3 기반이 Aurora 컬럼보다 적절.  
**추가:** invasive_vent_12h, vasopressor_12h 보조지표 모델 포함. model_registry에 등록하면 /predictions 응답에 자동 포함.

---

# 2. Dashboard (DashboardLambda)

## 2-1. GET /dashboard/icu/{icuId}

| 항목 | 내용 |
|---|---|
| **설명** | 특정 ICU의 현재 입실 환자 목록과 요약 정보를 조회합니다 |
| **Lambda** | DashboardLambda |
| **DB 조회** | `mv_active_patient_dashboard` WHERE `current_unit_code = {icuId}` |
| **프론트 페이지** | ICU 메인 대시보드 (`src/pages/OverviewPage.tsx`) |
| **프론트 서비스** | `src/api/services/patientService.ts` — `getPatients()` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sort` | TEXT | N | `risk_score:desc`, `sofa:desc`, `bed:asc` 등 |

**Response 200:**

```json
{
  "icu_unit": {
    "unit_code": "ICU_A",
    "display_name": "내과 중환자실 A"
  },
  "patients": [
    {
      "stay_id": "uuid",
      "stay_token": "ST-abc123",
      "patient_token": "PT-a3f2b8",
      "current_bed_label": "ICU-A-03",
      "age_group": "60s",
      "sex": "M",
      "latest_mortality_risk_score": 0.82,
      "latest_mortality_risk_label": "high",
      "latest_complication_risk_score": 0.45,
      "latest_sofa_total": 8,
      "active_alert_count": 2,
      "last_prediction_at": "2026-05-11T08:30:00Z",
      "last_observation_at": "2026-05-11T08:45:00Z"
    }
  ],
  "summary": {
    "total_patients": 12,
    "high_risk_count": 3,
    "critical_alert_count": 1
  }
}
```

**근거:** 빌드스펙 §9.2 #4 + DB 스키마 §6.3 mv_active_patient_dashboard 컬럼  
**변경 (대조 #1-1):** 식별자를 `id` 하나에서 `patient_token` + `stay_token` 2개로 분리. "한 환자가 ICU에 여러 번 입실하면 stay_token이 새로 생김. 프론트 URL 라우팅을 `:stayId`로 변경."  
**제거 (대조 #1-2):** `name` (환자 실명) 제거. PHI 정책.  
**변경 (대조 #1-3):** `age: 72` → `age_group: "60s"`. "비식별화 정책. 정확한 나이는 재식별 위험."  
**변경 (대조 #1-4):** `risk: "high"` → `latest_mortality_risk_label` + `latest_mortality_risk_score`. "score(실수)와 label(분류) 모두 제공하면 프론트가 임계값을 조정 가능."  
**제거 (대조 #1-5):** `status: "집중관찰"` 제거. "`risk_label` + `active_alert_count`로 프론트에서 파생."  
**제거 (대조 #1-6):** `admit`, `diag`, `sepsisOnset`을 대시보드 응답에서 제거. "상세 진입 시 `/icu-stays/{stayId}`에서 조회. 대시보드 페이로드 경량화."

---

## 2-2. GET /dashboard/icu/{icuId}/staffing *(신규 — #32)*

| 항목 | 내용 |
|---|---|
| **설명** | ICU의 환자-의료진 매칭 및 운영 KPI를 조회합니다 |
| **Lambda** | DashboardLambda |
| **DB 조회** | `icu_stays` JOIN `staff_users` (assignment 기준) + 집계 |
| **프론트 페이지** | ICU 메인 대시보드 KPI 카드 (`src/pages/OverviewPage.tsx`) |
| **프론트 서비스** | `src/api/services/staffingService.ts` — `getStaffing()` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "icu_unit_code": "ICU_A",
  "assignments": [
    {
      "stay_token": "ST-abc123",
      "patient_token": "PT-a3f2b8",
      "current_bed_label": "ICU-A-03",
      "assigned_staff": [
        {
          "staff_id": "uuid",
          "display_name": "김내과",
          "role": "physician"
        },
        {
          "staff_id": "uuid",
          "display_name": "박간호",
          "role": "nurse"
        }
      ]
    }
  ],
  "summary": {
    "total_patients": 12,
    "my_patients_count": 4,
    "unassigned_count": 0
  }
}
```

**추가 근거 (대조 #1-7):** Claude Code — "StaffingSnapshot(totalBeds, doctors.onDuty) endpoint가 API 명세에 없음. 명세 누락."  
**변경 이유:** 실제 ICU 간호사 피드백 — "병상 수보다 '해당 과에 환자가 얼마나 있고 어느 환자가 어느 의료진과 매칭되는지'가 더 중요." KPI를 환자 수/내 담당/고위험 중심으로 변경.  
**분리 근거:** 환자 임상 데이터(예측/SOFA)와 운영 데이터(담당 의료진)는 변경 주기가 다름. 예측은 새 임상 데이터 도착 시, 담당은 근무조 변경 시. 성격이 다른 데이터는 endpoint를 분리하는 게 REST 설계 원칙.  
**DB 보완 필요:** `icu_stays`에 `assigned_physician_id`, `assigned_nurse_id` 추가 또는 별도 assignment 구조 검토.  
**구현 우선순위:** 1차 MVP에서는 선택. 핵심 예측/알림 파이프라인 완성 후 2차에서 구현해도 무방. 프론트 대시보드 KPI 카드에서 이 endpoint 없이도 `summary.total_patients`, `summary.high_risk_count`는 `GET /dashboard/icu/{icuId}` 응답으로 표시 가능.

---

# 3. Patient Detail (PatientDetailLambda)

## 3-1. GET /icu-stays/{stayId}

| 항목 | 내용 |
|---|---|
| **설명** | 환자 상세 헤더 정보를 조회합니다 |
| **Lambda** | PatientDetailLambda |
| **DB 조회** | `icu_stays` JOIN `patients` WHERE `stay_token = {stayId}` |
| **프론트 페이지** | 환자 상세 (`src/pages/PatientPage.tsx`) |
| **프론트 서비스** | `src/api/services/patientService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "stay_id": "uuid",
  "stay_token": "ST-abc123",
  "patient_token": "PT-a3f2b8",
  "age_years": 65,
  "age_group": "60s",
  "sex": "M",
  "admission_type": "emergency",
  "primary_diagnosis_code": "A41.9",
  "primary_diagnosis_text": "Sepsis, unspecified organism",
  "hospital_admit_at": "2026-05-08T14:00:00Z",
  "icu_in_at": "2026-05-08T16:30:00Z",
  "icu_out_at": null,
  "current_unit_code": "ICU_A",
  "current_bed_label": "ICU-A-03",
  "status": "active",
  "sepsis_onset_at": "2026-05-08T18:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #5 + DB 스키마 §5.2 icu_stays + §5.1 patients  
**변경 (대조 #2A):** `admit` 단일 필드 → `hospital_admit_at` + `icu_in_at` 분리. "입원 시각과 ICU 입실 시각은 다를 수 있음."  
**변경 (대조 #2A):** `diag` → `primary_diagnosis_code` + `primary_diagnosis_text`. "ICD 코드와 표시명을 분리해야 코드 기반 필터링 가능."

---

# 4. Clinical Data (ClinicalDataLambda)

## 4-1. GET /icu-stays/{stayId}/clinical-data

| 항목 | 내용 |
|---|---|
| **설명** | 환자의 임상 수치(vital, lab, derived)를 조회합니다 |
| **Lambda** | ClinicalDataLambda |
| **DB 조회** | `clinical_observations` WHERE `stay_id` AND `metric_group` AND `observed_at` range |
| **프론트 페이지** | 환자 상세 vital/lab 차트 + 모델 상세 Raw 임상 지표 |
| **프론트 서비스** | `src/api/services/vitalService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `metric_group` | TEXT | N | `vital`, `lab`, `derived`. 미지정 시 전체 |
| `metric_codes` | TEXT | N | 쉼표 구분. 예: `hr,map,lactate` |
| `from` | TIMESTAMPTZ | N | 시작 시각 (기본: 24시간 전) |
| `to` | TIMESTAMPTZ | N | 종료 시각 (기본: 현재) |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "period": {
    "from": "2026-05-10T09:00:00Z",
    "to": "2026-05-11T09:00:00Z"
  },
  "observations": [
    {
      "observation_id": "uuid",
      "metric_group": "vital",
      "metric_code": "hr",
      "metric_name": "Heart Rate",
      "numeric_value": 92,
      "unit": "bpm",
      "value_status": "normal",
      "normal_range_low": 60,
      "normal_range_high": 100,
      "observed_at": "2026-05-11T08:30:00Z",
      "quality_flag": "valid"
    },
    {
      "observation_id": "uuid",
      "metric_group": "lab",
      "metric_code": "lactate",
      "metric_name": "Lactate",
      "numeric_value": 4.2,
      "unit": "mmol/L",
      "value_status": "high",
      "normal_range_low": 0.5,
      "normal_range_high": 2.0,
      "observed_at": "2026-05-11T08:25:00Z",
      "quality_flag": "valid"
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #6 + DB 스키마 §5.4 clinical_observations  
**구조 변경 (대조 #2-1):** mock은 metric별 pivot(`series.hr.data: number[]`), API는 flat row. "API를 따른다. ingestion 효율(INSERT row 단위), 새 지표 추가 시 스키마 변경 불필요, 결측 표현 자연스러움. 프론트에 `clinicalToVitalData()` 변환 유틸 한 곳에서 처리."  
**프론트 변환 필요:** `observations[]`를 `groupBy(metric_code)` → `{ hr: [{value, time}, ...], map: [...] }` pivot 변환. service 레이어에 유틸 함수 추가.

---

## 4-2. GET /icu-stays/{stayId}/sofa

| 항목 | 내용 |
|---|---|
| **설명** | SOFA 점수 trend를 조회합니다 |
| **Lambda** | ClinicalDataLambda |
| **DB 조회** | `clinical_observations` WHERE `stay_id` AND `metric_group = 'sofa'` |
| **프론트 페이지** | 환자 상세 SOFA 차트 |
| **프론트 서비스** | `src/api/services/vitalService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from` | TIMESTAMPTZ | N | 시작 시각 |
| `to` | TIMESTAMPTZ | N | 종료 시각 |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "sofa_trend": [
    {
      "observed_at": "2026-05-11T06:00:00Z",
      "sofa_total": 8,
      "components": {
        "respiration": 2,
        "coagulation": 1,
        "liver": 1,
        "cardiovascular": 2,
        "cns": 1,
        "renal": 1
      }
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #7 + DB 스키마 §5.4 metric_group='sofa'  
**변경 (대조 #2-2):** organ key 풀네임 사용 — `cardio→cardiovascular`, `resp→respiration`, `hepatic→liver`, `coag→coagulation`. "MIMIC sofa.parquet 컬럼명이 풀네임. DB 정합성 + 의료 용어 표준성."

---

# 5. Prediction (PredictionReadLambda)

## 5-1. GET /icu-stays/{stayId}/predictions

| 항목 | 내용 |
|---|---|
| **설명** | 환자의 모든 모델 최신 예측 결과를 조회합니다 (보조지표 포함 7개) |
| **Lambda** | PredictionReadLambda |
| **DB 조회** | `mv_latest_predictions` WHERE `stay_id` |
| **프론트 페이지** | 환자 상세 예측 카드 5개 + 보조지표 2개 |
| **프론트 서비스** | `src/api/services/modelService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "predictions": [
    {
      "prediction_id": "uuid",
      "model_key": "mortality_48h",
      "model_version": "v6.1.0",
      "target_name": "mortality",
      "horizon_hours": 48,
      "risk_score": 0.82,
      "risk_label": "high",
      "threshold": 0.5,
      "predicted_at": "2026-05-11T08:30:00Z",
      "feature_window_start": "2026-05-10T08:30:00Z",
      "feature_window_end": "2026-05-11T08:30:00Z",
      "top_factors_jsonb": [
        {"feature": "lactate", "value": 4.2, "direction": "increase", "contribution": 0.35},
        {"feature": "map", "value": 58, "direction": "decrease", "contribution": 0.22}
      ],
      "status": "completed"
    },
    {
      "prediction_id": "uuid",
      "model_key": "invasive_vent_12h",
      "model_version": "v1.0.0",
      "target_name": "invasive_vent",
      "horizon_hours": 12,
      "risk_score": 0.61,
      "risk_label": "medium",
      "threshold": 0.4,
      "predicted_at": "2026-05-11T08:30:00Z",
      "feature_window_start": "2026-05-11T02:30:00Z",
      "feature_window_end": "2026-05-11T08:30:00Z",
      "top_factors_jsonb": [
        {"feature": "pao2_fio2", "value": 180, "direction": "decrease", "contribution": 0.41}
      ],
      "status": "completed"
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #8 + DB 스키마 §5.7 model_predictions + §6.2 mv_latest_predictions  
**변경 (대조 #3-2):** `tone: "danger"` → `risk_label: "high"`. "위험 등급과 UI 색상 톤은 다른 개념. 색상 매핑은 컴포넌트 단에서 처리."  
**변경 (대조 #3-3):** SHAP `name: "Lactate 5.2 mmol/L"` → `feature` + `value` + `contribution` 분리. "라벨을 백엔드에서 합치면 i18n·단위 변경 시 불가능. feature 키만 보내고 프론트에서 조립."  
**추가 (보조지표):** invasive_vent_12h, vasopressor_12h가 같은 predictions 배열에 포함. 프론트에서 target_name으로 그룹핑하여 ARDS 카드에 invasive_vent, Shock 카드에 vasopressor를 묶어 표시.

---

## 5-2. GET /icu-stays/{stayId}/predictions/{modelKey}

| 항목 | 내용 |
|---|---|
| **설명** | 특정 모델의 최신 예측 결과를 조회합니다 |
| **Lambda** | PredictionReadLambda |
| **DB 조회** | `model_predictions` WHERE `stay_id` AND `model_key` ORDER BY `predicted_at DESC` LIMIT 1 |
| **프론트 페이지** | 모델 상세 |
| **프론트 서비스** | `src/api/services/modelService.ts` |
| **인증** | Cognito JWT |

**Response 200:** 위 predictions 배열 항목과 동일한 단건 객체

**근거:** 빌드스펙 §9.2 #9

---

## 5-3. GET /icu-stays/{stayId}/predictions/{modelKey}/history

| 항목 | 내용 |
|---|---|
| **설명** | 특정 모델의 예측 이력을 조회합니다 |
| **Lambda** | PredictionReadLambda |
| **DB 조회** | `model_predictions` WHERE `stay_id` AND `model_key` ORDER BY `predicted_at DESC` |
| **프론트 페이지** | 모델 상세 trend 차트 |
| **프론트 서비스** | `src/api/services/modelService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from` | TIMESTAMPTZ | N | 시작 시각 |
| `to` | TIMESTAMPTZ | N | 종료 시각 |
| `limit` | INT | N | 기본 50 |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "model_key": "mortality_48h",
  "history": [
    {
      "prediction_id": "uuid",
      "risk_score": 0.82,
      "risk_label": "high",
      "predicted_at": "2026-05-11T08:30:00Z",
      "status": "completed"
    },
    {
      "prediction_id": "uuid",
      "risk_score": 0.71,
      "risk_label": "high",
      "predicted_at": "2026-05-11T04:30:00Z",
      "status": "completed"
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #10  
**변경 (대조 #3-1):** mock trend[].t는 상대시간('-6h'), API는 ISO 8601 절대시간. "절대시간이 표준. 프론트에서 상대시간 표시로 변환."  
**변경 (대조 #3-1):** mock trend[].pct(0~100 정수) → API risk_score(0~1 실수). "0~1이 ML 표준 출력. 프론트에서 ×100하여 % 표시."  
**참고 (대조 #3-4):** `trendWarn: { delta, note }`는 API에 포함하지 않음. "history 배열 첫 값과 마지막 값으로 delta 계산 가능. 프론트 파생."  
**참고 (대조 #3-6):** 시점별 SHAP는 history 응답에 포함하지 않음. "매시간 SHAP 캐싱 시 응답 부피 과대. 최신만 /predictions/{modelKey}에서 제공. 과거 시점 SHAP가 필요하면 별도 호출 검토."

---

# 6. Timeline (TimelineLambda)

## 6-1. GET /icu-stays/{stayId}/timeline

| 항목 | 내용 |
|---|---|
| **설명** | 환자의 과거 이벤트 타임라인을 조회합니다 |
| **Lambda** | TimelineLambda |
| **DB 조회** | `v_clinical_timeline` WHERE `stay_id` ORDER BY `timeline_time DESC` |
| **프론트 페이지** | 환자 상세 타임라인 |
| **프론트 서비스** | `src/api/services/timelineService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from` | TIMESTAMPTZ | N | 시작 시각 |
| `to` | TIMESTAMPTZ | N | 종료 시각 |
| `item_types` | TEXT | N | 쉼표 구분. 예: `prediction,alert,event` |
| `limit` | INT | N | 기본 50 |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "timeline": [
    {
      "item_type": "prediction",
      "item_id": "uuid",
      "timeline_time": "2026-05-11T08:30:00Z",
      "title": "사망 위험도 82% (high)",
      "summary": "lactate 상승, MAP 저하가 주요 요인",
      "severity": "high",
      "detail_category": "mortality",
      "payload_jsonb": {
        "model_key": "mortality_48h",
        "risk_score": 0.82
      }
    },
    {
      "item_type": "event",
      "item_id": "uuid",
      "timeline_time": "2026-05-11T07:00:00Z",
      "title": "Lactate 검사",
      "summary": "4.2 mmol/L (상승)",
      "severity": "warning",
      "detail_category": "lab",
      "payload_jsonb": {
        "event_type": "order",
        "event_category": "diagnostic",
        "metric_code": "lactate",
        "numeric_value": 4.2
      }
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #11 + DB 스키마 §6.1 v_clinical_timeline  
**추가 (대조 #2D):** `detail_category` 필드 추가. mock은 `category`(vitals/lab/medication 등 임상 행위 유형), API는 `item_type`(prediction/alert/event 등 데이터 출처)으로 분류. "UI에서 아이콘 분기를 임상 행위 유형으로 하고 있다면 `payload_jsonb` 안에 별도 카테고리가 필요." → `detail_category`로 해결.

---

## 6-2. GET /icu-stays/{stayId}/schedule

| 항목 | 내용 |
|---|---|
| **설명** | 예정된 검사/처치/협진 일정을 조회합니다 |
| **Lambda** | TimelineLambda |
| **DB 조회** | `clinical_events` WHERE `stay_id` AND `event_status = 'scheduled'` AND `event_time >= now()` |
| **프론트 페이지** | 환자 상세 일정 |
| **프론트 서비스** | `src/api/services/timelineService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "stay_token": "ST-abc123",
  "scheduled_events": [
    {
      "event_id": "uuid",
      "event_type": "order",
      "event_category": "diagnostic",
      "event_title": "Lactate 재검",
      "event_description": "8시간 간격 정기 검사",
      "event_status": "scheduled",
      "event_time": "2026-05-11T12:00:00Z",
      "end_time": null,
      "derivation_basis": "처방: q8h (직전 투여 2026-05-11T04:00:00Z)"
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #12 + DB 스키마 §5.5 clinical_events  
**추가 (대조 #2E):** `derivation_basis` 필드. "mock의 `basis`('처방: q8h ...')는 UI 카드의 핵심 정보인데 API에 없었음. ScheduledEventBuilderLambda가 산출 가능한 정보."  
**DB 매핑:** `derivation_basis`는 `clinical_events.details_jsonb.derivation_basis`에서 조회. DB 컬럼 추가 없이 기존 JSONB 내부 필드 활용.  
**추가:** `event_description` 필드. mock의 `description`에 대응.

---

# 7. Report (ReportLambda)

## 7-1. GET /icu-stays/{stayId}/report/latest

| 항목 | 내용 |
|---|---|
| **설명** | 환자의 최신 저장된 보고서 메타데이터를 조회합니다 |
| **Lambda** | ReportLambda |
| **DB 조회** | `patient_reports` WHERE `stay_id` ORDER BY `generated_at DESC` LIMIT 1 |
| **프론트 페이지** | 요약 보고서 |
| **프론트 서비스** | `src/api/services/reportService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "report_id": "uuid",
  "stay_token": "ST-abc123",
  "report_type": "ai_assisted",
  "report_title": "일일 ICU 경과 보고서",
  "report_status": "generated",
  "generated_at": "2026-05-11T07:00:00Z",
  "generated_by_staff_id": "uuid",
  "available_formats": ["html", "pdf"],
  "html_download_url": "https://clinsight-reports.s3.ap-northeast-2.amazonaws.com/...?X-Amz-Signature=...",
  "pdf_download_url": "https://clinsight-reports.s3.ap-northeast-2.amazonaws.com/...?X-Amz-Signature=..."
}
```

**presigned URL 정책:** DB(`patient_reports`)에는 `s3://` URI를 원본 저장합니다. API 응답 시 ReportLambda가 `boto3 generate_presigned_url(ExpiresIn=900)`으로 15분 만료 presigned URL을 생성하여 내려줍니다. 브라우저가 `s3://` 프로토콜을 열 수 없고, bucket/key 직접 노출을 방지하기 위함입니다. 교육용 구현에서는 이 방식으로 충분합니다(Frontend가 Hospital-Sim VPC 내부에 있고, S3 VPC Endpoint 경유 접근 가능). 실제 병원 운영 환경에서는 private S3 접근 경로를 별도로 구성하거나, ReportLambda가 S3 객체를 프록시하는 download endpoint를 두는 방식을 검토합니다.

**Response 404:** 저장된 보고서가 없는 경우 (아직 한 번도 저장하지 않음)

**근거:** 빌드스펙 §9.2 #13 + DB 스키마 §5.11 patient_reports

**아키텍처 결정 (대조 #4-1):**

> **기본:** 프론트가 여러 API(patient + vitals + predictions)를 조합하여 화면에 보여줌 (저장 안 함, 가볍고 빠름)  
> **저장 필요 시:** "보고서 저장" 버튼 → POST /reports → Lambda가 그 시점 데이터로 PDF/HTML 생성 → S3 저장  
> **협진 첨부/인계 시:** 저장된 보고서의 S3 URI를 참조

> 이유: "잠깐 열었다 닫는 경우에 불필요한 S3 저장을 방지. 공식 기록이 필요할 때만 스냅샷 보존."  
> 감사 추적: "특정 시점에 의료진이 본 정보가 변경 불가능한 형태로 보존됨."

---

## 7-2. POST /icu-stays/{stayId}/reports

| 항목 | 내용 |
|---|---|
| **설명** | 현재 시점 데이터 기준으로 보고서를 생성하고 S3에 저장합니다 |
| **Lambda** | ReportLambda |
| **DB 쓰기** | `patient_reports` INSERT + S3에 HTML/PDF 저장 |
| **프론트 페이지** | 요약 보고서 "보고서 저장" 버튼 |
| **프론트 서비스** | `src/api/services/reportService.ts` |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "report_type": "daily",
  "report_title": "일일 ICU 경과 보고서",
  "observation_range": {
    "from": "2026-05-10T07:00:00Z",
    "to": "2026-05-11T07:00:00Z"
  },
  "include_predictions": true,
  "include_ai_summary": true
}
```

**Response 201:**

```json
{
  "report_id": "uuid",
  "report_status": "generated",
  "generated_at": "2026-05-11T07:05:00Z",
  "available_formats": ["html", "pdf"],
  "html_download_url": "https://clinsight-reports.s3.ap-northeast-2.amazonaws.com/...?X-Amz-Signature=...",
  "pdf_download_url": "https://clinsight-reports.s3.ap-northeast-2.amazonaws.com/...?X-Amz-Signature=..."
}
```

**근거:** 빌드스펙 §9.2 #14  
**참고 (대조 #4-2):** mock의 `computeVitalStatus()` 휴리스틱(프론트 임계치 판단) 대신 API의 `value_status` 필드를 사용. "임계치 판단은 임상 정책이라 백엔드(DB)에서 일관 관리."

---

## 7-3. GET /icu-stays/{stayId}/reports/{reportId}

| 항목 | 내용 |
|---|---|
| **설명** | 특정 보고서를 조회합니다 |
| **Lambda** | ReportLambda |
| **DB 조회** | `patient_reports` WHERE `report_id` |
| **인증** | Cognito JWT |

**Response 200:** 7-1과 동일 구조

**근거:** 빌드스펙 §9.2 #15

---

# 8. Staff / Consultation (ConsultationLambda)

## 8-1. GET /staff/departments

| 항목 | 내용 |
|---|---|
| **설명** | 부서 목록을 조회합니다 |
| **Lambda** | ConsultationLambda |
| **DB 조회** | `config_items` WHERE `config_type = 'department'` AND `is_active = true` |
| **프론트 페이지** | 협진 요청 모달 (수신 부서 선택) |
| **프론트 서비스** | `src/api/services/consultationService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "departments": [
    {
      "config_key": "icu",
      "display_name": "중환자의학과",
      "sort_order": 1
    },
    {
      "config_key": "infectious",
      "display_name": "감염내과",
      "sort_order": 2
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #16 + DB 스키마 §5.14 config_type='department'

---

## 8-2. GET /staff (신규 추가 — 명세 보강)

| 항목 | 내용 |
|---|---|
| **설명** | 부서별 의료진 목록을 조회합니다 (협진 수신자 선택용) |
| **Lambda** | ConsultationLambda |
| **DB 조회** | `staff_users` WHERE `primary_department_code` AND `status = 'active'` |
| **프론트 페이지** | 협진 요청 모달 (수신자 선택) |
| **프론트 서비스** | `src/api/services/consultationService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `department_code` | TEXT | N | 부서 코드 필터 |
| `role` | TEXT | N | `physician`, `nurse` 등 |

**Response 200:**

```json
{
  "staff": [
    {
      "staff_id": "uuid",
      "display_name": "박감염",
      "role": "physician",
      "primary_department_code": "infectious",
      "status": "active"
    }
  ]
}
```

**추가 근거 (대조 #5-4):** "mock Department.members에 의료진 목록 임베드. API 명세에 staff 조회 endpoint 없음. 협진 수신자 선택 모달에서 필요."  
**참고:** 빌드스펙 §9.2에는 없었던 신규 보강 endpoint. 부록 A 총괄표에 포함.

---

## 8-3. GET /consultations

| 항목 | 내용 |
|---|---|
| **설명** | 협진 목록을 조회합니다 |
| **Lambda** | ConsultationLambda |
| **DB 조회** | `consultations` |
| **프론트 페이지** | 협진 요청 (`src/pages/ConsultationsPage.tsx`) |
| **프론트 서비스** | `src/api/services/consultationService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `status` | TEXT | N | `requested`, `in_progress`, `completed` 등 |
| `stay_token` | TEXT | N | 특정 환자 필터 |

**Response 200:**

```json
{
  "consultations": [
    {
      "consultation_id": "uuid",
      "stay_token": "ST-abc123",
      "subject": "감염내과 협진 요청",
      "priority": "urgent",
      "status": "requested",
      "requester_staff_id": "uuid",
      "requester_department_code": "icu",
      "recipients_jsonb": [
        {"department_code": "infectious", "staff_id": null, "role": "to"},
        {"department_code": "pulmonology", "staff_id": null, "role": "cc"}
      ],
      "attached_report_id": "uuid",
      "created_at": "2026-05-11T08:00:00Z"
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #17 + DB 스키마 §5.10 consultations  
**변경 (대조 #5-1):** status enum `pending→requested`, `accepted→in_progress`. "API 명명이 워크플로우 표준에 더 가까움."  
**추가 (대조 #5-3):** `subject` 필드. "협진 목록 행에 짧은 제목이 노출되는 게 UX 표준."  
**추가 (대조 #5-2):** recipients에 `role: "to"/"cc"`. "수신(to)/참조(cc) 구분이 의료 현장에 필요."  
**추가 (대조 #5-5):** `attached_report_id`. "보고서 S3 URI와 연계. 협진 시 보고서 첨부."  
**DB 매핑:** `attached_report_id`는 `consultations` 테이블에 nullable UUID 컬럼으로 추가. `patient_reports.report_id`를 참조. 테이블 수 14개 유지.

---

## 8-4. GET /consultations/inbox

| 항목 | 내용 |
|---|---|
| **설명** | 현재 사용자에게 온 협진 요청을 조회합니다 |
| **Lambda** | ConsultationLambda |
| **DB 조회** | `consultations` WHERE `recipients_jsonb` @> `staff_id` 또는 `department_code` 매칭 |
| **프론트 페이지** | 현재 미구현 (받은 협진 페이지 추가 시 사용) |
| **인증** | Cognito JWT |

**Response 200:** 8-3과 동일 구조

**근거:** 빌드스펙 §9.2 #18

---

## 8-5. GET /consultations/{consultationId}

| 항목 | 내용 |
|---|---|
| **설명** | 협진 상세를 조회합니다 |
| **Lambda** | ConsultationLambda |
| **DB 조회** | `consultations` WHERE `consultation_id` |
| **프론트 페이지** | 현재 미구현 (목록에서 모든 정보 사용) |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "consultation_id": "uuid",
  "stay_token": "ST-abc123",
  "subject": "감염내과 협진 요청",
  "message": "Lactate 지속 상승, 항생제 변경 검토 요청드립니다.",
  "priority": "urgent",
  "status": "requested",
  "requester_staff_id": "uuid",
  "requester_department_code": "icu",
  "recipients_jsonb": [
    {"department_code": "infectious", "staff_id": null, "role": "to"}
  ],
  "notes_jsonb": [],
  "status_history_jsonb": [],
  "attached_report_id": "uuid",
  "created_at": "2026-05-11T08:00:00Z",
  "updated_at": "2026-05-11T08:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #19

---

## 8-6. POST /consultations

| 항목 | 내용 |
|---|---|
| **설명** | 협진을 요청합니다 |
| **Lambda** | ConsultationLambda |
| **DB 쓰기** | `consultations` INSERT + EventBridge `ConsultationCreated` 발행 |
| **프론트 페이지** | 협진 요청 모달 |
| **프론트 서비스** | `src/api/services/consultationService.ts` |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "stay_token": "ST-abc123",
  "subject": "감염내과 협진 요청",
  "message": "Lactate 지속 상승, 항생제 변경 검토 요청드립니다.",
  "priority": "urgent",
  "recipients": [
    {"department_code": "infectious", "role": "to"}
  ],
  "attached_report_id": "uuid"
}
```

**Response 201:**

```json
{
  "consultation_id": "uuid",
  "status": "requested",
  "created_at": "2026-05-11T08:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #20

---

## 8-7. PATCH /consultations/{consultationId}/status

| 항목 | 내용 |
|---|---|
| **설명** | 협진 상태를 변경합니다 |
| **Lambda** | ConsultationLambda |
| **DB 쓰기** | `consultations` UPDATE status + `status_history_jsonb` APPEND + `notes_jsonb` APPEND |
| **프론트 페이지** | 현재 미구현 (수신자 상태 변경 버튼 추가 시 사용) |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "status": "in_progress",
  "note": "확인했습니다. 오후에 회진 시 함께 보겠습니다."
}
```

**Response 200:**

```json
{
  "consultation_id": "uuid",
  "status": "in_progress",
  "updated_at": "2026-05-11T09:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #21

---

# 9. Alert (AlertApiLambda)

## 9-1. GET /alerts

| 항목 | 내용 |
|---|---|
| **설명** | 현재 사용자의 알림 목록을 조회합니다 |
| **Lambda** | AlertApiLambda |
| **DB 조회** | `alerts` JOIN `notification_deliveries` WHERE `staff_id` = 현재 사용자 |
| **프론트 페이지** | 알림 목록 (`src/pages/AlertsPage.tsx`) |
| **프론트 서비스** | `src/api/services/alertService.ts` |
| **인증** | Cognito JWT |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `status` | TEXT | N | `active`, `acknowledged`, `resolved` |
| `severity` | TEXT | N | `info`, `warning`, `critical` |
| `unread_only` | BOOLEAN | N | `true`면 `read_at IS NULL`만 |

**Response 200:**

```json
{
  "alerts": [
    {
      "alert_id": "uuid",
      "stay_token": "ST-abc123",
      "alert_type": "risk_threshold",
      "alert_source": "mortality_48h",
      "severity": "critical",
      "status": "active",
      "title": "사망 위험도 high 초과",
      "message": "48시간 사망 위험도가 82%로 threshold(50%)를 초과했습니다.",
      "tags_jsonb": ["MAP <65", "SOFA +4", "Lactate ↑"],
      "confidence": 0.82,
      "created_at": "2026-05-11T08:31:00Z",
      "delivery": {
        "delivery_id": "uuid",
        "read_at": null,
        "acknowledged_at": null
      }
    }
  ]
}
```

**근거:** 빌드스펙 §9.2 #22 + DB 스키마 §5.8 alerts + §5.9 notification_deliveries  
**추가 (대조 #6-1):** `alert_source` 필드. mock의 `source`(light_model/deep_model/threshold)에 대응. "UI 배지('AI(경량)' vs '임계치')에 활용. alert_type(알림 분류)과 alert_source(발생 출처)를 분리."  
**DB 매핑:** `alert_source`는 `alerts.trigger_rule_key` 또는 `alerts.prediction_id → model_predictions.model_key`에서 파생. AlertApiLambda가 응답 시 조합.  
**추가 (대조 #6-5):** `tags_jsonb` 필드. "알림 카드의 핵심 시각 정보. mock에서 활용 중."  
**DB 매핑:** `tags_jsonb`는 `alerts.triggered_value_jsonb.tags` 또는 `alerts.metadata_jsonb.tags`에서 조회. AlertWorkerLambda가 알림 생성 시 함께 저장.  
**추가 (대조 #6-5):** `confidence` 필드. "모델 출처 알림일 때 prediction.risk_score에서 가져옴."  
**DB 매핑:** `confidence`는 `alerts.prediction_id → model_predictions.risk_score`에서 파생. 모델 기반 알림이 아닌 경우 null.  
**변경 (대조 #6-2):** severity 3단계(`info`/`warning`/`critical`). "info 단계가 있어야 정보성 알림 표시 가능."  
**변경 (대조 #6-3):** status `new→active`. "같은 의미. 'active alert'가 일반적 명명."  
**추가 (대조 #6-4):** `delivery` 객체로 read/acknowledge 분리. "읽음(per-user)과 확인 처리(시스템 전체)는 다른 상태. 종 배지(unread)와 워크리스트(active) 분리."

---

## 9-2. GET /alerts/count

| 항목 | 내용 |
|---|---|
| **설명** | 현재 사용자의 알림 개수를 조회합니다 |
| **Lambda** | AlertApiLambda |
| **DB 조회** | `notification_deliveries` WHERE `staff_id` + 집계 |
| **프론트 페이지** | ICU 대시보드 알림 종 배지 |
| **프론트 서비스** | `src/api/services/alertService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "total": 5,
  "unread": 3,
  "critical_unread": 1
}
```

**근거:** 빌드스펙 §9.2 #23  
**변경 (대조 #6):** mock은 `getNewAlertCount()` → number 1개만. API는 total/unread/critical_unread 3개. "종 배지(unread)와 긴급 표시(critical_unread) 분리."

---

## 9-3. GET /icu-stays/{stayId}/alerts

| 항목 | 내용 |
|---|---|
| **설명** | 특정 환자의 알림을 조회합니다 |
| **Lambda** | AlertApiLambda |
| **DB 조회** | `alerts` WHERE `stay_id` |
| **프론트 페이지** | 현재 미구현 (환자 상세에 알림 섹션 추가 시 사용) |
| **인증** | Cognito JWT |

**Response 200:** 9-1과 동일 구조 (delivery 정보는 현재 사용자 기준)

**근거:** 빌드스펙 §9.2 #24

---

## 9-4. POST /alerts/{alertId}/read

| 항목 | 내용 |
|---|---|
| **설명** | 알림을 읽음 처리합니다 |
| **Lambda** | AlertApiLambda |
| **DB 쓰기** | `notification_deliveries` UPDATE `read_at = now()` WHERE `alert_id` AND `staff_id` |
| **프론트 페이지** | 알림 목록 (카드 클릭 시 자동 읽음 처리) |
| **프론트 서비스** | 현재 미구현 |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "alert_id": "uuid",
  "read_at": "2026-05-11T09:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #25  
**추가 근거 (대조 #6-4):** "read(읽음, per-user)와 acknowledge(확인 처리, 시스템 전체)는 다른 상태."

---

## 9-5. POST /alerts/{alertId}/acknowledge

| 항목 | 내용 |
|---|---|
| **설명** | 알림을 확인 처리합니다 |
| **Lambda** | AlertApiLambda |
| **DB 쓰기** | `alerts` UPDATE `status = 'acknowledged'`, `acknowledged_at`, `acknowledged_by_staff_id` + `notification_deliveries` UPDATE |
| **프론트 페이지** | 알림 목록 "확인" 버튼 |
| **프론트 서비스** | `src/api/services/alertService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "alert_id": "uuid",
  "status": "acknowledged",
  "acknowledged_at": "2026-05-11T09:05:00Z"
}
```

**근거:** 빌드스펙 §9.2 #26

---

## 9-6. POST /alerts/{alertId}/resolve

| 항목 | 내용 |
|---|---|
| **설명** | 알림을 해소 처리합니다 |
| **Lambda** | AlertApiLambda |
| **DB 쓰기** | `alerts` UPDATE `status = 'resolved'`, `resolved_at`, `resolved_by_staff_id` |
| **프론트 페이지** | 현재 미구현 (service에는 존재) |
| **프론트 서비스** | `src/api/services/alertService.ts` |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "alert_id": "uuid",
  "status": "resolved",
  "resolved_at": "2026-05-11T10:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #27

---

# 10. Ingestion (ClinicalIngestionLambda)

## 10-1. POST /ingest/clinical-observations

| 항목 | 내용 |
|---|---|
| **설명** | EMR Agent가 임상 관측 데이터를 전송합니다 |
| **Lambda** | ClinicalIngestionLambda |
| **DB 쓰기** | `clinical_observations` INSERT + SQS `ClinicalProcessingQueue` 발행 |
| **프론트 페이지** | 해당 없음 (Agent 전용) |
| **인증** | HMAC 서명 (`X-Agent-Id`, `X-Timestamp`, `X-Nonce`, `X-Body-Hash`, `X-Signature`) — §0.2 참조 |

**Request Body:**

```json
{
  "batch_id": "batch-20260511-0830-001",
  "agent_id": "hospital-sim-agent-01",
  "stay_token": "ST-abc123",
  "patient_token": "PT-a3f2b8",
  "observations": [
    {
      "metric_group": "vital",
      "metric_code": "hr",
      "numeric_value": 92,
      "unit": "bpm",
      "observed_at": "2026-05-11T08:30:00+09:00",
      "source_system": "mock_emr",
      "source_record_id_hash": "sha256-abc..."
    },
    {
      "metric_group": "lab",
      "metric_code": "lactate",
      "numeric_value": 4.2,
      "unit": "mmol/L",
      "observed_at": "2026-05-11T08:25:00+09:00",
      "source_system": "mock_emr"
    }
  ]
}
```

**처리 흐름:**
1. HMAC 서명 검증
2. `batch_id` 중복 확인
3. `clinical_observations` INSERT (Aurora)
4. SQS `ClinicalProcessingQueue` 발행 → 후속 SOFA 계산, 예측 트리거

**Response 201:**

```json
{
  "batch_id": "batch-20260511-0830-001",
  "status": "received",
  "rows_received": 2,
  "received_at": "2026-05-11T08:30:05Z"
}
```

**Response 409 (중복):**

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_BATCH",
    "message": "batch_id가 이미 처리되었습니다."
  }
}
```

**근거:** 빌드스펙 §9.2 #28 + DB 스키마 §5.4 clinical_observations + 빌드스펙 §13.1 SQS ClinicalProcessingQueue

---

## 10-2. POST /ingest/orders

| 항목 | 내용 |
|---|---|
| **설명** | EMR Agent가 오더/이벤트 데이터를 전송합니다 |
| **Lambda** | ClinicalIngestionLambda |
| **DB 쓰기** | `clinical_events` INSERT + EventBridge `OrderUpdated` 발행 |
| **프론트 페이지** | 해당 없음 (Agent 전용) |
| **인증** | HMAC 서명 (`X-Agent-Id`, `X-Timestamp`, `X-Nonce`, `X-Body-Hash`, `X-Signature`) — §0.2 참조 |

**Request Body:**

```json
{
  "batch_id": "batch-20260511-0835-002",
  "agent_id": "hospital-sim-agent-01",
  "stay_token": "ST-abc123",
  "events": [
    {
      "event_type": "order",
      "event_category": "diagnostic",
      "event_title": "Lactate 재검",
      "event_status": "scheduled",
      "event_time": "2026-05-11T12:00:00+09:00",
      "source_system": "mock_emr"
    }
  ]
}
```

**Response 201:**

```json
{
  "batch_id": "batch-20260511-0835-002",
  "status": "received",
  "rows_received": 1,
  "received_at": "2026-05-11T08:35:05Z"
}
```

**근거:** 빌드스펙 §9.2 #29 + DB 스키마 §5.5 clinical_events + 빌드스펙 §13.3 EventBridge OrderUpdated

---

# 11. AI (AiInsightLambda)

## 11-1. POST /ai/insights

| 항목 | 내용 |
|---|---|
| **설명** | SHAP 기반 AI 설명을 요청합니다 |
| **Lambda** | AiInsightLambda |
| **DB 조회/쓰기** | `ai_interactions` cache 확인 → `model_predictions` + `clinical_observations` 조회 → Bedrock Runtime → `ai_interactions` INSERT → S3 archive |
| **프론트 페이지** | 모델 상세 (AI 설명 카드) |
| **프론트 서비스** | `src/api/services/aiService.ts` |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "stay_token": "ST-abc123",
  "prediction_id": "uuid",
  "model_key": "mortality_48h",
  "force_refresh": false
}
```

**처리 흐름:**
1. `ai_interactions`에서 cache hit 확인 (`prompt_hash` + `expires_at`)
2. cache 없으면: Aurora에서 prediction + SHAP + clinical context 조회
3. prompt 선마스킹 (PII 제거)
4. Bedrock Runtime InvokeModel (guardrailIdentifier/Version 포함)
5. 결과를 `ai_interactions` INSERT (cache)
6. S3에 prompt/output archive 선택 저장

**Response 200:**

```json
{
  "interaction_id": "uuid",
  "interaction_type": "insight_cache",
  "stay_token": "ST-abc123",
  "prediction_id": "uuid",
  "explanation": "현재 입력된 수치 기준으로 48시간 사망 위험도가 높게 예측되었으며, 주요 기여 요인은 lactate 상승(4.2 mmol/L)과 평균 동맥압 저하(58 mmHg)입니다. 임상 판단은 담당 의료진의 평가가 필요합니다.",
  "top_factors": [
    {"feature": "lactate", "value": 4.2, "direction": "increase", "contribution": 0.35},
    {"feature": "map", "value": 58, "direction": "decrease", "contribution": 0.22}
  ],
  "guardrail_result": {
    "action": "NONE",
    "blocked": false
  },
  "model_provider": "bedrock",
  "llm_model_id": "anthropic.claude-sonnet-4-20250514-v1:0",
  "cached": false,
  "created_at": "2026-05-11T09:00:00Z"
}
```

**근거:** 빌드스펙 §9.2 #30 + §15 Bedrock 설명 계층 + DB 스키마 §5.12 ai_interactions

---

# 12. AI Chat (AiChatLambda)

## 12-1. POST /ai/chat/sessions

| 항목 | 내용 |
|---|---|
| **설명** | 새 채팅 세션을 생성합니다 |
| **Lambda** | AiChatLambda |
| **DB 쓰기** | `ai_interactions` INSERT (interaction_type='chat_session') |
| **프론트 페이지** | AI 채팅 |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "stay_token": "ST-abc123",
  "session_title": "사망 위험 요인 상세 문의"
}
```

**Response 201:**

```json
{
  "interaction_id": "uuid",
  "interaction_type": "chat_session",
  "session_key": "chat-session-uuid",
  "created_at": "2026-05-11T09:10:00Z"
}
```

**근거:** 빌드스펙 §9.2 #31

---

## 12-2. POST /ai/chat/sessions/{sessionKey}/messages

| 항목 | 내용 |
|---|---|
| **설명** | 채팅 메시지를 전송합니다 |
| **Lambda** | AiChatLambda |
| **DB 쓰기** | `ai_interactions` INSERT (interaction_type='chat_message') + Bedrock Runtime |
| **프론트 페이지** | AI 채팅 |
| **인증** | Cognito JWT |

**Request Body:**

```json
{
  "message": "lactate가 왜 이렇게 높은 건가요? 어떤 임상적 의미가 있나요?"
}
```

**Response 200:**

```json
{
  "interaction_id": "uuid",
  "interaction_type": "chat_message",
  "session_key": "chat-session-uuid",
  "output_text": "현재 환자의 lactate 수치는 4.2 mmol/L로 정상 범위(0.5~2.0)를 초과합니다. Lactate 상승은 조직 관류 저하를 시사할 수 있으며, 패혈증 환자에서 중요한 예후 지표입니다. 임상 판단은 담당 의료진의 평가가 필요합니다.",
  "guardrail_result": {
    "action": "NONE",
    "blocked": false
  },
  "created_at": "2026-05-11T09:11:00Z"
}
```

---

## 12-3. GET /ai/chat/sessions/{sessionKey}/messages

| 항목 | 내용 |
|---|---|
| **설명** | 채팅 이력을 조회합니다 |
| **Lambda** | AiChatLambda |
| **DB 조회** | `ai_interactions` WHERE `session_key` ORDER BY `created_at ASC` |
| **프론트 페이지** | AI 채팅 |
| **인증** | Cognito JWT |

**Response 200:**

```json
{
  "session_key": "chat-session-uuid",
  "messages": [
    {
      "interaction_id": "uuid",
      "role": "user",
      "content": "lactate가 왜 이렇게 높은 건가요?",
      "created_at": "2026-05-11T09:11:00Z"
    },
    {
      "interaction_id": "uuid",
      "role": "assistant",
      "content": "현재 환자의 lactate 수치는 ...",
      "created_at": "2026-05-11T09:11:02Z"
    }
  ]
}
```

**DB 매핑 (AI Chat 메시지 저장 구조):**  
`ai_interactions` 테이블에는 `role`, `content`라는 명시 컬럼이 없습니다. API 응답의 필드는 다음과 같이 매핑됩니다:
- **user message:** `interaction_type = 'chat_message'`, `role`은 `input_summary_jsonb.role`에 저장, `content`는 `input_summary_jsonb.message`에 저장
- **assistant message:** `interaction_type = 'chat_message'`, `role`은 고정값 `'assistant'`, `content`는 `output_text`에 저장
- AiChatLambda가 조회 시 이 매핑을 적용하여 통일된 `{ role, content }` 형태로 응답합니다.

---

| # | Method | Path | Lambda | 주요 DB/View | 프론트 페이지 |
|---|---|---|---|---|---|
| 1 | GET | `/me` | AppContextLambda | `staff_users` | 전체 (앱 초기화) |
| 2 | GET | `/meta/metrics` | AppContextLambda | `config_items` | 환자 상세, 모델 상세 |
| 3 | GET | `/meta/models` | AppContextLambda | `model_registry` | 모델 상세 |
| 4 | GET | `/dashboard/icu/{icuId}` | DashboardLambda | `mv_active_patient_dashboard` | ICU 대시보드 |
| 5 | GET | `/dashboard/icu/{icuId}/staffing` | DashboardLambda | `icu_stays`, `staff_users` | ICU 대시보드 KPI |
| 6 | GET | `/icu-stays/{stayId}` | PatientDetailLambda | `icu_stays`, `patients` | 환자 상세 |
| 7 | GET | `/icu-stays/{stayId}/clinical-data` | ClinicalDataLambda | `clinical_observations` | 환자 상세 차트 |
| 8 | GET | `/icu-stays/{stayId}/sofa` | ClinicalDataLambda | `clinical_observations` | 환자 상세 SOFA |
| 9 | GET | `/icu-stays/{stayId}/predictions` | PredictionReadLambda | `mv_latest_predictions` | 환자 상세 예측 |
| 10 | GET | `/icu-stays/{stayId}/predictions/{modelKey}` | PredictionReadLambda | `model_predictions` | 모델 상세 |
| 11 | GET | `/icu-stays/{stayId}/predictions/{modelKey}/history` | PredictionReadLambda | `model_predictions` | 모델 상세 trend |
| 12 | GET | `/icu-stays/{stayId}/timeline` | TimelineLambda | `v_clinical_timeline` | 환자 상세 타임라인 |
| 13 | GET | `/icu-stays/{stayId}/schedule` | TimelineLambda | `clinical_events` | 환자 상세 일정 |
| 14 | GET | `/icu-stays/{stayId}/report/latest` | ReportLambda | `patient_reports` | 요약 보고서 |
| 15 | POST | `/icu-stays/{stayId}/reports` | ReportLambda | `patient_reports`, S3 | 요약 보고서 저장 |
| 16 | GET | `/icu-stays/{stayId}/reports/{reportId}` | ReportLambda | `patient_reports` | 보고서 상세 |
| 17 | GET | `/staff/departments` | ConsultationLambda | `config_items` | 협진 모달 |
| 18 | GET | `/staff` | ConsultationLambda | `staff_users` | 협진 수신자 선택 |
| 19 | GET | `/consultations` | ConsultationLambda | `consultations` | 협진 목록 |
| 20 | GET | `/consultations/inbox` | ConsultationLambda | `consultations` | 받은 협진 (미구현) |
| 21 | GET | `/consultations/{consultationId}` | ConsultationLambda | `consultations` | 협진 상세 (미구현) |
| 22 | POST | `/consultations` | ConsultationLambda | `consultations`, EventBridge | 협진 요청 |
| 23 | PATCH | `/consultations/{consultationId}/status` | ConsultationLambda | `consultations` | 상태 변경 (미구현) |
| 24 | GET | `/alerts` | AlertApiLambda | `alerts`, `notification_deliveries` | 알림 목록 |
| 25 | GET | `/alerts/count` | AlertApiLambda | `notification_deliveries` | 알림 배지 |
| 26 | GET | `/icu-stays/{stayId}/alerts` | AlertApiLambda | `alerts`, `notification_deliveries` | 환자별 알림 (미구현) |
| 27 | POST | `/alerts/{alertId}/read` | AlertApiLambda | `notification_deliveries` | 읽음 처리 (미구현) |
| 28 | POST | `/alerts/{alertId}/acknowledge` | AlertApiLambda | `alerts`, `notification_deliveries` | 확인 처리 |
| 29 | POST | `/alerts/{alertId}/resolve` | AlertApiLambda | `alerts` | 해소 처리 |
| 30 | POST | `/ingest/clinical-observations` | ClinicalIngestionLambda | `clinical_observations`, SQS | Agent 전용 |
| 31 | POST | `/ingest/orders` | ClinicalIngestionLambda | `clinical_events`, EventBridge | Agent 전용 |
| 32 | POST | `/ai/insights` | AiInsightLambda | `ai_interactions`, `model_predictions`, Bedrock, S3 | 모델 상세 AI 설명 |
| 33 | POST | `/ai/chat/sessions` | AiChatLambda | `ai_interactions`, Bedrock | AI 채팅 |
| 34 | POST | `/ai/chat/sessions/{sessionKey}/messages` | AiChatLambda | `ai_interactions`, Bedrock | AI 채팅 |
| 35 | GET | `/ai/chat/sessions/{sessionKey}/messages` | AiChatLambda | `ai_interactions` | AI 채팅 |

---

# 부록 B. Claude Code 대조 결과 반영 요약

## B.1 API 명세에 추가/보강한 항목

| 항목 | 근거 | 반영 위치 |
|---|---|---|
| `GET /dashboard/icu/{icuId}/staffing` | 대조 #1-7 + ICU 간호사 피드백 | §2-2 (신규) |
| `GET /staff` (부서별 의료진 조회) | 대조 #5-4 "협진 수신자 선택용 staff 목록 없음" | §8-2 (신규) |
| `/meta/models`에 `input_features` | 대조 #3-7 "RawMetric isModelInput 라벨 산출 근거" | §1-3 |
| Schedule에 `derivation_basis` | 대조 #2E "UI 카드의 처방 근거 표시" | §6-2 |
| Alert에 `tags_jsonb`, `confidence`, `alert_source` | 대조 #6-1, #6-5 "카드 정보 보존" | §9-1 |
| Consultation에 `subject`, `attached_report_id`, recipients `role` | 대조 #5-2, #5-3, #5-5 | §8-3, §8-6 |
| Timeline에 `detail_category` | 대조 #2D "UI 아이콘 분기용 카테고리" | §6-1 |
| 보조지표 모델 (invasive_vent_12h, vasopressor_12h) | 대조 #3-5 "ARDS/Shock 보조 prediction" | §1-3, §5-1 |

## B.2 프론트가 변경/제거해야 할 항목

| 항목 | 근거 | 우선순위 |
|---|---|---|
| `Patient.name` 제거 | 대조 #1-2 "PHI 정책" | 높음 |
| `Patient.status` (집중관찰 등) 제거, risk_label+alert_count로 파생 | 대조 #1-5 | 높음 |
| `Patient.id` → `patient_token` + `stay_token` 분리, URL 라우팅 변경 | 대조 #1-1 | 높음 |
| `Patient.age` (정수) → `age_group` (텍스트) | 대조 #1-3 "비식별화 정책" | 높음 |
| VitalData/SofaTrend pivot → flat row 변환 유틸 추가 | 대조 #2-1 "service 레이어에서 groupBy" | 중간 |
| SOFA organ key 변경 (cardio→cardiovascular 등) | 대조 #2-2 "MIMIC 표준" | 중간 |
| ModelKey enum에 horizon 포함 (mortality→mortality_48h) | 대조 #3-1 | 중간 |
| tone(danger/warn/safe) → risk_label(high/med/low) + 프론트 색상 매핑 | 대조 #3-2 | 중간 |
| ShapFeature name(합쳐진 문자열) → feature+value+contribution 분리 | 대조 #3-3 | 중간 |
| Alert read/acknowledge 분리 UI 도입 | 대조 #6-4 | 중간 |
| PatientReportModal: 평소 프론트 조합 + 저장 시 POST /reports | 대조 #4-1 "아키텍처 타협안" | 낮음 (기능 동작 후) |

## B.3 현재 미구현 endpoint (페이지 추가 시 사용)

| Endpoint | 용도 |
|---|---|
| `GET /me` | Login 후 사용자 정보 (현재 CURRENT_USER 상수) |
| `GET /meta/metrics`, `GET /meta/models` | 부트 시 메타 로드 |
| `GET /consultations/inbox` | 받은 협진 페이지 |
| `PATCH /consultations/{id}/status` | 수신자 상태 변경 |
| `POST /alerts/{id}/read` | 읽음 처리 |
| `GET /icu-stays/{stayId}/alerts` | 환자 상세 알림 섹션 |
| `POST /ingest/*` | EMR Agent 전용 (프론트 비대상) |
