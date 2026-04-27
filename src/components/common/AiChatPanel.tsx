import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Info, Send, Sparkles, X } from 'lucide-react';
import { getChatIntro, getChatResponse } from '../../api/services/aiInsightService';
import { useAiMode } from '../../context/AiModeContext';
import type { AiInsightSection, ChatContext, ChatMessage } from '../../types';
import './AiChatPanel.css';

const SECTION_LABEL: Record<AiInsightSection, string> = {
  trend: '확률 추이',
  shap: 'SHAP 피처 기여도',
  rawMetrics: 'Raw 임상 지표',
  auxiliary: '보조지표 (치료 에스컬레이션)',
};

const RESPONSE_DELAY_MS = 450;

const PATIENT_PROMPT_EXAMPLES: string[] = [
  '현재 환자 상태를 요약해주세요',
  '가장 위험한 예측 모델은 무엇인가요?',
  '최근 바이탈 변화 추세를 알려주세요',
  '확률 추이에 대해 자세히 설명해주세요',
  'SHAP 기여도 분석을 설명해주세요',
];

function buildHeaderTitle(context: ChatContext | null): string {
  if (!context) return 'AI 어시스턴트';
  if (context.type === 'patient') return `환자 AI 어시스턴트 · ${context.patientId}`;
  return `${SECTION_LABEL[context.section]} · AI 설명`;
}

function buildContextKey(context: ChatContext | null): string {
  if (!context) return 'none';
  if (context.type === 'patient') return `patient:${context.patientId}`;
  return `section:${context.modelKey}:${context.section}`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiChatPanel() {
  const { chatPanelOpen, chatContext, closeChatPanel } = useAiMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingResponse, setPendingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<number | null>(null);

  const contextKey = buildContextKey(chatContext);

  // 컨텍스트 변경 시 메시지 리셋 + 인트로 시드
  useEffect(() => {
    if (responseTimerRef.current != null) {
      window.clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
    setPendingResponse(false);
    setInput('');
    if (!chatContext) {
      setMessages([]);
      return;
    }
    setMessages([
      {
        id: makeId(),
        role: 'ai',
        text: getChatIntro(chatContext),
      },
    ]);
  }, [contextKey, chatContext]);

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (!chatPanelOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatPanelOpen]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (responseTimerRef.current != null) {
        window.clearTimeout(responseTimerRef.current);
      }
    };
  }, []);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !chatContext || pendingResponse) return;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setPendingResponse(true);

    responseTimerRef.current = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'ai',
          text: getChatResponse(chatContext, trimmed),
        },
      ]);
      setPendingResponse(false);
      responseTimerRef.current = null;
    }, RESPONSE_DELAY_MS);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 환자 전체 컨텍스트 + 사용자 메시지가 한 건도 없을 때만 예제 프롬프트 노출
  const showPromptExamples =
    chatContext?.type === 'patient' && messages.every((m) => m.role === 'ai');

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
        {showPromptExamples && (
          <div className="ai-chat__prompts" role="group" aria-label="예제 질문">
            {PATIENT_PROMPT_EXAMPLES.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ai-chat__prompt"
                onClick={() => sendMessage(prompt)}
                disabled={pendingResponse}
              >
                {prompt}
              </button>
            ))}
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
