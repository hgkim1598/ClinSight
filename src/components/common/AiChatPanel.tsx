import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Info, Send, Sparkles, X } from 'lucide-react';
import {
  createChatSession,
  postChatMessage,
} from '../../api/services/aiInsightService';
import { useAiMode } from '../../context/aiMode';
import { useSnackbar } from '../../context/useSnackbar';
import { patientLocalData } from '../../data/patientLocalData';
import type { AiInsightSection, ChatContext, ChatMessage } from '../../types';
import './AiChatPanel.css';

const SECTION_LABEL: Record<AiInsightSection, string> = {
  trend: '확률 추이',
  shap: 'SHAP 피처 기여도',
  rawMetrics: 'Raw 임상 지표',
  auxiliary: '보조지표 (치료 에스컬레이션)',
};

const PATIENT_PROMPT_EXAMPLES: string[] = [
  '현재 환자 상태를 요약해주세요',
  '가장 위험한 예측 모델은 무엇인가요?',
  '최근 바이탈 변화 추세를 알려주세요',
  '확률 추이에 대해 자세히 설명해주세요',
  'SHAP 기여도 분석을 설명해주세요',
];

/** 환자 표시명 — PatientHeader 와 동일 소스(patientLocalData). 미스 시 토큰 폴백. */
function resolvePatientLabel(
  context: Extract<ChatContext, { type: 'patient' }>,
): string {
  return (
    patientLocalData[context.patientToken ?? '']?.name ??
    context.patientToken ??
    context.stayToken
  );
}

function buildHeaderTitle(context: ChatContext | null): string {
  if (!context) return 'AI 어시스턴트';
  if (context.type === 'patient') {
    return `환자 AI 어시스턴트 · ${resolvePatientLabel(context)}`;
  }
  return `${SECTION_LABEL[context.section]} · AI 설명`;
}

function buildContextKey(context: ChatContext | null): string {
  if (!context) return 'none';
  if (context.type === 'patient') return `patient:${context.stayToken}`;
  return `section:${context.modelKey}:${context.section}`;
}

function buildSessionTitle(context: ChatContext): string {
  if (context.type === 'patient') return `환자 ${context.stayToken} 문의`;
  return `${SECTION_LABEL[context.section]} 문의`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiChatPanel() {
  const { chatPanelOpen, chatContext, closeChatPanel } = useAiMode();
  const { show: showSnackbar } = useSnackbar();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingResponse, setPendingResponse] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextKey = buildContextKey(chatContext);

  // 컨텍스트 변경 시 동기 상태 리셋 — render-time prop 동기화 패턴.
  const [prevContextKey, setPrevContextKey] = useState(contextKey);
  if (prevContextKey !== contextKey) {
    setPrevContextKey(contextKey);
    setPendingResponse(false);
    setInput('');
    setMessages([]);
    setSessionKey(null);
  }

  // 세션은 인트로 표시용으로 미리 만들지 않는다 — 첫 메시지 전송 시 sendMessage 에서
  // lazily 생성한다. 대화 시작 전(messages 비어 있음)에는 웰컴 영역만 보여준다.

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (!chatPanelOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatPanelOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !chatContext || pendingResponse) return;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setPendingResponse(true);
    try {
      // 세션 생성이 아직 진행 중일 수 있어 lazily 재생성.
      let key = sessionKey;
      if (!key) {
        const session = await createChatSession(
          chatContext.type === 'patient' ? chatContext.stayToken : 'unknown',
          buildSessionTitle(chatContext),
        );
        key = session.sessionKey;
        setSessionKey(key);
      }
      const reply = await postChatMessage(key, trimmed);
      // adapter: assistant → ai, content → text
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'ai', text: reply.content },
      ]);
    } catch {
      // 응답 없이 typing dot만 꺼지면 사용자가 상태를 알 수 없으므로 Snackbar로 안내.
      showSnackbar({
        message: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
        type: 'error',
      });
    } finally {
      setPendingResponse(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    void sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 대화 시작 전(환자 컨텍스트 + messages 비어 있음) 웰컴 영역을 보여줄지 여부.
  const showWelcome = chatContext?.type === 'patient' && messages.length === 0;

  return (
    <aside
      className={`ai-chat ${chatPanelOpen ? 'ai-chat--open' : ''}`}
      aria-hidden={!chatPanelOpen}
      aria-label="AI 어시스턴트 채팅"
    >
      <header className="ai-chat__header">
        <h3 className="ai-chat__title">
          <Sparkles size={16} className="ai-chat__title-icon" aria-hidden="true" />
          {buildHeaderTitle(chatContext)}
        </h3>
        <button
          type="button"
          className="ai-chat__close"
          onClick={closeChatPanel}
          aria-label="채팅 닫기"
        >
          <X size={18} />
        </button>
      </header>

      <div className="ai-chat__messages" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-chat__msg ai-chat__msg--${msg.role}`}
          >
            <div className="ai-chat__bubble">{msg.text}</div>
            {msg.role === 'ai' && (
              <div className="ai-chat__disclaimer">
                <Info size={11} aria-hidden="true" />
                AI 생성 텍스트 · 임상 판단 대체 불가
              </div>
            )}
          </div>
        ))}
        {showWelcome && (
          <div className="ai-chat__welcome">
            <Sparkles
              size={28}
              className="ai-chat__welcome-icon"
              aria-hidden="true"
            />
            <p className="ai-chat__welcome-text">
              안녕하세요. <br />
              {resolvePatientLabel(chatContext)} 환자의 현재 상태에 대해 질문해주세요.
            </p>
            <div className="ai-chat__prompts" role="group" aria-label="예제 질문">
              {PATIENT_PROMPT_EXAMPLES.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-chat__prompt"
                  onClick={() => void sendMessage(prompt)}
                  disabled={pendingResponse}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {pendingResponse && (
          <div className="ai-chat__msg ai-chat__msg--ai">
            <div className="ai-chat__bubble ai-chat__bubble--typing" aria-label="AI 응답 작성 중">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="ai-chat__input"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <textarea
          className="ai-chat__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요..."
          rows={1}
          aria-label="질문 입력"
        />
        <button
          type="submit"
          className="ai-chat__send"
          disabled={!input.trim() || pendingResponse}
          aria-label="메시지 전송"
        >
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
}
