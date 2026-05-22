import { useState } from 'react';
import { useMe } from '../../../context/useMeta';

interface ConsultationNote {
  id: string;
  text: string;
  author: string;
  time: Date;
}

interface ConsultationNotesProps {
  /** 'write'(기본): 작성란 표시 / 'read': 작성란 숨김(기존 협진 열람). */
  mode?: 'write' | 'read';
}

function makeNoteId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

/**
 * 협진 의견(메모) 입력/리스트.
 * 메모는 모달 내부 로컬 상태로만 관리되며 부모 모달이 unmount되면 자동 폐기.
 * 백엔드 연결 시 추가 저장 endpoint로 교체될 자리.
 */
export default function ConsultationNotes({
  mode = 'write',
}: ConsultationNotesProps = {}) {
  const me = useMe();
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [noteInput, setNoteInput] = useState('');

  const handleAddNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotes((prev) => [
      ...prev,
      {
        id: makeNoteId(),
        text,
        author: me?.displayName ?? '담당 의료진',
        time: new Date(),
      },
    ]);
    setNoteInput('');
  };

  return (
    <section className="report-paper__section report-paper__section--notes">
      <h3 className="report-paper__section-title">
        협진 의견 (Consultation Notes)
      </h3>
      {notes.length > 0 && (
        <ul className="report-paper__note-list">
          {notes.map((note) => (
            <li key={note.id} className="report-paper__note">
              <p className="report-paper__note-text">{note.text}</p>
              <span className="report-paper__note-meta">
                {note.author} · {formatDateTime(note.time)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {mode === 'read' && notes.length === 0 && (
        <p className="report-paper__empty">등록된 협진 의견이 없습니다.</p>
      )}
      {mode === 'write' && (
        <div className="report-modal__note-add">
          <textarea
            className="report-modal__note-textarea"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="협진 관련 메모를 입력하세요..."
            rows={3}
            aria-label="협진 메모 입력"
          />
          <button
            type="button"
            className="report-modal__note-button"
            onClick={handleAddNote}
            disabled={!noteInput.trim()}
          >
            보고서에 추가
          </button>
        </div>
      )}
    </section>
  );
}
