/**
 * 시간 형식 변환 유틸.
 * Mock 데이터의 표시용 문자열("14:20", "-6h" 등)은 백엔드 연결 시 ISO 8601로 통일될 예정.
 * 그 시점부터 컴포넌트에서 본 유틸을 통해 표시 형식으로 변환한다.
 */

/** ISO 8601 → "14:20" 형식 (시:분) */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO 8601 → "2025-04-29 14:20" 형식 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ko-KR')} ${formatTime(iso)}`;
}

/** ISO 8601 → "12분 전" / "3시간 전" / "2일 전" 상대 시각 */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/**
 * 두 ISO 시각의 차이를 "-6h", "-4h", "현재" 등으로 변환.
 * 바이탈 차트의 trend 시점 라벨 생성에 사용.
 */
export function toRelativeLabel(iso: string, referenceIso: string): string {
  const diff = new Date(referenceIso).getTime() - new Date(iso).getTime();
  const hours = Math.round(diff / 3600000);
  if (hours <= 0) return '현재';
  return `-${hours}h`;
}

// ============================================
// 일수 계산 — 임상 관행상 자정 기준
// ============================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Date를 로컬 자정으로 떨어뜨린다 (시/분/초/밀리초 = 0). */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * `iso` 시점부터 `now`까지 경과한 로컬 일수 차이를 반환한다.
 * 같은 날이면 0. 시간대 영향을 최소화하기 위해 두 시각을 로컬 자정으로
 * 떨어뜨린 뒤 일수 차이를 계산한다.
 */
export function daysSinceLocalMidnight(iso: string, now: Date = new Date()): number {
  const start = startOfLocalDay(new Date(iso));
  const end = startOfLocalDay(now);
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * HOD (Hospital Day) — 입원한 날을 1일로 카운트.
 * 피드백 §1-2 — 한국 병원 임상 관행.
 */
export function hospitalDay(admitIso: string, now?: Date): number {
  return daysSinceLocalMidnight(admitIso, now) + 1;
}

/**
 * POD (Postoperative Day) — 수술 당일을 POD #0으로 카운트.
 * 피드백 §1-2 — "수술 당일은 POD #0, 다음 날이 POD #1".
 */
export function postOpDay(surgeryIso: string, now?: Date): number {
  return daysSinceLocalMidnight(surgeryIso, now);
}

/**
 * Onset 일수 — 발병 당일을 1일째로 카운트.
 * 피드백 §6-3.
 */
export function onsetDay(onsetIso: string, now?: Date): number {
  return daysSinceLocalMidnight(onsetIso, now) + 1;
}
