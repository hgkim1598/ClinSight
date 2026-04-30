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
  ScheduledEvent,
  TimelineEvent,
  TimelineEventCategory,
} from '../../types';
import './ClinicalTimeline.css';

interface ClinicalTimelineProps {
  events: TimelineEvent[];
  schedule: ScheduledEvent[];
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

function PastList({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="clinical-timeline__empty">
        최근 24시간 이벤트가 없습니다.
      </div>
    );
  }
  return (
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
  );
}

function UpcomingList({ schedule }: { schedule: ScheduledEvent[] }) {
  if (schedule.length === 0) {
    return (
      <div className="clinical-timeline__empty">
        예정된 이벤트가 없습니다.
      </div>
    );
  }
  return (
    <ol className="clinical-timeline__list">
      {schedule.map((s, idx) => {
        const Icon = CATEGORY_ICON[s.category];
        const isLast = idx === schedule.length - 1;
        return (
          <li
            key={s.id}
            className={`clinical-timeline__item clinical-timeline__item--upcoming ${
              isLast ? 'is-last' : ''
            }`}
          >
            <span className="clinical-timeline__time">{s.time}</span>
            <span className="clinical-timeline__rail" aria-hidden="true">
              <span className="clinical-timeline__dot clinical-timeline__dot--hollow">
                <Icon size={14} />
              </span>
            </span>
            <div className="clinical-timeline__body">
              <div className="clinical-timeline__body-head">
                <span className="clinical-timeline__category">
                  {CATEGORY_LABEL[s.category]}
                </span>
                <h4 className="clinical-timeline__event-title">{s.title}</h4>
              </div>
              <p className="clinical-timeline__event-desc">{s.description}</p>
              <p className="clinical-timeline__basis">{s.basis}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ClinicalTimeline({ events, schedule }: ClinicalTimelineProps) {
  return (
    <section className="clinical-timeline">
      <header className="clinical-timeline__head">
        <h3 className="clinical-timeline__title">임상 타임라인</h3>
        <span className="clinical-timeline__meta">
          과거 {events.length}건 · 예정 {schedule.length}건
        </span>
      </header>
      <div className="clinical-timeline__columns">
        <div className="clinical-timeline__column clinical-timeline__column--past">
          <h4 className="clinical-timeline__column-title">과거</h4>
          <PastList events={events} />
        </div>
        <div className="clinical-timeline__column clinical-timeline__column--upcoming">
          <h4 className="clinical-timeline__column-title">예정</h4>
          <UpcomingList schedule={schedule} />
        </div>
      </div>
    </section>
  );
}
