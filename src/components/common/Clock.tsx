import { memo, useEffect, useState } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

interface ClockProps {
  /** 추가 클래스 (기존 페이지의 시계 위치 클래스에 그대로 적용 가능) */
  className?: string;
}

function formatKstClock(date: Date): string {
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${fmt.format(date)} KST`;
}

/**
 * 1초마다 자체 갱신되는 시계 컴포넌트.
 * memo로 감싸 부모 리렌더에 영향을 받지 않으며, 자기 setInterval만으로 갱신.
 * 기존에 페이지 단위 useState/useEffect로 처리하던 시계를 이 컴포넌트로 분리해
 * 1초 간격 전체 페이지 리렌더를 회피한다.
 */
function Clock({ className }: ClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className}>
      <ClockIcon size={14} />
      {formatKstClock(now)}
    </span>
  );
}

export default memo(Clock);
