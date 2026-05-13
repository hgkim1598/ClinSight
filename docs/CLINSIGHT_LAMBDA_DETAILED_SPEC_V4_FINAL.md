# ClinSight Lambda 상세 명세서

## 1. 문서 기준

이 문서는 공유된 아키텍처의 최종 기본 구성을 기준으로 Lambda를 정리한 명세서이다.

| 항목 | 기준 |
|---|---|
| API 진입 | Private REST API Gateway |
| 인증 | Cognito 기반 JWT, 실제 운영 시 병원 IdP 연동 가능 |
| 운영 DB | Aurora PostgreSQL 1개 DB + 14개 핵심 테이블 + View/Materialized View |
| 이벤트 처리 | SQS + EventBridge + 애플리케이션 레벨 이벤트 발행 |
| 예측 처리 | EMR Agent 데이터 수집 후 비동기로 예측 계산, 대시보드는 저장된 최신 예측 조회 |
| AI 설명 | Bedrock Runtime 기반 SHAP 자연어 설명 |
| AI 채팅 | Bedrock Runtime 기반 세션형 챗봇 |
| RAG / Knowledge Base | 적용 시 `AiChatLambda`에서 KB 검색 결과를 prompt context에 추가하는 구조로 확장한다. vector store는 Aurora PostgreSQL pgvector 또는 S3 Vectors를 후보로 검토 중이다. |
| DynamoDB | 기본 구성에서 제외 |

## 2. Lambda 전체 구성

현재 아키텍처 기준 Lambda는 총 22개다.

| 구분 | 개수 | 성격 |
|---|---:|---|
| 동기 API Lambda | 11개 | 프론트엔드 또는 EMR Agent의 API 요청에 즉시 응답하는 Lambda |
| 비동기 Lambda | 11개 | SQS, EventBridge, 내부 이벤트를 기반으로 후처리하는 Lambda |
| 총합 | 22개 | 현재 아키텍처 최종 기준 |

## 3. Lambda 설계 원칙

| 원칙 | 내용 |
|---|---|
| API와 내부 처리 분리 | 사용자 화면 응답과 시스템 내부 후처리는 timeout, 재시도, IAM 권한이 다르므로 분리한다. |
| Aurora 중심 | 환자, ICU stay, 임상 수치, 예측, 알림, 협진, AI interaction은 Aurora 중심으로 관리한다. |
| DynamoDB Streams 제거 | 기본 구성은 Aurora 중심이므로 DynamoDB Streams는 사용하지 않는다. |
| SQS 기반 재시도 | 예측, 알림, 감사 로그처럼 실패 재처리가 필요한 작업은 SQS와 DLQ를 사용한다. |
| SageMaker 호출 제한 | 모델 추론은 기본적으로 `PredictionWorkerLambda`에서만 수행한다. |
| Bedrock 호출 제한 | Bedrock Runtime 호출은 `AiInsightLambda`, `AiChatLambda`에서만 수행한다. |
| S3 pointer 저장 | 큰 파일, 보고서, SHAP detail, feature snapshot은 S3에 저장하고 Aurora에는 URI pointer를 저장한다. |
| 최소 권한 | Lambda별 DB user와 IAM policy를 분리한다. |
| PHI 로그 금지 | CloudWatch, S3 LLM log, audit log에는 직접 식별정보를 남기지 않는다. |
| 안전 문구 유지 | AI 응답에는 최종 진단/처방이 아니라는 안전 문구를 포함한다. |

## 4. 공통 모듈

여러 Lambda가 반복해서 쓰는 기능은 공통 모듈로 분리한다.

| 공통 모듈 | 주요 함수 | 사용 Lambda |
|---|---|---|
| `db_client` | `get_connection()`, `execute_query()`, `execute_transaction()` | DB 접근 Lambda 전체 |
| `auth_context` | `extract_user_context()`, `require_permission()`, `get_staff_context()` | 동기 API Lambda |
| `response_builder` | `ok(data)`, `error(code, message)`, `validation_error()` | 동기 API Lambda |
| `audit_event` | `build_audit_event()`, `enqueue_audit_log()` | 쓰기 작업이 있는 Lambda |
| `sqs_client` | `send_message()`, `send_fifo_message()`, `send_batch()` | Queue 발행 Lambda |
| `s3_client` | `read_json()`, `write_json()`, `generate_presigned_url()` | Report, Prediction, AI Lambda |
| `bedrock_client` | `invoke_model()`, `build_guardrail_config()`, `parse_model_output()` | AiInsight, AiChat |
| `safety_policy` | `build_system_instruction()`, `check_forbidden_phrases()`, `append_clinician_review_note()` | AiInsight, AiChat |
| `idempotency` | `make_key()`, `check_duplicate()`, `record_processed()` | Ingestion, Prediction, Report |
| `time_utils` | `parse_iso8601_with_offset()`, `to_utc()`, `format_for_response()` | Ingestion, Timeline, Report |
| `clinical_units` | `normalize_metric_code()`, `normalize_unit()`, `validate_value()` | Ingestion, ClinicalData |
| `feature_builder` | `load_feature_schema()`, `build_feature_window()`, `validate_model_input()` | PredictionWorker |

## 5. 공통 환경변수

| 환경변수 | 설명 | 사용 Lambda |
|---|---|---|
| `AWS_REGION` | 기본 리전. 현재 기준 `ap-northeast-2` | 전체 |
| `DB_SECRET_ARN` | Aurora 접속 정보 Secret ARN | DB 접근 Lambda |
| `DB_PROXY_ENDPOINT` | RDS Proxy 사용 시 endpoint | DB 접근 Lambda |
| `S3_MODEL_BUCKET` | 모델 artifact/schema bucket | AppContext, PredictionWorker |
| `S3_DATA_BUCKET` | feature snapshot, SHAP detail 저장 | PredictionWorker, Report, AI Lambda |
| `S3_REPORT_BUCKET` | 보고서 파일 저장 | ReportLambda |
| `S3_AUDIT_BUCKET` | 감사 로그 archive 저장 | AuditLogWriter |
| `S3_LLM_LOG_BUCKET` | LLM prompt/output archive | AiInsight, AiChat |
| `BEDROCK_MODEL_ID` | Bedrock Runtime model ID | AiInsight, AiChat |
| `BEDROCK_GUARDRAIL_ID` | Guardrails ID | AiInsight, AiChat |
| `BEDROCK_GUARDRAIL_VERSION` | Guardrails version | AiInsight, AiChat |
| `PREDICTION_QUEUE_URL` | 예측 작업 queue URL | PredictionTrigger, FreshnessChecker |
| `ALERT_QUEUE_URL` | 알림 평가 queue URL | PredictionWorker, AlertEvaluator |
| `NOTIFICATION_QUEUE_URL` | 알림 전달 queue URL | AlertEvaluator, ConsultationEvent |
| `SNAPSHOT_QUEUE_URL` | 대시보드 snapshot/MV 갱신 queue URL | Ingestion, PredictionWorker, AlertEvaluator |
| `AUDIT_QUEUE_URL` | 감사 로그 queue URL | 쓰기 Lambda 전체 |

---

# 6. 동기 API Lambda 상세 명세

## 6.1 AppContextLambda

### 역할

앱 진입 시 필요한 사용자 context, 지표 정의, 모델 목록을 제공한다. 프론트엔드가 사용자 권한, 화면 표시명, metric 단위, 모델 카드 구성을 결정할 수 있게 한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /me` | 로그인 후 앱 진입 시 |
| `GET /meta/metrics` | vital/lab/SOFA/derived metric 표시명과 단위가 필요할 때 |
| `GET /meta/models` | 예측 카드, 모델 필터, 모델 설명 화면을 구성할 때 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `handle(event)` | API Gateway event를 path/method 기준으로 분기 |
| `get_current_user(claims)` | JWT claims에서 사용자 식별자 추출 |
| `fetch_staff_context(staff_id)` | `staff_users`에서 사용자 role, 부서, 권한 조회 |
| `fetch_metric_definitions()` | `config_items(config_type='metric_definition')` 조회 |
| `fetch_active_models()` | `model_registry`에서 active model 조회 |
| `load_feature_schema(uri)` | S3 feature schema 파일 조회 |
| `build_me_response()` | `/me` 응답 구성 |
| `build_meta_metrics_response()` | `/meta/metrics` 응답 구성 |
| `build_meta_models_response()` | `/meta/models` 응답 구성 |

### 연결

```text
Frontend
→ Private API Gateway
→ AppContextLambda
→ Aurora staff_users / config_items / model_registry
→ S3 feature schema
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `staff_users` |
| Read | `config_items` |
| Read | `model_registry` |
| Read | S3 feature schema |
| Write | 없음 |

---

## 6.2 DashboardLambda

### 역할

ICU 대시보드 화면에 필요한 환자 목록, 최신 위험도, 최근 SOFA, alert 요약, 병상 정보를 조회한다. 대시보드 조회 시 SageMaker를 호출하지 않고 Aurora에 저장된 최신 결과만 읽는다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /dashboard/icu/{icuId}` | ICU 대시보드 진입/새로고침 |
| `GET /dashboard/icu/{icuId}/staffing` | ICU 인력/배정 요약 카드 조회 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_dashboard_query(event)` | ICU ID, 필터, 정렬, pagination 파싱 |
| `authorize_icu_access(user_context, icu_id)` | 사용자의 ICU 접근 권한 확인 |
| `fetch_dashboard_rows(icu_id, filters)` | `mv_active_patient_dashboard` 조회 |
| `fetch_latest_prediction_summary(stay_tokens)` | 필요 시 `mv_latest_predictions` 보강 조회 |
| `fetch_staffing_summary(icu_id)` | `staff_users`, `icu_stays` 기반 인력/배정 요약 조회 |
| `map_dashboard_row(row)` | 프론트 카드 데이터로 변환 |
| `build_response(rows, pagination)` | 최종 응답 생성 |

### 연결

```text
Frontend
→ GET /dashboard/icu/{icuId}
→ DashboardLambda
→ Aurora mv_active_patient_dashboard / mv_latest_predictions / icu_stays / staff_users
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `mv_active_patient_dashboard` |
| Read | `mv_latest_predictions` |
| Read | `icu_stays` |
| Read | `staff_users` |
| Write | 없음 |

---

## 6.3 PatientDetailLambda

### 역할

환자 상세 화면의 헤더 영역을 조회한다. 환자 token, ICU stay 정보, 현재 병상, 입실 시각, 주요 진단명, 상태, 나이/성별 등 기본 정보를 제공한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /icu-stays/{stayId}` | 환자 상세 화면 진입 시 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_stay_id(event)` | path parameter에서 stay ID 추출 |
| `authorize_stay_access(user_context, stay_id)` | 환자 상세 접근 권한 확인 |
| `fetch_stay_header(stay_id)` | `icu_stays`와 `patients` join 조회 |
| `fetch_current_alert_summary(stay_id)` | 현재 active/acknowledged alert 요약 |
| `fetch_latest_prediction_badges(stay_id)` | 모델별 최신 위험도 badge 조회 |
| `build_patient_header_response()` | 환자 상세 헤더 응답 구성 |

### 연결

```text
Frontend
→ GET /icu-stays/{stayId}
→ PatientDetailLambda
→ Aurora patients / icu_stays / model_predictions / alerts
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `patients` |
| Read | `icu_stays` |
| Read | `model_predictions` |
| Read | `alerts` |
| Write | 없음 |

---

## 6.4 ClinicalDataLambda

### 역할

환자 상세 화면의 vital, lab, derived metric, SOFA trend를 조회한다. `clinical_observations` 단일 테이블에서 metric group/code 기준으로 데이터를 필터링해 반환한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /icu-stays/{stayId}/clinical-data` | 환자 상세의 vital/lab trend 조회 |
| `GET /icu-stays/{stayId}/sofa` | SOFA trend 카드 조회 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_clinical_query(event)` | metric group, 기간, limit 파싱 |
| `fetch_observations(stay_id, filters)` | vital/lab/derived metric 조회 |
| `fetch_sofa_trend(stay_id, range)` | `metric_group='sofa'` 조회 |
| `group_by_metric(rows)` | metric_code별 series 구성 |
| `attach_metric_definition(rows)` | `config_items`의 표시명/단위 연결 |
| `build_clinical_response()` | chart/table용 응답 구성 |

### 연결

```text
Frontend
→ ClinicalDataLambda
→ Aurora clinical_observations / config_items
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `clinical_observations` |
| Read | `config_items` |
| Write | 없음 |

---

## 6.5 PredictionReadLambda

### 역할

모델 예측 결과를 읽는다. 대시보드/환자 상세/모델 상세 화면에서 최신 예측, 특정 모델 예측, 예측 이력을 제공한다. SHAP detail이 S3에 저장된 경우 URI를 통해 필요한 요약만 읽어올 수 있다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /icu-stays/{stayId}/predictions` | 환자별 최신 예측 전체 조회 |
| `GET /icu-stays/{stayId}/predictions/{modelKey}` | 특정 모델 최신 예측 조회 |
| `GET /icu-stays/{stayId}/predictions/{modelKey}/history` | 특정 모델 예측 이력 조회 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_prediction_query(event)` | stayId, modelKey, history range 파싱 |
| `fetch_latest_predictions(stay_id)` | 환자별 최신 예측 조회 |
| `fetch_latest_prediction_by_model(stay_id, model_key)` | 특정 모델 최신 예측 조회 |
| `fetch_prediction_history(stay_id, model_key, range)` | 예측 이력 조회 |
| `load_shap_detail_if_needed(s3_uri)` | S3 SHAP detail 선택 조회 |
| `map_prediction_response(row)` | 위험도, threshold, SHAP summary 변환 |

### 연결

```text
Frontend
→ PredictionReadLambda
→ Aurora model_predictions / model_registry
→ S3 shap-details 선택 조회
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `model_predictions` |
| Read | `model_registry` |
| Read | S3 SHAP detail 선택 |
| Write | 없음 |

---

## 6.6 TimelineLambda

### 역할

환자 상세의 타임라인과 예정 이벤트를 조회한다. 임상 수치, 예측 결과, 알림, 오더/스케줄성 이벤트를 시간순으로 보여준다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /icu-stays/{stayId}/timeline` | 환자 상세 타임라인 조회 |
| `GET /icu-stays/{stayId}/schedule` | 예정 이벤트/오더 기반 일정 조회 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_timeline_query(event)` | 기간, event type, pagination 파싱 |
| `fetch_timeline(stay_id, filters)` | `v_clinical_timeline` 조회 |
| `fetch_schedule(stay_id, filters)` | `clinical_events(event_type='scheduled')` 조회 |
| `normalize_timeline_event(row)` | 이벤트 표시용 구조로 변환 |
| `build_timeline_response()` | 시간순 응답 생성 |

### 연결

```text
Frontend
→ TimelineLambda
→ Aurora v_clinical_timeline / clinical_events
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `v_clinical_timeline` |
| Read | `clinical_events` |
| Write | 없음 |

---

## 6.7 ReportLambda

### 역할

환자 보고서를 생성하고 조회한다. 보고서 생성 시 현재 환자 상태, 임상 수치 요약, 예측 결과, 알림, AI 설명 결과를 snapshot으로 묶어 S3에 저장하고 Aurora에는 메타데이터와 URI pointer를 저장한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /icu-stays/{stayId}/report/latest` | 최신 저장 보고서 조회 |
| `POST /icu-stays/{stayId}/reports` | 보고서 생성/저장 |
| `GET /icu-stays/{stayId}/reports/{reportId}` | 특정 보고서 조회 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_report_request(event)` | stayId, reportId, format, include 옵션 파싱 |
| `fetch_latest_report(stay_id)` | 최신 보고서 메타데이터 조회 |
| `fetch_report(report_id)` | 특정 보고서 조회 |
| `collect_report_snapshot(stay_id)` | 환자 헤더, clinical summary, prediction, alert 조회 |
| `render_report_html(snapshot)` | HTML 보고서 생성 |
| `render_report_pdf(html)` | PDF 생성이 필요한 경우 사용 |
| `write_report_to_s3(content, format)` | S3 저장 |
| `insert_patient_report(metadata)` | `patient_reports` 저장 |
| `generate_download_url(s3_uri)` | presigned URL 또는 download proxy용 정보 생성 |
| `enqueue_audit_log()` | 보고서 생성/조회 감사 로그 발행 |

### 연결

```text
Frontend
→ ReportLambda
→ Aurora patients / icu_stays / clinical_observations / model_predictions / alerts / patient_reports
→ S3 reports
→ AuditQueue
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `patients`, `icu_stays`, `clinical_observations`, `model_predictions`, `alerts` |
| Read/Write | `patient_reports` |
| Write | S3 reports |
| Write | AuditQueue |

---

## 6.8 ConsultationLambda

### 역할

협진 기능을 처리한다. 부서/의료진 목록 조회, 협진 생성, 받은 협진, 협진 상세, 협진 상태 변경을 담당한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /staff/departments` | 협진 생성 화면에서 부서 목록 조회 |
| `GET /staff` | 협진 수신 의료진 목록 조회 |
| `GET /consultations` | 협진 목록 조회 |
| `GET /consultations/inbox` | 받은 협진 조회 |
| `GET /consultations/{consultationId}` | 협진 상세 조회 |
| `POST /consultations` | 협진 생성 |
| `PATCH /consultations/{consultationId}/status` | 협진 상태 변경 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `fetch_departments()` | `config_items(config_type='department')` 조회 |
| `fetch_staff_list(filters)` | `staff_users` 조회 |
| `fetch_consultations(filters)` | 협진 목록 조회 |
| `fetch_consultation_detail(id)` | 협진 상세 조회 |
| `validate_consultation_request(body)` | 협진 생성 request 검증 |
| `create_consultation(body, user_context)` | `consultations` insert |
| `update_consultation_status(id, status)` | 상태 변경 |
| `publish_consultation_event(event)` | EventBridge 또는 NotificationQueue 발행 |
| `enqueue_audit_log()` | 감사 로그 발행 |

### 연결

```text
Frontend
→ ConsultationLambda
→ Aurora config_items / staff_users / consultations / patient_reports
→ EventBridge ConsultationCreated 또는 NotificationQueue
→ AuditQueue
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `config_items`, `staff_users`, `consultations`, `patient_reports` |
| Write | `consultations` |
| Write | EventBridge 또는 NotificationQueue |
| Write | AuditQueue |

---

## 6.9 AlertApiLambda

### 역할

의료진 화면에서 알림을 조회하고 상태를 변경한다. 알림 발생 자체는 `AlertEvaluatorLambda`가 담당하고, 이 Lambda는 사용자가 보는 알림 API를 담당한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `GET /alerts` | 현재 사용자 알림 목록 조회 |
| `GET /alerts/count` | 알림 배지 count 조회 |
| `GET /icu-stays/{stayId}/alerts` | 환자별 알림 조회 |
| `POST /alerts/{alertId}/read` | 알림 읽음 처리 |
| `POST /alerts/{alertId}/acknowledge` | 알림 확인 처리 |
| `POST /alerts/{alertId}/resolve` | 알림 해소 처리 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `fetch_user_alerts(staff_id, filters)` | `notification_deliveries` 중심 사용자 알림 조회 |
| `fetch_alert_count(staff_id)` | unread count 조회 |
| `fetch_stay_alerts(stay_id)` | 환자별 alert 조회 |
| `mark_read(alert_id, staff_id)` | 사용자별 읽음 처리 |
| `acknowledge_alert(alert_id, staff_id)` | alert 확인 처리 |
| `resolve_alert(alert_id, staff_id)` | alert 해소 처리 |
| `validate_alert_permission()` | 알림 처리 권한 확인 |
| `enqueue_audit_log()` | 상태 변경 감사 로그 발행 |

### 연결

```text
Frontend
→ AlertApiLambda
→ Aurora alerts / notification_deliveries / model_predictions
→ AuditQueue
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `alerts`, `notification_deliveries`, `model_predictions` |
| Write | `alerts`, `notification_deliveries` |
| Write | AuditQueue |

---

## 6.10 AiInsightLambda

### 역할

프론트의 AI 설명 버튼 요청을 처리한다. 모델 예측값, SHAP top features, 환자 context를 조회한 뒤 Bedrock Runtime으로 의료진용 자연어 설명을 생성한다. 같은 예측에 대한 설명이 이미 존재하면 cache를 우선 사용한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `POST /ai/insights` | 예측 카드 또는 모델 상세 화면에서 AI 설명 버튼 클릭 |

### 입력 예시

~~~json
{
  "stayToken": "stay_001",
  "predictionId": "pred_001",
  "modelKey": "mortality_48h",
  "forceRefresh": false
}
~~~

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_ai_insight_request(event)` | stayToken, predictionId, modelKey, forceRefresh 파싱 |
| `authorize_ai_access(user_context, stay_token)` | 환자 AI 설명 접근 권한 확인 |
| `find_cached_insight(prediction_id, model_key)` | `ai_interactions`에서 기존 설명 조회 |
| `fetch_prediction_context(prediction_id, model_key)` | `model_predictions`, `model_registry` 조회 |
| `fetch_patient_clinical_context(stay_token)` | 최근 vital/lab/SOFA/alert context 조회 |
| `load_shap_detail_if_needed(s3_uri)` | S3 SHAP detail 선택 조회 |
| `build_insight_prompt(context)` | SHAP + 환자 context 기반 prompt 생성 |
| `mask_prompt_context(prompt)` | 직접 식별정보가 섞이지 않도록 선마스킹 |
| `invoke_bedrock_for_insight(prompt)` | Bedrock Runtime 호출 |
| `apply_safety_postprocess(output)` | 금지 표현 점검, 안전 문구 보강 |
| `save_ai_interaction()` | `ai_interactions(interaction_type='insight_cache')` 저장 |
| `write_llm_audit_log_if_enabled()` | S3 LLM log 선택 저장 |
| `build_insight_response()` | 프론트 응답 구성 |

### 연결

```text
Frontend
→ POST /ai/insights
→ AiInsightLambda
→ Aurora model_predictions / model_registry / clinical_observations / alerts / ai_interactions
→ S3 SHAP detail 선택 조회
→ Bedrock Runtime + Guardrails
→ Aurora ai_interactions cache 저장
→ S3 LLM log 선택 저장
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `model_predictions`, `model_registry`, `clinical_observations`, `alerts` |
| Read/Write | `ai_interactions` |
| Read | S3 SHAP detail 선택 |
| Write | S3 LLM log 선택 |
| External call | Bedrock Runtime |

### 응답 예시

~~~json
{
  "success": true,
  "data": {
    "interactionId": "ai_001",
    "predictionId": "pred_001",
    "modelKey": "mortality_48h",
    "riskLevel": "high",
    "explanation": "현재 입력된 수치 기준으로 48시간 사망 위험도가 높게 예측되었습니다. 주요 기여 요인은 lactate 상승, 평균혈압 저하, creatinine 상승입니다. 이 설명은 모델 기반 보조 정보이며 최종 임상 판단은 의료진의 검토가 필요합니다.",
    "keyFactors": [
      {
        "feature": "lactate",
        "direction": "risk_increase",
        "summary": "lactate 상승이 위험도 증가에 기여했습니다."
      }
    ],
    "safetyNote": "이 결과는 최종 진단이나 처방이 아닙니다."
  }
}
~~~

### 안전 정책

| 항목 | 정책 |
|---|---|
| 허용 | 예측값, SHAP 요인, 최근 임상 수치를 근거로 설명 |
| 금지 | 확정 진단, 확정 예후, 처방 지시, 특정 약물 용량 지시 |
| 필수 | 모델 기반 보조 정보이며 의료진 검토가 필요하다는 문구 |
| 실패 시 | Bedrock timeout이면 SHAP top feature의 규칙 기반 요약만 반환 가능 |

---

## 6.11 AiChatLambda

### 역할

AI 챗봇 세션과 메시지를 관리한다. 세션 생성, 메시지 전송, 메시지 이력 조회를 처리한다. 사용자가 질문을 보내면 세션 이력과 환자 context를 조합해 Bedrock Runtime으로 답변을 생성하고 저장한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `POST /ai/chat/sessions` | 새 챗봇 대화 시작 |
| `POST /ai/chat/sessions/{sessionKey}/messages` | 사용자 메시지 전송 |
| `GET /ai/chat/sessions/{sessionKey}/messages` | 채팅 이력 조회 |

### 입력 예시

~~~json
{
  "sessionKey": "chat_001",
  "stayToken": "stay_001",
  "message": "이 환자는 왜 위험도가 높게 나왔어?"
}
~~~

### 내부 함수

| 함수 | 내용 |
|---|---|
| `route_chat_request(event)` | path/method에 따라 세션 생성/메시지 전송/이력 조회 분기 |
| `create_chat_session(body, user_context)` | `ai_interactions(interaction_type='chat_session')` 생성 |
| `validate_session_access(session_key, user_context)` | 세션 접근 권한 확인 |
| `save_user_message(session_key, message)` | 사용자 메시지 저장 |
| `fetch_chat_history(session_key, limit)` | 이전 메시지 조회 |
| `fetch_optional_patient_context(stay_token)` | 환자 context 선택 조회 |
| `classify_chat_intent(message)` | 예측 설명, 상태 요약, 용어 설명, 사용법 질문 등 분류 |
| `build_chat_prompt(history, patient_context, message)` | 대화형 prompt 생성 |
| `invoke_bedrock_for_chat(prompt)` | Bedrock Runtime 호출 |
| `apply_safety_postprocess(output)` | 금지 표현 점검, 안전 문구 보강 |
| `save_assistant_message(session_key, output)` | assistant message 저장 |
| `build_chat_messages_response()` | 메시지 이력 응답 생성 |

### 설계 메모: classify_chat_intent 확장 가능성

현재 `classify_chat_intent`는 단일 함수 안에서 intent를 분류하고 같은 Lambda 내에서 처리한다.
향후 챗봇 기능이 확장될 경우, 이 함수가 멀티에이전트 라우터 역할로 발전할 수 있다.

예시:
- intent별로 전문화된 sub-agent(예측 설명 agent, 임상 용어 agent, 가이드라인 RAG agent)로 분기
- 각 agent가 독립적으로 context를 구성하고 Bedrock을 호출
- classify_chat_intent가 orchestrator로서 적절한 agent를 선택하고 결과를 통합

이 구조 전환 시 Lambda 분리 또는 내부 모듈 분리 여부는 별도 설계에서 결정한다.

### 연결

```text
Frontend
→ /ai/chat/sessions/*
→ AiChatLambda
→ Aurora ai_interactions / patients / icu_stays / clinical_observations / model_predictions / alerts
→ Bedrock Runtime + Guardrails
→ Aurora ai_interactions 저장
→ S3 LLM log 선택 저장
→ Frontend
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read/Write | `ai_interactions` |
| Read | `patients`, `icu_stays`, `clinical_observations`, `model_predictions`, `alerts` |
| Write | S3 LLM log 선택 |
| External call | Bedrock Runtime |

### 응답 예시

~~~json
{
  "success": true,
  "data": {
    "sessionKey": "chat_001",
    "messages": [
      {
        "role": "user",
        "content": "이 환자는 왜 위험도가 높게 나왔어?",
        "createdAt": "2026-05-12T10:10:00+09:00"
      },
      {
        "role": "assistant",
        "content": "현재 환자는 lactate 상승, 평균혈압 저하, 산소화 지표 악화 가능성이 함께 관찰되어 모델 위험도가 높게 예측된 것으로 보입니다. 이 답변은 모델 기반 임상 보조 정보이며 최종 진단이나 처방은 의료진의 판단이 필요합니다.",
        "createdAt": "2026-05-12T10:10:05+09:00"
      }
    ]
  }
}
~~~

### 안전 정책

| 항목 | 정책 |
|---|---|
| 허용 | 환자 상태 요약, 예측 결과 설명, 임상 용어 설명, 대시보드 사용법 설명 |
| 금지 | 확정 진단, 처방 지시, 특정 약물 용량 확정, 의료진 판단 대체 |
| 필수 | 답변 근거가 환자 데이터인지 모델 결과인지 일반 설명인지 구분 |
| 실패 시 | Bedrock timeout이면 저장된 메시지는 유지하고 오류 메시지 반환 |

---

# 7. 비동기 Lambda 상세 명세

## 7.1 ClinicalIngestionLambda

### 역할

Hospital-Sim VPC의 EMR Agent가 보낸 임상 관측값과 오더 데이터를 검증하고 Aurora에 저장한다. 저장 후 SOFA 계산, 예측 판단, 알림 평가, 감사 로그 등 후속 처리를 위한 queue/event를 발행한다.

### 호출 시점

| API | 호출 상황 |
|---|---|
| `POST /ingest/clinical-observations` | 신규 vital/lab/derived metric 전송 |
| `POST /ingest/orders` | 신규 order/event 전송 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `verify_agent_signature(headers, body)` | HMAC 서명 검증 |
| `validate_timestamp_and_nonce(headers)` | clock skew, nonce 재사용 검증 |
| `parse_ingestion_payload(body)` | payload 파싱 |
| `validate_tokenized_payload(payload)` | 직접 식별정보 포함 여부 점검 |
| `normalize_observations(payload)` | metric code, unit, timestamp 정규화 |
| `normalize_orders(payload)` | order/event 정규화 |
| `check_idempotency_key(key)` | 중복 전송 확인 |
| `insert_clinical_observations(rows)` | `clinical_observations` 저장 |
| `insert_clinical_events(rows)` | `clinical_events` 저장 |
| `enqueue_clinical_processing()` | `ClinicalProcessingQueue` 발행 |
| `enqueue_prediction_trigger()` | 필요 시 예측 판단 queue 발행 |
| `enqueue_audit_log()` | Agent 수집 감사 로그 발행 |

### 연결

```text
Mock EMR
→ EMR Agent
→ POST /ingest/*
→ ClinicalIngestionLambda
→ Aurora clinical_observations / clinical_events
→ ClinicalProcessingQueue
→ AuditQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | Secrets Manager HMAC secret |
| Write | `clinical_observations`, `clinical_events` |
| Write | ClinicalProcessingQueue |
| Write | AuditQueue |

---

## 7.2 SofaCalculationLambda

### 역할

임상 관측값 저장 후 SOFA 관련 metric을 계산하고 `clinical_observations(metric_group='sofa')`로 저장한다. 입력값이 부족하면 계산 가능한 component와 누락 component를 함께 기록한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `ClinicalProcessingQueue` | 새로운 vital/lab이 들어온 뒤 후처리 |
| 내부 호출 | Ingestion 직후 즉시 계산이 필요한 경우 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_processing_message(message)` | stayToken, time window 파싱 |
| `fetch_sofa_inputs(stay_token, window)` | SOFA 계산에 필요한 임상 값 조회 |
| `calculate_respiratory_component(inputs)` | 호흡 component 계산 |
| `calculate_coagulation_component(inputs)` | 혈소판 component 계산 |
| `calculate_liver_component(inputs)` | bilirubin component 계산 |
| `calculate_cardiovascular_component(inputs)` | 혈압/승압제 component 계산 |
| `calculate_cns_component(inputs)` | GCS component 계산 |
| `calculate_renal_component(inputs)` | creatinine/urine output component 계산 |
| `build_missing_components(inputs)` | 누락 입력값 정리 |
| `insert_sofa_observations(score)` | `clinical_observations`에 SOFA 저장 |
| `enqueue_prediction_trigger_if_needed()` | SOFA 변화가 예측에 필요하면 queue 발행 |

### 연결

```text
ClinicalProcessingQueue
→ SofaCalculationLambda
→ Aurora clinical_observations
→ PredictionTriggerLambda 또는 PredictionQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `clinical_observations`, `clinical_events` |
| Write | `clinical_observations(metric_group='sofa')` |
| Write | Prediction 관련 queue 선택 |

---

## 7.3 PredictionTriggerLambda

### 역할

새 임상 데이터가 들어왔을 때 예측을 다시 수행해야 하는지 판단한다. 예측 조건을 만족하면 `PredictionQueue.fifo`에 job을 발행한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `ClinicalProcessingQueue` | 신규 임상 데이터 또는 SOFA 계산 이후 |
| EventBridge | 주기적으로 재예측 필요 여부 점검 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_trigger_message(message)` | stayToken, event time, changed metric 파싱 |
| `fetch_active_models()` | `model_registry`에서 active 모델 조회 |
| `fetch_recent_prediction_state(stay_token)` | 기존 예측 시점 조회 |
| `should_predict(model, changed_metrics, last_prediction)` | 재예측 필요 여부 판단 |
| `build_prediction_job(model, stay_token, window)` | 예측 job payload 생성 |
| `send_prediction_fifo_message(job)` | `PredictionQueue.fifo` 발행 |
| `record_trigger_audit()` | 감사 로그 발행 |

### 연결

```text
ClinicalProcessingQueue / EventBridge
→ PredictionTriggerLambda
→ Aurora model_registry / model_predictions
→ PredictionQueue.fifo
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `model_registry`, `model_predictions`, `clinical_observations` |
| Write | PredictionQueue.fifo |
| Write | AuditQueue 선택 |

---

## 7.4 PredictionWorkerLambda

### 역할

`PredictionQueue.fifo`의 예측 job을 처리한다. feature window를 구성하고 SageMaker Endpoint를 호출한 뒤 예측 결과, SHAP summary, input snapshot pointer를 저장한다. 이후 알림 평가와 대시보드 갱신을 위한 queue를 발행한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `PredictionQueue.fifo` | 예측 job이 발행되었을 때 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_prediction_job(message)` | stayToken, modelKey, featureWindowEnd 파싱 |
| `fetch_model_config(model_key)` | `model_registry`에서 endpoint/schema/artifact 정보 조회 |
| `load_feature_schema(uri)` | S3 feature schema 조회 |
| `fetch_feature_window(stay_token, schema, window)` | Aurora에서 feature window 조회 |
| `build_model_input(features, schema)` | SageMaker 입력 payload 생성 |
| `validate_model_input(payload)` | 입력 누락/타입 검증 |
| `write_feature_snapshot_to_s3(payload)` | 추론 당시 입력 snapshot 저장 |
| `invoke_sagemaker_endpoint(endpoint_name, payload)` | SageMaker Runtime 호출 |
| `parse_prediction_output(output)` | risk score, risk label, SHAP summary 파싱 |
| `write_shap_detail_to_s3_if_needed(output)` | 큰 SHAP payload 저장 |
| `insert_model_prediction(result)` | `model_predictions` 저장 |
| `enqueue_alert_evaluation(result)` | `AlertEvaluationQueue` 발행 |
| `enqueue_snapshot_update(stay_token)` | `SnapshotUpdateQueue` 발행 |
| `handle_failure_with_dlq_context(error)` | 실패 원인 로그/재시도 대응 |

### 연결

```text
PredictionQueue.fifo
→ PredictionWorkerLambda
→ Aurora model_registry / clinical_observations / model_predictions
→ S3 feature snapshot / SHAP detail
→ SageMaker Runtime
→ AlertEvaluationQueue
→ SnapshotUpdateQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `model_registry`, `clinical_observations`, `icu_stays` |
| Write | `model_predictions` |
| Read/Write | S3 model schema, feature snapshot, SHAP detail |
| External call | SageMaker Runtime |
| Write | AlertEvaluationQueue, SnapshotUpdateQueue |

---

## 7.5 AlertEvaluatorLambda

### 역할

예측 결과 또는 임상 수치 변화를 기준으로 알림 규칙을 평가한다. 조건을 만족하면 `alerts`를 생성하고, 의료진별 전달 상태 생성을 위해 `NotificationQueue`를 발행한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `AlertEvaluationQueue` | 예측 결과 저장 이후 |
| 내부 호출 | 특정 임상 이벤트 직후 즉시 알림 평가가 필요한 경우 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_alert_message(message)` | predictionId, stayToken, trigger source 파싱 |
| `fetch_alert_rules()` | `config_items(config_type='alert_rule')` 조회 |
| `fetch_prediction_context(prediction_id)` | `model_predictions` 조회 |
| `fetch_recent_clinical_context(stay_token)` | 최근 임상 값 조회 |
| `evaluate_rules(rules, context)` | severity, threshold, 중복 여부 평가 |
| `deduplicate_active_alerts(stay_token, rule_key)` | 같은 active alert 중복 방지 |
| `insert_alert(alert)` | `alerts` 저장 |
| `enqueue_notification(alert)` | NotificationQueue 발행 |
| `enqueue_snapshot_update(stay_token)` | 대시보드 갱신 queue 발행 |

### 연결

```text
AlertEvaluationQueue
→ AlertEvaluatorLambda
→ Aurora config_items / model_predictions / clinical_observations / alerts
→ NotificationQueue
→ SnapshotUpdateQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `config_items`, `model_predictions`, `clinical_observations`, `alerts` |
| Write | `alerts` |
| Write | NotificationQueue, SnapshotUpdateQueue |

---

## 7.6 NotificationDispatchLambda

### 역할

생성된 alert를 의료진별 전달 상태로 펼친다. `notification_deliveries`를 생성해 사용자별 unread count와 read/ack 상태 관리를 가능하게 한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `NotificationQueue` | alert 생성 또는 협진 이벤트 발생 후 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_notification_message(message)` | alertId 또는 consultationId 파싱 |
| `resolve_recipients(payload)` | ICU, role, 부서 기준 수신자 결정 |
| `fetch_staff_recipients(criteria)` | `staff_users` 조회 |
| `insert_notification_deliveries(recipients)` | `notification_deliveries` insert |
| `publish_external_notification_if_enabled()` | 외부 알림 채널 사용 시 발행 |
| `enqueue_audit_log()` | 알림 전달 감사 로그 발행 |

### 연결

```text
NotificationQueue
→ NotificationDispatchLambda
→ Aurora alerts / consultations / staff_users / notification_deliveries
→ AuditQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `alerts`, `consultations`, `staff_users` |
| Write | `notification_deliveries` |
| Write | AuditQueue |

---

## 7.7 ActivePatientSnapshotUpdaterLambda

### 역할

대시보드 조회 성능을 위해 materialized view를 refresh하거나 dashboard summary를 갱신한다. 이 Lambda는 별도 업무 데이터를 새로 만드는 것이 아니라, 대시보드용 조회 최적화를 담당한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `SnapshotUpdateQueue` | 임상 데이터, 예측, 알림 상태가 바뀐 뒤 |
| EventBridge | 정기 refresh가 필요한 경우 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_snapshot_message(message)` | stayToken, refresh 범위 파싱 |
| `refresh_latest_predictions_mv()` | `mv_latest_predictions` refresh |
| `refresh_active_patient_dashboard_mv()` | `mv_active_patient_dashboard` refresh |
| `refresh_patient_summary_if_needed()` | 선택 view refresh |
| `record_refresh_status()` | refresh 성공/실패 기록 |

### 연결

```text
SnapshotUpdateQueue / EventBridge
→ ActivePatientSnapshotUpdaterLambda
→ Aurora materialized view refresh
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `clinical_observations`, `model_predictions`, `alerts`, `icu_stays` |
| Write | Materialized View refresh |

---

## 7.8 ScheduledEventBuilderLambda

### 역할

오더나 임상 이벤트를 기반으로 환자 일정/예정 이벤트를 만든다. 예를 들어 검사 예정, 재평가 예정, 오더 기반 알림성 이벤트를 `clinical_events(event_type='scheduled')`로 저장한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| EventBridge `OrderUpdated` | order event가 저장된 뒤 |
| EventBridge Scheduler | 정기적으로 예정 이벤트를 재구성할 때 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_order_event(event)` | order ID, stayToken 파싱 |
| `fetch_order_context(order_id)` | `clinical_events(event_type='order')` 조회 |
| `derive_schedule_events(order_context)` | 예정 이벤트 생성 규칙 적용 |
| `upsert_scheduled_events(events)` | `clinical_events(event_type='scheduled')` 저장 |
| `enqueue_snapshot_update(stay_token)` | 화면 갱신 queue 발행 |
| `enqueue_audit_log()` | 감사 로그 발행 |

### 연결

```text
EventBridge OrderUpdated
→ ScheduledEventBuilderLambda
→ Aurora clinical_events
→ SnapshotUpdateQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `clinical_events` |
| Write | `clinical_events(event_type='scheduled')` |
| Write | SnapshotUpdateQueue, AuditQueue |

---

## 7.9 ConsultationEventLambda

### 역할

협진 생성 또는 상태 변경 이후 필요한 후속 처리를 수행한다. 수신자 알림 생성, 환자 timeline 반영, 감사 로그 생성을 담당한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| EventBridge `ConsultationCreated` | 협진 생성 후 |
| EventBridge `ConsultationStatusChanged` | 협진 상태 변경 후 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_consultation_event(event)` | consultationId, event type 파싱 |
| `fetch_consultation(consultation_id)` | 협진 상세 조회 |
| `create_consultation_timeline_event()` | `clinical_events`에 timeline성 이벤트 저장 |
| `enqueue_consultation_notification()` | NotificationQueue 발행 |
| `enqueue_audit_log()` | 감사 로그 발행 |

### 연결

```text
EventBridge ConsultationCreated / ConsultationStatusChanged
→ ConsultationEventLambda
→ Aurora consultations / clinical_events
→ NotificationQueue
→ AuditQueue
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `consultations` |
| Write | `clinical_events` |
| Write | NotificationQueue, AuditQueue |

---

## 7.10 PredictionFreshnessCheckerLambda

### 역할

환자별 최신 예측이 오래되었거나, 새 임상 데이터가 들어왔는데 예측이 갱신되지 않은 상태를 탐지한다. 필요하면 `PredictionQueue.fifo`에 재예측 job을 발행한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| EventBridge Scheduler | 정기적으로 예측 freshness 확인 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `fetch_active_stays()` | 현재 ICU active stay 조회 |
| `fetch_active_models()` | active model 조회 |
| `fetch_latest_prediction(stay_token, model_key)` | 최신 예측 시각 조회 |
| `fetch_latest_clinical_update(stay_token)` | 최신 임상 데이터 시각 조회 |
| `is_prediction_stale(latest_prediction, latest_clinical_update)` | 예측 갱신 필요 여부 판단 |
| `build_prediction_job()` | 재예측 job 생성 |
| `send_prediction_fifo_message()` | PredictionQueue 발행 |
| `record_freshness_check_result()` | 점검 결과 감사/운영 로그 기록 |

### 연결

```text
EventBridge Scheduler
→ PredictionFreshnessCheckerLambda
→ Aurora icu_stays / model_registry / model_predictions / clinical_observations
→ PredictionQueue.fifo
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Read | `icu_stays`, `model_registry`, `model_predictions`, `clinical_observations` |
| Write | PredictionQueue.fifo |
| Write | AuditQueue 선택 |

---

## 7.11 AuditLogWriterLambda

### 역할

여러 Lambda가 발행한 감사 로그 메시지를 받아 Aurora `audit_logs`에 저장한다. 장기 보관이 필요한 로그는 S3 archive로 이전한다.

### 호출 시점

| Trigger | 호출 상황 |
|---|---|
| `AuditQueue` | API 호출, 상태 변경, AI 호출, Agent ingestion 등 감사 이벤트 발생 시 |
| EventBridge Scheduler | 일별 archive 작업 |

### 내부 함수

| 함수 | 내용 |
|---|---|
| `parse_audit_message(message)` | actor, action, resource, timestamp 파싱 |
| `sanitize_audit_payload(payload)` | PHI/민감 정보 제거 |
| `insert_audit_log(row)` | `audit_logs` 저장 |
| `archive_old_audit_logs_to_s3()` | 오래된 감사 로그 S3 archive |
| `mark_archived_logs()` | archive 완료 상태 기록 |
| `handle_audit_failure()` | DLQ 대응용 실패 로그 |

### 연결

```text
AuditQueue
→ AuditLogWriterLambda
→ Aurora audit_logs
→ S3 audit archive
```

### 읽기/쓰기

| 작업 | 대상 |
|---|---|
| Write | `audit_logs` |
| Read | `audit_logs` archive 대상 |
| Write | S3 audit archive |

---

# 8. 주요 업무 흐름별 연결도

## 8.1 데이터 수집과 예측 계산

```text
Mock EMR
→ EMR Agent
→ Private API Gateway
→ ClinicalIngestionLambda
→ Aurora clinical_observations / clinical_events
→ ClinicalProcessingQueue
→ SofaCalculationLambda
→ PredictionTriggerLambda
→ PredictionQueue.fifo
→ PredictionWorkerLambda
→ SageMaker Endpoint
→ Aurora model_predictions
→ AlertEvaluationQueue
→ AlertEvaluatorLambda
→ NotificationQueue
→ NotificationDispatchLambda
→ SnapshotUpdateQueue
→ ActivePatientSnapshotUpdaterLambda
```

## 8.2 대시보드 조회

```text
Frontend
→ Private API Gateway
→ DashboardLambda
→ Aurora mv_active_patient_dashboard / mv_latest_predictions
→ Frontend
```

대시보드 조회는 SageMaker를 호출하지 않는다. 예측은 이미 `PredictionWorkerLambda`가 비동기로 계산해 Aurora에 저장해둔 값을 읽는다.

## 8.3 환자 상세 조회

```text
Frontend
→ PatientDetailLambda
→ ClinicalDataLambda
→ PredictionReadLambda
→ TimelineLambda
→ Aurora patients / icu_stays / clinical_observations / model_predictions / v_clinical_timeline
→ Frontend
```

## 8.4 AI 설명 버튼

```text
Frontend
→ POST /ai/insights
→ AiInsightLambda
→ Aurora prediction + SHAP summary + clinical context 조회
→ S3 SHAP detail 선택 조회
→ Bedrock Runtime + Guardrails
→ Aurora ai_interactions cache 저장
→ Frontend
```

## 8.5 AI 챗봇

```text
Frontend
→ POST /ai/chat/sessions
→ AiChatLambda
→ Aurora ai_interactions chat_session 저장

Frontend
→ POST /ai/chat/sessions/{sessionKey}/messages
→ AiChatLambda
→ Aurora chat history + optional patient context 조회
→ Bedrock Runtime + Guardrails
→ Aurora ai_interactions chat_message 저장
→ Frontend

Frontend
→ GET /ai/chat/sessions/{sessionKey}/messages
→ AiChatLambda
→ Aurora ai_interactions 조회
→ Frontend
```

## 8.6 보고서 생성

```text
Frontend
→ POST /icu-stays/{stayId}/reports
→ ReportLambda
→ Aurora 환자/임상/예측/알림 조회
→ HTML/PDF snapshot 생성
→ S3 reports 저장
→ Aurora patient_reports 저장
→ AuditQueue
→ Frontend
```

## 8.7 협진과 알림

```text
Frontend
→ POST /consultations
→ ConsultationLambda
→ Aurora consultations 저장
→ EventBridge ConsultationCreated
→ ConsultationEventLambda
→ clinical_events 저장
→ NotificationQueue
→ NotificationDispatchLambda
→ notification_deliveries 저장
```

---

# 9. API와 Lambda 매핑표

| # | Method | Path | Lambda |
|---:|---|---|---|
| 1 | GET | `/me` | AppContextLambda |
| 2 | GET | `/meta/metrics` | AppContextLambda |
| 3 | GET | `/meta/models` | AppContextLambda |
| 4 | GET | `/dashboard/icu/{icuId}` | DashboardLambda |
| 5 | GET | `/dashboard/icu/{icuId}/staffing` | DashboardLambda |
| 6 | GET | `/icu-stays/{stayId}` | PatientDetailLambda |
| 7 | GET | `/icu-stays/{stayId}/clinical-data` | ClinicalDataLambda |
| 8 | GET | `/icu-stays/{stayId}/sofa` | ClinicalDataLambda |
| 9 | GET | `/icu-stays/{stayId}/predictions` | PredictionReadLambda |
| 10 | GET | `/icu-stays/{stayId}/predictions/{modelKey}` | PredictionReadLambda |
| 11 | GET | `/icu-stays/{stayId}/predictions/{modelKey}/history` | PredictionReadLambda |
| 12 | GET | `/icu-stays/{stayId}/timeline` | TimelineLambda |
| 13 | GET | `/icu-stays/{stayId}/schedule` | TimelineLambda |
| 14 | GET | `/icu-stays/{stayId}/report/latest` | ReportLambda |
| 15 | POST | `/icu-stays/{stayId}/reports` | ReportLambda |
| 16 | GET | `/icu-stays/{stayId}/reports/{reportId}` | ReportLambda |
| 17 | GET | `/staff/departments` | ConsultationLambda |
| 18 | GET | `/staff` | ConsultationLambda |
| 19 | GET | `/consultations` | ConsultationLambda |
| 20 | GET | `/consultations/inbox` | ConsultationLambda |
| 21 | GET | `/consultations/{consultationId}` | ConsultationLambda |
| 22 | POST | `/consultations` | ConsultationLambda |
| 23 | PATCH | `/consultations/{consultationId}/status` | ConsultationLambda |
| 24 | GET | `/alerts` | AlertApiLambda |
| 25 | GET | `/alerts/count` | AlertApiLambda |
| 26 | GET | `/icu-stays/{stayId}/alerts` | AlertApiLambda |
| 27 | POST | `/alerts/{alertId}/read` | AlertApiLambda |
| 28 | POST | `/alerts/{alertId}/acknowledge` | AlertApiLambda |
| 29 | POST | `/alerts/{alertId}/resolve` | AlertApiLambda |
| 30 | POST | `/ingest/clinical-observations` | ClinicalIngestionLambda |
| 31 | POST | `/ingest/orders` | ClinicalIngestionLambda |
| 32 | POST | `/ai/insights` | AiInsightLambda |
| 33 | POST | `/ai/chat/sessions` | AiChatLambda |
| 34 | POST | `/ai/chat/sessions/{sessionKey}/messages` | AiChatLambda |
| 35 | GET | `/ai/chat/sessions/{sessionKey}/messages` | AiChatLambda |

---

# 10. Queue / Event와 Lambda 매핑표

| Queue / Event | Consumer Lambda | 역할 |
|---|---|---|
| `ClinicalProcessingQueue` | SofaCalculationLambda | SOFA/derived metric 계산 |
| `ClinicalProcessingQueue` | PredictionTriggerLambda | 예측 필요 여부 판단 |
| `PredictionQueue.fifo` | PredictionWorkerLambda | SageMaker 예측 실행 |
| `AlertEvaluationQueue` | AlertEvaluatorLambda | 알림 규칙 평가 |
| `NotificationQueue` | NotificationDispatchLambda | 의료진별 알림 전달 상태 생성 |
| `SnapshotUpdateQueue` | ActivePatientSnapshotUpdaterLambda | 대시보드 MV/snapshot 갱신 |
| `AuditQueue` | AuditLogWriterLambda | 감사 로그 저장 |
| `OrderUpdated` | ScheduledEventBuilderLambda | 오더 기반 예정 이벤트 생성 |
| `ConsultationCreated` | ConsultationEventLambda | 협진 후속 이벤트/알림 생성 |
| `ConsultationStatusChanged` | ConsultationEventLambda | 협진 상태 변경 후속 처리 |
| `PredictionStaleCheck` | PredictionFreshnessCheckerLambda | 오래된 예측 탐지 및 재예측 발행 |
| `DailyAuditArchive` | AuditLogWriterLambda | 감사 로그 S3 archive |

---

# 11. Lambda별 최소 테스트 케이스

| Lambda | 최소 테스트 |
|---|---|
| AppContextLambda | JWT claims mock으로 `/me`, `/meta/models` 응답 확인 |
| DashboardLambda | ICU ID 기준 환자 목록 응답 확인 |
| PatientDetailLambda | stayId 기준 환자 헤더 조회 확인 |
| ClinicalDataLambda | vital/lab/SOFA trend 조회 확인 |
| PredictionReadLambda | 최신 예측, 특정 모델 예측, 이력 조회 확인 |
| TimelineLambda | timeline/schedule 응답 확인 |
| ReportLambda | 보고서 생성 후 S3 URI와 `patient_reports` 저장 확인 |
| ConsultationLambda | 협진 생성, inbox 조회, 상태 변경 확인 |
| AlertApiLambda | 알림 목록, count, read/ack/resolve 확인 |
| AiInsightLambda | mock prediction + SHAP으로 Bedrock 설명 생성 및 cache 저장 확인 |
| AiChatLambda | 세션 생성, 메시지 전송, 이력 조회 확인 |
| ClinicalIngestionLambda | HMAC 검증, observation 저장, queue 발행 확인 |
| SofaCalculationLambda | 입력값 기반 SOFA component 저장 확인 |
| PredictionTriggerLambda | 재예측 필요 여부 판단과 FIFO message 발행 확인 |
| PredictionWorkerLambda | mock SageMaker 응답 기반 prediction 저장 확인 |
| AlertEvaluatorLambda | threshold rule 기반 alert 생성 확인 |
| NotificationDispatchLambda | alert 수신자별 delivery 생성 확인 |
| ActivePatientSnapshotUpdaterLambda | materialized view refresh 실행 확인 |
| ScheduledEventBuilderLambda | order event 기반 scheduled event 생성 확인 |
| ConsultationEventLambda | 협진 생성 후 notification event 생성 확인 |
| PredictionFreshnessCheckerLambda | 오래된 prediction 탐지 후 queue 발행 확인 |
| AuditLogWriterLambda | audit message 저장 및 S3 archive 확인 |

---

# 12. Bedrock 관련 Lambda 경계

기본 구성에서 Bedrock Runtime을 직접 호출하는 Lambda는 아래 2개다.

| Lambda | API | Bedrock 사용 목적 | 저장 |
|---|---|---|---|
| `AiInsightLambda` | `POST /ai/insights` | SHAP top features와 환자 context를 의료진용 자연어 설명으로 변환 | `ai_interactions(interaction_type='insight_cache')` |
| `AiChatLambda` | `/ai/chat/sessions/*` | 세션 기반 질문에 대해 대화형 답변 생성 | `ai_interactions(interaction_type='chat_session' / 'chat_message')` |

공통으로 사용하는 Bedrock 관련 구성은 다음과 같다.

| 구성 | 내용 |
|---|---|
| Model ID | `BEDROCK_MODEL_ID` 환경변수로 관리 |
| Guardrails | `BEDROCK_GUARDRAIL_ID`, `BEDROCK_GUARDRAIL_VERSION`으로 관리 |
| Prompt 안전 정책 | 확정 진단, 처방 지시, 특정 약물 용량 확정 금지 |
| Cache | 반복 요청 비용 절감을 위해 `ai_interactions` 조회 후 Bedrock 호출 |
| LLM log | PHI가 제거된 prompt/output만 S3에 선택 저장 |

### RAG / Knowledge Base 적용 시 영향 범위

RAG를 적용하는 경우, 영향받는 Lambda는 아래와 같다.

| Lambda | 변경 내용 |
|---|---|
| `AiChatLambda` | `build_chat_prompt()` 단계에서 Bedrock Knowledge Base 또는 자체 retriever를 통해 관련 임상 가이드라인을 검색하고, 검색 결과를 prompt context에 추가한다. |
| `AiInsightLambda` | SHAP 설명 생성 시, 관련 가이드라인 근거를 함께 제공하도록 prompt context를 확장할 수 있다. |

vector store 후보:
- Aurora PostgreSQL pgvector: 기존 Aurora 인프라를 재활용하여 추가 서비스 없이 구성 가능
- S3 Vectors: 유휴 비용 없이 서버리스로 운영 가능, 서울 리전 지원

KB 적용 여부와 vector store 선택은 확정 후 이 문서에 반영한다.

---

# 13. 최종 정리

ClinSight Lambda 구조는 다음과 같이 이해하면 된다.

```text
화면 조회 API
→ AppContext / Dashboard / PatientDetail / ClinicalData / PredictionRead / Timeline
→ Aurora 읽기 중심

사용자 업무 API
→ Report / Consultation / AlertApi
→ Aurora 쓰기 + S3 + EventBridge/SQS + AuditQueue

AI API
→ AiInsight / AiChat
→ Aurora context 조회 + Bedrock Runtime + Guardrails + ai_interactions 저장

데이터 수집/예측 처리
→ ClinicalIngestion → SofaCalculation → PredictionTrigger → PredictionWorker
→ SageMaker → model_predictions → AlertEvaluator → NotificationDispatch → SnapshotUpdater

운영/감사
→ AuditLogWriter / PredictionFreshnessChecker / ScheduledEventBuilder / ConsultationEvent
```

이 구조에서 핵심 원칙은 다음과 같다.

| 핵심 원칙 | 설명 |
|---|---|
| 대시보드 조회와 예측 실행 분리 | 화면 새로고침 때 SageMaker를 직접 호출하지 않는다. |
| AI 설명과 AI 채팅 분리 | 버튼형 설명은 `AiInsightLambda`, 대화형 챗봇은 `AiChatLambda`가 처리한다. |
| Bedrock 호출 위치 제한 | Bedrock은 AI Lambda에서만 호출한다. |
| SageMaker 호출 위치 제한 | SageMaker는 `PredictionWorkerLambda`에서만 호출한다. |
| Aurora 중심 저장 | 주요 운영 데이터는 Aurora에 저장한다. |
| S3는 파일/스냅샷/아카이브 | 큰 payload와 보고서는 S3에 저장하고 Aurora에는 pointer를 둔다. |
| SQS로 장애 흡수 | 예측, 알림, 감사 로그는 queue와 DLQ로 재처리 가능하게 한다. |
