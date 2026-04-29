import type { ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  FlaskConical,
  Pill,
  Stethoscope,
} from 'lucide-react';
import type {
  TimelineEvent,
  TimelineEventCategory,
} from '../../types';
import './ClinicalTimeline.css';

interface ClinicalTimelineProps {
  events: TimelineEvent[];
}

interface IconProps {
  size?: number;
}

const CATEGORY_ICON: Record<TimelineEventCategory, ComponentType<IconProps>> = {
  vitals: Activity,
  lab: FlaskConical,
  medication: Pill,
  procedure: Stethoscope,
  assessment: ClipboardCheck,
  alert: AlertTriangle,
};

const CATEGORY_LABEL: Record<TimelineEventCategory, string> = {
  vitals: '바이탈',
  lab: '검사',
  medication: '투약',
  procedure: '시술',
  assessment: '평가',
  alert: '경보',
};

export default function ClinicalTimeline({ events }: ClinicalTimelineProps) {
  if (events.length === 0) {
    return (
      <section className="clinical-timeline">
        <header className="clinical-timeline__head">
          <h3 className="clinical-timeline__title">임상 타임라인</h3>
        </header>
        <div className="clinical-timeline__empty">
          최근 24시간 이벤트가 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="clinical-timeline">
      <header className="clinical-timeline__head">
        <h3 className="clinical-timeline__title">임상 타임라인</h3>
        <span className="clinical-timeline__meta">
          최근 24시간 · {events.length}건
        </span>
      </header>
      <ol className="clinical-timeline__list">
        {events.map((event, idx) => {
          const Icon = CATEGORY_ICON[event.category];
          const isLast = idx === events.length - 1;
          return (
            <li
              key={event.id}
              className={`clinical-timeline__item clinical-timeline__item--${event.severity} ${
                isLast ? 'is-last' : ''
              }`}
            >
              <span className="clinical-timeline__time">{event.time}</span>
              <span className="clinical-timeline__rail" aria-hidden="true">
                <span className="clinical-timeline__dot">
                  <Icon size={14} />
                </span>
              </span>
              <div className="clinical-timeline__body">
                <div className="clinical-timeline__body-head">
                  <span className="clinical-timeline__category">
                    {CATEGORY_LABEL[event.category]}
                  </span>
                  <h4 className="clinical-timeline__event-title">{event.title}</h4>
                </div>
                <p className="clinical-timeline__event-desc">{event.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
