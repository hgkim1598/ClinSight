# ClinSight API Gateway Route 설계안

> 본 문서는 **API Gateway에 정의할 REST API Route 후보**를 정리한 설계안이다.
> 실제 API/Lambda 코드를 구현하지 않으며, 프론트 코드·DynamoDB schema·기존 docs는 변경하지 않는다.
>
> 1차 근거 문서:
> - [`docs/clinsight_api_lambda_mapping_from_ui.md`](./clinsight_api_lambda_mapping_from_ui.md)
> - [`docs/DYNAMO_SCHEMA.md`](./DYNAMO_SCHEMA.md)
>
> 확정되지 않은 사항은 모두 "확인 필요" 또는 "추정"으로 표시한다.

---

## 1. 문서 목적

- 프론트 UI / `src/api/services/*` / mock / 타입 정의를 기반으로 **API Gateway에 노출할 REST Route 후보**를
  도메인별로 정리한다.
- 각 Route에 대해 (목적 / 호출 위치 / 연결 Lambda / 파라미터 / Response 타입 / DynamoDB 매핑 /
  근거 수준 / 우선순위 / 비고)를 명세한다.
- API Gateway Route와 **내부 비동기 트리거**(DDB Stream / SQS / EventBridge)는 명확히 분리해 정리한다.
- 본 문서는 설계 초안이며, 실제 구현 시 path 형태 / 응답 스키마 / 에러 코드는 조정 가능하다.

---

## 2. 참고한 파일 / 기준 문서

### 2.1 기준 문서

| 경로 | 역할 |
|---|---|
| [`docs/clinsight_api_lambda_mapping_from_ui.md`](./clinsight_api_lambda_mapping_from_ui.md) | UI 기준 API/Lambda 후보 매핑의 1차 reference. Lambda 책임 단위, 동기/비동기 분리, 정책 미정 항목 정리 |
| [`docs/DYNAMO_SCHEMA.md`](./DYNAMO_SCHEMA.md) | DynamoDB 테이블, PK/SK, GSI, Query 패턴, 응답 변환 규약 |

### 2.2 프론트 소스 (Route 도출 근거)

- `src/App.tsx` — 라우팅 (`/`, `/patient/:id`, `/patient/:id/model/:modelKey`(스텁), `/alerts`,
  `/consultations`, `/login`)
- `src/api/client.ts` — fetch wrapper (`VITE_API_BASE` 사용 예정, 현재는 mock 모드)
- `src/api/services/*` — 10개 service 파일이 컴포넌트가 바라보는 단일 진입점
- `src/api/mock/*` — 응답 형태 검증
- `src/types/index.ts` — 모든 응답 타입의 단일 source
- `src/pages/*`, `src/components/**/*` — 사용자 액션·호출 시점 확인

### 2.3 부재한 것으로 표시된 외부 reference (확인 필요)

- `clinsight_complete_architecture_context_for_ai.md`, `design.md`, `requirements.md`,
  `03-architecture-overview.md` — 레포에 존재하지 않음. 실제 파일이 있다면 경로 확인 후 별도 비교
  필요 → `확인 필요`.

---

## 3. API Gateway 설계 원칙

1. **API와 Lambda는 1:1 관계가 아니다.** 여러 Route를 책임 단위 Lambda 하나로 묶는다.
   예) `GET /patients`, `GET /patients/{patientId}` → Patient Handler Lambda.
2. **Route는 프론트 사용자 행동·service 함수 시그니처를 기준으로 정리.**
   service 시그니처에 없는 endpoint는 본 문서에서 확정하지 않는다.
3. **Lambda 책임 단위** (clinsight_api_lambda_mapping_from_ui.md §11.1 기준):
   - Patient Handler Lambda (ICU Status Handler 흡수 — Patient 자체는 유지)
   - Vital/SOFA Handler Lambda (통합)
   - Prediction Read Handler Lambda (단독 vs Patient Handler 흡수 — 정책 결정 후 확정)
   - Timeline Handler Lambda
   - Report Handler Lambda
   - Alert API Handler Lambda
   - Consultation Handler Lambda
   - Explanation Handler Lambda
4. **DDB Stream / SQS / EventBridge 기반 Lambda는 API Gateway Route가 아니다.** §9에 별도로 정리.
   대상: Prediction Trigger, Prediction Worker, Alert Stream Handler, Stale Prediction Checker,
   Ingestion Adapter.
5. **환자 데이터 접근 API는 원칙적으로 Lambda를 거친다.** API Gateway → DDB 직접 integration은
   의료정보 보호 및 감사 가능성 관점에서 비추천.
6. **응답은 DDB row를 그대로 반환하지 않는다.** Lambda가 `src/types/index.ts`의 프론트 타입에 맞게
   변환해 반환 (rename, nested 복원, 시계열 pivot, multi-table join 등).
7. **Path param 네이밍은 camelCase로 통일.** `{patientId}`, `{alertId}`, `{icuId}`, `{modelKey}`,
   `{consultationId}`, `{generatedAt}` 등. 프론트 라우트의 `:id`와는 다를 수 있다.
8. **확실하지 않은 사항은 "확인 필요"로 표기.** 특히 Cognito 연동 흐름, 보고서 정책, 실시간 push,
   재예측 트리거 UI는 모두 확정 보류.

### 3.1 근거 작성 원칙

본 문서의 각 Route와 설계 판단은 아래 근거 유형을 함께 기록한다.

| 근거 유형 | 의미 |
|---|---|
| UI 근거 | 실제 화면/컴포넌트에서 사용자 행동 또는 데이터 표시가 확인됨 |
| Service 근거 | `src/api/services/*`에 호출 함수가 존재함 |
| Type 근거 | `src/types/index.ts`에 응답 타입이 정의되어 있음 |
| Mock 근거 | `src/api/mock/*`에 현재 응답 형태가 존재함 |
| Schema 근거 | `docs/DYNAMO_SCHEMA.md`에 테이블/키/GSI가 정의됨 |
| Mapping 근거 | `docs/clinsight_api_lambda_mapping_from_ui.md`에서 정리됨 |
| AWS 공식 근거 | AWS 공식 문서에 근거한 기술 판단 (부록 B 참조) |
| 추정 / 확인 필요 | 코드 또는 문서 근거가 부족함 |

각 Route 상세 표(§6)의 마지막에는 위 유형을 압축한 **근거 상세** 행이 있다.

---

## 4. Route 전체 요약

| 우선순위 | Method | Path | 목적 | 호출 화면/service | 연결 Lambda | Response Type | 근거 수준 | 상태 |
|---|---|---|---|---|---|---|---|---|
| 우선 | GET | `/patients` | 환자 목록 | OverviewPage / `getPatients` | Patient Handler | `Patient[]` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/patients/{patientId}` | 환자 단건 | PatientPage / `getPatientById` | Patient Handler | `Patient` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/patients/{patientId}/vitals` | Vital 시계열 + Lab 점 | VitalChart / `getVitals` | Vital/SOFA Handler | `VitalData` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/patients/{patientId}/sofa` | SOFA 6장기 점수 추이 | SofaPanel / `getSofaTrend` | Vital/SOFA Handler | `SofaTrend` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/patients/{patientId}/predictions` | 5개 모델 예측 결과 | PatientPage, ModelDetailView / `getModelPredictions` | Prediction Read Handler | `Record<ModelKey, ModelPrediction>` | UI/Type/Docs | 확정 후보 (Lambda 통합 여부는 정책 결정 후 확정) |
| 우선 | GET | `/patients/{patientId}/timeline` | 24h 임상 이벤트 | ClinicalTimeline / `getTimeline` | Timeline Handler | `TimelineEvent[]` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/patients/{patientId}/schedule` | 예정 임상 이벤트 | ClinicalTimeline / `getSchedule` | Timeline Handler | `ScheduledEvent[]` | UI/Type/Docs (`ScheduledEvents` 테이블 충돌 — §8) | 확정 후보 |
| 우선 | GET | `/patients/{patientId}/report` | 환자 요약 보고서 (Live 조립) | PatientReportModal, ConsultationsPage / `getPatientReport` | Report Handler | `PatientReport` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/icus/{icuId}/staffing` | ICU 운영 스냅샷 | OverviewPage / `getStaffing` | Patient Handler (ICU Status 흡수) | `StaffingSnapshot` | UI/Type/Docs | 확정 후보 (Lambda는 통합) |
| 우선 | GET | `/alerts` | 알림 목록 | AlertsPage / `getAlerts` | Alert API Handler | `Alert[]` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/alerts/count` | 미확인 알림 카운트 | AlertBell / `getNewAlertCount` | Alert API Handler | `{ count: number }` | UI/Type/Docs | 확정 후보 |
| 우선 | POST | `/alerts/{alertId}/acknowledge` | 알림 확인 처리 | AlertCard / `acknowledgeAlert` | Alert API Handler | `Alert` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/staff/departments` | 부서 + 인원 트리 | ConsultRequestModal / `getDepartments` | Consultation Handler | `Department[]` | UI/Type/Docs | 확정 후보 |
| 우선 | GET | `/consultations` | 협진 목록 (전체/환자별) | ConsultationsPage / `getConsultations` | Consultation Handler | `ConsultationRequest[]` | UI/Type/Docs | 확정 후보 |
| 우선 | POST | `/consultations` | 협진 생성 | ConsultRequestModal / `createConsultation` | Consultation Handler | `ConsultationRequest` (201) | UI/Type/Docs | 확정 후보 |
| 우선 | POST | `/ai/insight` | 모델×섹션 AI 설명 | AiInsightModal / `getAiInsight` | Explanation Handler | `{ text: string }` | UI/Type/Docs | 확정 후보 |
| 우선 | POST | `/ai/chat` | 채팅 메시지 응답 | AiChatPanel / `getChatResponse` | Explanation Handler | `{ text: string, messageId: string }` | UI/Type/Docs | 확정 후보 |
| 옵션 | POST | `/ai/chat/intro` | 채팅 인트로 메시지 | AiChatPanel / `getChatIntro` | (해당 없음 또는 Explanation Handler) | `{ text: string }` | UI/Mock 확인 / 정적 템플릿 | 옵션 (프론트 정적 처리 가능) |
| 보류 | POST | `/alerts/{alertId}/resolve` | 알림 해소 처리 | (UI 미확인 — `resolveAlert` 함수만 존재) | Alert API Handler | `Alert` | Mock/Type / UI 근거 약함 | UI 연결 시 필수 |
| 옵션 | POST | `/patients/{patientId}/reports` | 보고서 시점 동결 저장 | (현재 UI 미연결) | Report Handler | `PatientReport` (201) | Docs / UI 근거 약함 | Persisted mode 선택 시 필수 |
| 옵션 | POST | `/patients/{patientId}/reports/{generatedAt}/notes` | 협진 메모 영속화 | (현재 모달 로컬 상태) | Report Handler | `{ noteId: string }` (201) | UI 기준 추가 확인 필요 | 보고서 메모 영속화 정책 미정 |
| 보류 | POST | `/predictions/{patientId}` | 강제 재예측 트리거 | (UI 버튼 없음) | Prediction Orchestrator | `{ jobId: string }` (202) 추정 | UI 근거 없음 / 아키텍처 기반 | 운영용/아키텍처 기반 후보 |
| 보류 | POST | `/alerts/{alertId}/escalate` | 상급 보고 처리 | (UI 더미 — `window.alert('준비 중')`) | Alert API Handler 또는 Escalation Handler | (미정) | UI 기준 추가 확인 필요 | UI 더미, 정책 미정 |
| 확인 필요 | POST | `/auth/login` | 로그인 (대안: Cognito 직접) | LoginPage (현재 호출 없음) | API Gateway Route Handler 없음 — Cognito 직접 사용 권장. PreToken Generation Trigger는 Cognito 내부 옵션 | (미정) | 추정 | API Gateway Route로 확정하지 않음 |
| 확인 필요 | GET | `/me` 또는 `/staff/me` | 현재 사용자 프로필 | (코드 근거 없음) | Consultation Handler 또는 별도 Profile Handler (미정 — 도입 시 검토) | (미정 — `Staff` 일부 + Cognito claim 후보) | 추정 | `CURRENT_USER` placeholder 대체용 — 코드 근거 없음. 도입 시 필수 |
| 내부 전용 | — | (DDB Stream / SQS / EventBridge) | §9 참조 | — | Alert Stream / Prediction Trigger·Worker / Stale Checker / Ingestion Adapter | — | Docs | 내부 전용 |

---

## 5. 화면별 Route 매핑

| 화면 / 컴포넌트 | 트리거 | Route |
|---|---|---|
| LoginPage | 폼 제출 | (Cognito 직접 또는 `POST /auth/login` — 확인 필요) |
| OverviewPage 진입 | 마운트 | `GET /patients`, `GET /icus/{icuId}/staffing` |
| AlertBell (Layout 공통) | 마운트 | `GET /alerts/count` |
| OverviewPage → 환자 행 클릭 | navigate | (이동만, fetch 없음) |
| PatientPage 진입 | 마운트 (Promise.all 5건) | `GET /patients/{patientId}`, `GET /patients/{patientId}/vitals`, `GET /patients/{patientId}/predictions`, `GET /patients/{patientId}/timeline`, `GET /patients/{patientId}/schedule` |
| VitalChart SOFA 탭 진입 | 탭 전환 | `GET /patients/{patientId}/sofa` |
| ModelDetailView (모델 카드 클릭) | 상태 전환 | (이미 fetch된 predictions 재사용 — 추가 fetch 없음) |
| ✨ AI 설명 버튼 (섹션별) | 모달 open | `POST /ai/insight` |
| FloatingChatButton | 패널 open | (옵션) `POST /ai/chat/intro` — 정적 템플릿이라 프론트 처리 가능 |
| AiChatPanel 메시지 전송 | 버튼/Enter | `POST /ai/chat` |
| PatientHeader "요약 보고서" | 모달 open | `GET /patients/{patientId}/report` |
| PatientReportModal "협진 요청" | 모달 open | `GET /staff/departments` |
| ConsultRequestModal "협진 요청 전송" | 버튼 | `POST /consultations` |
| ConsultationsPage 진입 | 마운트 | `GET /consultations` |
| ConsultationsPage "요청 내용" | 모달 open | `GET /patients/{patientId}/report` |
| AlertsPage 진입 | 마운트 | `GET /alerts` |
| AlertsPage "확인" 버튼 | 버튼 | `POST /alerts/{alertId}/acknowledge` |
| AlertsPage "상급 보고" | 버튼 (UI 더미) | (보류) `POST /alerts/{alertId}/escalate` |
| Sidebar 인계/가이드라인/설정 | (라우트 없음) | (해당 없음) |
| `/patient/:id/model/:modelKey` (DrilldownPage) | (코드에서 navigate 없음, 스텁) | (해당 없음 — 추후 deeplink 시 PatientPage와 동일 fetch 재사용) |

---

## 6. 도메인별 Route 상세

각 Route에 대해 형식:

> `목적 / 호출 위치 / 연결 Lambda / Path Params / Query Params / Request Body / Response Type / DynamoDB / Lambda 필요 여부 / 인증·권한 / 근거 수준 / 구현 우선순위 / 비고`

---

### 6.1 Auth / Current User

#### POST /auth/login (확인 필요)

| 항목 | 내용 |
|---|---|
| 목적 | (대안) 직원번호/비밀번호 로그인 처리 |
| 호출 위치 | LoginPage (현재 폼만 존재, 1.5초 splash 후 navigate `/`) |
| 연결 Lambda | **API Gateway Route Handler 없음** — Cognito Hosted UI 또는 Amplify SDK 직접 사용 가능. **PreToken Generation Trigger는 Cognito User Pool 내부의 Lambda Trigger 옵션이며 API Gateway Route Handler가 아님** |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | `{ employeeId, password }` (추정) |
| Response Type | (미정) — Cognito 사용 시 토큰 객체 |
| DynamoDB | (없음 또는 `Staff` 매핑 시 `Staff.cognitoSub`) |
| Lambda 필요 여부 | 비추천 — Cognito Hosted UI 또는 Amplify SDK 직접 사용 가능 |
| 인증/권한 | 본 endpoint 자체가 인증 발급 |
| 근거 수준 | 추정 / UI 호출 코드 없음 |
| 구현 우선순위 | 보류 |
| 비고 | Cognito 도입 방식 결정 필요 → `확인 필요`. **본 endpoint는 API Gateway Route로 확정하지 않는다.** PreToken Generation Trigger는 Cognito User Pool 내부 Trigger로서 staff 정보 토큰 주입에만 사용 가능 (API Gateway 연결 Lambda가 아님) |
| 근거 상세 | UI 근거 없음 — `pages/LoginPage.tsx`는 폼 제출 시 1.5초 splash 후 `navigate('/')`만 수행, API 호출 없음. AWS 공식 근거: 부록 B (Cognito User Pool Authorizer, PreToken Generation Trigger). Mapping §3.1, §11.3 |

#### GET /me 또는 GET /staff/me (확인 필요)

| 항목 | 내용 |
|---|---|
| 목적 | 현재 로그인 사용자 프로필 / 부서 / 역할 조회 |
| 호출 위치 | (코드 근거 없음 — 현재 `CURRENT_USER='담당 의료진'` placeholder, `acknowledgedBy='Dr. 사용자'` 하드코딩) |
| 연결 Lambda | Consultation Handler 또는 별도 Profile Handler (미정 — 도입 시 검토) |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | 없음 |
| Response Type | (미정 — `Staff` 일부 + Cognito claim 후보) |
| DynamoDB | `Staff` (read, GSI lookup by Cognito sub) |
| Lambda 필요 여부 | **도입 시 필수** — Cognito claim ↔ Staff row 매핑이 필요할 경우. 현재는 코드 근거 없음 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | 추정 — 코드 호출 근거 없음 |
| 구현 우선순위 | 보류 |
| 비고 | placeholder 제거 시점에 도입. path는 `/me`(generic) vs `/staff/me`(도메인 명시) 중 결정 필요 → `확인 필요` |
| 근거 상세 | 코드 호출 근거 없음 — `utils/constants.ts`의 `CURRENT_USER='담당 의료진'` placeholder, `pages/AlertsPage.tsx`의 `'Dr. 사용자'` 하드코딩만 존재. Schema: §15 Staff (GSI lookup by Cognito sub 가정). Mapping §10 10번 |

---

### 6.2 Patients / ICU Overview

#### GET /patients

| 항목 | 내용 |
|---|---|
| 목적 | ICU 환자 마스터 목록 반환 |
| 호출 위치 | OverviewPage / `patientService.getPatients` |
| 연결 Lambda | Patient Handler Lambda |
| Path Params | 없음 |
| Query Params | (옵션) `risk`, `sortBy` — 현재 UI는 클라이언트 정렬, 서버 필터 근거 약함 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `Patient[]` |
| DynamoDB | `Patients` (Scan 또는 GSI `riskAdmitIndex` Query) |
| Lambda 필요 여부 | 선택 — rename/drop 변환 필요 (`patientId↔id`, `admit`, `diag`, `icuId` drop) |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | KPI 사전 집계(총/점유율/고위험)를 응답에 포함할지는 정책 결정 필요 → `확인 필요` |
| 근거 상세 | UI: `pages/OverviewPage.tsx` (`useAsync(() => getPatients(), [])`) / Service: `patientService.getPatients` / Type: `Patient[]` (`types/index.ts`) / Mock: `api/mock/patients.ts` / Schema: §4 Patients / Mapping: §3.2, §5 |

#### GET /patients/{patientId}

| 항목 | 내용 |
|---|---|
| 목적 | 환자 단건 조회 |
| 호출 위치 | PatientPage / `patientService.getPatientById` |
| 연결 Lambda | Patient Handler Lambda |
| Path Params | `patientId` |
| Query Params | 없음 |
| Request Body | 없음 |
| Response Type | `Patient` |
| DynamoDB | `Patients` GetItem |
| Lambda 필요 여부 | 선택 — 응답 변환 + PII 노출 통제 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 미존재 시 `404 PATIENT_NOT_FOUND` |
| 근거 상세 | UI: `pages/PatientPage.tsx` (Promise.all 5건 중 1건) / Service: `patientService.getPatientById` / Type: `Patient` / Mock: `api/mock/patients.ts` / Schema: §4 Patients / Mapping: §3.3, §5 |

#### GET /icus/{icuId}/staffing

| 항목 | 내용 |
|---|---|
| 목적 | ICU 인력/병상 스냅샷 조회 |
| 호출 위치 | OverviewPage / `staffingService.getStaffing` |
| 연결 Lambda | Patient Handler Lambda (ICU Status Handler 흡수) |
| Path Params | `icuId` |
| Query Params | 없음 |
| Request Body | 없음 |
| Response Type | `StaffingSnapshot` |
| DynamoDB | `IcuStaffing` GetItem |
| Lambda 필요 여부 | 선택 — 응답 변환 거의 없음 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 단일 ICU 환경에서는 frontend가 고정 `icuId`(예: `ICU-01`) 사용 가능. 향후 멀티 ICU 시 사용자 컨텍스트 기반 자동 추론 필요 → `확인 필요` |
| 근거 상세 | UI: `pages/OverviewPage.tsx` Capacity 섹션 (의사·간호사 가용/임계값 표시) / Service: `staffingService.getStaffing` / Type: `StaffingSnapshot` (JSDoc에 DDB 매핑 명시) / Mock: `api/mock/staffing.ts` / Schema: §9 IcuStaffing / Mapping: §3.2, §5 |

---

### 6.3 Patient Detail Clinical Data (Vitals / SOFA)

#### GET /patients/{patientId}/vitals

| 항목 | 내용 |
|---|---|
| 목적 | 환자별 vital 시계열과 lab point를 `VitalData` 형태로 반환 |
| 호출 위치 | PatientPage → VitalChart / `vitalService.getVitals` |
| 연결 Lambda | Vital/SOFA Handler Lambda |
| Path Params | `patientId` |
| Query Params | (옵션) `from`, `to` — 현재 UI는 24h 고정, 서버 파라미터 근거 약함 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `VitalData` |
| DynamoDB | `Vitals` (Query patientId, SK between), `Labs` (Query patientId, SK begins_with) |
| Lambda 필요 여부 | 필수 — 두 테이블 join + `VitalKey`별 시계열 pivot + 메타(label/unit/normal) 결합 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | `connectNulls=false` 정책 — 결측은 attribute 누락으로 표현 (보간 금지). `VitalSeries.label/unit/normal`은 Lambda 상수 또는 별도 마스터 |
| 근거 상세 | UI: `components/common/VitalChart.tsx` (recharts) / Service: `vitalService.getVitals` / Type: `VitalData = { series: Record<VitalKey, VitalSeries>, labs: LabDot[] }` / Mock: `api/mock/vitals.ts` (`vitalsByPatient`, `emptyVitals`) / Schema: §5 Vitals + §6 Labs (두 테이블 join) / Mapping: §3.3, §5 |

#### GET /patients/{patientId}/sofa

| 항목 | 내용 |
|---|---|
| 목적 | SOFA 6장기 시간별 점수 추이를 `SofaTrend` 형태(times[] + organ-keyed scores)로 반환 |
| 호출 위치 | SofaPanel / `sofaService.getSofaTrend` |
| 연결 Lambda | Vital/SOFA Handler Lambda |
| Path Params | `patientId` |
| Query Params | (옵션) `from`, `to` — UI 근거 약함 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `SofaTrend` |
| DynamoDB | `SofaScores` Query patientId, SK between |
| Lambda 필요 여부 | 필수 — row 시계열 → 장기별 배열 pivot, 결측 보존 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 결측은 `null` 유지 (보간 금지). 측정값이 0건인 장기는 빈 배열 또는 모두 null |
| 근거 상세 | UI: `components/common/SofaPanel.tsx` (VitalChart의 SOFA 탭 진입 시 마운트) / Service: `sofaService.getSofaTrend` / Type: `SofaTrend = { times: string[], scores: Record<OrganKey, Array<number\|null>> }` / Mock: `api/mock/sofaScores.ts` / Schema: §8 SofaScores / Mapping: §3.3, §5 |

---

### 6.4 Predictions

#### GET /patients/{patientId}/predictions

| 항목 | 내용 |
|---|---|
| 목적 | 환자의 5개 모델(`mortality`/`aki`/`ards`/`sic`/`shock`) 최신 예측을 `Record<ModelKey, ModelPrediction>` 형태로 반환 |
| 호출 위치 | PatientPage / `modelService.getModelPredictions`. ModelDetailView도 부모 prop으로 재사용 |
| 연결 Lambda | Prediction Read Handler Lambda (단독 vs Patient Handler 흡수 정책 결정 후 확정) |
| Path Params | `patientId` |
| Query Params | (옵션) `modelKey` — 단일 모델만 fetch. UI는 5개 묶음 fetch라 근거 약함 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `Record<ModelKey, ModelPrediction>` |
| DynamoDB | `ModelPredictions` Query patientId (5 rows) |
| Lambda 필요 여부 | 선택 — 5 row reduce + `updatedAt`/`modelVersion` drop + 환자 미존재 시 5개 키 fallback |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 단일 항목 크기 KB급 (trend × shap 중첩). 400KB DDB 한도 모니터링 필요 |
| 근거 상세 | UI: `pages/PatientPage.tsx` (Promise.all) + `components/common/ModelDetailView.tsx` (prop 재사용) / Service: `modelService.getModelPredictions` / Type: `Record<ModelKey, ModelPrediction>` (5개 키, fallback 포함) / Mock: `api/mock/models.ts` (`modelPredictions`) / Schema: §7 ModelPredictions (5 row reduce) / Mapping: §3.3, §5 |

#### POST /predictions/{patientId} (보류)

| 항목 | 내용 |
|---|---|
| 목적 | 강제 재예측 트리거 (운영용) |
| 호출 위치 | (현재 UI에 새로고침 버튼 없음) |
| 연결 Lambda | Prediction Orchestrator Lambda (또는 SQS Prediction Queue로 위임) |
| Path Params | `patientId` |
| Query Params | (옵션) `modelKey` — 특정 모델만 |
| Request Body | (옵션) `{ reason }` (감사 로그용 추정) |
| Response Type | `{ jobId: string }` (202 Accepted, 추정) |
| DynamoDB | `Vitals`/`Labs` (read), `ModelPredictions` (write 예정) |
| Lambda 필요 여부 | 필수 — feature payload 생성 + SageMaker 호출 |
| 인증/권한 | Cognito JWT 필수 (운영자 권한 추후 분리 가능) |
| 근거 수준 | UI 근거 없음 / 아키텍처 기반 후보 |
| 구현 우선순위 | 보류 |
| 비고 | UI에 트리거 버튼이 추가되거나 운영용 인터페이스가 정의된 후 도입. 현재는 정상 흐름이 §9 비동기 트리거로 처리됨. **path 스타일은 다른 Route(`/patients/{patientId}/...` 패턴)와의 일관성을 고려해 확정 필요** → §14 참조 |
| 근거 상세 | **UI 근거 없음** — `pages/PatientPage.tsx`, `components/common/ModelDetailView.tsx`, `components/common/ModelCard.tsx` 어디에도 재예측 트리거 버튼 없음. 정상 흐름은 §9 비동기 (Vitals/Labs Stream → Trigger → Worker). Mapping §11.2 'Prediction Orchestrator Lambda' (UI 근거 없음 / 아키텍처 기반) |

---

### 6.5 Timeline / Schedule

#### GET /patients/{patientId}/timeline

| 항목 | 내용 |
|---|---|
| 목적 | 환자 24시간 임상 이벤트 누적 (최신순) |
| 호출 위치 | PatientPage → ClinicalTimeline / `timelineService.getTimeline` |
| 연결 Lambda | Timeline Handler Lambda |
| Path Params | `patientId` |
| Query Params | (옵션) `from`, `to` — 현재 UI는 24h 고정 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `TimelineEvent[]` |
| DynamoDB | `ClinicalTimeline` Query patientId desc |
| Lambda 필요 여부 | 선택 — rename(`eventId↔id`, `timestamp↔time`) + drop sortKey/patientId |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 표시용 시각 vs ISO 8601 통일 정책 미정 → `확인 필요` (DYNAMO_SCHEMA §20) |
| 근거 상세 | UI: `components/common/ClinicalTimeline.tsx` (PastList 컴포넌트, severity dot) / Service: `timelineService.getTimeline` / Type: `TimelineEvent[]` / Mock: `api/mock/timeline.ts` (`mockTimeline`) / Schema: §12 ClinicalTimeline / Mapping: §3.3, §5 |

#### GET /patients/{patientId}/schedule

| 항목 | 내용 |
|---|---|
| 목적 | 환자 예정 임상 이벤트 (가까운 순) |
| 호출 위치 | PatientPage → ClinicalTimeline / `timelineService.getSchedule` |
| 연결 Lambda | Timeline Handler Lambda |
| Path Params | `patientId` |
| Query Params | (옵션) `limit`, `until` — 현재 UI는 고정 → `확인 필요` |
| Request Body | 없음 |
| Response Type | `ScheduledEvent[]` |
| DynamoDB | `ScheduledEvents` Query patientId, SK > now, asc (DYNAMO_SCHEMA §13). **테이블 자체가 스키마와 사용자 그룹화 사이에서 충돌** → §8 참조 |
| Lambda 필요 여부 | 선택 — rename(`scheduleId↔id`, `scheduledTime↔time`) + drop sourceOrderId |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 (단, 테이블 충돌 — `확인 필요`) |
| 구현 우선순위 | 우선 |
| 비고 | `ScheduledEvents` 독립 테이블 vs `ClinicalTimeline` 흡수 결정 필요. Route 자체는 어느 쪽이든 유지 |
| 근거 상세 | UI: `components/common/ClinicalTimeline.tsx` (UpcomingList 컴포넌트, basis 표시) / Service: `timelineService.getSchedule` / Type: `ScheduledEvent[]` (basis 필드 포함) / Mock: `api/mock/timeline.ts` (`mockSchedule`) / Schema: §13 ScheduledEvents (테이블 충돌 — §8 누락/불일치 점검) / Mapping: §3.3, §5 |

---

### 6.6 Reports

#### GET /patients/{patientId}/report

| 항목 | 내용 |
|---|---|
| 목적 | 환자 상태 요약 보고서 (Live 조립: patient + vitals + labs + predictions) |
| 호출 위치 | PatientReportModal, ConsultationsPage / `reportService.getPatientReport` |
| 연결 Lambda | Report Handler Lambda |
| Path Params | `patientId` |
| Query Params | (옵션) `mode=live\|persisted` — 정책 결정 후 확정 |
| Request Body | 없음 |
| Response Type | `PatientReport` |
| DynamoDB | `Patients`+`Vitals`+`Labs`+`ModelPredictions` (read) — 옵션 `PatientReports`(read latest) |
| Lambda 필요 여부 | 필수 — multi-service 조합, vital status 휴리스틱, lab/모델 매핑 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 현재 UI는 Live 조립에 가까움. Persisted 모드는 §10 3번 정책 결정 후 도입 |
| 근거 상세 | UI: `components/common/PatientReportModal.tsx` + `report/ReportContent.tsx` (인쇄/협진 진입) / Service: `reportService.getPatientReport` (조합형 — `getPatientById` + `getVitals` + `getModelPredictions`를 `Promise.all`로 호출) / Type: `PatientReport` (`generatedAt: Date`) / Schema: §4+§5+§6+§7 (+옵션 §18) / Mapping: §3.9, §5 |

#### POST /patients/{patientId}/reports (옵션)

| 항목 | 내용 |
|---|---|
| 목적 | 보고서 시점 동결 저장 (Persisted mode) |
| 호출 위치 | (현재 UI 미연결) |
| 연결 Lambda | Report Handler Lambda |
| Path Params | `patientId` |
| Query Params | 없음 |
| Request Body | (옵션) `{ generatedBy }` 또는 서버에서 Cognito sub로 채움 |
| Response Type | `PatientReport` (201) |
| DynamoDB | `PatientReports` PutItem, `Patients`+`Vitals`+`Labs`+`ModelPredictions` (read snapshot) |
| Lambda 필요 여부 | Persisted mode 선택 시 필수 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | Docs / UI 근거 약함 |
| 구현 우선순위 | 옵션 |
| 비고 | 보고서 발행 정책 미정 (DYNAMO_SCHEMA §20) → `확인 필요` |
| 근거 상세 | **보류** — 현재 `reportService.getPatientReport`는 매 호출마다 patient/vital/model을 즉석 조합 (Live mode). `PatientReports` 테이블 PutItem 흐름 미연결. Schema: §18 PatientReports (정의는 존재). Mapping §10 3번 / DYNAMO_SCHEMA §20 |

#### POST /patients/{patientId}/reports/{generatedAt}/notes (옵션)

| 항목 | 내용 |
|---|---|
| 목적 | 보고서 협진 의견 메모 영속화 |
| 호출 위치 | (현재 PatientReportModal 내부 로컬 상태) |
| 연결 Lambda | Report Handler Lambda |
| Path Params | `patientId`, `generatedAt` (보고서 SK) |
| Query Params | 없음 |
| Request Body | `{ text: string }` |
| Response Type | `{ noteId: string, time: string, author: string }` (201) |
| DynamoDB | `PatientReports` UpdateItem (notes 배열 append) — 또는 별도 테이블 분리 |
| Lambda 필요 여부 | 영속화 정책 도입 시 필수 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI 기준 추가 확인 필요 |
| 구현 우선순위 | 옵션 |
| 비고 | 메모 위치(보고서 내부 vs 별도 테이블) 결정 필요 → `확인 필요` |
| 근거 상세 | **보류** — `components/common/report/ConsultationNotes.tsx`의 메모는 `useState<ConsultationNote[]>([])` 로컬 상태 (`makeNoteId`, `time: new Date()`만 사용). 영속화 endpoint·mock 없음. Mapping §10 12번 |

---

### 6.7 Alerts

#### GET /alerts

| 항목 | 내용 |
|---|---|
| 목적 | 알림 목록 조회 (전체 또는 필터) |
| 호출 위치 | AlertsPage / `alertService.getAlerts` |
| 연결 Lambda | Alert API Handler Lambda |
| Path Params | 없음 |
| Query Params | (옵션) `status`(`new`/`acknowledged`/`resolved`), `priority`(`critical`/`warning`), `patientId` — 현재 UI는 클라이언트 필터, 서버 필터로 전환 시 추가 |
| Request Body | 없음 |
| Response Type | `Alert[]` |
| DynamoDB | `Alerts` Scan 또는 GSI1 `StatusCreatedAtIndex` 다중 status 합산 / GSI2 `PatientCreatedAtIndex`(환자별) |
| Lambda 필요 여부 | 선택 — flat row → nested `patient` 복원, `icuId` drop |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 데이터량 증가 시 서버 필터 권장 → `확인 필요` |
| 근거 상세 | UI: `pages/AlertsPage.tsx` (전체 fetch 후 클라이언트 필터/정렬) + `components/alerts/AlertCard.tsx` / Service: `alertService.getAlerts` / Type: `Alert[]` (nested `patient`) / Mock: `api/mock/alerts.ts` (`mockAlerts`) / Schema: §11 Alerts (GSI1 status, GSI2 patientId) / Mapping: §3.5, §5 |

#### GET /alerts/count

| 항목 | 내용 |
|---|---|
| 목적 | 미확인 알림 카운트 (AlertBell 배지) |
| 호출 위치 | AlertBell / `alertService.getNewAlertCount` |
| 연결 Lambda | Alert API Handler Lambda |
| Path Params | 없음 |
| Query Params | `status=new` (기본값) |
| Request Body | 없음 |
| Response Type | `{ count: number }` (서비스 함수는 `number` 반환이지만, API 응답은 객체로 wrap 권장) |
| DynamoDB | `Alerts` GSI1 Query `Status='new'`, `Select=COUNT` |
| Lambda 필요 여부 | 선택 — 사용자/ICU 필터 적용 가능성 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 폴링 주기 / WebSocket 푸시 결정 필요 → `확인 필요` (§10 8번) |
| 근거 상세 | UI: `components/common/AlertBell.tsx` (Layout 공통 — OverviewPage 헤더에서 사용) / Service: `alertService.getNewAlertCount` (현재 `number` 반환 — API는 `{ count }` wrap 권장) / Schema: §11 Alerts GSI1 `Select=COUNT` / Mapping: §3.5, §5 |

#### POST /alerts/{alertId}/acknowledge

| 항목 | 내용 |
|---|---|
| 목적 | 알림 확인 처리 (status='acknowledged') |
| 호출 위치 | AlertCard "확인" 버튼 / `alertService.acknowledgeAlert` |
| 연결 Lambda | Alert API Handler Lambda |
| Path Params | `alertId` |
| Query Params | 없음 |
| Request Body | (옵션) `{ note }` — 현재 미사용 |
| Response Type | `Alert` (갱신 후 전체) |
| DynamoDB | `Alerts` UpdateItem (status, acknowledgedBy=Cognito sub, acknowledgedAt=서버 시각) |
| Lambda 필요 여부 | 필수 — 권한 체크 + status 전이 검증 + 사용자 컨텍스트 부여 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | `acknowledgedBy`는 서버에서 Cognito sub로 부여 (현재 UI는 `'Dr. 사용자'` 하드코딩) |
| 근거 상세 | UI: `components/alerts/AlertCard.tsx` "확인" 버튼 (`status='new'`일 때만 노출) → `pages/AlertsPage.tsx` `handleAcknowledge` / Service: `alertService.acknowledgeAlert(id, by)` (현재 mock mutation) / Type: `Alert` / Schema: §11 Alerts UpdateItem / Mapping: §3.5, §5 |

#### POST /alerts/{alertId}/resolve (보류)

| 항목 | 내용 |
|---|---|
| 목적 | 알림 해소 처리 (status='resolved') |
| 호출 위치 | (UI 미확인 — `resolveAlert` 서비스 함수만 존재) |
| 연결 Lambda | Alert API Handler Lambda |
| Path Params | `alertId` |
| Query Params | 없음 |
| Request Body | (옵션) `{ note }` |
| Response Type | `Alert` |
| DynamoDB | `Alerts` UpdateItem (status, resolvedAt=서버 시각) |
| Lambda 필요 여부 | UI 연결 시 필수 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | Mock/Type 확인 / UI 근거 약함 |
| 구현 우선순위 | 보류 |
| 비고 | 현재 명확한 resolve 버튼/흐름이 없으면 acknowledge만 우선 구현 가능 |
| 근거 상세 | **보류** — `alertService.resolveAlert(id)` service 함수는 존재. 그러나 `pages/AlertsPage.tsx`/`components/alerts/AlertCard.tsx`에 명시적 resolve 버튼 없음 (`AlertCard`의 `visibleActions` 필터는 `acknowledge`만 `status='new'`에서 노출, `resolve` 액션 타입 자체가 `Alert.actions`에 등장하지 않음). Schema: §11 Alerts UpdateItem (resolvedAt). Mapping §3.5 / §11.1 'Alert API Handler' (UI 연결 시 필수) |

#### POST /alerts/{alertId}/escalate (보류)

| 항목 | 내용 |
|---|---|
| 목적 | 상급 보고 처리 |
| 호출 위치 | AlertCard "상급 보고" 버튼 (현재 `window.alert('준비 중')`) |
| 연결 Lambda | Alert API Handler Lambda 또는 별도 Escalation Handler |
| Path Params | `alertId` |
| Query Params | 없음 |
| Request Body | (미정) `{ targetStaffId, reason, priority? }` 추정 |
| Response Type | (미정) |
| DynamoDB | `Alerts` UpdateItem (state 추가) — `Consultations`로 위임할지도 미정 |
| Lambda 필요 여부 | UI 정책 확정 시 필수 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI 기준 추가 확인 필요 |
| 구현 우선순위 | 보류 |
| 비고 | UI 더미 — 실제 동작/수신자/우선순위 정책 미정 → `확인 필요` (§10 7번) |
| 근거 상세 | **보류** — `components/alerts/AlertCard.tsx` `handleAction`에서 `escalate` 분기는 `window.alert('상급 보고 기능은 준비 중입니다')` 호출만 수행 (실제 endpoint 없음). Mapping §3.5 비고, §10 7번 |

---

### 6.8 Consultations / Staff

#### GET /staff/departments

| 항목 | 내용 |
|---|---|
| 목적 | 부서 + 인원 트리 (협진 모달 수신자 선택용) |
| 호출 위치 | ConsultRequestModal / `consultService.getDepartments` |
| 연결 Lambda | Consultation Handler Lambda |
| Path Params | 없음 |
| Query Params | (옵션) `availableOnly=true` — 현재 UI는 클라이언트 필터 |
| Request Body | 없음 |
| Response Type | `Department[]` (`{ id, name, members: StaffMember[] }`) |
| DynamoDB | `Departments` Scan + `Staff` GSI1 `DepartmentIndex` Query |
| Lambda 필요 여부 | 필수 — cross-table join + nested `members[]` 조립 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 항목 수 적어 Scan 허용. 캐시 가능 |
| 근거 상세 | UI: `components/common/ConsultRequestModal.tsx` + `components/common/consult/DepartmentTree.tsx` (수신자 선택 트리) / Service: `consultService.getDepartments` / Type: `Department[]` (`{ id, name, members: StaffMember[] }`) / Mock: `api/mock/departments.ts` (`mockDepartments`) / Schema: §14 Departments + §15 Staff (cross-table join) / Mapping: §3.7, §5 |

#### GET /consultations

| 항목 | 내용 |
|---|---|
| 목적 | 협진 목록 (전체 또는 환자별) |
| 호출 위치 | ConsultationsPage / `consultService.getConsultations(patientId?)` |
| 연결 Lambda | Consultation Handler Lambda |
| Path Params | 없음 |
| Query Params | (옵션) `patientId`, `status` |
| Request Body | 없음 |
| Response Type | `ConsultationRequest[]` |
| DynamoDB | `Consultations` GSI1 `PatientRequestedAtIndex`(환자별) / GSI2 `StatusRequestedAtIndex`(status) |
| Lambda 필요 여부 | 선택 — rename(`consultationId↔id`), `icuId` drop |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 수신자(staffId) 기준 inbox는 UI 근거 없음 → `확인 필요` |
| 근거 상세 | UI: `pages/ConsultationsPage.tsx` (`useAsync(() => getConsultations(), [])` — 전체 fetch 후 클라이언트 필터) / Service: `consultService.getConsultations(patientId?)` / Type: `ConsultationRequest[]` / Mock: `api/mock/consultations.ts` (`mockConsultations`) / Schema: §16 Consultations (GSI1 patient, GSI2 status) / Mapping: §3.6, §5 |

#### POST /consultations

| 항목 | 내용 |
|---|---|
| 목적 | 협진 요청 생성 |
| 호출 위치 | ConsultRequestModal "협진 요청 전송" / `consultService.createConsultation` |
| 연결 Lambda | Consultation Handler Lambda |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | `{ patientId, patientName, patientBed, recipients[], priority, reason, reportSnapshot? }` (서버가 `id`/`requestedBy`/`requestedAt`/`status='pending'` 부여) |
| Response Type | `ConsultationRequest` (201) |
| DynamoDB | `Consultations` PutItem (+ `recipients` 검증을 위한 `Staff` GetItem 가능) |
| Lambda 필요 여부 | 필수 — ID/시각/Cognito sub 부여 + recipients 유효성 검증 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 보고서 첨부 정책 미정 → `확인 필요` (§3.7 비고) |
| 근거 상세 | UI: `components/common/ConsultRequestModal.tsx` "협진 요청 전송" 버튼 (`handleSubmit` → `createConsultation`) / Service: `consultService.createConsultation` (서버에서 `id`/`requestedBy`/`requestedAt`/`status='pending'` 부여) / Type: `ConsultationRequest` / Schema: §16 Consultations PutItem / Mapping: §3.7, §5 |

---

### 6.9 AI Insight / Chat

#### POST /ai/insight

| 항목 | 내용 |
|---|---|
| 목적 | 모델×섹션 단위 AI 설명 텍스트 |
| 호출 위치 | AiInsightModal (✨ 버튼) / `aiInsightService.getAiInsight` |
| 연결 Lambda | Explanation Handler Lambda |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | `{ modelKey: ModelKey, section: AiInsightSection, patientId? }` — **`patientId?`는 현재 UI/service 근거가 약함** (`getAiInsight(modelKey, section)` 시그니처에 없음). 환자별 Bedrock 설명 또는 환자별 캐시 키를 쓰는 정책이 확정되면 사용 → `확인 필요` |
| Response Type | `{ text: string }` (서비스 함수는 `string` 반환, API는 객체로 wrap 권장) |
| DynamoDB | `AiInsightsCache` GetItem(`{modelKey}#{section}` 또는 `{patientId}#{modelKey}#{section}`) → miss 시 PutItem(TTL 24h) |
| Lambda 필요 여부 | 필수 — 캐시 hit/miss + Bedrock 호출 + PII 마스킹 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | 캐시 키 단위(환자 컨텍스트 포함 여부) 결정 필요 → `확인 필요` (§10 4번) |
| 근거 상세 | UI: `components/common/AiInsightModal.tsx` + `AiInsightButton.tsx` (✨ 버튼) / Service: `aiInsightService.getAiInsight(modelKey, section)` (시그니처에 `patientId` 없음 — `patientId?` 필드는 추정) / Type: 현재 `string` 반환 → API는 `{ text }` wrap 권장 / Mock: `api/mock/aiInsights.ts` (5×4 매트릭스) / Schema: §10 AiInsightsCache / Mapping: §3.4, §5 |

#### POST /ai/chat

| 항목 | 내용 |
|---|---|
| 목적 | 채팅 user → AI 응답 |
| 호출 위치 | AiChatPanel 메시지 전송 / `aiInsightService.getChatResponse` |
| 연결 Lambda | Explanation Handler Lambda |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | `{ context: ChatContext, message: string, sessionId?: string }` |
| Response Type | `{ text: string, messageId: string, sessionId?: string }` |
| DynamoDB | `ChatMessages` PutItem (user) → Bedrock 호출 → PutItem (ai) |
| Lambda 필요 여부 | 필수 — Bedrock + PII 마스킹 + 영속화 |
| 인증/권한 | Cognito JWT 필수 |
| 근거 수준 | UI/Type/Docs 확인 |
| 구현 우선순위 | 우선 |
| 비고 | `sessionId` 발급 주체(클라이언트 vs 서버) 결정 필요 → `확인 필요` (§10 5번). 응답 stream(SSE/WebSocket) 옵션 |
| 근거 상세 | UI: `components/common/AiChatPanel.tsx` (`sendMessage` → `getChatResponse`) + `FloatingChatButton.tsx` (patient 컨텍스트 진입) / Service: `aiInsightService.getChatResponse(context, message)` (현재 stateless 랜덤 mock) / Type: 현재 `string` 반환 → API는 `{ text, messageId }` wrap 권장 / Mock: `api/mock/aiInsights.ts` (`SECTION_CHAT_RESPONSES`, `PATIENT_CHAT_RESPONSES` 풀에서 랜덤) / Schema: §17 ChatMessages / Mapping: §3.8, §5 |

#### POST /ai/chat/intro (옵션)

| 항목 | 내용 |
|---|---|
| 목적 | 채팅 패널 진입 시 AI 인트로 메시지 |
| 호출 위치 | AiChatPanel 마운트 / `aiInsightService.getChatIntro` |
| 연결 Lambda | (해당 없음 또는 Explanation Handler Lambda) |
| Path Params | 없음 |
| Query Params | 없음 |
| Request Body | `{ context: ChatContext }` |
| Response Type | `{ text: string }` |
| DynamoDB | (해당 없음) |
| Lambda 필요 여부 | 선택 — 현재 mock은 정적 템플릿 (`안녕하세요. {patientId}...`) + section 컨텍스트는 `aiInsights[modelKey][section]`(이미 `/ai/insight`로 노출) 재조합. 프론트에서 직접 구성 가능 |
| 인증/권한 | Cognito JWT 필수 (도입 시) |
| 근거 수준 | UI/Mock 확인 / 정적 템플릿 |
| 구현 우선순위 | 옵션 (프론트 정적 처리 가능) |
| 비고 | 환자별 동적 인트로 생성 정책으로 바뀌면 필수로 승격 → `확인 필요` |
| 근거 상세 | **옵션** — `aiInsightService.getChatIntro(context)` 구현 확인 결과: patient 컨텍스트는 `buildPatientChatIntro(patientId)` = `'안녕하세요. ${patientId} 환자의 현재 상태에 대해...'` 정적 템플릿. section 컨텍스트는 `buildSectionChatIntro`가 `aiInsights[modelKey][section]`(이미 `/ai/insight`로 노출되는 텍스트) + `SECTION_LABEL` 라벨 합성. Bedrock 호출 불필요 → 프론트 정적 처리 가능. Mapping §3.8, §5 |

---

### 6.10 Optional / Deferred Routes

본 항목은 §6의 다른 도메인에서 보류/옵션으로 분류된 Route를 한 곳에 모아 보여준다.

| Method | Path | 분류 | 사유 |
|---|---|---|---|
| POST | `/auth/login` | 확인 필요 | Cognito Hosted UI/SDK 직접 사용 가능 (§6.1) |
| GET | `/me` 또는 `/staff/me` | 확인 필요 | 코드 호출 근거 없음 (§6.1) |
| POST | `/predictions/{patientId}` | 보류 | UI 트리거 없음 — 운영용/아키텍처 기반 (§6.4) |
| POST | `/patients/{patientId}/reports` | 옵션 | Persisted mode 선택 시 필수 (§6.6) |
| POST | `/patients/{patientId}/reports/{generatedAt}/notes` | 옵션 | 보고서 메모 영속화 정책 미정 (§6.6) |
| POST | `/alerts/{alertId}/resolve` | 보류 | UI 연결 시 필수 (§6.7) |
| POST | `/alerts/{alertId}/escalate` | 보류 | UI 더미, 정책 미정 (§6.7) |
| POST | `/ai/chat/intro` | 옵션 | 프론트 정적 처리 가능 (§6.9) |

---

## 7. API Gateway Route ↔ Lambda 매핑

| Lambda | 담당 Route | 비고 |
|---|---|---|
| **Patient Handler Lambda** | `GET /patients`, `GET /patients/{patientId}`, `GET /icus/{icuId}/staffing` | ICU Status Handler 책임을 흡수 (Patient Handler 자체는 유지). Prediction Read Handler 흡수 여부는 정책 결정 필요 |
| **Vital/SOFA Handler Lambda** | `GET /patients/{patientId}/vitals`, `GET /patients/{patientId}/sofa` | 환자 단위 시계열 pivot 책임 통합 |
| **Prediction Read Handler Lambda** | `GET /patients/{patientId}/predictions` | 단독 유지 vs Patient Handler 흡수 — 정책 결정 후 확정 (`ModelPredictions`가 비동기 흐름 종착점이라 운영 분리 시 모니터링 단순) |
| **Timeline Handler Lambda** | `GET /patients/{patientId}/timeline`, `GET /patients/{patientId}/schedule` | 두 도메인 모두 환자 단위 시간 Query |
| **Report Handler Lambda** | `GET /patients/{patientId}/report` (그리고 옵션 `POST /patients/{patientId}/reports`, `POST /patients/{patientId}/reports/{generatedAt}/notes`) | multi-service 조합 BFF |
| **Alert API Handler Lambda** | `GET /alerts`, `GET /alerts/count`, `POST /alerts/{alertId}/acknowledge` (그리고 UI 연결 시 `POST /alerts/{alertId}/resolve`, 정책 확정 시 `POST /alerts/{alertId}/escalate`) | Alert Stream Handler와 트리거/IAM/timeout 다름 — Lambda 함수는 분리, 코드 패키지는 공유 가능 |
| **Consultation Handler Lambda** | `GET /staff/departments`, `GET /consultations`, `POST /consultations` (그리고 도입 시 `GET /staff/me`) | cross-table join + 생성 validation |
| **Explanation Handler Lambda** | `POST /ai/insight`, `POST /ai/chat` (그리고 정책 확정 시 `POST /ai/chat/intro`) | Bedrock + PII 마스킹 + 캐시 + 채팅 영속화 |
| (API Gateway Route Handler 없음) | `POST /auth/login` | Cognito Hosted UI 또는 Amplify SDK 직접 사용 권장. PreToken Generation Trigger는 Cognito 내부 옵션이며 API Gateway 연결 Lambda가 아님 |
| **Prediction Orchestrator Lambda** | `POST /predictions/{patientId}` | UI 근거 없음 / 운영용 보류 |

---

## 8. API Gateway Route ↔ DynamoDB 테이블 매핑

| 테이블 | 읽는 Route | 쓰는 Route | 비고 |
|---|---|---|---|
| `Patients` | `GET /patients`, `GET /patients/{patientId}`, `GET /patients/{patientId}/report` | (Ingestion Adapter — §9) | rename `patientId↔id` |
| `Vitals` | `GET /patients/{patientId}/vitals`, `GET /patients/{patientId}/report` | (Ingestion Adapter / EMR — §9) | DDB Stream → Prediction Trigger |
| `Labs` | `GET /patients/{patientId}/vitals`, `GET /patients/{patientId}/report` | (Ingestion Adapter — §9) | Vitals와 함께 응답 |
| `SofaScores` | `GET /patients/{patientId}/sofa` | (Ingestion Adapter / SOFA 계산 — §9) | 결측 보존, organ-keyed pivot |
| `ModelPredictions` | `GET /patients/{patientId}/predictions`, `GET /patients/{patientId}/report` | (Prediction Worker / Orchestrator — §9), `POST /predictions/{patientId}` (보류) | DDB Stream → Alert Stream Handler |
| `IcuStaffing` | `GET /icus/{icuId}/staffing` | (운영 페이지 미존재) | 단일 ICU 기준 |
| `ClinicalTimeline` | `GET /patients/{patientId}/timeline` | (Ingestion Adapter / 이벤트 생성기 — §9) | rename `eventId↔id`, drop sortKey |
| `ScheduledEvents` | `GET /patients/{patientId}/schedule` | (처방/오더 시스템 hook — §9) | **`ScheduledEvents` 독립 테이블 vs `ClinicalTimeline` 흡수 — 확인 필요** (DYNAMO_SCHEMA §13에는 독립, 사용자 그룹화에는 미포함) |
| `Alerts` | `GET /alerts`, `GET /alerts/count` | `POST /alerts/{alertId}/acknowledge`, `POST /alerts/{alertId}/resolve`(보류), `POST /alerts/{alertId}/escalate`(보류), (Alert Stream Handler — §9) | nested `patient` 복원 |
| `Departments` | `GET /staff/departments` | (마스터 운영) | 항목 적음 — Scan 허용 |
| `Staff` | `GET /staff/departments` (간접), 도입 시 `GET /staff/me` | (마스터 운영) | GSI1 `DepartmentIndex` |
| `Consultations` | `GET /consultations` | `POST /consultations` | GSI1(patient), GSI2(status) |
| `AiInsightsCache` | `POST /ai/insight` | `POST /ai/insight` (cache PutItem) | 24h TTL |
| `ChatMessages` | (옵션) `POST /ai/chat`(이력 read), `POST /ai/chat/intro`(옵션) | `POST /ai/chat` (user/ai PutItem) | sessionId 발급 결정 필요 |
| `PatientReports` | `GET /patients/{patientId}/report`(Persisted mode 시) | `POST /patients/{patientId}/reports`(옵션), `POST /patients/{patientId}/reports/{generatedAt}/notes`(옵션) | 보고서 발행 정책 미정 |
| `HandoverNotes` (미설계) | (해당 없음) | (해당 없음) | DYNAMO_SCHEMA §20 미정. 인계 노트 기능 도입 시 정의 필요 → `확인 필요` |

> **테이블 vs 그룹 충돌**: DYNAMO_SCHEMA.md `§2 전체 테이블 요약`(15개)에는 `ScheduledEvents`가
> 독립 테이블 #10번으로 정의되어 있지만, 사용자가 제공한 "최대 15개 테이블 그룹화"에는 빠지고
> `HandoverNotes`가 그 자리에 들어가 있다. 본 문서는 schema가 권위 source라는 가정 하에 정리했으며,
> 실제 정책은 `확인 필요`. 자세한 분석은 `clinsight_api_lambda_mapping_from_ui.md` §8 참조.

---

## 9. 내부 비동기 트리거 (API Gateway Route 아님)

아래 Lambda는 **API Gateway에 노출되지 않는다.** DDB Stream / SQS / EventBridge 기반으로만 호출된다.

| Lambda | 트리거 | 책임 | 접근 리소스 | 근거 수준 |
|---|---|---|---|---|
| **Alert Stream Handler Lambda** | DDB Stream (`ModelPredictions`) | 알림 조건 평가 → `Alerts` PutItem + SNS 전송 | `ModelPredictions` (Stream read), `Alerts` (write), SNS | Docs (확정 비동기 흐름) |
| **Prediction Trigger Lambda** | DDB Stream (`Vitals`, `Labs`) | 새 측정값 → 재예측 조건 판단 → SQS push | `Vitals`/`Labs` Stream, SQS Prediction Queue | Docs (확정 비동기 흐름) |
| **Prediction Worker Lambda** | SQS Prediction Queue | 최신 window 재조회 → SageMaker 호출 → `ModelPredictions` PutItem | `Vitals`/`Labs` (read), S3 (`feature_schema`/`normalization_stats`), SageMaker Endpoint, `ModelPredictions` (write) | Docs (확정 비동기 흐름) |
| **Stale Prediction Checker Lambda** | EventBridge cron | 만료된 예측 신선도 평가 → 재예측 큐 push | `ModelPredictions` (scan/GSI), SQS Prediction Queue | Docs (선택) |
| **Ingestion Adapter Lambda** | (외부 ingestion — EMR/외부 시스템) | 외부 → 내부 테이블 적재 | `Vitals`, `Labs`, `Patients`, `SofaScores` (write) | Docs (데이터 소스 확정 후) |

> 실시간 push(WebSocket/SSE)나 협진 in-app 알림 등 **UI 근거가 약한 추가 비동기 흐름**은 본 문서 범위에서 보류.
> Slack/Teams/이메일/SMS 등 외부 채널은 본 분석에서 제외.

---

## 10. 인증 / 권한 / 보안 고려사항

- **인증**: 모든 API Gateway Route는 Cognito JWT 인증 필수. API Gateway Authorizer
  (Cognito User Pool Authorizer) 사용. (→ 부록 B: Cognito User Pool Authorizer)
- **권한 모델**: 현재는 의료진 단일 역할이므로 RBAC를 적용하지 않는다. 사용자 컨텍스트는
  Cognito sub로 통일 (`acknowledgedBy`, `requestedBy`, `generatedBy` 등).
- **향후 RBAC 확장**: Cognito User Pool Groups 활용 가능 (예: `attending`, `resident`,
  `nurse`, `admin`). 그룹별 액션 분리는 도입 시 정의.
- **CORS**: 프론트(S3+CloudFront)와 API(API Gateway)가 다른 도메인일 수 있으므로 API Gateway에
  CORS 설정 필수. preflight `OPTIONS` 자동 처리. (→ 부록 B: CORS)
- **감사 로그**: API Gateway Access Logs 활성화 권장. Lambda 내부에서도 (1) Cognito sub
  (2) 요청 path/method (3) 대상 리소스(patientId 등) (4) 결과 상태 코드를 구조화 로그로 기록.
  (→ 부록 B: API Gateway access log context 변수)
- **PII / 의료정보 보호**:
  - 본 프로젝트는 MIMIC-IV 기반 교육·연구용 비식별 데이터를 다루므로 HIPAA 준수 대상으로 확정된
    것은 아니지만, **HIPAA 수준의 의료정보 보호 원칙을 참고해 설계한다.**
  - 모든 환자 데이터 access는 Lambda를 경유한다. API Gateway → DDB 직접 integration은 비추천.
  - Bedrock/SageMaker 호출 직전 PII 마스킹 (Explanation Handler / Prediction Worker 책임).
  - 응답에서 DDB 내부 키(`icuId`, `sortKey` 등)는 drop, nested 구조 복원.
- **Rate Limiting**:
  - **API Gateway Usage Plan**: API key 기반 throttle(rate/burst)와 quota 설정에 적합.
    절대적 보장값이 아니라 best-effort 기반으로 적용되므로, 비용 보호 목적으로는 **AWS Budgets
    병행** 권장. (→ 부록 B: Usage Plan throttling/quota)
  - **사용자별(Cognito user 단위) 제한**: Usage Plan의 기본 기능이 아니다. 다음 중 하나로
    구현 검토:
    - Lambda Authorizer가 Cognito sub를 기반으로 동적 API key를 반환해 Usage Plan에 매핑
    - 또는 Lambda 내부 로직(예: DynamoDB counter, ElastiCache)으로 직접 처리
  - **IP 기반 제한**: API Gateway Usage Plan이 아니라 **AWS WAF**(Rate-based rule) 사용 검토.
    (→ 부록 B: IP 기반 rate limiting)
  - **외부 AI/ML 호출 endpoint**(`POST /ai/insight`, `POST /ai/chat`,
    `POST /predictions/{patientId}`)는 Bedrock/SageMaker 비용 보호 관점에서 별도 제한 정책이
    필요. **어떤 방식으로 제한할지(Usage Plan / Lambda 내부 / WAF / Budgets 조합)는 확인 필요**
    → §14 참조.
- **암호화**: API Gateway HTTPS 강제 (`TLS 1.2+`), DynamoDB at-rest 암호화 (KMS) 활성화 권장.

---

## 11. 에러 응답 규칙

> 본 규칙은 **초안**이며, 실제 구현 시 응답 코드/메시지/에러 코드 enum은 조정 가능하다.

### HTTP Status

| HTTP Status | 의미 | 사용 예시 |
|---|---|---|
| 200 | 성공 | 정상 조회/처리 |
| 201 | 생성 성공 | `POST /consultations`, `POST /patients/{patientId}/reports` 등 리소스 생성 |
| 400 | 잘못된 요청 | 필수 파라미터 누락, 잘못된 형식 |
| 401 | 인증 실패 | Cognito JWT 만료/누락 |
| 403 | 권한 없음 | 해당 ICU/환자 접근 권한 없음 |
| 404 | 리소스 없음 | 존재하지 않는 `patientId`, `alertId` 등 |
| 409 | 상태 충돌 | 이미 acknowledged된 알림에 대한 acknowledge 재호출 등 (옵션) |
| 429 | 요청 과다 | API Gateway throttling |
| 500 | 서버 오류 | Lambda 내부 오류. SageMaker/Bedrock 호출 실패는 Lambda가 잡아서 도메인 에러(예: `500 + BEDROCK_INVOCATION_FAILED`)로 변환할 수 있음 |
| 502 | Bad Gateway | **Lambda proxy response 형식 오류**, Lambda 실행 에러로 인한 잘못된 응답, integration 응답 형식 문제 (→ 부록 B: Lambda proxy response 형식) |
| 503 | 서비스 불가 | SageMaker Endpoint 비활성, 의존 서비스 일시 중단 등 |
| 504 | Gateway Timeout | **API Gateway integration timeout (기본 29초)**. Lambda 또는 외부 서비스(SageMaker/Bedrock) 호출이 제한 시간 내 응답하지 못한 경우 (→ 부록 B: Integration timeout) |

### 에러 응답 body 형식

```json
{
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "해당 환자를 찾을 수 없습니다",
    "details": {}
  }
}
```

- `code`: 도메인별 enum (예: `PATIENT_NOT_FOUND`, `ALERT_ALREADY_ACKNOWLEDGED`,
  `BEDROCK_INVOCATION_FAILED`, `INVALID_RECIPIENTS` 등). 실제 enum 목록은 구현 시 확정.
- `message`: 사용자에게 노출 가능한 한국어 메시지 (의료 도메인 톤: "권고/지시" 금지).
- `details`: 디버깅용 부가 정보. 운영 환경에서는 PII 누출 방지를 위해 최소화.

### 공통 응답 헤더

- `X-Request-Id`: 요청 추적용 ID. API Gateway `$context.requestId` 또는 Lambda `awsRequestId`를
  기준으로 **Lambda가 응답 헤더에 포함하도록 구현 권장** (Lambda proxy integration에서는 자동
  주입되지 않음). API Gateway access log와 Lambda log가 같은 ID를 공유하도록 매핑 정책 필요
  → `확인 필요`. (→ 부록 B: X-Request-Id 응답 헤더, API Gateway access log context 변수)
- `Cache-Control`: 정적/준정적 응답에 대해 명시 (예: `GET /staff/departments`는 짧은 캐시 가능).

---

## 12. 우선 구현 Route

clinsight_api_lambda_mapping_from_ui.md §11.1 기준 + UI/Type/Docs 근거가 모두 있는 Route만 우선 구현.

| Method | Path | 호출 service |
|---|---|---|
| GET | `/patients` | `getPatients` |
| GET | `/patients/{patientId}` | `getPatientById` |
| GET | `/patients/{patientId}/vitals` | `getVitals` |
| GET | `/patients/{patientId}/sofa` | `getSofaTrend` |
| GET | `/patients/{patientId}/predictions` | `getModelPredictions` |
| GET | `/patients/{patientId}/timeline` | `getTimeline` |
| GET | `/patients/{patientId}/schedule` | `getSchedule` |
| GET | `/patients/{patientId}/report` | `getPatientReport` |
| GET | `/icus/{icuId}/staffing` | `getStaffing` |
| GET | `/alerts` | `getAlerts` |
| GET | `/alerts/count` | `getNewAlertCount` |
| POST | `/alerts/{alertId}/acknowledge` | `acknowledgeAlert` |
| GET | `/staff/departments` | `getDepartments` |
| GET | `/consultations` | `getConsultations` |
| POST | `/consultations` | `createConsultation` |
| POST | `/ai/insight` | `getAiInsight` |
| POST | `/ai/chat` | `getChatResponse` |

> 위 17개 Route는 8개 Lambda(§7 매핑 표)로 묶인다. Lambda 통합 정책(Patient↔ICU Status,
> Vital↔SOFA, Prediction Read 단독 vs 흡수)은 §7과 `clinsight_api_lambda_mapping_from_ui.md`
> §11.1 참조.

---

## 13. 보류 / 확인 필요 Route

| Method | Path | 분류 | 사유 | 도입 조건 |
|---|---|---|---|---|
| POST | `/ai/chat/intro` | 옵션 | 정적 템플릿 — 프론트 처리 가능 | 환자별 동적 인트로 정책 확정 시 |
| POST | `/alerts/{alertId}/resolve` | 보류 | UI 미연결 (`resolveAlert` service만 존재) | UI에 resolve 버튼/흐름 추가 시 필수 |
| POST | `/patients/{patientId}/reports` | 옵션 | Persisted mode 정책 미정 | 보고서 발행 정책 확정 시 |
| POST | `/patients/{patientId}/reports/{generatedAt}/notes` | 옵션 | 보고서 메모 영속화 정책 미정 | 영속화 정책 확정 시 |
| POST | `/predictions/{patientId}` (path 스타일 후보) | 보류 | UI 트리거 없음 — path 스타일도 미확정 | 운영 인터페이스/새로고침 버튼 추가 + path 스타일 결정 시 |
| POST | `/alerts/{alertId}/escalate` | 보류 | UI 더미, 정책 미정 | 상급 보고 동작/수신자 정책 확정 시 |
| POST | `/auth/login` | 확인 필요 | Cognito 직접 사용 권장 — API Gateway Route로 확정하지 않음. PreToken Trigger는 Cognito 내부 옵션 | Cognito 도입 방식 결정 시 |
| GET | `/me` 또는 `/staff/me` | 확인 필요 | 코드 호출 근거 없음 | `CURRENT_USER` placeholder 제거 시점 |

---

## 14. 확정이 필요한 질문

`clinsight_api_lambda_mapping_from_ui.md` §10에 정리된 질문을 본 문서 관점에서 다시 정리한다.

1. **Cognito 도입 방식**: Hosted UI vs Amplify SDK. `POST /auth/login` 필요 여부 결정 → §6.1.
2. **`GET /me` / `GET /staff/me` 도입 시점**: `CURRENT_USER='담당 의료진'` placeholder 대체 정책.
3. **보고서 정책**: Live mode 유지 vs Persisted mode 도입(`POST /patients/{patientId}/reports`).
4. **보고서 메모 영속화**: 보고서 row 내부 vs 별도 테이블. `POST .../notes` 형태 확정 필요.
5. **Alert resolve 흐름**: UI 버튼/사용자 흐름 정의 → `POST /alerts/{alertId}/resolve` 확정 시점.
6. **Alert escalate 정책**: UI 더미 동작의 실제 흐름(수신자/우선순위) → `POST /alerts/{alertId}/escalate`.
7. **재예측 강제 트리거 UI 도입 여부**: `POST /predictions/{patientId}` 확정 시점.
8. **AI Insight 캐시 키 단위**: `{model}#{section}` vs `{patientId}#{model}#{section}`.
9. **AI Chat sessionId 발급 주체**: 클라이언트 vs 서버 (충돌 회피 위해 서버 권장).
10. **AI Chat 응답 stream**: 일반 응답 vs SSE/WebSocket.
11. **알림 실시간 push 방식**: 폴링(`GET /alerts/count` 주기) vs WebSocket vs SSE.
12. **KPI 사전 집계 위치**: 클라이언트 합산 유지 vs `GET /patients` 응답에 포함.
13. **시간 표기 통일**: `"14:20"`, `"-6h"` 표시 문자열을 ISO 8601로 통일 후 프론트 포맷터 → 응답
    필드 형태 결정 필요.
14. **`AlertBell.getNewAlertCount`와 `AlertsPage.getAlerts` 중복 호출**: 카운트 endpoint 분리
    유지 vs 페이지 fetch 응답에 합치기.
15. **`ScheduledEvents` 테이블 정책**: 독립 테이블 유지 vs `ClinicalTimeline` 흡수 (§8 참조).
16. **`HandoverNotes` 테이블 우선순위**: 인계 노트 페이지 구현 시점에 schema 추가.
17. **API Rate Limiting 구현 방식**: Bedrock/SageMaker 호출 endpoint(`POST /ai/insight`,
    `POST /ai/chat`, `POST /predictions/{patientId}`)의 사용자별 제한을 어떻게 구현할지 결정 필요
    — Lambda Authorizer가 동적 API key 발급해 Usage Plan 매핑 vs Lambda 내부 카운터(DDB/Cache)
    vs WAF 조합. 비용 보호는 AWS Budgets 병행 권장 (§10 Rate Limiting 참조).
18. **응답 Path param 형태**: 본 문서는 camelCase로 통일했지만, 실제 사내 컨벤션과 다를 수 있음
    → `확인 필요`.
19. **외부 AI/ML 서비스 timeout / retry / fallback 정책**: `POST /ai/insight`, `POST /ai/chat`,
    `POST /predictions/{patientId}`는 Bedrock/SageMaker 호출이 있어 API Gateway 기본 29초 timeout
    내 응답 보장이 어려울 수 있음. (a) Lambda 내부 timeout/budget (b) 재시도 정책 (c) 부분 응답 또는
    캐시 fallback 정책 (d) 504 vs 도메인 에러(예: `BEDROCK_INVOCATION_FAILED`) 변환 기준 결정 필요
    (§11 502/504 참조).
20. **강제 재예측 Route path 스타일**: 다른 Route는 모두 `/patients/{patientId}/...` 패턴인 반면
    현재 안은 `/predictions/{patientId}`라 일관성이 떨어짐. 후보:
    - `POST /predictions/{patientId}` (현재 안)
    - `POST /patients/{patientId}/predictions` (환자 하위 리소스 패턴)
    - `POST /patients/{patientId}/predictions:refresh` (action 스타일)
    UI 트리거가 정해진 시점에 함께 확정 (§6.4, §13).
21. **`X-Request-Id` 응답 헤더 발급 정책**: API Gateway `$context.requestId` vs Lambda
    `awsRequestId` 중 어느 ID를 표준으로 쓸지, 그리고 Lambda 응답 headers에 자동 포함하는
    공통 미들웨어/래퍼를 둘지 결정 필요 (§11 공통 응답 헤더 참조).

---

## 부록 A — 명명 규칙 / 스타일 가이드 요약

- **Path param**: camelCase (`{patientId}`, `{alertId}`, `{icuId}`, `{modelKey}`,
  `{consultationId}`, `{generatedAt}`).
- **Query param**: snake_case 대신 camelCase 또는 단일 단어 (예: `from`, `to`, `status`,
  `priority`, `patientId`). 일관성 위해 camelCase 권장 → `확인 필요`.
- **요청/응답 body**: `src/types/index.ts` 인터페이스 그대로. enum 값은 lower-case
  string(`'high'`, `'low'`, `'pending'`, `'critical'` 등).
- **시각**: 응답 body는 ISO 8601 KST(`2026-04-29T14:20:00+09:00`) 통일 권장. 표시용 변환은
  프론트 포맷터 책임. 현재 mock의 `"14:20"`/`"-6h"`는 전환 대상.
- **리소스 명사**: 복수형(`/patients`, `/alerts`, `/consultations`). action endpoint는
  하위 path(`/alerts/{alertId}/acknowledge`, `/alerts/{alertId}/resolve`).
- **버전 prefix**: 본 문서는 `/v1` prefix를 도입하지 않는다 (사용자 지시 — MVP/v1/v2 구분 사용 금지).
  추후 backward-incompatible 변경이 필요하면 그 시점에 별도 정책 결정 → `확인 필요`.

---

## 부록 B — AWS 공식 문서 기반 근거

본 문서의 §10·§11에 반영된 AWS 관련 설계 판단을 한 곳에 모아 정리한다. 본문에서는 각 항목 끝에
"(→ 부록 B: 항목명)" 형식으로만 참조한다.

| 설계 판단 | AWS 공식 근거 요약 | 공식 문서 URL | 반영 위치 |
|---|---|---|---|
| Cognito User Pool Authorizer | 사용자가 User Pool에서 토큰을 받은 뒤 `Authorization` header로 API 호출하는 구조 | [API Gateway — Control access to a REST API using Cognito user pools](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html) | §6.1, §10 |
| PreToken Generation Trigger | Cognito가 token 발급 전 claim을 수정하는 **User Pool 내부 Lambda Trigger**. API Gateway Route Handler가 아님 | [Cognito — Pre token generation Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html) | §6.1, §7 |
| Lambda proxy response 형식 | `statusCode`/`headers`/`body` 형식이 다르면 API Gateway가 502 반환 | [API Gateway — Set up Lambda proxy integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html) · [Lambda — Handling errors with API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-errors.html) | §11 |
| X-Request-Id 응답 헤더 | Lambda proxy integration에서 자동 주입되지 않음. Lambda response `headers`에 직접 포함해야 함 | [API Gateway — Set up Lambda proxy integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html) | §11 |
| API Gateway access log context 변수 | `$context.requestId`, `$context.extendedRequestId` 사용 가능 | [API Gateway — Setting up CloudWatch logging](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html) · [API Gateway — `$context` variables for access logging](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-variables-for-access-logging.html) | §10, §11 |
| Usage Plan throttling/quota | best-effort 적용. 비용 통제에는 AWS Budgets / WAF 병행 권장 | [API Gateway — Usage plans](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html) · [API Gateway — Throttle API requests for better throughput](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html) | §10 |
| IP 기반 rate limiting | Usage Plan은 API key 기반. IP 기반은 **AWS WAF rate-based rule** 사용 | [WAF — Rate-based rule statement](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html) | §10 |
| Integration timeout | REST API 기본 **29초**. Regional/Private API에서 증가 가능하나 throttle quota 조정 필요 | [API Gateway — Quotas and important notes (REST API)](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html) | §11 |
| CORS | 브라우저 기반 프론트와 API Gateway 도메인이 다를 때 preflight `OPTIONS` 처리 필요 | [API Gateway — Enabling CORS for a REST API resource](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html) | §10 |

> 위 항목은 AWS 공식 문서의 일반 원칙을 요약한 것이며, **실제 적용 시 최신 문서/리전·서비스
> 변경 사항을 확인할 것** → `확인 필요`.
