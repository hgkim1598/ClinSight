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
