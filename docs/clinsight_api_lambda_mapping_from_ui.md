# ClinSight UI 기반 API / Lambda 후보 매핑

> 본 문서는 **현재 프론트엔드 UI / mock 데이터 / 타입 정의 / 기존 services 시그니처**를
> 기준으로, ClinSight 통합 아키텍처에 필요한 API 후보, Lambda 후보, DynamoDB 테이블
> 접근 후보를 정리한 분석 문서다. **실제 구현이나 코드 변경은 포함하지 않는다.**
>
> 분석 결과가 이미 확정된 아키텍처 컨텍스트와 충돌하면 임의로 수정하지 않고 `충돌/확인 필요`
> 또는 `UI 근거 없음 / 아키텍처 문서 기반 후보` 로 표기한다.

---

## 1. 분석 목적

- 현재 프론트 코드(`src/**`)와 [`docs/DYNAMO_SCHEMA.md`](./DYNAMO_SCHEMA.md)를 단일 기준으로,
  필요한 REST API 엔드포인트와 그 뒤를 지탱할 Lambda 후보, 접근 DynamoDB 테이블을 식별한다.
- "현재 UI에서 직접 호출되는가"를 1차 근거로 사용하고, 아키텍처 컨텍스트(이미 알려진 Lambda 목록·
  비동기 흐름)와 비교해 **UI 확인됨 / UI 근거 없음 (아키텍처 기반) / UI 기준 추가 확인 필요** 로
  분리한다.
- 모든 응답은 `src/types/index.ts`의 인터페이스 형태로 내려주는 것을 전제로 한다
  (DynamoDB row → Lambda 변환 → 프론트 타입).

---

## 2. 참고한 파일 / 문서

### 2.1 docs

| 경로 | 상태 | 비고 |
|---|---|---|
| [`docs/DYNAMO_SCHEMA.md`](./DYNAMO_SCHEMA.md) | 존재 | 본 분석의 1차 reference. §4–§18 테이블 정의, §19 단일 테이블 대안, §20 미정 항목 사용 |
| `clinsight_complete_architecture_context_for_ai.md` | **부재** | 작업 지시에 언급됐지만 레포에 존재하지 않음 — 본 문서에서는 사용자가 제공한 "이미 확정된 아키텍처 맥락" 텍스트만 근거로 사용. 실제 파일 내용과 다를 수 있음 → `확인 필요` |
| `design.md` / `requirements.md` / `03-architecture-overview.md` | **부재** | 동일 |

### 2.2 프론트 소스 (확인한 주요 파일)

- `src/App.tsx` — 라우팅 (`/`, `/patient/:id`, `/patient/:id/model/:modelKey`, `/alerts`,
  `/consultations`, `/login`)
- `src/types/index.ts` — 모든 인터페이스 정의 (Patient, ModelPrediction, Alert,
  ConsultationRequest, TimelineEvent, ScheduledEvent, PatientReport, ChatMessage,
  StaffingSnapshot, SofaTrend, VitalData 등)
- `src/api/client.ts` — fetch wrapper (현재 mock 모드, `VITE_API_BASE` env 사용 예정)
- `src/api/services/*` — 컴포넌트가 바라보는 단일 진입점 10개 파일
  (`patientService`, `vitalService`, `modelService`, `sofaService`, `staffingService`,
  `aiInsightService`, `alertService`, `consultService`, `timelineService`, `reportService`)
- `src/api/mock/*` — 응답 형태 검증용 (patients, vitals, models, sofaScores, staffing,
  aiInsights, alerts, timeline, departments, consultations)
- `src/pages/*` — OverviewPage, PatientPage, DrilldownPage(스텁 — §3.10 참조), AlertsPage,
  ConsultationsPage, LoginPage
- `src/components/common/*` — PatientHeader, ModelCard, ModelDetailView, AiInsightModal,
  AiInsightButton, AiChatPanel, FloatingChatButton, PatientReportModal,
  ConsultRequestModal, ClinicalTimeline, VitalChart, SofaPanel, AlertBell, TrendBar,
  ShapChart, RawMetrics, EscalationCard 등
- `src/components/alerts/AlertCard.tsx` — 알림 카드 액션
- `src/components/layout/Sidebar.tsx` — 네비게이션 (인계 노트·가이드라인·시스템 설정은 미라우팅)
- `src/context/AiModeContext.tsx` — 채팅 패널 컨텍스트 (`patient` / `section`)
- `src/utils/constants.ts` — `CURRENT_USER`(Cognito 연동 전 placeholder), `RISK_THRESHOLDS`

---

## 3. 화면별 데이터 요구사항

### 3.1 LoginPage (`/login`)

- **사용자 행동**: 직원번호/비밀번호 입력 → 로그인, ID 배지 로그인 (UI만 존재)
- **표시 데이터**: 없음 (입력 폼만)
- **현재 코드**: [`src/pages/LoginPage.tsx`](../src/pages/LoginPage.tsx) — 1.5초 splash 후
  `navigate('/')`. 실제 인증 호출 없음.
- **API 후보**: `POST /auth/login` (Cognito 연동 시 — 통상 `Amazon Cognito Hosted UI` 또는
  `aws-amplify` SDK 사용. API Gateway 별도 endpoint가 필요한지는 확정 필요)
- **Lambda 후보**: 없음 (Cognito 직접 사용 가능). 사용자 프로필 보강이 필요하면 `Pre Token
  Generation` Lambda Trigger 후보.
- **DynamoDB 후보**: 없음 (또는 `Staff` 테이블에 Cognito `sub` 매핑 필드 추가)
- **근거**: UI: `pages/LoginPage.tsx`(handleSubmit, line 17–27) — splash 후 `navigate('/')`만 수행. `src/api/services/*`에 인증 호출 없음. Service/Type/Mock 근거 없음. 백엔드 흐름은 **추정**.
- **비고**: Cognito Hosted UI/SDK는 본 시스템 외부의 서비스이므로 Lambda 신설 없이 통합 가능.

---

### 3.2 OverviewPage `/` — ICU 대시보드

#### 사용자 행동
- 로그인 후 기본 화면 진입
- KPI(총 환자, 점유율, 고위험) / Capacity(의사·간호사) / 환자 목록 확인
- 정렬 변경(위험도/입실시간/SOFA/나이), 페이지네이션
- 환자 행 클릭 → `/patient/:id`
- 알림 종(`AlertBell`) 클릭 → `/alerts`

#### 화면에 필요한 데이터
- **환자 목록**: `Patient[]` — `bed`, `id`, `name`, `age`, `sex`, `admit`, `diag`, `risk`,
  `sofa`, `status`, `sepsisOnset?`
- **운영 스냅샷**: `StaffingSnapshot` — `totalBeds`, `doctors.{onDuty,total,activities[]}`,
  `nurses.onDuty`, `thresholds.maxPatientsPerNurse`
- **미확인 알림 수**: `number` (배지)

#### 현재 코드 호출
- [`OverviewPage.tsx:106`](../src/pages/OverviewPage.tsx#L106): `getPatients()`
- [`OverviewPage.tsx:112`](../src/pages/OverviewPage.tsx#L112): `getStaffing()`
- [`AlertBell.tsx:9`](../src/components/common/AlertBell.tsx#L9): `getNewAlertCount()`

#### API 후보
- `GET /patients` → `Patient[]`
- `GET /icus/{icuId}/staffing` → `StaffingSnapshot`
- `GET /alerts/count?status=new` → `{ count: number }`

#### Lambda / DynamoDB
- `Patient Handler Lambda` ← `Patients` 테이블 (Scan 또는 GSI Query)
- `ICU Status Handler Lambda` ← `IcuStaffing` (`GetItem(icuId)`)
- `Alert API Handler Lambda` ← `Alerts` GSI1 (`Status='new'` `Select=COUNT`)

#### 근거
- UI: `pages/OverviewPage.tsx:106` (`getPatients()`), `OverviewPage.tsx:112` (`getStaffing()`), `components/common/AlertBell.tsx:9` (`getNewAlertCount()`)
- Service: `patientService.getPatients` (`patientService.ts:17`), `staffingService.getStaffing` (`staffingService.ts:16`), `alertService.getNewAlertCount` (`alertService.ts:25`)
- Type: `Patient`, `StaffingSnapshot` (`types/index.ts`)
- Mock: `api/mock/patients.ts`, `api/mock/staffing.ts`, `api/mock/alerts.ts`
- Schema: DYNAMO_SCHEMA §4 / §9 / §11

#### 비고 / 불확실한 점
- KPI 계산(`총/점유율/고위험 카운트`)은 **현재 클라이언트에서 합산**(`buildKpis`). Lambda에서
  사전 집계해 내려줄지, 클라이언트 합산을 유지할지 결정 필요 → `확인 필요`.
- `risk='high'` 정렬은 클라이언트 정렬. Lambda에서 GSI(`riskAdmitIndex`)로 내려주면 부하 절감
  가능하지만 단일 ICU 트래픽에선 비필수.

---

### 3.3 PatientPage `/patient/:id` — 환자 상세 (기본 뷰)

#### 사용자 행동
- 환자 헤더 (이름·나이·병상·입실·진단·SOFA·sepsisOnset)
- "요약 보고서" 버튼 → `PatientReportModal` 열기
- VitalChart (탭: SOFA / cardio / resp / renal / cns / coag / hepatic / temp)
- 5개 모델 카드 가로 나열, 클릭 시 ModelDetailView로 전환 (URL 변경 없음)
- ClinicalTimeline (과거 24h + 예정 N건)
- FloatingChatButton → `AiChatPanel` open (`{type:'patient', patientId}`)

#### 화면에 필요한 데이터
- `Patient` — header
- `VitalData` — `series` (HR/MAP/SpO2/RR/Temp/GCS/UO) + `labs[]` (lac/cre/pf_ratio/platelet/bilirubin)
- `Record<ModelKey, ModelPrediction>` — 5개 모델 (`mortality`/`aki`/`ards`/`sic`/`shock`)
- `TimelineEvent[]` — 24h 임상 이벤트
- `ScheduledEvent[]` — 예정 이벤트
- (보고서 모달 열릴 때) `PatientReport` — patient + vitals + labs + predictions

#### 현재 코드 호출
- [`PatientPage.tsx:32-38`](../src/pages/PatientPage.tsx#L32-L38): `Promise.all([
  getPatientById, getVitals, getModelPredictions, getTimeline, getSchedule ])`
- [`PatientPage.tsx:45-48`](../src/pages/PatientPage.tsx#L45-L48): `getPatientReport(id)` (모달 open 시)
- [`SofaPanel.tsx`](../src/components/common/SofaPanel.tsx) (VitalChart의 SOFA 탭 진입 시):
  `getSofaTrend(patientId)`

#### API 후보
- `GET /patients/{id}` → `Patient`
- `GET /patients/{id}/vitals` → `VitalData` (Vitals + Labs join + 시계열 pivot)
- `GET /patients/{id}/predictions` → `Record<ModelKey, ModelPrediction>` (5 row reduce)
- `GET /patients/{id}/timeline` → `TimelineEvent[]`
- `GET /patients/{id}/schedule` → `ScheduledEvent[]`
- `GET /patients/{id}/sofa` → `SofaTrend` (시계열 → 장기별 pivot)
- `GET /patients/{id}/report` → `PatientReport` (BFF; 또는 클라이언트 조합)

#### Lambda / DynamoDB
- `Patient Handler Lambda` — `Patients` GetItem
- `Vital Handler Lambda` (또는 `SOFA Handler`와 통합) — `Vitals` + `Labs` Query 후 pivot
- `Prediction Read Handler Lambda` — `ModelPredictions` Query (단독 유지 또는 §11.1 정책 결정에 따름)
- `Timeline Handler Lambda` — `ClinicalTimeline` Query (24h 범위)
- `Schedule Handler Lambda` (Timeline Handler에 통합 권장) — `ScheduledEvents` Query (now ~ now+N)
- `SOFA Handler Lambda` (또는 `Vital Handler`와 통합) — `SofaScores` Query 후 pivot
- `Report Handler Lambda` — patient + vitals + labs + predictions 조합 (BFF)

#### 근거
- UI: `pages/PatientPage.tsx:32-38` (Promise.all 5건), `PatientPage.tsx:45-48` (`getPatientReport`), `components/common/VitalChart.tsx`, `components/common/SofaPanel.tsx:62` (`getSofaTrend`), `components/common/ClinicalTimeline.tsx`, `components/common/PatientReportModal.tsx`
- Service: `patientService.getPatientById:21`, `vitalService.getVitals:17`, `modelService.getModelPredictions:65`, `timelineService.getTimeline:16`, `timelineService.getSchedule:24`, `sofaService.getSofaTrend:17`, `reportService.getPatientReport:69` (조합형)
- Type: `Patient`, `VitalData`, `Record<ModelKey, ModelPrediction>`, `TimelineEvent[]`, `ScheduledEvent[]`, `SofaTrend`, `PatientReport` (`types/index.ts`)
- Mock: `api/mock/patients.ts`, `api/mock/vitals.ts`, `api/mock/models.ts`, `api/mock/timeline.ts`(mockTimeline+mockSchedule), `api/mock/sofaScores.ts`
- Schema: DYNAMO_SCHEMA §4, §5, §6, §7, §8, §12, §13, §18

#### 비고 / 불확실한 점
- `getPatientReport`는 현재 frontend에서 `getPatientById` + `getVitals` + `getModelPredictions`를
  조합. 백엔드 Lambda에서 **BFF로 한 endpoint에 합칠지**, **현재처럼 클라이언트 조합 유지할지**
  결정 필요. DYNAMO_SCHEMA §18은 "Live mode vs Persisted mode" 두 안 모두 허용. → `확인 필요`
- `LAST_UPDATED_MIN`(2분)은 현재 하드코딩. 백엔드 도입 시 `ModelPredictions.updatedAt` 기준으로
  계산. → `Mock/Type 확인` (DYNAMO_SCHEMA §7에 `updatedAt` 명시)

---

### 3.4 ModelDetailView (PatientPage 내부, URL 동일)

#### 사용자 행동
- 모델 카드 클릭 → 상세로 전환 (좌측: 선택 모델 + 다른 모델 미니, 우측: 추이/SHAP/Raw/보조지표)
- "근거 보기 ↓" 클릭 → SHAP 섹션으로 스크롤
- ✨ AI 설명 버튼 클릭 → `AiInsightModal` open (섹션별 설명 텍스트)
- "전체 보기" 클릭 → 기본 뷰 복귀
- 다른 모델 미니 카드 클릭 → 우측 패널만 교체

#### 화면에 필요한 데이터
- `ModelPrediction` — `title`, `tone`, `trend[]`(7시점 + 시점별 SHAP), `trendWarn`,
  `shap[]`(현재 top 5), `raw[]`, `llmSummary`, `escalation?`(ARDS/Shock 전용)
- AI 설명 텍스트 — `string` (모델×섹션 4종: `trend`/`shap`/`rawMetrics`/`auxiliary`)

#### 현재 코드 호출
- 데이터는 부모(`PatientPage`)의 `predictions` prop을 그대로 사용 (별도 fetch 없음)
- [`ModelDetailView.tsx:59-63`](../src/components/common/ModelDetailView.tsx#L59-L63):
  `getAiInsight(selectedModel, openSection)` (모달 open 시 fetch)

#### API 후보
- (예측은 PatientPage에서 이미 fetch됨)
- `POST /ai/insight` body: `{ modelKey, section, patientId? }` → `{ text }`
  - 캐시 hit 우선, miss 시 Bedrock 호출

#### Lambda / DynamoDB
- `Explanation Handler Lambda` — `AiInsightsCache` GetItem → miss 시 Bedrock 호출 + PutItem (TTL)
  - DYNAMO_SCHEMA §10 기준
  - **PII 마스킹**: 환자 컨텍스트가 들어갈 경우 Bedrock 호출 직전 마스킹 적용 (이미 확정된 책임)

#### 근거
- UI: `components/common/ModelDetailView.tsx:61` (`getAiInsight(selectedModel, openSection)`), `components/common/AiInsightButton.tsx`, `components/common/AiInsightModal.tsx`
- Service: `aiInsightService.getAiInsight:31` (시그니처 `(modelKey, section)` — patientId 없음)
- Type: 반환 `string` (mock 매트릭스), API 도입 시 `{ text }` 권장
- Mock: `api/mock/aiInsights.ts` (5×4 매트릭스 정적)
- Schema: DYNAMO_SCHEMA §10 AiInsightsCache

#### 비고 / 불확실한 점
- 현재 mock은 `ModelKey × AiInsightSection` 매트릭스에서 정적 텍스트 반환. 환자 컨텍스트(`patientId`)는
  전달되지 않음. 실제 Bedrock 호출 시 환자별 캐시 키를 쓸지, 모델×섹션 단위만 쓸지 결정 필요. →
  `확인 필요`
- "재예측 새로고침" 버튼은 **현재 UI에 존재하지 않음**. 사용자 지시문에 등장하는
  `POST /predictions/{id}` (Prediction Orchestrator)는 → `UI 근거 없음 / 아키텍처 문서 기반 후보`
  로 표시.
- `DrilldownPage`(`/patient/:id/model/:modelKey`)가 동일 도메인의 별도 라우트로 등록되어 있으나,
  현재 구현은 placeholder 텍스트만 출력하는 **스텁**이며 service/API 호출이 없다. 또한 다른 컴포넌트
  어디에서도 이 URL로 navigate하지 않는다 (`AlertCard`, `PatientPage`, `Sidebar` 모두
  `/patient/:id`로만 이동). 모델 상세 데이터는 본 §3.4의 `ModelDetailView`가 부모 `PatientPage`의
  prop으로 받은 predictions를 그대로 사용 — **별도 API 후보는 필요하지 않음**. 자세한 라우트 상태는
  §3.10 참조.

---

### 3.5 AlertsPage `/alerts` — 알림 센터

#### 사용자 행동
- 우선순위 필터 (전체/Critical/Warning) 탭 전환
- 미확인/확인됨/해소됨 섹션 보기 (해소됨은 토글 펼침)
- 알림 카드 클릭 → 환자 상세로 이동
- "확인" 버튼 → `acknowledgeAlert(id, by)` → 새로고침
- "환자 보기" 버튼 → 환자 상세
- "상급 보고" 버튼 → 현재 `window.alert('준비 중')` (UI 더미)

#### 화면에 필요한 데이터
- `Alert[]` — `id`, `timestamp`, `patient.{id,name,bed}`, `source`, `priority`, `status`,
  `acknowledgedBy?`, `acknowledgedAt?`, `resolvedAt?`, `title`, `body`, `tags[]`,
  `confidence?`, `actions[]`

#### 현재 코드 호출
- [`AlertsPage.tsx:36`](../src/pages/AlertsPage.tsx#L36): `getAlerts()` (전체 조회 후 클라이언트 필터)
- [`AlertsPage.tsx:43`](../src/pages/AlertsPage.tsx#L43): `acknowledgeAlert(id, 'Dr. 사용자')`

#### API 후보
- `GET /alerts` → `Alert[]` (전체)
- `GET /alerts?status=new&priority=critical` → `Alert[]` (서버 필터; 옵션)
- `POST /alerts/{id}/acknowledge` body: `{ by }` → `Alert`
- `POST /alerts/{id}/resolve` → `Alert`
- `GET /alerts/count?status=new` → `{ count }` (AlertBell이 사용)

#### Lambda / DynamoDB
- `Alert API Handler Lambda` — `Alerts` 테이블 (동기, API Gateway 트리거)
  - 전체 조회: `Scan` 또는 GSI1 `StatusCreatedAtIndex` 다중 status 합산
  - status 필터: GSI1 Query
  - 환자별 필터: GSI2 `PatientCreatedAtIndex` Query
  - ack/resolve: `UpdateItem`
- `Alert Stream Handler Lambda` — 알림 생성은 별도 비동기 흐름 (§9.1 참조)

#### 근거
- UI: `pages/AlertsPage.tsx:36` (`getAlerts()`), `AlertsPage.tsx:43` (`acknowledgeAlert(id, 'Dr. 사용자')` — 하드코딩), `components/alerts/AlertCard.tsx`(handleAction에서 `escalate` 분기는 `window.alert(...)` 더미), `components/common/AlertBell.tsx:9` (`getNewAlertCount()`)
- Service: `alertService.getAlerts:20`, `getNewAlertCount:25`, `acknowledgeAlert:38`, `resolveAlert:52` (resolve는 service만 존재 — UI 버튼 미확인)
- Type: `Alert`, `AlertAction` (`types/index.ts`)
- Mock: `api/mock/alerts.ts` (`mockAlerts`)
- Schema: DYNAMO_SCHEMA §11

#### 비고 / 불확실한 점
- "상급 보고" 액션은 **UI 더미**. 실제 동작 정의 없음 → 본 분석에서는 endpoint 후보에서 제외하고
  `UI 기준 추가 확인 필요`로 표시.
- 클라이언트가 전체 Alert을 가져와 클라이언트 필터링 중. 데이터량이 커지면 서버 필터(GSI Query)로
  전환 필요 → `확인 필요`.
- 알림은 **확정된 비동기 흐름**(ModelPredictions → DDB Stream → `Alert Stream Handler`)으로 생성됨.
  생성 endpoint(`POST /alerts`)는 UI에 없음 → `UI 근거 없음 / 아키텍처 문서 기반 후보` (내부 흐름).

---

### 3.6 ConsultationsPage `/consultations` — 협진 요청

#### 사용자 행동
- 상태 필터 (전체/대기중/수락됨/완료) 탭 전환
- 협진 행 보기 (상태/환자/수신/우선순위/요청시각/액션)
- "요청 내용" 클릭 → `PatientReportModal` 열기 (협진 시 첨부된 보고서 컨텍스트로)
- "환자 보기" → 환자 상세

#### 화면에 필요한 데이터
- `ConsultationRequest[]` — `id`, `patientId`, `patientName`, `patientBed`, `requestedBy`,
  `requestedAt`, `priority`, `status`, `recipients[]`, `reason`, `reportSnapshot?`
- (요청 내용 모달 열림 시) `PatientReport`

#### 현재 코드 호출
- [`ConsultationsPage.tsx:117`](../src/pages/ConsultationsPage.tsx#L117): `getConsultations()`
- [`ConsultationsPage.tsx:122-124`](../src/pages/ConsultationsPage.tsx#L122-L124): `getPatientReport(selectedPatientId)`

#### API 후보
- `GET /consultations` → `ConsultationRequest[]`
- `GET /consultations?patientId={id}` → `ConsultationRequest[]`
- (`POST /consultations` 는 별도 모달에서 호출, §3.7 참조)
- (`GET /patients/{id}/report` 는 §3.3 참조)

#### Lambda / DynamoDB
- `Consultation Handler Lambda` — `Consultations` 테이블
  - 전체: GSI2 `StatusRequestedAtIndex` 다중 status 합산 또는 Scan
  - 환자별: GSI1 `PatientRequestedAtIndex` Query

#### 근거
- UI: `pages/ConsultationsPage.tsx:117` (`getConsultations()` — 전체 fetch 후 클라이언트 필터), `ConsultationsPage.tsx:122-124` (`getPatientReport`)
- Service: `consultService.getConsultations:34` (선택 파라미터 `patientId?`)
- Type: `ConsultationRequest` (`types/index.ts`)
- Mock: `api/mock/consultations.ts` (`mockConsultations`)
- Schema: DYNAMO_SCHEMA §16

#### 비고
- "수신자 inbox" GSI(staffId 기준)는 UI에 없음 → `UI 근거 없음 / 아키텍처 문서 기반 후보`.

---

### 3.7 ConsultRequestModal (PatientReportModal 내 / 환자 상세에서 진입)

#### 사용자 행동
- 부서 트리 펼침 → 인원 클릭 시 수신자 추가
- 수신자 chip 클릭 → `to ↔ cc` 토글 / 제거
- 사유 입력 (옵션)
- 우선순위 라디오 (긴급/일반)
- "협진 요청 전송" → `createConsultation` → 성공 화면 → 자동 닫힘

#### 화면에 필요한 데이터
- `Department[]` — 각 항목에 `members: StaffMember[]` nested

#### 현재 코드 호출
- [`ConsultRequestModal.tsx:41`](../src/components/common/ConsultRequestModal.tsx#L41): `getDepartments()`
- [`ConsultRequestModal.tsx:134-141`](../src/components/common/ConsultRequestModal.tsx#L134-L141): `createConsultation({...})`

#### API 후보
- `GET /staff/departments` → `Department[]` (Departments + Staff GSI join → nested)
- `POST /consultations` body: `{ patientId, patientName, patientBed, recipients[],
  priority, reason }` → `ConsultationRequest` (`id`, `requestedBy`, `requestedAt`, `status`는
  서버가 채움)

#### Lambda / DynamoDB
- `Consultation Handler Lambda`:
  - `Departments` Scan + `Staff` GSI1 `DepartmentIndex` Query → `Department[]` 조립
  - `Consultations` PutItem (서버에서 ID/시각/Cognito sub/status='pending' 부여)

#### 근거
- UI: `components/common/ConsultRequestModal.tsx:41` (`getDepartments()`), `ConsultRequestModal.tsx:134-141` (`createConsultation({...})`), `components/common/consult/DepartmentTree.tsx`, `RecipientChips.tsx`
- Service: `consultService.getDepartments:26`, `createConsultation:46`
- Type: `Department`, `StaffMember`, `ConsultationRequest` (`types/index.ts`)
- Mock: `api/mock/departments.ts` (`mockDepartments`)
- Schema: DYNAMO_SCHEMA §14, §15, §16

#### 비고
- DYNAMO_SCHEMA §16: 보고서 첨부(`reportSnapshot`)는 옵션. UI는 현재 보고서 모달에서 협진을
  열되 본문에 포함하지 않음 → `UI 기준 추가 확인 필요`.

---

### 3.8 AiChatPanel (Layout 우측 패널, 모든 페이지 공통)

#### 사용자 행동
- FloatingChatButton 클릭 → 환자 컨텍스트 채팅 열림
- (Section 컨텍스트는 향후 ✨ 버튼에서 채팅으로 확장될 자리지만 현재 미연결)
- 인트로 메시지 자동 표시
- 텍스트 입력 → 전송 → AI 응답
- 환자 컨텍스트일 때 예제 프롬프트 칩 노출

#### 화면에 필요한 데이터
- `string` (인트로) / `string` (응답)

#### 현재 코드 호출
- [`AiChatPanel.tsx:71`](../src/components/common/AiChatPanel.tsx#L71): `getChatIntro(context)`
- [`AiChatPanel.tsx:105`](../src/components/common/AiChatPanel.tsx#L105): `getChatResponse(context, trimmed)`

#### API 후보
- (옵션) `POST /ai/chat/intro` body: `{ context }` → `{ text }` — 현재 mock은 정적 템플릿이라
  프론트에서 직접 구성 가능. 환자별 동적 인트로가 필요해질 때만 endpoint로 승격.
- `POST /ai/chat` body: `{ context, message, sessionId }` → `{ text, messageId }`
  - 또는 stream 응답(SSE/WebSocket)으로 변경 가능 (확정 필요)

#### Lambda / DynamoDB
- `Explanation Handler Lambda` (또는 별도 `Chat Handler Lambda`)
  - `ChatMessages` PutItem (user) → Bedrock 호출 → PutItem (ai) → 반환
  - PII 마스킹 책임 동일
  - 인트로는 정적 템플릿이라 Lambda 호출 불필요 (프론트 처리)
- DYNAMO_SCHEMA §17

#### 근거
- UI: `components/common/AiChatPanel.tsx:71` (`getChatIntro(context)`), `AiChatPanel.tsx:105` (`getChatResponse(context, trimmed)`), `components/common/FloatingChatButton.tsx`
- Service: `aiInsightService.getChatIntro:42` (정적 템플릿 — `buildPatientChatIntro`/`buildSectionChatIntro` 호출), `getChatResponse:54` (현재 stateless 랜덤 mock)
- Type: `ChatContext`, `ChatMessage` (`types/index.ts`)
- Mock: `api/mock/aiInsights.ts` (`buildPatientChatIntro`, `buildSectionChatIntro`, `getChatResponseFromMock` — `SECTION_CHAT_RESPONSES`/`PATIENT_CHAT_RESPONSES` 풀)
- Schema: DYNAMO_SCHEMA §17

#### 비고
- `sessionId` 발급/관리는 클라이언트 또는 서버 어느 쪽에서 할지 결정 필요 → `확인 필요`.
- `getChatResponse`는 현재 stateless string 반환. 백엔드 도입 시 단건 `ChatMessage` 또는 세션
  전체 배열 반환으로 확장 가능 (DYNAMO_SCHEMA §17 마지막 단락).

---

### 3.9 PatientReportModal — 환자 상태 요약 보고서

#### 사용자 행동
- 환자 상세에서 "요약 보고서" 또는 협진 페이지에서 "요청 내용" 클릭으로 진입
- 인쇄 버튼 → `window.print()` (PDF 변환은 브라우저)
- 협진 요청 버튼 → `ConsultRequestModal` 열기 (§3.7)
- 협진 의견 메모 입력/추가 (현재 모달 내부 로컬 상태 — 영속화 없음)

#### 화면에 필요한 데이터
- `PatientReport` — patient + vitals + labs + predictions

#### 현재 코드 호출
- §3.3, §3.6 참조 (`getPatientReport(patientId)`)

#### API 후보
- `GET /patients/{id}/report` → `PatientReport`
- (옵션) `POST /patients/{id}/reports` → 보고서 시점 동결 저장 (DYNAMO_SCHEMA §18 Persisted mode)
- (옵션) `POST /patients/{id}/reports/{generatedAt}/notes` → 협진 메모 영속화

#### Lambda / DynamoDB
- `Report Handler Lambda` — `Patients` + `Vitals` + `Labs` + `ModelPredictions` 조합 (BFF)
  - Persisted mode 활성화 시 `PatientReports` PutItem

#### 근거
- UI: `components/common/PatientReportModal.tsx`, `components/common/report/ReportContent.tsx`, `components/common/report/ConsultationNotes.tsx` (메모는 `useState<ConsultationNote[]>([])` 로컬 상태 — 영속화 없음)
- Service: `reportService.getPatientReport:69` (조합형 — 내부에서 `getPatientById` + `Promise.all([getVitals, getModelPredictions])` 호출, `reportService.ts:70-76` 참조)
- Type: `PatientReport`, `ReportVitalRow`, `ReportLabRow`, `ReportPrediction` (`types/index.ts`)
- Mock: 직접 mock 없음 (조합 결과)
- Schema: DYNAMO_SCHEMA §18 PatientReports (정의는 존재)

#### 비고 / 불확실한 점
- 보고서 생성 빈도(매 호출 vs "발행" 버튼)는 DYNAMO_SCHEMA §20에서도 미정으로 표기 → `확인 필요`.
- `ConsultationNotes`는 현재 **모달 내부 로컬 상태**로 영속화 없음. UI에 입력은 있으나 서버 저장
  endpoint 미연결 → `UI 기준 추가 확인 필요`.

---

### 3.10 Sidebar 미라우팅 항목 / 잔존 라우트

#### Sidebar 라벨만 있고 라우트 없는 항목

| 라벨 | 라우트 | 상태 | 비고 |
|---|---|---|---|
| 인계 노트 | (없음) | 페이지 미구현 | DYNAMO_SCHEMA §20 미정 항목 (`HandoverNotes` 테이블 미설계) — `UI 기준 추가 확인 필요` |
| 가이드라인 | (없음) | 페이지 미구현 | 정적 콘텐츠 가능성 — `UI 근거 약함` |
| 시스템 설정 | (없음) | 페이지 미구현 | 사용자 설정 / 알림 임계치 / 테마 등 — `UI 근거 약함` |

#### 라우트는 있으나 현재 주요 UI 흐름에서는 사용 근거 약함

| 페이지 | 라우트 | 상태 | 비고 |
|---|---|---|---|
| `DrilldownPage` | `/patient/:id/model/:modelKey` | 스텁 (placeholder 텍스트만) | App.tsx에 라우트 등록은 되어 있으나 [`DrilldownPage.tsx`](../src/pages/DrilldownPage.tsx) 본문은 `<h2>모델 상세</h2>`와 `<p>확률 추이, SHAP, Raw 지표가 여기에 들어올 예정</p>` 두 줄 + `FloatingChatButton`만 존재. service/API 호출 없음. 다른 컴포넌트 어디에서도 이 URL로 navigate하지 않음 — 모델 상세는 §3.4 `ModelDetailView`가 `/patient/:id` 내부에서 처리. → `라우트는 있으나 사용 근거 약함` / 별도 API 후보 불필요. 추후 모델별 deeplink가 필요해지면 PatientPage와 동일한 데이터 fetch를 재사용 가능 → `확인 필요` |

---

## 4. UI 요소별 요청 목록

| UI 요소 | 사용자 행동 | 필요한 데이터/작업 | API 후보 | Lambda 후보 | 근거 수준 | 비고 |
|---|---|---|---|---|---|---|
| 환자 행 클릭 (`PatientTable`) | `/patient/:id` 이동 | 환자 + Vitals + Predictions + Timeline + Schedule (Promise.all) | `GET /patients/{id}` 외 4건 | Patient/Vital/Prediction/Timeline/Schedule Handler | UI 확인 | 5건 동시 fetch — BFF 통합 검토 가치 |
| 정렬 select 변경 | 클라이언트 정렬 | 없음 (client-side) | — | — | UI 확인 | 서버 정렬 전환 옵션 — 트래픽 따라 결정 |
| 페이지네이션 ◀▶ | 클라이언트 페이지 분할 | 없음 (client-side) | — | — | UI 확인 | 환자 수 적어 client OK |
| AlertBell 아이콘 | `/alerts` 이동 | 미확인 카운트 | `GET /alerts/count?status=new` | Alert API Handler | UI 확인 | 폴링 또는 WebSocket push |
| 알림 카드 클릭 | 환자 상세 이동 | 없음 (라우팅만) | — | — | UI 확인 | |
| 알림 "확인" 버튼 | status='acknowledged'로 변경 | UpdateItem | `POST /alerts/{id}/acknowledge` | Alert API Handler | UI 확인 | `by`는 현재 placeholder, Cognito sub로 교체 |
| 알림 "환자 보기" | 환자 상세 이동 | 없음 (라우팅만) | — | — | UI 확인 | |
| 알림 "상급 보고" | UI 더미 (`window.alert`) | 미정 | (미정) | (미정) | UI 기준 추가 확인 필요 | endpoint 정의 없음 |
| 모델 카드 클릭 | ModelDetailView로 전환 (URL 동일) | 없음 (이미 fetch된 predictions 사용) | — | — | UI 확인 | URL 변경 없는 내부 상태 전환 |
| ✨ AI 설명 버튼 (섹션별) | `AiInsightModal` 열기 | 모델×섹션 텍스트 | `POST /ai/insight` | Explanation Handler | UI 확인 | PII 마스킹 필요, 캐시 hit 우선 |
| "근거 보기 ↓" | SHAP 섹션으로 스크롤 | 없음 | — | — | UI 확인 | client-side scroll |
| "전체 보기" (ModelDetail) | 기본 뷰 복귀 | 없음 | — | — | UI 확인 | |
| 다른 모델 미니 카드 | 우측 패널만 교체 | 없음 (이미 fetch된 데이터) | — | — | UI 확인 | |
| FloatingChatButton | `AiChatPanel` open (patient ctx) | 인트로 텍스트 (현재 정적 템플릿) | (선택) `POST /ai/chat/intro` | (선택) Explanation Handler | UI/Mock 확인 | 현재 mock은 `안녕하세요. {patientId}...` 단순 템플릿 — 프론트 정적 처리 가능. 환자별 동적 생성으로 바뀌면 endpoint 필요 |
| 채팅 메시지 전송 | AI 응답 | user 메시지 + Bedrock 호출 + ai 응답 | `POST /ai/chat` | Explanation Handler | UI 확인 | ChatMessages 영속화, PII 마스킹 |
| 채팅 예제 프롬프트 칩 | 메시지 즉시 전송 | (위와 동일) | `POST /ai/chat` | Explanation Handler | UI 확인 | |
| "요약 보고서" 버튼 (PatientHeader) | `PatientReportModal` 열기 | `PatientReport` | `GET /patients/{id}/report` | Report Handler | UI 확인 | BFF 권장 |
| 보고서 "인쇄" | `window.print()` | 없음 (browser) | — | — | UI 확인 | PDF는 브라우저 책임 |
| 보고서 "협진 요청" | `ConsultRequestModal` 열기 | `Department[]` | `GET /staff/departments` | Consultation Handler | UI 확인 | |
| 보고서 협진 의견 메모 추가 | 모달 내부 로컬 상태 | (미연결) | (옵션) `POST /reports/{id}/notes` | Report Handler | UI 기준 추가 확인 필요 | 영속화 미구현 |
| ConsultRequestModal 부서 트리 펼침/선택 | 수신자 추가 | 없음 (이미 fetch된 departments) | — | — | UI 확인 | |
| 수신자 chip "to/cc" 토글 | 클라이언트 상태 | 없음 | — | — | UI 확인 | |
| "협진 요청 전송" | 협진 PutItem | `POST /consultations` | Consultation Handler | UI 확인 | `requestedBy`/`requestedAt`/`id`/`status`는 서버 부여 |
| 협진 행 "요청 내용" | `PatientReportModal` 열기 (해당 환자 보고서) | `PatientReport` | `GET /patients/{id}/report` | Report Handler | UI 확인 | |
| 협진 행 "환자 보기" | 환자 상세 이동 | 없음 | — | — | UI 확인 | |
| VitalChart 탭 전환 | 같은 vitals 데이터에서 series 전환 | 없음 (client-side) | — | — | UI 확인 | SOFA 탭 진입 시 `getSofaTrend` 트리거 |
| SofaPanel 진입 | SOFA 추이 fetch | `SofaTrend` | `GET /patients/{id}/sofa` | SOFA Handler | UI 확인 | |
| ClinicalTimeline 보기 | 데이터 표시만 | 없음 (이미 fetch) | — | — | UI 확인 | |
| Sidebar 인계/가이드라인/설정 | (라우트 없음) | 미정 | — | — | UI 기준 추가 확인 필요 | 페이지 미구현 |
| 로그인 form 제출 | 인증 + redirect | (Cognito) | `POST /auth/login` 또는 Cognito SDK | (없음 또는 PreToken Lambda) | 추정 | 백엔드 흐름 미확정 |

---

## 5. API 후보 목록

| API 후보 | Method | 목적 | 호출 화면/컴포넌트 | Lambda 후보 | DynamoDB 테이블 | Lambda 필요 여부 | 근거 수준 | 비고 |
|---|---|---|---|---|---|---|---|---|
| `/patients` | GET | 환자 목록 | OverviewPage | Patient Handler | `Patients` | 선택 (응답 가공) | UI 확인 | Scan 또는 GSI Query |
| `/patients/{id}` | GET | 환자 단건 | PatientPage, AlertCard 후속 | Patient Handler | `Patients` | 선택 (응답 가공) | UI 확인 | rename `patientId↔id`, drop `icuId` |
| `/patients/{id}/vitals` | GET | Vital 시계열 + Lab 점 | VitalChart | Vital Handler (또는 SOFA Handler와 통합) | `Vitals`, `Labs` | 필수 | UI 확인 | 두 테이블 join + pivot 필요 |
| `/patients/{id}/sofa` | GET | SOFA 6장기 시간별 점수 | SofaPanel | SOFA Handler | `SofaScores` | 필수 | UI 확인 | row → organ-keyed pivot, 결측 보존 |
| `/patients/{id}/predictions` | GET | 5개 모델 예측 | PatientPage, ModelDetailView (read-through) | Prediction Read Handler | `ModelPredictions` | 선택 (5 row reduce) | UI 확인 | `Record<ModelKey, ModelPrediction>` 조립 |
| `/patients/{id}/timeline` | GET | 24h 임상 이벤트 | ClinicalTimeline | Timeline Handler | `ClinicalTimeline` | 선택 (응답 가공) | UI 확인 | rename, drop sortKey |
| `/patients/{id}/schedule` | GET | 예정 임상 이벤트 | ClinicalTimeline | Timeline Handler (통합) | `ScheduledEvents` | 선택 (응답 가공) | UI 확인 | now ~ now+N 범위 |
| `/patients/{id}/report` | GET | 환자 요약 보고서 | PatientReportModal, ConsultationsPage | Report Handler | `Patients`+`Vitals`+`Labs`+`ModelPredictions` (+ 옵션 `PatientReports`) | 필수 (multi-table join) | UI 확인 | BFF 권장. Live vs Persisted 모드 결정 필요 |
| `/patients/{id}/reports` | POST | 보고서 시점 동결 저장 | (옵션) | Report Handler | `PatientReports` | Persisted mode 선택 시 필수 | Docs 확인 / UI 근거 약함 | 현재 UI는 `GET /patients/{id}/report` 기반 Live 조립에 가까움. 실제 정책은 확인 필요 (§10 3번) |
| `/icus/{icuId}/staffing` | GET | ICU 인력/병상 스냅샷 | OverviewPage | ICU Status Handler | `IcuStaffing` | 선택 | UI 확인 | 응답 변환 거의 없음 |
| `/alerts` | GET | 알림 전체/필터 | AlertsPage | Alert API Handler | `Alerts` | 선택 (응답 가공) | UI 확인 | nested `patient` 복원 |
| `/alerts/count` | GET | 미확인 카운트 | AlertBell | Alert API Handler | `Alerts` (GSI1) | 선택 | UI 확인 | `Select=COUNT` |
| `/alerts/{id}/acknowledge` | POST | 알림 확인 처리 | AlertCard | Alert API Handler | `Alerts` | 필수 (권한 체크) | UI 확인 | `acknowledgedBy`는 Cognito sub |
| `/alerts/{id}/resolve` | POST | 알림 해소 처리 | (UI 미확인 — service에는 있음) | Alert API Handler | `Alerts` | UI 연결 시 필수 | Mock/Type 확인 / UI 근거 약함 | `resolveAlert` 서비스 함수만 존재. 현재 명확한 resolve 버튼/흐름이 없으면 acknowledge만 우선 구현 가능 |
| `/staff/departments` | GET | 부서 + 인원 트리 | ConsultRequestModal | Consultation Handler | `Departments`, `Staff` | 필수 (cross-table join) | UI 확인 | nested `members[]` 조립 |
| `/consultations` | GET | 협진 전체/환자별 | ConsultationsPage | Consultation Handler | `Consultations` | 선택 (응답 가공) | UI 확인 | GSI1 (환자별) / GSI2 (status) |
| `/consultations` | POST | 협진 생성 | ConsultRequestModal | Consultation Handler | `Consultations` | 필수 (validation, ID/시각/sub 부여) | UI 확인 | `recipients[]` 평탄화 시 별도 처리 |
| `/ai/insight` | POST | 모델×섹션 AI 설명 | AiInsightModal | Explanation Handler | `AiInsightsCache` | 필수 (Bedrock + PII 마스킹) | UI 확인 | 캐시 hit 우선 |
| `/ai/chat/intro` | POST | 채팅 인트로 메시지 | AiChatPanel | (해당 없음 또는 Explanation Handler) | (해당 없음) | 선택 (프론트 정적 처리 가능) | UI/Mock 확인 | 현재 mock 구현은 정적 템플릿 — patient 컨텍스트는 `안녕하세요. {patientId}...` 단순 끼워넣기, section 컨텍스트는 `aiInsights[model][section]`(이미 `/ai/insight` 응답)을 라벨 문구와 합성. Bedrock 호출 없이 클라이언트에서 구성 가능. **환자별 동적 인트로 생성 정책으로 바뀌면 필수로 승격** → 확인 필요 |
| `/ai/chat` | POST | 채팅 user→ai 응답 | AiChatPanel | Explanation Handler | `ChatMessages` | 필수 (Bedrock + PII 마스킹 + 영속화) | UI 확인 | stream(SSE) 옵션 |
| `/predictions/{id}` | POST | 재예측 강제 트리거 | (UI 없음 — 아키텍처 문서) | Prediction Orchestrator | `ModelPredictions` (write) | 필수 | UI 근거 없음 / 아키텍처 문서 기반 후보 | "새로고침" 버튼이 UI에 없음 |
| `/auth/login` | POST | Cognito 로그인 | LoginPage | (없음 또는 PreToken Lambda) | (없음 또는 `Staff`) | 비추천 (Cognito 직접) | 추정 | Cognito SDK 사용 가능 |

### API 후보 근거 보충 노트

각 API 후보의 근거를 1줄씩 정리. 근거 유형(UI/Service/Type/Mock/Schema)과 파일·함수명만 짧게 명시.

- `GET /patients`: UI: `pages/OverviewPage.tsx:106` / Service: `patientService.getPatients` / Type: `Patient[]` / Mock: `api/mock/patients.ts` / Schema: §4 Patients Scan 또는 GSI
- `GET /patients/{id}`: UI: `pages/PatientPage.tsx:33` (Promise.all 1건) / Service: `patientService.getPatientById` / Type: `Patient` / Mock: `api/mock/patients.ts` / Schema: §4 GetItem
- `GET /patients/{id}/vitals`: UI: `pages/PatientPage.tsx:34` → `components/common/VitalChart.tsx` / Service: `vitalService.getVitals` / Type: `VitalData` (`series + labs`) / Mock: `api/mock/vitals.ts` / Schema: §5 Vitals + §6 Labs join
- `GET /patients/{id}/sofa`: UI: `components/common/SofaPanel.tsx:62` (SOFA 탭 진입 시) / Service: `sofaService.getSofaTrend` / Type: `SofaTrend` / Mock: `api/mock/sofaScores.ts` / Schema: §8 SofaScores pivot
- `GET /patients/{id}/predictions`: UI: `pages/PatientPage.tsx:35` + `components/common/ModelDetailView.tsx`(prop 재사용) / Service: `modelService.getModelPredictions` / Type: `Record<ModelKey, ModelPrediction>` / Mock: `api/mock/models.ts` / Schema: §7 ModelPredictions Query 5 row
- `GET /patients/{id}/timeline`: UI: `pages/PatientPage.tsx:36` → `components/common/ClinicalTimeline.tsx`(PastList) / Service: `timelineService.getTimeline` / Type: `TimelineEvent[]` / Mock: `api/mock/timeline.ts`(`mockTimeline`) / Schema: §12
- `GET /patients/{id}/schedule`: UI: `pages/PatientPage.tsx:37` → `components/common/ClinicalTimeline.tsx`(UpcomingList) / Service: `timelineService.getSchedule` / Type: `ScheduledEvent[]` / Mock: `api/mock/timeline.ts`(`mockSchedule`) / Schema: §13 (테이블 충돌 — §8 누락/불일치 참조)
- `GET /patients/{id}/report`: UI: `pages/PatientPage.tsx:46`, `pages/ConsultationsPage.tsx:122-124` → `components/common/PatientReportModal.tsx` / Service: `reportService.getPatientReport`(조합형, `reportService.ts:69-76`에서 patient + Promise.all([vitals, predictions])) / Type: `PatientReport` / Mock 직접 없음 (조합 결과) / Schema: §4+§5+§6+§7 (+옵션 §18)
- `POST /patients/{id}/reports`: 보류 — Live 조립 흐름만 존재 (`reportService.getPatientReport`). `PatientReports` PutItem 호출 코드 없음. Schema: §18 정의 존재. Persisted mode 정책 미정 → DYNAMO_SCHEMA §20
- `GET /icus/{icuId}/staffing`: UI: `pages/OverviewPage.tsx:112` (Capacity 섹션 표시) / Service: `staffingService.getStaffing` / Type: `StaffingSnapshot` / Mock: `api/mock/staffing.ts` / Schema: §9 GetItem
- `GET /alerts`: UI: `pages/AlertsPage.tsx:36` (전체 fetch 후 클라이언트 필터) / Service: `alertService.getAlerts` / Type: `Alert[]` / Mock: `api/mock/alerts.ts`(`mockAlerts`) / Schema: §11 GSI1/GSI2
- `GET /alerts/count`: UI: `components/common/AlertBell.tsx:9` / Service: `alertService.getNewAlertCount` (현재 `number` 반환 — API는 `{ count }` wrap 권장) / Schema: §11 GSI1 `Select=COUNT`
- `POST /alerts/{id}/acknowledge`: UI: `pages/AlertsPage.tsx:43` (`handleAcknowledge`) → `components/alerts/AlertCard.tsx` "확인" 버튼 / Service: `alertService.acknowledgeAlert(id, by)` / Type: `Alert` / Schema: §11 UpdateItem
- `POST /alerts/{id}/resolve`: 보류 — Service: `alertService.resolveAlert:52` 함수는 존재. UI: `pages/AlertsPage.tsx`/`components/alerts/AlertCard.tsx`에 명시적 resolve 버튼 없음 (`AlertCard.visibleActions` 필터는 `acknowledge`만 노출, `Alert.actions` mock에도 `resolve` 액션 타입 등장하지 않음). UI 근거 약함
- `GET /staff/departments`: UI: `components/common/ConsultRequestModal.tsx:41` → `consult/DepartmentTree.tsx` / Service: `consultService.getDepartments` / Type: `Department[]`(`members` nested) / Mock: `api/mock/departments.ts` / Schema: §14 + §15 GSI1 cross-table join
- `GET /consultations`: UI: `pages/ConsultationsPage.tsx:117` / Service: `consultService.getConsultations(patientId?)` / Type: `ConsultationRequest[]` / Mock: `api/mock/consultations.ts` / Schema: §16 GSI1/GSI2
- `POST /consultations`: UI: `components/common/ConsultRequestModal.tsx:134-141` "협진 요청 전송" / Service: `consultService.createConsultation`(서버에서 `id`/`requestedBy`/`requestedAt`/`status='pending'` 부여) / Type: `ConsultationRequest` / Schema: §16 PutItem
- `POST /ai/insight`: UI: `components/common/ModelDetailView.tsx:61` (`getAiInsight(selectedModel, openSection)`) / Service: `aiInsightService.getAiInsight` (시그니처에 `patientId` 없음 — `patientId?` 필드는 정책 확정 시) / Mock: `api/mock/aiInsights.ts` 5×4 매트릭스 정적 / Schema: §10 AiInsightsCache
- `POST /ai/chat`: UI: `components/common/AiChatPanel.tsx:105` / Service: `aiInsightService.getChatResponse` (현재 stateless 랜덤 mock) / Mock: `api/mock/aiInsights.ts`(`PATIENT_CHAT_RESPONSES`/`SECTION_CHAT_RESPONSES` 풀) / Schema: §17 ChatMessages
- `POST /ai/chat/intro`: 옵션 — Service: `aiInsightService.getChatIntro:42` 구현 확인 결과 patient는 `buildPatientChatIntro(patientId)` 정적 템플릿, section은 `buildSectionChatIntro`가 `aiInsights[modelKey][section]`(이미 `/ai/insight`로 노출) + 라벨 합성. Bedrock 호출 불필요 → 프론트 정적 처리 가능
- `POST /predictions/{id}`: 보류 — UI에 재예측 버튼 없음 (`pages/PatientPage.tsx`/`components/common/ModelDetailView.tsx`/`ModelCard.tsx` 어디에도 트리거 없음). 정상 흐름은 §9 비동기 (Vitals/Labs DDB Stream → Trigger → Worker). 아키텍처 기반 후보
- `POST /auth/login`: 보류 — `pages/LoginPage.tsx`에 실제 API 호출 없음 (splash 후 `navigate('/')`만). Cognito Hosted UI/SDK 직접 사용 가능

---

## 6. Lambda 후보 목록

| Lambda 후보 | 주요 책임 | 연결 API | 접근 테이블/서비스 | 동기/비동기 | 필요한 이유 | 근거 수준 | 통합 가능성 |
|---|---|---|---|---|---|---|---|
| Patient Handler Lambda | 환자 목록/단건 조회, DDB row → `Patient` 변환 | `GET /patients`, `GET /patients/{id}` | `Patients` | 동기 | 필드 rename, `icuId` drop | UI 확인 | **유지** — 환자 조회의 중심 Handler. `ICU Status Handler` 책임을 흡수하는 통합 대상 |
| ICU Status Handler Lambda | ICU 운영 스냅샷 단건 조회 | `GET /icus/{icuId}/staffing` | `IcuStaffing` | 동기 | 단순 GetItem이지만 권한 체크/응답 형태 보장 | UI 확인 | **`Patient Handler`로 흡수 가능** (책임이 작아 별도 Lambda 운영 비용이 큼) |
| Vital Handler Lambda | Vitals + Labs 두 테이블 join, 시계열 → `VitalData` 집계 | `GET /patients/{id}/vitals` | `Vitals`, `Labs` | 동기 | multi-table join + pivot 필요 | UI 확인 | SOFA Handler와 통합 후보 (모두 시계열 조립) |
| SOFA Handler Lambda | SofaScores 시계열 → `SofaTrend` pivot, 결측 보존 | `GET /patients/{id}/sofa` | `SofaScores` | 동기 | row → organ-keyed pivot | UI 확인 | Vital Handler와 통합 후보 |
| Prediction Read Handler Lambda | 5 row → `Record<ModelKey, ModelPrediction>` reduce | `GET /patients/{id}/predictions` | `ModelPredictions` | 동기 | 5 row 조립, 메타 필드 drop | UI 확인 | 단독 유지 또는 `Patient Handler`에 흡수 가능. `ModelPredictions`는 비동기 흐름의 종착점이라 운영 분리 시 모니터링이 단순 — 정책 결정 필요 |
| Timeline Handler Lambda | 24h 과거 + 예정 이벤트 조회 | `GET /patients/{id}/timeline`, `GET /patients/{id}/schedule` | `ClinicalTimeline`, `ScheduledEvents` | 동기 | 두 테이블 모두 환자 단위 시간 Query | UI 확인 | 단독 유지 권장 (두 테이블 lifecycle 다름) |
| Report Handler Lambda | patient + vitals + labs + predictions 조합 (BFF) | `GET /patients/{id}/report`, (옵션) `POST /patients/{id}/reports` | `Patients`+`Vitals`+`Labs`+`ModelPredictions` (+ `PatientReports`) | 동기 | multi-service 조합, 보고서 동결 시 PutItem | UI 확인 | 분리 유지 권장 (책임 명확) |
| **Alert API Handler Lambda** | 알림 조회/카운트/ack (동기 API). resolve는 UI 연결 시 추가 | `GET /alerts`, `GET /alerts/count`, `POST /alerts/{id}/acknowledge` (그리고 UI 연결 시 `POST /alerts/{id}/resolve`) | `Alerts` (read + UpdateItem) | 동기 (API Gateway 트리거) | nested patient 복원, status 변경 권한 | UI 확인 + Docs 확인 | 코드 베이스는 Stream Handler와 한 패키지로 묶어도 무방. resolve는 service 함수만 존재 (§5 표 참조) |
| **Alert Stream Handler Lambda** | ModelPredictions DDB Stream 이벤트 → 알림 조건 평가 → `Alerts` PutItem + SNS 전송 | (없음 — 내부 비동기) | `ModelPredictions` (Stream read), `Alerts` (write), SNS | 비동기 (DDB Stream 트리거) | 임계치/등급 평가 + 알림 수신자 분배. API Handler와 IAM 범위·timeout·메모리 요구가 다름 | Docs 확인 | 코드 패키지는 공유 가능, Lambda 함수는 분리 권장 |
| Consultation Handler Lambda | 협진 조회/생성, 부서+인원 트리 조립 | `GET /staff/departments`, `GET /consultations`, `POST /consultations` | `Consultations`, `Departments`, `Staff` | 동기 | cross-table join (Departments+Staff), validation | UI 확인 | Departments 조회만 분리 가능하지만 통합 권장 (운영 단순) |
| Explanation Handler Lambda | Bedrock 호출, PII 마스킹, 캐시 hit/miss, 채팅 영속화 | `POST /ai/insight`, `POST /ai/chat` (그리고 정책 확정 시 `POST /ai/chat/intro`) | `AiInsightsCache`, `ChatMessages` | 동기 (옵션 stream) | PII 마스킹 + Bedrock 외부 호출 + 캐시 | UI 확인 + Docs 확인 | insight와 chat 책임이 비슷 — 통합 유지. 인트로는 현재 mock이 정적 템플릿이라 미포함 (§5 표 참조) |
| Prediction Orchestrator Lambda | 강제 재예측 (수동 트리거) | (UI 없음) `POST /predictions/{id}` | `ModelPredictions` (write), Vitals/Labs read | 동기 또는 SQS 위임 | SageMaker 호출, feature payload 생성 | UI 근거 없음 / 아키텍처 문서 기반 후보 | UI 트리거 없으면 운영용으로만 유지 |
| Prediction Trigger Lambda | DDB Stream → 재예측 조건 판단 → SQS push | (없음 — 내부) | `Vitals`, `Labs` Stream | 비동기 | Stream 이벤트 평가 | UI 근거 없음 / 아키텍처 문서 기반 후보 | 확정된 비동기 흐름 |
| Prediction Worker Lambda | SQS → 최신 window 재조회 → SageMaker → ModelPredictions write | (없음 — 내부) | `Vitals`, `Labs` (read), `ModelPredictions` (write), S3 (feature_schema) | 비동기 | SageMaker 호출, payload 생성 | UI 근거 없음 / 아키텍처 문서 기반 후보 | 확정된 비동기 흐름 |
| Stale Prediction Checker Lambda | 만료된 예측을 주기적 재실행 | (없음 — EventBridge cron) | `ModelPredictions` (scan/GSI), Prediction queue | 비동기 (스케줄) | 신선도 보장 | UI 근거 없음 / 아키텍처 문서 기반 후보 | 운영 후보. 비용/필요성 검토 |
| Ingestion Adapter Lambda | EMR/외부 → 내부 테이블 적재 | (없음 — 내부 ingest) | `Vitals`, `Labs`, `Patients`, `SofaScores` (write) | 비동기 또는 동기 | 외부 시스템 연결 | UI 근거 없음 / 아키텍처 문서 기반 후보 | 데이터 소스 확정 후 정의 |
| Handover Handler Lambda | 인계 노트 CRUD | (UI 미구현) | `HandoverNotes` (미설계) | 동기 | 인계 정보 영속화 | UI 기준 추가 확인 필요 | DYNAMO_SCHEMA §20 미정 |
| (옵션) PreToken Lambda Trigger | Cognito 로그인 시 staff 정보 토큰에 주입 | (Cognito 내부) | `Staff` | 동기 (Cognito Trigger) | 권한/역할 컨텍스트 주입 | 추정 | Cognito 도입 시 검토 |

### 통합/분리 권장 요약
- **통합 권장**:
  - `ICU Status Handler` → `Patient Handler`로 **흡수** (책임 작음, 단일 ICU 환경에서 분리 비용 큼).
    Patient Handler 자체는 유지하고 ICU Status의 책임만 가져온다.
  - `Vital Handler` ↔ `SOFA Handler` 통합 (둘 다 환자 단위 시계열 pivot 책임).
- **분리 권장**:
  - Report Handler — multi-service 조합 책임이 커서 별도 유지하면 다른 Lambda의 cold start
    영향을 받지 않음.
  - **Alert API Handler ↔ Alert Stream Handler**: 트리거 방식(API Gateway vs DDB Stream),
    IAM 권한 범위, timeout, 메모리 요구가 모두 다르므로 **두 Lambda로 분리**가 원칙. 다만 알림
    payload 가공·태그 산정 등의 공통 로직은 한 코드 패키지로 묶어 두 Lambda가 공유 가능.
  - Explanation Handler — Bedrock 호출 + PII 마스킹은 다른 Handler와 격리해야 보안·감사 단순.

### Lambda 후보 근거 보충 노트

각 Lambda 후보의 근거를 1줄씩 정리. 동기 API / 내부 비동기 / 확장-보류로 구분.

**동기 API Lambda** (API Gateway 트리거)

- **Patient Handler** (ICU Status 흡수): UI: `pages/OverviewPage.tsx:106/112`, `pages/PatientPage.tsx:33` / Service: `patientService.getPatients`, `getPatientById`, `staffingService.getStaffing` / Type: `Patient`, `StaffingSnapshot` / Schema: §4 Patients + §9 IcuStaffing
- **Vital/SOFA Handler** (통합): UI: `components/common/VitalChart.tsx`, `SofaPanel.tsx:62` / Service: `vitalService.getVitals`, `sofaService.getSofaTrend` / Type: `VitalData`, `SofaTrend` / Schema: §5 Vitals + §6 Labs + §8 SofaScores (모두 환자 단위 시계열 pivot)
- **Prediction Read Handler** (정책 결정 후 확정): UI: `pages/PatientPage.tsx:35` + `components/common/ModelDetailView.tsx`(prop 재사용) / Service: `modelService.getModelPredictions:65` (5 row reduce + fallback) / Type: `Record<ModelKey, ModelPrediction>` / Schema: §7 ModelPredictions
- **Timeline Handler**: UI: `components/common/ClinicalTimeline.tsx`(PastList + UpcomingList) / Service: `timelineService.getTimeline:16`, `getSchedule:24` / Type: `TimelineEvent[]`, `ScheduledEvent[]` / Schema: §12 + §13
- **Report Handler**: UI: `components/common/PatientReportModal.tsx` / Service: `reportService.getPatientReport:69` (조합형 — `reportService.ts:70-76`) / Type: `PatientReport` / Schema: §4+§5+§6+§7 (+옵션 §18)
- **Alert API Handler**: UI: `pages/AlertsPage.tsx:36/43` + `components/common/AlertBell.tsx:9` + `components/alerts/AlertCard.tsx`(handleAction에서 `escalate`는 `window.alert(...)` 더미) / Service: `alertService.getAlerts/getNewAlertCount/acknowledgeAlert` / Type: `Alert` / Schema: §11. **resolve는 `alertService.resolveAlert:52` 함수만 있고 UI 버튼 미확인 — 근거 약함**
- **Consultation Handler**: UI: `pages/ConsultationsPage.tsx:117`, `components/common/ConsultRequestModal.tsx:41/134-141` / Service: `consultService.getDepartments`, `getConsultations`, `createConsultation` / Type: `Department[]`, `ConsultationRequest` / Schema: §14+§15+§16
- **Explanation Handler**: UI: `components/common/AiInsightModal.tsx`, `AiChatPanel.tsx:71/105` / Service: `aiInsightService.getAiInsight/getChatResponse` (Bedrock 호출 자리) — `getChatIntro`는 정적 템플릿이라 미포함 / Type: 현재 `string` 반환 → API는 `{ text }` wrap / Schema: §10 AiInsightsCache + §17 ChatMessages

**내부 비동기 Lambda** (DDB Stream / SQS / EventBridge — API Gateway Route 아님)

- **Alert Stream Handler**: UI 직접 호출 없음. ModelPredictions DDB Stream → 알림 평가 → `Alerts` PutItem + SNS. Schema: §11 / 트리거 방식·IAM·timeout이 Alert API Handler와 달라 별도 Lambda
- **Prediction Trigger**: UI 직접 호출 없음. Vitals/Labs DDB Stream → 재예측 조건 판단 → SQS push
- **Prediction Worker**: UI 직접 호출 없음. SQS → 최신 window 재조회 → SageMaker → `ModelPredictions` write. 외부 의존: S3 (`feature_schema`/`normalization_stats`), SageMaker Endpoint
- **Stale Prediction Checker**: UI 직접 호출 없음. EventBridge cron → 신선도 평가 → 재예측 큐 push. 선택 도입
- **Ingestion Adapter**: UI 직접 호출 없음. 외부(EMR 등) → 내부 테이블 적재. 데이터 소스 확정 후

**확장/보류 Lambda**

- **Prediction Orchestrator** (보류): `POST /predictions/{id}` 운영용 Route 후보. UI에 재예측 버튼 없음 (`PatientPage.tsx`/`ModelDetailView.tsx`/`ModelCard.tsx` 확인). 정상 흐름은 §9 비동기로 처리됨
- **Handover Handler** (확장): Sidebar 라벨만 있고 라우트 없음 (`Sidebar.tsx`의 NAV_GROUPS에 "인계 노트" 항목, `to` 미정의 — `pages/*` 파일 없음). `HandoverNotes` 테이블 미설계 (DYNAMO_SCHEMA §20)
- **PreToken Lambda Trigger** (옵션): API Gateway Route Handler가 아님 — Cognito User Pool 내부 Trigger 후보 (AWS 공식 근거는 `docs/clinsight_api_gateway_routes.md` 부록 B 참조)

---

## 7. Lambda 필수 작업 vs 직접 서비스 호출 가능 작업

### 7.A Lambda가 필요한 작업

| 작업 | 이유 |
|---|---|
| `GET /patients/{id}/vitals` | Vitals + Labs 두 테이블 병렬 Query 후 `VitalData` 집계 |
| `GET /patients/{id}/sofa` | row 시계열 → 장기별 배열 pivot, 결측 보존 |
| `GET /patients/{id}/predictions` | 5 row reduce + 응답 변환 |
| `GET /patients/{id}/report` | 4개 도메인 데이터 조합 + (옵션) 보고서 동결 저장 |
| `GET /staff/departments` | Departments + Staff GSI cross-table join + nested 조립 |
| `POST /consultations` | ID/시각/Cognito sub/status 부여 + recipients 검증 |
| `POST /ai/insight`, `POST /ai/chat` | Bedrock 호출, PII 마스킹, 캐시 hit/miss, 채팅 영속화 (인트로는 정적 템플릿이라 제외) |
| `POST /alerts/{id}/acknowledge` | 권한/사용자 컨텍스트 + status 전이 검증 (UI 확인) |
| `POST /alerts/{id}/resolve` | 권한/사용자 컨텍스트 + status 전이 검증 — **UI 연결 시 필수** (현재 명확한 resolve 버튼/흐름 없음 — `resolveAlert` 서비스 함수만 존재) |
| `POST /predictions/{id}` (UI 미존재) | feature payload 생성 + SageMaker 호출 |
| Vitals/Labs DDB Stream → 재예측 트리거 | 조건 판단 후 SQS 메시지 생성 |
| ModelPredictions DDB Stream → Alerts | 임계치/등급 평가 후 Alerts row 생성 |

### 7.B Lambda 없이 직접 서비스 호출 가능성이 있는 작업

이 시스템은 환자 의료 데이터를 다루므로 **단순 GetItem이라도 권한 체크와 응답 가공을 위해 Lambda를
거치는 것이 더 안전**하다. 직접 통합 가능성은 다음과 같이 평가한다.

| 작업 | Lambda 필요 여부 | 이유 | 직접 서비스 호출 가능성 | 근거 수준 | 최종 권장 |
|---|---|---|---|---|---|
| `GET /icus/{icuId}/staffing` | 선택 | 단순 GetItem, 변환 거의 없음 | API GW → DDB 직접 가능 | UI 확인 | **Lambda 권장** — 사용자 권한 체크, 응답 형태 보장 |
| `GET /patients/{id}` | 선택 | rename + drop만 필요 | API GW → DDB GetItem 가능 | UI 확인 | **Lambda 권장** — PII 노출 통제, 응답 변환 |
| `GET /alerts/count?status=new` | 선택 | GSI Query `Select=COUNT` | API GW → DDB 직접 가능 | UI 확인 | **Lambda 권장** — 사용자별 ICU 필터, hot-path 최적화 가능 |
| `GET /patients/{id}/timeline` | 선택 | row → array 변환 | API GW → DDB 직접 가능 | UI 확인 | **Lambda 권장** — 응답 변환 + drop, 시간 표기 통일 |
| 인증 (`POST /auth/login`) | 비추천 | Cognito 자체 처리 가능 | Cognito Hosted UI / SDK 직접 | 추정 | **Cognito 직접 사용** + 필요 시 PreToken Trigger Lambda |
| SQS publish (재예측 트리거) | 필수 | 조건 판단 로직 | API GW → SQS 직접 불가 (조건 판단 필요) | Docs 확인 | Lambda 필수 |
| Step Functions 시작 | (해당 없음) | 현재 SF 사용 흐름 미확정 | — | — | — |

> **공통 원칙**: 의료정보 보호 및 감사 가능성 관점에서 모든 환자 데이터 access는 Lambda를 경유해
> (1) Cognito sub 기반 권한 체크 (2) 감사 로그 기록 (3) 응답 PII 가공이 가능하도록 한다.
> API Gateway → DDB 직접 integration은 비용·레이턴시 절감 효과가 크더라도 **이 시스템에서는 비추천**.
>
> 본 프로젝트는 MIMIC-IV 기반 교육·연구용 비식별 데이터를 다루므로 HIPAA 준수 대상으로 확정된
> 것은 아니지만, HIPAA 수준의 의료정보 보호 원칙을 참고해 설계한다.
>
> Cognito / PreToken Trigger / API Gateway Usage Plan / Lambda proxy response / Integration timeout
> 등 **AWS 공식 문서 기반 근거**는 [`docs/clinsight_api_gateway_routes.md`](./clinsight_api_gateway_routes.md)
> 부록 B 참조 (URL 포함).

---

## 8. DynamoDB 테이블 매핑

DYNAMO_SCHEMA.md `§2 전체 테이블 요약`에 정의된 15개 테이블 + 본 분석에서 확인 필요로 표기한 테이블.

> **주의**: 사용자 지시문에 제공된 "최대 15개 테이블 그룹화"에는 `ScheduledEvents`가 빠지고 `HandoverNotes`가
> 포함되어 있어, schema와 1:1로 일치하지 않는다. 본 표는 **DYNAMO_SCHEMA.md를 권위 있는 source로 간주**하고
> 정리한다. 자세한 충돌 분석은 아래 "누락/불일치 점검" 항목 참조.

| 테이블 | 읽는 Lambda/API | 쓰는 Lambda/API | 사용 화면 | 주요 Query 패턴 | 근거 수준 | 비고 |
|---|---|---|---|---|---|---|
| `Patients` | Patient Handler / `GET /patients`, `GET /patients/{id}` | Ingestion Adapter (write) | OverviewPage, PatientPage | Scan, GetItem, GSI risk |  UI 확인 + Docs 확인 | rename `patientId↔id` |
| `Vitals` | Vital Handler, Prediction Worker | Ingestion Adapter, EMR 수집 | VitalChart | `Query patientId, SK between` | UI 확인 + Docs 확인 | DDB Stream → Prediction Trigger |
| `Labs` | Vital Handler, Prediction Worker | Ingestion Adapter | VitalChart | `Query patientId, SK begins_with(time)` | UI 확인 + Docs 확인 | Vitals와 함께 join 응답 |
| `SofaScores` | SOFA Handler | Ingestion Adapter (또는 SOFA 계산 Lambda) | SofaPanel | `Query patientId, SK between` | UI 확인 + Docs 확인 | 결측 보존, pivot |
| `ModelPredictions` | Prediction Read Handler | Prediction Orchestrator, Prediction Worker | PatientPage, ModelDetailView | `Query patientId` (5 rows) | UI 확인 + Docs 확인 | Stream → Alert Handler |
| `IcuStaffing` | ICU Status Handler | (운영 페이지 미존재) | OverviewPage | `GetItem(icuId)` | UI 확인 + Docs 확인 | 단일 ICU 기준 |
| `ClinicalTimeline` | Timeline Handler | Ingestion Adapter (또는 이벤트 생성기) | PatientPage (ClinicalTimeline 컴포넌트) | `Query patientId` desc | UI 확인 + Docs 확인 | rename `eventId↔id`, drop sortKey |
| `ScheduledEvents` | Timeline Handler | (처방/오더 시스템 hook) | PatientPage (ClinicalTimeline 컴포넌트) | `Query patientId, SK > now, asc` | UI 확인 + Docs 확인 | 처방 변경 시 재계산 |
| `Alerts` | Alert API Handler | Alert Stream Handler (PutItem) | OverviewPage(AlertBell), AlertsPage | GSI1(status), GSI2(patientId) | UI 확인 + Docs 확인 | nested patient 복원 |
| `Departments` | Consultation Handler | (마스터 운영) | ConsultRequestModal | `Scan` | UI 확인 + Docs 확인 | 항목 적음 |
| `Staff` | Consultation Handler | (마스터 운영) | ConsultRequestModal | GSI1(`departmentId`) Query | UI 확인 + Docs 확인 | nested into Department |
| `Consultations` | Consultation Handler | Consultation Handler (PutItem) | ConsultationsPage, ConsultRequestModal | GSI1(patient), GSI2(status), PutItem | UI 확인 + Docs 확인 | recipients 검증 |
| `AiInsightsCache` | Explanation Handler | Explanation Handler (PutItem TTL) | AiInsightModal | `GetItem(insightKey)` | UI 확인 (간접) + Docs 확인 | 24h TTL |
| `ChatMessages` | Explanation Handler | Explanation Handler (PutItem) | AiChatPanel | `Query sessionId` (이력), PutItem | UI 확인 (간접) + Docs 확인 | sessionId 발급 결정 필요 |
| `PatientReports` | Report Handler (옵션) | Report Handler (옵션 PutItem) | PatientReportModal, ConsultationsPage | `Query patientId desc`, GetItem | Docs 확인 (UI는 Live mode) | 보고서 발행 정책 결정 필요 |
| `HandoverNotes` (미설계) | Handover Handler | Handover Handler | (Sidebar "인계 노트" — 라우트 없음) | (미정) | UI 기준 추가 확인 필요 | DYNAMO_SCHEMA §20 미정 |

### 누락/불일치 점검
- **`ScheduledEvents` vs 사용자 제공 15개 테이블 그룹** → `충돌/확인 필요`
  - **Schema 근거**: DYNAMO_SCHEMA.md §2 전체 테이블 요약에 `ScheduledEvents`가 **#10번 독립 테이블**로
    정의 (PK=`patientId`, SK=`scheduledTime`). §13에서 `ClinicalTimeline`(과거)과 분리한 근거도 명시
    (lifecycle·쿼리 방향·필드가 다름).
  - **UI 근거**: `components/common/ClinicalTimeline.tsx`(UpcomingList)에서 별도 prop `schedule`로
    소비. Service: `timelineService.getSchedule:24` 함수 존재. Type: `ScheduledEvent` (`types/index.ts`,
    `basis` 필드 — 과거 이벤트의 `severity`와 다름).
  - **충돌**: 사용자 지시문에 제공된 "최대 15개 테이블 그룹화"에는 `ScheduledEvents`가 빠져 있고 그 자리에
    `HandoverNotes`가 들어가 있음. 두 목록은 같은 15개를 가리키지 않음.
  - **본 문서 처리**: §3.3, §4, §5, §8, §11.1은 schema가 권위 있는 source라는 가정 하에 독립 테이블 +
    `Timeline Handler` 통합 운영으로 정리. 만약 그룹 목록이 옳다면 schema의 §13을 `ClinicalTimeline`에
    흡수하거나 `ScheduledEvents`를 정식 추가하는 결정 필요.
- **`HandoverNotes`** → `충돌/확인 필요`
  - **Schema 근거**: DYNAMO_SCHEMA.md §20 미정 항목 — "인계 노트 (Handoff Note): UI 명세는 있으나
    mock/타입 미구현. 별도 테이블 설계 필요"라고만 기재. 정식 테이블 정의 없음.
  - **UI 근거**: `components/layout/Sidebar.tsx`의 `NAV_GROUPS` 배열에 `{ icon: ClipboardList,
    label: '인계 노트' }` 항목 존재 (`to` 필드 미정의). `App.tsx` 라우트 등록 없음. `pages/*`에 페이지
    파일 없음. Service/Type/Mock도 모두 부재.
  - **결론**: 사용자 그룹화에는 포함되어 있으나, schema·UI·service 어디에도 실체가 없음. 우선순위 결정 필요.
- **`ChatMessages` PK 발급 주체** → `확인 필요`
  - **Schema 근거**: DYNAMO_SCHEMA §17에 `sessionId` 기반 PK 합성 규칙 `chat-{patientId}-{type}-{nanoId}`
    (또는 `chat-{patientId}-section-{modelKey}-{section}-{nanoId}`) 명시 — "세션 ID 생성 규칙은
    클라이언트가 채팅 패널 첫 진입 시 발급"이라고 한 줄 권고는 있으나 결정사항 아님.
  - **UI 근거**: `components/common/AiChatPanel.tsx`에 `sessionId` state·전송 코드 없음. Service:
    `aiInsightService.getChatResponse(context, message)` 시그니처에도 `sessionId` 파라미터 없음.
  - **결론**: 클라이언트 발급 vs 서버 발급 미정. 충돌 회피 위해 서버 발급 권장 (§10 5번 질문 참조).
- **`PatientReports` Live vs Persisted 모드** → `확인 필요`
  - **Schema 근거**: DYNAMO_SCHEMA.md §18에 `PatientReports` 테이블 정의 + Live mode / Persisted mode
    두 안 모두 허용. §20에서도 "보고서 생성 빈도(매 호출 vs '발행' 버튼)"는 미정으로 표기.
  - **UI/Service 근거**: 현재 `reportService.getPatientReport:69`는 매 호출마다 `getPatientById` +
    `Promise.all([getVitals, getModelPredictions])` 조합으로 즉석 생성 (`reportService.ts:70-76` 확인) —
    **Live 조립**에 가까움. `PatientReports` PutItem/GetItem 호출 코드 없음.
  - **결론**: Persisted mode 도입 여부 미정. 도입 시 Live와 Persisted 모드 동시 지원 또는 mode 선택 정책 필요.

---

## 9. 비동기 처리 후보

### 9.1 확정된 비동기 흐름 (아키텍처 컨텍스트)

| 비동기 흐름 | 트리거 | 사용 서비스 | 실행 Lambda | 필요한 이유 | 근거 수준 | 선택/필수 |
|---|---|---|---|---|---|---|
| Vitals/Labs 새 측정값 → 재예측 조건 평가 → SQS | DDB Stream (Vitals, Labs) | DDB Streams + SQS | Prediction Trigger Lambda | 매 측정마다 SageMaker 호출 방지, 조건 판단 | Docs 확인 | 필수 |
| SQS → 최신 window 재조회 → SageMaker → ModelPredictions write | SQS Prediction Queue | SQS, S3(feature_schema), SageMaker Endpoint | Prediction Worker Lambda | 무거운 호출, 동기 응답 불필요 | Docs 확인 | 필수 |
| ModelPredictions 저장 → 알림 평가 → Alerts write → SNS | DDB Stream (ModelPredictions) | DDB Streams + SNS | Alert Stream Handler Lambda | 임계치 평가 + 알림 수신자 분배 | Docs 확인 | 필수 |
| EventBridge cron → 만료된 예측 재실행 | EventBridge | EventBridge, SQS | Stale Prediction Checker Lambda | 신선도 보장 | Docs 확인 | 선택 |
| EMR/외부 → 내부 테이블 적재 | (외부 ingestion) | (외부) | Ingestion Adapter Lambda | 데이터 소스 통합 | Docs 확인 | 필수(데이터 소스 확정 후) |

### 9.2 UI 분석 결과 추가 비동기 후보 (UI 기반)

| 비동기 흐름 | 트리거 | 사용 서비스 | 실행 Lambda | 필요한 이유 | 근거 수준 | 선택/필수 |
|---|---|---|---|---|---|---|
| Alerts 변동 → 클라이언트 push (AlertBell 배지) | DDB Stream (Alerts) | API Gateway WebSocket 또는 SSE | Alert Push Lambda (옵션) | 폴링 회피, 실시간 배지 | UI 확인 (배지 갱신 필요)  | 선택 — 폴링으로 대체 가능 |
| 협진 생성 → 수신자 알림 (in-app/이메일 등) | DDB Stream (Consultations) | (미정) | Consultation Notify Lambda (옵션) | 수신자 inbox 갱신 | UI 기준 추가 확인 필요 | 선택 — 외부 채널은 본 분석에서 제외 |
| 채팅 메시지 영속화 (background write) | `POST /ai/chat` 응답 후 | (Lambda 내부) | Explanation Handler 내부 처리 | 응답 latency 최소화 | UI 확인 | 선택 — Bedrock 응답 후 동기 PutItem도 충분 |

> 외부 채널(Slack/Teams/이메일/SMS)은 본 분석 범위에서 제외 (사용자 지시).

### 비동기 흐름 근거 보충 노트

§9.1·§9.2의 각 흐름에 대해 근거를 1줄씩 정리. 새 후보를 추가하지 않고 기존 흐름의 근거만 명시.

**확정된 비동기 흐름** (§9.1)

- **Vitals/Labs Stream → Prediction Trigger**: UI 직접 호출 없음. DYNAMO_SCHEMA §5 Vitals, §6 Labs의 신규 측정값을 내부 트리거로 사용해 SQS Prediction Queue에 넣는 아키텍처 기반 흐름. API Gateway Route 아님.
- **SQS → Prediction Worker**: UI 직접 호출 없음. SQS 메시지를 받아 S3 `feature_schema`/`normalization_stats`와 SageMaker Endpoint를 사용하고, 결과를 DYNAMO_SCHEMA §7 ModelPredictions에 write하는 내부 처리. API Gateway Route 아님.
- **ModelPredictions Stream → Alert Stream Handler**: UI 직접 호출 없음. DYNAMO_SCHEMA §7 ModelPredictions 저장 이후 알림 조건을 평가해 §11 Alerts에 PutItem하는 내부 비동기 흐름. Alert API Handler와 분리 (§11.1·§11.2 참조).
- **EventBridge → Stale Prediction Checker**: UI 직접 호출 없음. ModelPredictions.updatedAt 기반 신선도 점검 후보. 선택 도입.
- **외부 ingestion → Ingestion Adapter**: UI 직접 호출 없음. EMR/외부 시스템에서 Patients/Vitals/Labs/SofaScores로 적재하는 내부 수집 후보. 데이터 소스 확정 후 정의.

**UI 기반 추가 비동기 후보** (§9.2)

- **Alerts 변동 → 클라이언트 push**: `components/common/AlertBell.tsx:9`의 배지 갱신 필요는 UI 근거가 있으나, 현재 AlertBell은 마운트 시 1회 `getNewAlertCount`만 호출하므로 폴링 또는 WebSocket/SSE 정책은 미정 (§10 8번 참조).
- **협진 생성 → 수신자 알림**: `components/common/ConsultRequestModal.tsx:134-141`의 `createConsultation` UI 근거는 있으나 수신자 inbox/push UI는 없음. 외부 채널은 분석 범위에서 제외.
- **채팅 메시지 영속화 background write**: `components/common/AiChatPanel.tsx:105`의 메시지 전송 UI 근거는 있으나 현재 `aiInsightService.getChatResponse:54`는 stateless mock. DYNAMO_SCHEMA §17 ChatMessages 영속화 방식은 백엔드 도입 시 결정 (§10 5번 sessionId 발급 주체와 함께).

---

## 10. 확정이 필요한 질문

UI/Mock/Docs 사이의 불일치 또는 미정 사항.

1. **아키텍처 reference 문서 위치**: `clinsight_complete_architecture_context_for_ai.md`가 레포에
   존재하지 않음. 본 분석은 사용자가 제공한 텍스트 + DYNAMO_SCHEMA.md만 사용. 실제 문서가 있다면
   별도 위치 확인 필요.
2. **HandoverNotes 테이블 설계**: 사용자가 제공한 테이블 그룹에는 포함, DYNAMO_SCHEMA.md에는 미설계,
   UI에도 라우트 미존재 → 우선순위 결정 필요.
3. **보고서 생성 정책**: Live mode (매 요청 시 조립) vs Persisted mode (`PatientReports` 동결 저장).
   DYNAMO_SCHEMA §20에서도 미정.
4. **AI Insight 캐시 키 단위**: `{model}#{section}` 단위 vs `{patientId}#{model}#{section}` 단위.
   환자 컨텍스트가 들어가면 캐시 hit율이 떨어지지만 정확도 향상.
5. **Chat sessionId 발급 주체**: 클라이언트 발급 vs 서버 발급. 클라이언트 발급 시 충돌 위험.
6. **재예측 강제 트리거 UI**: `POST /predictions/{id}`(Prediction Orchestrator)에 매핑되는 버튼이
   현재 UI에 없음. 필요한지 확정 필요.
7. **알림 "상급 보고" 액션의 실제 동작**: 현재 UI 더미(`window.alert('준비 중')`). endpoint 정의 없음.
   - 추정: 실제 기능 구현 시 `POST /alerts/{id}/escalate` → `Alert API Handler` 또는 별도
     `Escalation Handler Lambda` 검토 필요. 수신자/사유/우선순위 변경 정책 미정 → `확인 필요`.
8. **알림 실시간 push 방식**: 폴링 vs WebSocket vs SSE. 현재 `AlertBell`은 마운트 시 1회 fetch만
   수행 — 자동 갱신 정책 결정 필요.
9. **KPI 사전 집계 위치**: 클라이언트 합산 유지 vs Lambda에서 집계해 내려주기.
10. **Cognito 연동 시점**: `CURRENT_USER = '담당 의료진'` placeholder, `acknowledgedBy='Dr. 사용자'`
    하드코딩 — Cognito sub 매핑 필드(`Staff.cognitoSub` 등) 추가 필요.
11. **시간 표기 통일**: mock의 `"14:20"`, `"-6h"` 표시 문자열을 ISO 8601로 통일 후 프론트 포맷터로
    옮길지 결정 (DYNAMO_SCHEMA §20 미정).
12. **협진 메모(`ConsultationNotes`) 영속화**: 현재 모달 로컬 상태. 보고서에 함께 저장할지(Persisted
    mode), 별도 테이블로 분리할지.
13. **Sidebar 미라우팅 항목**(인계 노트 / 가이드라인 / 시스템 설정): 우선순위 및 페이지 구현 계획.
14. **`AlertBell.getNewAlertCount`와 `AlertsPage.getAlerts` 중복 호출**: 카운트 endpoint를 별도로
    유지할지, 페이지 fetch에 합칠지.

---

## 11. 최종 권장 Lambda 구성안

### 11.1 현재 UI 기준으로 우선 검토 가능한 동기 API Lambda

UI 호출, mock/type, docs 근거가 있어 우선 검토 대상이 되는 동기 API Lambda. 각 항목에는 다음 상태
중 하나를 표기한다.

- `유지 권장`: 단독 Lambda로 두는 편이 운영·책임 분리에 유리
- `통합 후보`: 다른 Lambda에 합쳐도 무방 (대상 명시)
- `분리 후보`: 코드 패키지는 공유 가능하지만 Lambda 함수는 분리 권장 (이유 명시)
- `정책 결정 후 확정`: 설계 선택지가 남아 있음 (필요한 결정 항목 명시)

| Lambda | 책임 범위 | 상태 | 근거 |
|---|---|---|---|
| **Patient Handler Lambda** | `GET /patients`, `GET /patients/{id}` | `유지 권장` — 환자 조회의 중심 Handler. 통합 시에는 흡수하는 쪽 (ICU Status를 가져옴) | `pages/OverviewPage.tsx:106` + `pages/PatientPage.tsx:33` UI / `patientService.getPatients`+`getPatientById` / `Patient` type / `Patients` schema §4. ICU Status 흡수: `staffingService.getStaffing` / `IcuStaffing` schema §9 |
| **ICU Status Handler Lambda** | `GET /icus/{icuId}/staffing` | `통합 후보` — `Patient Handler`로 **흡수** 가능 (단일 ICU 환경에서 책임이 작음) | `pages/OverviewPage.tsx:112` UI (Capacity 섹션) / `staffingService.getStaffing:16` / `StaffingSnapshot` type / `IcuStaffing` schema §9 GetItem |
| **Vital Handler Lambda** | `GET /patients/{id}/vitals` (Vitals + Labs join + 시계열 집계) | `통합 후보` — `SOFA Handler`와 같은 환자 단위 시계열 pivot 책임이라 통합 가능 | `components/common/VitalChart.tsx` UI / `vitalService.getVitals:17` / `VitalData = { series, labs }` type / Vitals §5 + Labs §6 두 테이블 join |
| **SOFA Handler Lambda** | `GET /patients/{id}/sofa` (장기별 pivot, 결측 보존) | `통합 후보` — `Vital Handler`와 통합 가능 | `components/common/SofaPanel.tsx:62` UI (SOFA 탭 진입 시) / `sofaService.getSofaTrend:17` / `SofaTrend = { times, scores }` type / `SofaScores` schema §8 |
| **Prediction Read Handler Lambda** | `GET /patients/{id}/predictions` (5 row reduce) | `정책 결정 후 확정` — `Patient Handler`에 흡수해도 무방하지만, `ModelPredictions`가 비동기 예측 흐름의 종착점이라 운영 분리 시 모니터링이 단순함. 단독 유지 vs 흡수 결정 필요 | `pages/PatientPage.tsx:35` UI + `components/common/ModelDetailView.tsx`(prop 재사용) / `modelService.getModelPredictions:65` (fallback 포함) / `Record<ModelKey, ModelPrediction>` type / `ModelPredictions` schema §7 |
| **Timeline Handler Lambda** | `GET /patients/{id}/timeline`, `GET /patients/{id}/schedule` | `유지 권장` — 두 테이블(`ClinicalTimeline`, `ScheduledEvents`) 모두 환자 단위 시간 Query, 책임 명확 | `pages/PatientPage.tsx:36-37` → `components/common/ClinicalTimeline.tsx` (PastList + UpcomingList) / `timelineService.getTimeline:16` + `getSchedule:24` / `TimelineEvent[]` + `ScheduledEvent[]` types / Schema §12 + §13 (단 §13 자체가 사용자 그룹 충돌 — §8 참조) |
| **Report Handler Lambda** | `GET /patients/{id}/report` (Live mode), 옵션 `POST /patients/{id}/reports` (Persisted) | `정책 결정 후 확정` — Live mode vs Persisted mode 결정 필요 (§10 3번). Persisted 채택 시 PutItem 추가 | `components/common/PatientReportModal.tsx` UI / `reportService.getPatientReport:69` (조합형 — `reportService.ts:70-76`에서 `getPatientById` + `Promise.all([getVitals, getModelPredictions])`) / `PatientReport` type / Schema §4+§5+§6+§7 (+옵션 §18) |
| **Alert API Handler Lambda** | `GET /alerts`, `GET /alerts/count`, `POST /alerts/{id}/acknowledge`, (UI 연결 시) `POST /alerts/{id}/resolve` | `분리 후보` — `Alert Stream Handler`(§11.2 참조)와 트리거/IAM/timeout이 달라 Lambda 함수는 분리, 코드 패키지는 공유 가능 | `pages/AlertsPage.tsx:36/43` + `components/common/AlertBell.tsx:9` + `components/alerts/AlertCard.tsx` UI / `alertService.getAlerts/getNewAlertCount/acknowledgeAlert` / `Alert` type / `Alerts` schema §11. **resolve는 `alertService.resolveAlert:52` 함수만 있고 UI 버튼 미확인 → 근거 약함** |
| **Consultation Handler Lambda** | `GET /staff/departments`, `GET /consultations`, `POST /consultations` | `유지 권장` — cross-table join (Departments+Staff)과 PutItem 책임이 단일 도메인에 모여 있음 | `pages/ConsultationsPage.tsx:117` + `components/common/ConsultRequestModal.tsx:41/134-141` UI / `consultService.getDepartments`/`getConsultations`/`createConsultation` / `Department[]`+`ConsultationRequest` types / Schema §14+§15 join + §16 PutItem |
| **Explanation Handler Lambda** | `POST /ai/insight`, `POST /ai/chat`, PII 마스킹, 캐시 + ChatMessages 영속화 | `유지 권장` — Bedrock 외부 호출 + PII 마스킹은 다른 Handler와 보안·감사 단위로 분리하는 편이 안전. 인트로는 정적 템플릿이라 제외 (§5 표 참조) | `components/common/ModelDetailView.tsx:61` + `AiChatPanel.tsx:71/105` UI / `aiInsightService.getAiInsight/getChatResponse` (Bedrock 호출 자리) — `getChatIntro`는 정적 템플릿이라 미포함 / Schema §10 AiInsightsCache + §17 ChatMessages |

### 11.2 아키텍처상 필요하지만 UI 근거가 약한 Lambda

현재 화면에서 직접 호출되지는 않지만, 백엔드 운영 흐름상 필요한 Lambda. 비동기/내부 트리거 위주.

| Lambda | 책임 범위 | 근거 |
|---|---|---|
| **Alert Stream Handler Lambda** | ModelPredictions DDB Stream → 알림 조건 평가 → `Alerts` PutItem + SNS 전송 | UI 직접 호출 없음. 확정된 비동기 흐름 — `ModelPredictions` schema §7 Stream → `Alerts` schema §11 PutItem. API Gateway Route 아님. `Alert API Handler`와 트리거·IAM·timeout 달라 별도 Lambda |
| **Prediction Orchestrator Lambda** | 강제 재예측 (`POST /predictions/{id}` 또는 운영 트리거) | UI 근거 없음 — `pages/PatientPage.tsx`/`components/common/ModelDetailView.tsx`/`ModelCard.tsx` 확인 결과 재예측 버튼 없음. 아키텍처 기반 후보 — 운영용/보류 |
| **Prediction Trigger Lambda** | Vitals/Labs DDB Stream → 재예측 조건 판단 → SQS push | UI 직접 호출 없음. 확정된 비동기 흐름 — `Vitals`/`Labs` schema §5/§6 Stream → SQS Prediction Queue. API Gateway Route 아님 |
| **Prediction Worker Lambda** | SQS → SageMaker → ModelPredictions write | UI 직접 호출 없음. SQS → 외부 의존(S3 `feature_schema`/`normalization_stats`, SageMaker Endpoint) → `ModelPredictions` schema §7 write. API Gateway Route 아님 |
| **Stale Prediction Checker Lambda** | EventBridge cron → 신선도 평가 → 재예측 큐 push | UI 직접 호출 없음. EventBridge 스케줄 기반 — `ModelPredictions.updatedAt` 기준 신선도 평가 후 SQS push. 선택 도입 |
| **Ingestion Adapter Lambda** | EMR/외부 → 내부 테이블 적재 | UI 직접 호출 없음. 외부 데이터 소스 확정 후 정의 — `Vitals`/`Labs`/`Patients`/`SofaScores` write. API Gateway Route 아님 |

### 11.3 확장 후보 Lambda

현재 당장 필수는 아니지만 기능 확장 시 분리할 수 있는 Lambda.

| Lambda | 책임 범위 | 근거 |
|---|---|---|
| **Handover Handler Lambda** | 인계 노트 CRUD | `components/layout/Sidebar.tsx` `NAV_GROUPS`에 "인계 노트" 라벨만 있고 `to` 미정의. `App.tsx`/`pages/*` 라우트·페이지 없음. Service/Type/Mock 부재. `HandoverNotes` 테이블도 schema 미설계 (DYNAMO_SCHEMA §20) |
| **Alert Push Lambda** (옵션) | Alerts DDB Stream → WebSocket/SSE push | 현재 `AlertBell.tsx:9`는 마운트 시 1회 fetch만 — 자동 갱신 없음. 실시간 요구 명확해질 때 분리 |
| **Consultation Notify Lambda** (옵션) | 협진 생성 → 수신자 inbox 알림 | 외부 채널은 본 분석 범위 제외 (사용자 지시). in-app 수신자 inbox UI 미존재 — 정책 확정 시 |
| **Cognito PreToken Lambda Trigger** | 로그인 시 staff 정보를 토큰에 주입 | API Gateway Route Handler가 아님 — Cognito User Pool 내부 Trigger 후보. AWS 공식 근거는 `docs/clinsight_api_gateway_routes.md` 부록 B 참조 |
| **Report Note Handler Lambda** (옵션) | `ConsultationNotes`(보고서 메모) 영속화 | `components/common/report/ConsultationNotes.tsx`의 `useState<ConsultationNote[]>([])` 로컬 상태만 존재 — 영속화 endpoint·schema 미연결 |

---

## 부록 — 통합 ClinSight 아키텍처 관점에서의 정리

- **현재 UI 코드는 services 함수 레이어로 깔끔하게 추상화**되어 있어, 백엔드 도입 시 mock import만
  fetch 호출로 교체하면 즉시 통합 가능 (`src/api/client.ts` 참조).
- **응답 타입은 `src/types/index.ts`가 단일 source**. Lambda는 DDB row → 프론트 타입으로 조립하는
  변환 계층 책임을 일관되게 가져간다 (DYNAMO_SCHEMA §1 참조).
- **단일 ICU 환경 가정**: GSI hot partition 위험은 상대적으로 작으나, 멀티 ICU 확장 시
  DYNAMO_SCHEMA §4·§11·§16의 합성 PK 개선 대안 적용을 검토.
- **의료정보 보호 및 감사 가능성 원칙**: 모든 환자 데이터 access는 Lambda를 경유한다.
  API Gateway → DDB 직접 integration은 비추천. 본 프로젝트는 MIMIC-IV 기반 비식별 데이터를
  다루므로 HIPAA 준수 대상으로 확정된 것은 아니지만, HIPAA 수준의 보호 원칙을 참고해 설계한다.
- **변경 범위**: 본 분석은 문서 생성만 수행. 코드/기존 docs/schema 변경 없음.
