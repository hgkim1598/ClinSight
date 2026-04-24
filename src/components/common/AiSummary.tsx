import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import './AiSummary.css';

interface AiSummaryProps {
  summary: string;
}

function splitSummary(summary: string): { lead: string; bullets: string[]; detail: string } {
  const sentences = summary
    .split(/(?<=[.。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lead = sentences[0] ?? summary;
  const bullets = sentences.slice(1, 4);
  const detail = sentences.slice(4).join(' ');
  return { lead, bullets, detail };
}

export default function AiSummary({ summary }: AiSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const hasContent = summary.trim().length > 0;

  const { lead, bullets, detail } = splitSummary(summary);

  return (
    <div className="ai-summary">
      <div className="ai-summary__tag">
        <Info size={12} />
        AI 생성 텍스트 · 임상 판단 대체 불가
      </div>
      {hasContent ? (
        <>
          <button
            type="button"
            className="ai-summary__toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span>AI 임상 설명</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="ai-summary__body">
              <p className="ai-summary__lead">{lead}</p>
              {bullets.length > 0 && (
                <ul className="ai-summary__bullets">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {detail.length > 0 && (
                <>
                  <button
                    type="button"
                    className="ai-summary__detail-toggle"
                    onClick={() => setDetailOpen((v) => !v)}
                    aria-expanded={detailOpen}
                  >
                    {detailOpen ? '자세히 접기' : '자세히'}
                    {detailOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {detailOpen && <p className="ai-summary__detail">{detail}</p>}
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="ai-summary__empty">요약이 아직 생성되지 않았습니다.</div>
      )}
    </div>
  );
}
