# ClinSight DynamoDB 스키마 설계 문서

> ICU 패혈증 예측 대시보드(ClinSight) 백엔드용 DynamoDB 테이블 설계 초안.
> 프론트엔드의 mock 데이터·타입·서비스 시그니처를 기반으로 도출.

---

## 0. 참고 자료

### 프론트엔드 레포지토리

- **Git 주소**: `https://github.com/hgkim1598/ClinSight.git`
- **CLAUDE.md** 참고: 도메인·UI 규칙·Mock 데이터 특성 정리 文件
- 컴포넌트는 `src/api/services/*` 만 import → 백엔드 연동 시 **services 함수 본문만 fetch로 교체**하면 됨. mock 파일은 보존.

### 단일 진입점 (타입 정의)

| 경로 | 역할 |
|---|---|
| [`src/types/index.ts`](../src/types/index.ts) | 모든 인터페이스/타입 정의 — DynamoDB 속성 매핑의 1차 reference |

### Mock 데이터 파일 (백엔드 응답 예시로 활용 가능)

| 경로 | 역할 |
|---|---|
| [`src/api/mock/patients.ts`](../src/api/mock/patients.ts) | 환자 목록 (8명) |
| [`src/api/mock/vitals.ts`](../src/api/mock/vitals.ts) | 환자별 활력징후 시계열 + 검사 점 |
| [`src/api/mock/models.ts`](../src/api/mock/models.ts) | 5개 예측 모델 결과 (trend·shap·raw·llmSummary) |
| [`src/api/mock/sofaScores.ts`](../src/api/mock/sofaScores.ts) | SOFA 6장기 시간별 점수 |
| [`src/api/mock/staffing.ts`](../src/api/mock/staffing.ts) | ICU 운영 현황 |
| [`src/api/mock/aiInsights.ts`](../src/api/mock/aiInsights.ts) | 모델×섹션 AI 설명 텍스트 |
| [`src/api/mock/alerts.ts`](../src/api/mock/alerts.ts) | 임상 알림 누적 |
| [`src/api/mock/timeline.ts`](../src/api/mock/timeline.ts) | 환자 24시간 임상 이벤트 |
| [`src/api/mock/departments.ts`](../src/api/mock/departments.ts) | 진료 부서 + 의료진 트리 |
| [`src/api/mock/consultations.ts`](../src/api/mock/consultations.ts) | 협진 요청 내역 |

### 서비스 함수 시그니처 (쿼리 패턴 도출 근거)

| 경로 | 주요 함수 |
|---|---|
| [`src/api/services/patientService.ts`](../src/api/services/patientService.ts) | `getPatients()`, `getPatientById(id)` |
| [`src/api/services/vitalService.ts`](../src/api/services/vitalService.ts) | `getVitals(patientId)` |
| [`src/api/services/modelService.ts`](../src/api/services/modelService.ts) | `getModelPredictions(patientId)` |
| [`src/api/services/sofaService.ts`](../src/api/services/sofaService.ts) | `getSofaTrend(patientId)` |
| [`src/api/services/staffingService.ts`](../src/api/services/staffingService.ts) | `getStaffing()` |
| [`src/api/services/aiInsightService.ts`](../src/api/services/aiInsightService.ts) | `getAiInsight(model, section)` 등 |
| [`src/api/services/alertService.ts`](../src/api/services/alertService.ts) | `getAlerts()`, `getNewAlertCount()`, `acknowledgeAlert(id, by)`, `resolveAlert(id)` |
| [`src/api/services/timelineService.ts`](../src/api/services/timelineService.ts) | `getTimeline(patientId)` |
| [`src/api/services/consultService.ts`](../src/api/services/consultService.ts) | `getDepartments()`, `getConsultations(patientId?)`, `createConsultation(...)` |
| [`src/api/services/reportService.ts`](../src/api/services/reportService.ts) | `getPatientReport(patientId)` — 조합형 (3개 서비스 호출) |

---

## 1. 전체 테이블 요약

| # | 테이블명 | 용도 | PK | SK | GSI 개수 |
|---|---|---|---|---|---|
| 1 | `Patients` | ICU 환자 마스터 | `patientId` (S) | — | 1 |
| 2 | `Vitals` | 활력징후 시계열 | `patientId` (S) | `timestamp` (S) | 0 |
| 3 | `Labs` | 검사 점 데이터 | `patientId` (S) | `timestamp#labType` (S) | 0 |
| 4 | `ModelPredictions` | AI 예측 모델 결과 | `patientId` (S) | `modelKey` (S) | 0 |
| 5 | `SofaScores` | SOFA 6장기 시간별 점수 | `patientId` (S) | `timestamp` (S) | 0 |
| 6 | `IcuStaffing` | ICU 운영 현황 | `icuId` (S) | — | 0 |
| 7 | `AiInsightsCache` | AI 설명 텍스트 캐시 (옵션) | `insightKey` (S) | — | 0 |
| 8 | `Alerts` | 임상 알림 | `alertId` (S) | — | 2 |
| 9 | `ClinicalTimeline` | 환자 24시간 이벤트 | `patientId` (S) | `timestamp#eventId` (S) | 0 |
| 10 | `Departments` | 진료 부서 마스터 | `departmentId` (S) | — | 0 |
| 11 | `Staff` | 의료진 마스터 | `staffId` (S) | — | 1 |
| 12 | `Consultations` | 협진 요청 | `consultationId` (S) | — | 2 |

> **참고**: 단일 테이블 디자인(single-table design)으로 통합도 가능하나, 가독성·온보딩을 위해 도메인별로 분리. 통합안 토의는 §13에 정리.

---

## 2. 공통 가이드라인

- **시각 표기**: 모든 timestamp는 ISO 8601 KST(`2026-04-29T14:20:00+09:00`) 권장. mock의 표시용 문자열(`"14:20"`, `"2026-04-21 08:14"`)은 프론트 포맷터가 변환하도록.
- **String 타입의 sentinel**: nullable 시각/문자열은 누락 시 attribute 자체를 생략(존재 여부로 판단).
- **숫자형 결측**: SOFA·바이탈처럼 결측이 잦은 항목은 `NULL` 또는 attribute 미존재로 표현. 0으로 채우지 말 것 (CLAUDE.md "결측치 처리(보간) 하지 않음" 규칙).
- **삭제 정책**: 임상 데이터는 soft-delete(`deletedAt`) 권장. hard-delete 금지.
- **Streams**: `Alerts` 테이블 등 실시간 알림이 필요한 곳은 DDB Streams + Lambda + WebSocket 또는 SNS 구성 고려.
- **TTL**: `AiInsightsCache`만 TTL 사용(예: 24시간).

---

## 3. `Patients`

### 용도
ICU 입실 환자의 정적 마스터 데이터(이름·진단·위험도·상태). 위험도/상태/SOFA는 자주 갱신되므로 별도의 **events** 또는 **read replica** 패턴을 고려할 수 있음.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** (예: `PT-19482`) |
| GSI1: `riskAdmitIndex` | — | PK=`risk` (high/med/low), SK=`admitTime` — 위험도별 입실시간순 정렬 |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | 환자 식별자 (예: `PT-19482`) |
| `name` | S | ✓ | 이름 |
| `age` | N | ✓ | 나이 |
| `sex` | S | ✓ | `M` / `F` |
| `bed` | S | ✓ | 병상 (예: `A-01`) |
| `admitTime` | S | ✓ | 입실시각 ISO 8601 |
| `diagnosis` | S | ✓ | 주진단 |
| `risk` | S | ✓ | `high` / `med` / `low` |
| `status` | S | ✓ | `집중관찰` / `안정` / `주의관찰` |
| `sofa` | N | ✓ | 현재 SOFA 점수 |
| `sepsisOnset` | S | ✗ | 패혈증 발생 시각 (있는 경우) |

### Mock 예시 ([patients.ts:4-16](../src/api/mock/patients.ts#L4-L16))
```json
{
  "patientId": "PT-19482",
  "name": "김영호",
  "age": 72,
  "sex": "M",
  "bed": "A-01",
  "admitTime": "2026-04-21T08:14:00+09:00",
  "diagnosis": "지역사회획득 폐렴, 패혈성 쇼크 의심",
  "risk": "high",
  "status": "집중관찰",
  "sofa": 12,
  "sepsisOnset": "2026-04-23T11:40:00+09:00"
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 전체 환자 조회 | `Scan` (소량 ICU 한정) | `GET /patients` ← `getPatients()` |
| 단일 환자 조회 | `GetItem(patientId)` | `GET /patients/{id}` ← `getPatientById(id)` |
| 고위험 환자 최신순 | GSI Query `risk='high'` SK desc | (UI 정렬용 — Scan 후 클라이언트 정렬도 가능) |

---

## 4. `Vitals`

### 용도
환자별 활력징후 시계열(HR/MAP/SpO₂/RR/Temp/GCS/UO). 매시간 단위 측정. `connectNulls=false` 정책이라 결측 attribute 생략.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** |
| `timestamp` | S | **SK** (ISO 8601, 시간 정렬) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | 환자 ID (PK) |
| `timestamp` | S | ✓ | 측정 시각 (SK) |
| `hr` | N | ✗ | Heart Rate (bpm) |
| `map` | N | ✗ | MAP (mmHg) |
| `spo2` | N | ✗ | SpO₂ (%) |
| `rr` | N | ✗ | Respiratory Rate (/min) |
| `temp` | N | ✗ | Temperature (°C) |
| `gcs` | N | ✗ | Glasgow Coma Scale (3–15) |
| `urineOutput` | N | ✗ | Urine Output (mL/h) |

> 정상 범위·라벨·단위는 백엔드/UI 양쪽 어디든 둘 수 있음. 마스터 테이블(`VitalMeta`)로 분리하거나 프론트 상수화 모두 가능 — 현재 프론트는 `VitalSeries.normal/label/unit`을 응답 묶음으로 받아옴.

### Mock 예시 ([vitals.ts:13](../src/api/mock/vitals.ts#L13))
```json
{
  "patientId": "PT-19482",
  "timestamp": "2026-04-25T14:00:00+09:00",
  "hr": 107.4,
  "map": 58,
  "spo2": 91,
  "rr": 28,
  "temp": 38.9,
  "gcs": 9,
  "urineOutput": 20
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 환자 24시간 전체 vital | `Query patientId, SK between (now-24h, now)` | `GET /patients/{id}/vitals` ← `getVitals(id)` |
| 최근 N개 포인트 | `Query` + `ScanIndexForward=false` + `Limit=N` | (옵션) |

---

## 5. `Labs`

### 용도
연속 측정이 아닌 검사 점 데이터(Lactate, Creatinine, P/F ratio, Platelet, Bilirubin). 측정 빈도가 낮고 시점이 불규칙.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** |
| `timestamp#labType` | S | **SK** (예: `2026-04-25T14:00:00+09:00#lac`) |

> 같은 시각에 여러 lab type이 들어올 수 있으므로 SK에 type을 합성. 프론트의 `LabDot.type` enum: `lac` / `cre` / `pf_ratio` / `platelet` / `bilirubin`.

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | 환자 ID (PK) |
| `sortKey` | S | ✓ | `timestamp#labType` (SK) |
| `timestamp` | S | ✓ | 측정 시각 (역정규화) |
| `labType` | S | ✓ | `lac` / `cre` / `pf_ratio` / `platelet` / `bilirubin` |
| `label` | S | ✓ | 표시 라벨 (예: `Lac`, `P/F 380`) |
| `value` | N | ✓ | 수치 |

### Mock 예시 ([vitals.ts:60](../src/api/mock/vitals.ts#L60))
```json
{
  "patientId": "PT-19482",
  "sortKey": "2026-04-25T14:00:00+09:00#lac",
  "timestamp": "2026-04-25T14:00:00+09:00",
  "labType": "lac",
  "label": "Lac",
  "value": 5.2
}
```

### 쿼리 패턴

| 시나리오 | 동작 |
|---|---|
| 환자 전체 lab (최근 24h) | `Query patientId, SK begins_with(시각 prefix)` |
| 특정 lab type만 | `Query patientId` + FilterExpression `labType=:t` (소량이라 비용 미미) |

> Vitals + Labs를 한 응답으로 묶는 BFF 엔드포인트(`GET /patients/{id}/vitals`)는 백엔드에서 두 테이블을 병렬 조회 후 `VitalData` 형태로 합치는 것을 권장.

---

## 6. `ModelPredictions`

### 용도
환자별 5개 AI 모델(`mortality`/`aki`/`ards`/`sic`/`shock`) 최신 예측 결과. trend(7시점, 시점별 SHAP top-5 포함), 현재 SHAP, raw 입력, LLM 요약, escalation(보조지표) 포함.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** |
| `modelKey` | S | **SK** (`mortality` / `aki` / `ards` / `sic` / `shock`) |

> 환자 1명당 정확히 5개 항목. 한 번의 `Query patientId`로 5건 모두 회수.

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | PK |
| `modelKey` | S | ✓ | SK |
| `title` | S | ✓ | 모델 표시명 (예: `사망 위험`) |
| `tone` | S | ✓ | `danger` / `warn` / `safe` |
| `trend` | L (List of M) | ✓ | 7시점 배열, 각 항목: `{ t, pct, shap[] }` |
| `trendWarn` | M | ✓ | `{ delta, note }` |
| `shap` | L | ✓ | 현재 시점 SHAP top-5: `{ name, value, direction }` |
| `raw` | L | ✓ | 모델 입력 원본 지표: `{ label, value, unit, time, isModelInput }` |
| `llmSummary` | S | ✓ | LLM이 생성한 임상 요약 |
| `escalation` | M | ✗ | ARDS/Shock 전용 보조지표: `{ title, shortLabel, probability, currentStatus, shap[] }` |
| `updatedAt` | S | ✓ | 모델 갱신 시각 (캐시 신선도 체크용) |

### Mock 예시 ([models.ts:16-49](../src/api/mock/models.ts#L16-L49))
```json
{
  "patientId": "PT-19482",
  "modelKey": "mortality",
  "title": "사망 위험",
  "tone": "danger",
  "trend": [
    {
      "t": "-6h",
      "pct": 48,
      "shap": [
        { "name": "Lactate 2.8 mmol/L", "value": 0.15, "direction": "up" }
        /* ... */
      ]
    }
    /* 7개 시점 */
  ],
  "trendWarn": { "delta": "+26%p", "note": "최근 6시간 동안 위험이 빠르게 상승 중입니다." },
  "shap": [ /* 현재 SHAP top 5 */ ],
  "raw": [ /* 모델 입력 원본 */ ],
  "llmSummary": "혈압 저하와 lactate 상승이 동반되며..."
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 환자의 5개 모델 모두 | `Query patientId` (5개 항목 회수) | `GET /patients/{id}/predictions` ← `getModelPredictions(id)` |
| 단일 모델만 | `GetItem(patientId, modelKey)` | (옵션) |

> **데이터 크기 주의**: trend × shap 중첩으로 단일 항목이 수 KB. 400KB DDB 항목 한도 내지만, 대형 LLM 요약은 별도 테이블 분리 검토.

---

## 7. `SofaScores`

### 용도
SOFA 6개 장기(`cardio`/`resp`/`cns`/`hepatic`/`renal`/`coag`) 시간별 점수. 결측 빈도가 장기마다 다름 (CLAUDE.md §SOFA 참조).

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** |
| `timestamp` | S | **SK** (ISO 8601) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | PK |
| `timestamp` | S | ✓ | SK |
| `cardio` | N | ✗ | 심혈관 점수 (0–4, NaN/null 가능) |
| `resp` | N | ✗ | 호흡 점수 |
| `cns` | N | ✗ | 중추신경 점수 |
| `hepatic` | N | ✗ | 간 점수 |
| `renal` | N | ✗ | 신장 점수 |
| `coag` | N | ✗ | 응고 점수 |

### Mock 예시 ([sofaScores.ts:8-18](../src/api/mock/sofaScores.ts#L8-L18))
```json
{
  "patientId": "PT-19482",
  "timestamp": "2026-04-25T08:00:00+09:00",
  "cardio": 4,
  "resp": 3,
  "cns": 2,
  "hepatic": 2,
  "renal": 3,
  "coag": 2
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 환자 24시간 SOFA 추이 | `Query patientId, SK between` | `GET /patients/{id}/sofa` ← `getSofaTrend(id)` |

---

## 8. `IcuStaffing`

### 용도
ICU 운영 스냅샷. 병상 정원·의사·간호사 인력·임계값. (이미 [`types/index.ts`](../src/types/index.ts)의 `StaffingSnapshot` JSDoc에 명세 존재 — 그 규약을 따른다.)

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `icuId` | S | **PK** (예: `ICU-01`) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `icuId` | S | ✓ | PK |
| `updatedAt` | S | ✓ | 스냅샷 갱신 시각 |
| `totalBeds` | N | ✓ | 병상 정원 |
| `doctors` | M | ✓ | `{ onDuty, total, activities[] }` |
| `nurses` | M | ✓ | `{ onDuty }` |
| `thresholds` | M | ✓ | `{ maxPatientsPerNurse }` |

### Mock 예시 ([staffing.ts:3-21](../src/api/mock/staffing.ts#L3-L21))
```json
{
  "icuId": "ICU-01",
  "updatedAt": "2026-04-25T08:00:00+09:00",
  "totalBeds": 20,
  "doctors": {
    "onDuty": 3,
    "total": 4,
    "activities": [
      { "label": "회진", "count": 2 },
      { "label": "수술", "count": 1 }
    ]
  },
  "nurses": { "onDuty": 4 },
  "thresholds": { "maxPatientsPerNurse": 2 }
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 단일 ICU 최신 스냅샷 | `GetItem(icuId)` | `GET /icus/{icuId}/staffing` ← `getStaffing()` |

---

## 9. `AiInsightsCache` (옵션)

### 용도
Bedrock 호출 결과를 모델×섹션 단위로 캐싱. **선택 사항** — 비용·레이턴시 이슈가 없다면 매번 직접 호출도 가능.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `insightKey` | S | **PK** (예: `mortality#trend`) |
| `ttl` | N | TTL (Unix epoch seconds) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `insightKey` | S | ✓ | `{modelKey}#{section}` |
| `text` | S | ✓ | LLM 생성 텍스트 |
| `generatedAt` | S | ✓ | 생성 시각 |
| `ttl` | N | ✓ | DDB TTL (24시간 권장) |
| `patientContext` | S | ✗ | (환자별 캐시 시) `patientId` 추가 |

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 캐시 hit 체크 → miss 시 Bedrock 호출 | `GetItem` → 없으면 invoke → `PutItem` | `getAiInsight(model, section)` |

> 환자 컨텍스트가 들어가면 PK가 `{patientId}#{modelKey}#{section}`로 확장. 채팅(`getChatResponse`)은 stateless가 자연스러움.

---

## 10. `Alerts`

### 용도
임상 알림(모델 발생 / 임계치 초과). 미확인 카운트는 종 버튼 배지에 사용되어 **읽기가 빈번**, 상태 변경(ack/resolve)은 단건 update.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `alertId` | S | **PK** (예: `alert-001`) |
| GSI1: `StatusCreatedAtIndex` | — | PK=`status`, SK=`createdAt` — 미확인 큐 |
| GSI2: `PatientCreatedAtIndex` | — | PK=`patientId`, SK=`createdAt` — 환자별 알림 |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `alertId` | S | ✓ | PK |
| `patientId` | S | ✓ | 환자 ID (GSI2 PK) |
| `patientName` | S | ✓ | 역정규화 (UI에서 즉시 표시) |
| `patientBed` | S | ✓ | 역정규화 |
| `source` | S | ✓ | `light_model` / `deep_model` / `threshold` |
| `priority` | S | ✓ | `critical` / `warning` |
| `status` | S | ✓ | `new` / `acknowledged` / `resolved` (GSI1 PK) |
| `createdAt` | S | ✓ | ISO 8601 (GSI1/GSI2 SK) |
| `acknowledgedBy` | S | ✗ | 처리자 |
| `acknowledgedAt` | S | ✗ | 처리 시각 |
| `resolvedAt` | S | ✗ | 해소 시각 |
| `title` | S | ✓ | 헤드라인 |
| `body` | S | ✓ | 본문 (모델 근거·수치 포함) |
| `tags` | L (S) | ✓ | 태그 배열 |
| `confidence` | N | ✗ | 0–100 (모델 source일 때만) |
| `actions` | L (M) | ✓ | UI 액션 정의: `{ type, label }` |

### Mock 예시 ([alerts.ts:18-33](../src/api/mock/alerts.ts#L18-L33))
```json
{
  "alertId": "alert-001",
  "patientId": "PT-19482",
  "patientName": "김영호",
  "patientBed": "A-01",
  "source": "deep_model",
  "priority": "critical",
  "status": "new",
  "createdAt": "2026-04-29T14:20:00+09:00",
  "title": "패혈증 고위험 — Risk 87%",
  "body": "MAP 58 mmHg, NE 0.18 mcg/kg/min 투여 중. Lactate 3.8 mmol/L (2배 이상 증가). SOFA 11 (+4). Sepsis-3 기준 충족.",
  "tags": ["MAP <65", "SOFA +4", "Lactate ↑", "No Lactate Clearance"],
  "confidence": 87,
  "actions": [
    { "type": "acknowledge", "label": "확인" },
    { "type": "view_patient", "label": "환자 보기" },
    { "type": "escalate", "label": "상급 보고" }
  ]
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 미확인 알림 카운트 | `Query GSI1 status='new', Select=COUNT` | `getNewAlertCount()` (종 버튼 배지) |
| 미확인 알림 목록(최신순) | `Query GSI1 status='new' ScanIndexForward=false` | (알림 페이지 §1 섹션) |
| 확인됨/해소됨 목록 | `Query GSI1 status='acknowledged' / 'resolved'` | (알림 페이지 §2/§3) |
| 전체 알림 | (GSI1 모든 상태 합산 또는 Scan) | `getAlerts()` |
| 환자별 알림 | `Query GSI2 patientId` | (환자 상세 연동 시) |
| 단일 알림 ack | `UpdateItem(alertId)` SET status, acknowledgedBy, acknowledgedAt | `acknowledgeAlert(id, by)` |
| 단일 알림 resolve | `UpdateItem(alertId)` SET status, resolvedAt | `resolveAlert(id)` |

> **실시간 푸시**: DDB Streams에 트리거 → Lambda → WebSocket / SNS로 미확인 알림 변동 알림 가능.

---

## 11. `ClinicalTimeline`

### 용도
환자 24시간 임상 이벤트 누적(투약·시술·평가·경보 등). 환자 상세 페이지의 타임라인 컴포넌트에서 사용.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `patientId` | S | **PK** |
| `timestamp#eventId` | S | **SK** (시간순 + 동시 이벤트 구분) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `patientId` | S | ✓ | PK |
| `sortKey` | S | ✓ | `timestamp#eventId` (SK) |
| `eventId` | S | ✓ | (예: `tl-001`) |
| `timestamp` | S | ✓ | ISO 8601 |
| `title` | S | ✓ | 이벤트 제목 |
| `description` | S | ✓ | 상세 설명 |
| `category` | S | ✓ | `vitals` / `lab` / `medication` / `procedure` / `assessment` / `alert` |
| `severity` | S | ✓ | `critical` / `warning` / `info` |

### Mock 예시 ([timeline.ts:11-18](../src/api/mock/timeline.ts#L11-L18))
```json
{
  "patientId": "PT-19482",
  "sortKey": "2026-04-29T14:20:00+09:00#tl-001",
  "eventId": "tl-001",
  "timestamp": "2026-04-29T14:20:00+09:00",
  "title": "MAP 58 mmHg로 하락",
  "description": "NE 용량 증량: 0.12 → 0.18 mcg/kg/min",
  "category": "vitals",
  "severity": "critical"
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 환자 24시간 이벤트 (최신순) | `Query patientId` ScanIndexForward=false | `GET /patients/{id}/timeline` ← `getTimeline(id)` |

---

## 12. `Departments`

### 용도
진료 부서 마스터. 협진 요청 모달의 부서 트리에 사용.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `departmentId` | S | **PK** (예: `dept-nephro`) |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `departmentId` | S | ✓ | PK |
| `name` | S | ✓ | 한글명 (예: `신장내과`) |
| `displayOrder` | N | ✗ | UI 정렬 순서 (옵션) |

### Mock 예시 ([departments.ts:10-18](../src/api/mock/departments.ts#L10-L18))
```json
{ "departmentId": "dept-nephro", "name": "신장내과" }
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 전체 부서 + 소속 인원 | `Scan Departments` + `Query Staff GSI departmentId` | `GET /staff/departments` ← `getDepartments()` |

> Departments는 항목 수가 적으므로 Scan 허용. 백엔드에서 Staff와 함께 join한 응답을 BFF처럼 내려주는 것을 권장.

---

## 13. `Staff`

### 용도
의료진 마스터. 부서별 조회 + 단건 lookup이 둘 다 필요.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `staffId` | S | **PK** (예: `staff-001`) |
| GSI1: `DepartmentIndex` | — | PK=`departmentId` — 부서별 의료진 |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `staffId` | S | ✓ | PK |
| `name` | S | ✓ | 이름 |
| `role` | S | ✓ | `전문의` / `전공의` / `수간호사` 등 |
| `departmentId` | S | ✓ | 부서 ID (GSI1 PK) |
| `available` | BOOL | ✓ | 현재 근무 여부 |

### Mock 예시 ([departments.ts:11](../src/api/mock/departments.ts#L11))
```json
{
  "staffId": "staff-001",
  "name": "박지훈",
  "role": "전문의",
  "departmentId": "dept-nephro",
  "available": true
}
```

### 쿼리 패턴

| 시나리오 | 동작 |
|---|---|
| 부서별 의료진 | `Query GSI1 departmentId` |
| 단일 의료진 | `GetItem(staffId)` |
| 근무중 의료진만 | GSI1 + FilterExpression `available=true` (소량) |

> **availability 변경**이 잦다면 별도 attribute가 아닌 `WorkSession` 테이블로 분리 가능 (입/퇴근 이벤트 기반).

---

## 14. `Consultations`

### 용도
협진 요청 내역. 환자별 + 상태별 조회 모두 필요. 생성은 단순 `PutItem`.

### 키 설계

| 속성 | 타입 | 역할 |
|---|---|---|
| `consultationId` | S | **PK** (예: `consult-001`) |
| GSI1: `PatientRequestedAtIndex` | — | PK=`patientId`, SK=`requestedAt` — 환자별 시간순 |
| GSI2: `StatusRequestedAtIndex` | — | PK=`status`, SK=`requestedAt` — 처리 큐 |

### 속성

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `consultationId` | S | ✓ | PK |
| `patientId` | S | ✓ | GSI1 PK |
| `patientName` | S | ✓ | 역정규화 |
| `patientBed` | S | ✓ | 역정규화 |
| `requestedBy` | S | ✓ | 요청자 (Cognito `sub` 권장, 표시명 별도) |
| `requestedAt` | S | ✓ | GSI1/GSI2 SK |
| `priority` | S | ✓ | `urgent` / `routine` |
| `status` | S | ✓ | `pending` / `accepted` / `completed` (GSI2 PK) |
| `recipients` | L (M) | ✓ | `{ staffId, name, department, role: 'to'/'cc' }` |
| `reason` | S | ✓ | 요청 사유 |
| `reportSnapshot` | S | ✗ | 첨부 보고서 요약 (JSON 또는 ID 참조) |

### Mock 예시 ([consultations.ts:7-21](../src/api/mock/consultations.ts#L7-L21))
```json
{
  "consultationId": "consult-001",
  "patientId": "PT-19482",
  "patientName": "김영호",
  "patientBed": "A-01",
  "requestedBy": "담당 의료진",
  "requestedAt": "2025-04-29T13:50:00+09:00",
  "priority": "urgent",
  "status": "pending",
  "recipients": [
    { "staffId": "staff-001", "name": "박지훈", "department": "신장내과", "role": "to" },
    { "staffId": "staff-006", "name": "최민서", "department": "감염내과", "role": "cc" }
  ],
  "reason": "AKI Stage 2 진행, Cr 2.1 (baseline 0.9). 신대체요법 필요성 평가 요청."
}
```

### 쿼리 패턴

| 시나리오 | 동작 | API 매핑 |
|---|---|---|
| 환자별 협진 내역 | `Query GSI1 patientId` ScanIndexForward=false | `getConsultations(patientId)` |
| pending 협진 큐 | `Query GSI2 status='pending'` | (협진 페이지 — 추후) |
| 전체 협진 | (GSI2 모든 status 합산 또는 Scan) | `getConsultations()` |
| 협진 생성 | `PutItem` | `createConsultation(...)` |
| 단건 조회 | `GetItem(consultationId)` | (옵션) |

> **수신자별 inbox**: 의료진이 자기 앞으로 온 협진을 보려면 GSI3(`StaffIdRequestedAtIndex` — recipients의 staffId를 별도 attribute로 평탄화) 또는 단일 테이블 디자인으로의 전환 검토.

---

## 15. 단일 테이블 디자인(Single-Table Design) 대안

위 12개 분리 테이블 대신 한 테이블로 통합하는 안:

```
Table: ClinSight
PK = "PATIENT#PT-19482" / "ICU#ICU-01" / "ALERT#alert-001" 등
SK = "META" / "VITAL#2026-04-25T14:00:00" / "MODEL#mortality" / "ALERT#alert-001" 등
```

### 장점
- Hot partition 위험 감소 (균등 분포)
- 동일 환자의 모든 데이터를 단일 `Query PATIENT#{id}`로 회수
- 비용·운영 단순

### 단점
- 학습 곡선 가파름
- 스키마 변화에 GSI 재설계 부담
- 디버깅/콘솔 가독성 떨어짐

### 권장
- MVP는 분리 테이블로 시작 (현재 문서 §3–§14)
- 트래픽이 늘면 hot path만 단일 테이블 패턴으로 이전

---

## 16. 미정 / 후속 결정 필요

| 항목 | 비고 |
|---|---|
| 인계 노트 (Handoff Note) | UI 명세는 있으나 mock/타입 미구현. 별도 테이블 설계 필요 |
| 인증 (Cognito) | `requestedBy`, `acknowledgedBy` 등은 현재 `'담당 의료진'` placeholder. Cognito `sub` 또는 staff ID로 교체 |
| 환자 ID 체계 | 현재 mock이 `PT-XXXXX` 형식. EMR 연동 시 hospital MRN 매핑 필요 |
| 시각 표기 통일 | Mock의 표시용 문자열(`"14:20"`, `"-6h"`) → ISO 8601로 통일 후 프론트 포맷터 추가 |
| GSI 비용 | Alerts·Consultations는 GSI 2개 + Streams 가능성 → 비용 산정 필요 |
| Model 모니터링 | `ModelPredictions.updatedAt` + 모델 버전 attribute 추가 검토 |

---

문의: 프론트엔드 담당자 또는 위 services 함수 시그니처 참고.
