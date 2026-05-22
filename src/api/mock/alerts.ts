/**
 * GET /alerts 응답을 모사한 mock.
 *
 * V4 명세 §9-1을 따른다.
 *  - severity: 'info' | 'warning' | 'critical'
 *  - status: 'active' | 'acknowledged' | 'resolved'   ('new' 폐기)
 *  - delivery: per-user read/acknowledge
 *  - tags_jsonb, confidence (0~1 실수), alert_source 포함
 *  - 환자 실명은 응답에 없음. patient_token만.
 *
 * mock mutation은 alertService 내부에서 처리.
 */

export interface WireAlertDelivery {
  delivery_id: string;
  read_at: string | null;
  acknowledged_at: string | null;
}

export interface WireAlert {
  alert_id: string;
  stay_token: string;
  alert_type: string;
  alert_source: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  title: string;
  message: string;
  tags_jsonb: string[];
  confidence: number | null;
  created_at: string;
  delivery: WireAlertDelivery;
  // 폴백용 — 현재 백엔드가 내려주는 원본 alerts(flat) 필드. delivery 객체 없이 평탄하게 옴.
  // TODO: 백엔드 뷰 전환 완료 후 폴백 필드 제거
  stay_id?: string;
  trigger_rule_key?: string;
  read_at?: string | null;
  acknowledged_at?: string | null;
  is_read?: boolean;
  is_acknowledged?: boolean;
  resolved_at?: string | null;
}

export interface WireAlertsResponse {
  alerts: WireAlert[];
}

const ISO = (h: number, m: number): string =>
  `2026-05-11T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`;

export const mockAlertsWire: WireAlert[] = [
  {
    alert_id: 'alert-001',
    stay_token: 'ST-19482',
    alert_type: 'risk_threshold',
    alert_source: 'mortality_48h',
    severity: 'critical',
    status: 'active',
    title: '패혈증 고위험 — Risk 87%',
    message: 'MAP 58 mmHg, NE 0.18 mcg/kg/min 투여 중. Lactate 3.8 mmol/L (2배 이상 증가). SOFA 11 (+4). Sepsis-3 기준 충족.',
    tags_jsonb: ['MAP <65', 'SOFA +4', 'Lactate ↑', 'No Lactate Clearance'],
    confidence: 0.87,
    created_at: ISO(14, 20),
    delivery: { delivery_id: 'dlv-001', read_at: null, acknowledged_at: null },
  },
  {
    alert_id: 'alert-002',
    stay_token: 'ST-19482',
    alert_type: 'vital_breach',
    alert_source: 'threshold',
    severity: 'critical',
    status: 'active',
    title: '호흡부전 — P/F Ratio 152',
    message: 'SpO2 91%, FiO2 0.6 (P/F=152, 중등도 ARDS). RR 28/min. Plateau pressure 한계 접근 중. Prone positioning 고려.',
    tags_jsonb: ['P/F <200', '중등도 ARDS', 'SpO2 91%', 'RR 28/min'],
    confidence: null,
    created_at: ISO(14, 15),
    delivery: { delivery_id: 'dlv-002', read_at: null, acknowledged_at: null },
  },
  {
    alert_id: 'alert-003',
    stay_token: 'ST-20314',
    alert_type: 'risk_threshold',
    alert_source: 'sepsis_light',
    severity: 'warning',
    status: 'active',
    title: '패혈증 의심 — qSOFA 2/3',
    message: 'HR 118, Temp 39.1°C, WBC 21.3, CRP 156. 패혈증 번들 시작 고려.',
    tags_jsonb: ['72% Risk', 'qSOFA 2/3', 'Rising Trend'],
    confidence: 0.72,
    created_at: ISO(14, 8),
    delivery: { delivery_id: 'dlv-003', read_at: null, acknowledged_at: null },
  },
  {
    alert_id: 'alert-004',
    stay_token: 'ST-19482',
    alert_type: 'vital_breach',
    alert_source: 'threshold',
    severity: 'warning',
    status: 'acknowledged',
    title: 'AKI 진행 — Creatinine 2.1 mg/dL',
    message: 'Creatinine 2.1 (baseline 0.9, ×2.3 증가). UO 0.28 mL/kg/h (6시간). AKI Stage 2 (KDIGO). 신장내과 협진 권고.',
    tags_jsonb: ['Cr ×2.3', 'UO ↓', 'KDIGO Stage 2'],
    confidence: null,
    created_at: ISO(13, 50),
    delivery: { delivery_id: 'dlv-004', read_at: ISO(14, 0), acknowledged_at: ISO(14, 5) },
  },
  {
    alert_id: 'alert-005',
    stay_token: 'ST-20781',
    alert_type: 'risk_threshold',
    alert_source: 'septic_shock_12h',
    severity: 'warning',
    status: 'active',
    title: '패혈성 쇼크 진행 가능성 — Risk 64%',
    message: 'MAP 64 mmHg (경계), Lactate 2.6 mmol/L. Vasopressor 시작 고려 단계. 1시간 내 재평가 필요.',
    tags_jsonb: ['64% Risk', 'MAP 경계', 'Lactate 2.6'],
    confidence: 0.64,
    created_at: ISO(13, 32),
    delivery: { delivery_id: 'dlv-005', read_at: null, acknowledged_at: null },
  },
  {
    alert_id: 'alert-006',
    stay_token: 'ST-21005',
    alert_type: 'risk_threshold',
    alert_source: 'sepsis_light',
    severity: 'warning',
    status: 'active',
    title: '패혈증 초기 의심 — Risk 58%',
    message: 'HR 108, Temp 38.4°C, RR 22/min. SIRS 3/4 충족. 감염원 확인 권고.',
    tags_jsonb: ['58% Risk', 'SIRS 3/4', '초기'],
    confidence: 0.58,
    created_at: ISO(13, 15),
    delivery: { delivery_id: 'dlv-006', read_at: null, acknowledged_at: null },
  },
  {
    alert_id: 'alert-007',
    stay_token: 'ST-20314',
    alert_type: 'vital_breach',
    alert_source: 'threshold',
    severity: 'warning',
    status: 'acknowledged',
    title: 'Lactate 상승 — 3.2 mmol/L',
    message: 'Lactate 3.2 (1시간 전 2.4). 관류 저하 신호. 수액 반응성 평가 권고.',
    tags_jsonb: ['Lactate ↑', '관류 저하'],
    confidence: null,
    created_at: ISO(12, 48),
    delivery: { delivery_id: 'dlv-007', read_at: ISO(12, 55), acknowledged_at: ISO(13, 0) },
  },
  {
    alert_id: 'alert-008',
    stay_token: 'ST-20781',
    alert_type: 'vital_breach',
    alert_source: 'threshold',
    severity: 'critical',
    status: 'resolved',
    title: 'SpO2 저하 — 88%',
    message: 'SpO2 88%, FiO2 0.4 → 0.5 상향 후 94%로 회복. 추가 모니터링 중.',
    tags_jsonb: ['SpO2 저하', '회복'],
    confidence: null,
    created_at: ISO(12, 20),
    delivery: { delivery_id: 'dlv-008', read_at: ISO(12, 30), acknowledged_at: ISO(12, 35) },
  },
  {
    alert_id: 'alert-009',
    stay_token: 'ST-19482',
    alert_type: 'risk_threshold',
    alert_source: 'sepsis_light',
    severity: 'warning',
    status: 'resolved',
    title: 'HR 변동성 증가 — Risk 51%',
    message: 'HR variability 증가 후 안정화. Sinus tachycardia 지속 중이나 추세 안정.',
    tags_jsonb: ['51% Risk', '안정화'],
    confidence: 0.51,
    created_at: ISO(11, 55),
    delivery: { delivery_id: 'dlv-009', read_at: ISO(12, 0), acknowledged_at: ISO(12, 10) },
  },
  {
    alert_id: 'alert-010',
    stay_token: 'ST-21005',
    alert_type: 'risk_threshold',
    alert_source: 'mortality_48h',
    severity: 'warning',
    status: 'acknowledged',
    title: '사망 위험도 상승 — Risk 42%',
    message: '사망 예측 모델 위험도 28% → 42% 상승. SOFA +2 변화. 추세 모니터링 권고.',
    tags_jsonb: ['42% Risk', 'SOFA +2'],
    confidence: 0.42,
    created_at: ISO(11, 30),
    delivery: { delivery_id: 'dlv-010', read_at: ISO(11, 40), acknowledged_at: ISO(11, 48) },
  },
];
