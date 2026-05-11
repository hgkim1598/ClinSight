/**
 * AI Insight & Chat Service
 *
 * V4 명세 §11, §12. 모든 함수는 mock 모드에서는 더미 응답을 반환한다.
 *
 *  - POST /ai/insights                                   → postAiInsight()
 *  - POST /ai/chat/sessions                              → createChatSession()
 *  - POST /ai/chat/sessions/{sessionKey}/messages        → postChatMessage()
 *  - GET  /ai/chat/sessions/{sessionKey}/messages        → getChatMessages()
 *
 * 모든 mock 응답에는 "임상 판단은 담당 의료진의 평가가 필요합니다" 안전 문구를 포함한다.
 */

import type { AiInsightSection, ChatContext, ModelKey } from '../../types';
import { MOCK_MODE, request } from '../client';
import { aiInsights, buildPatientChatIntro, buildSectionChatIntro } from '../mock/aiInsights';

// ============================================================
// AI Insight — POST /ai/insights
// ============================================================

export interface AiInsightResult {
  interactionId: string;
  /** Bedrock이 생성한 임상 설명. */
  explanation: string;
  /** ai_interactions 캐시 히트 여부. */
  cached: boolean;
}

interface WireAiInsightResponse {
  interaction_id: string;
  interaction_type: string;
  stay_token: string;
  prediction_id: string;
  explanation: string;
  top_factors: unknown[];
  guardrail_result: unknown;
  model_provider: string;
  llm_model_id: string;
  cached: boolean;
  created_at: string;
}

/**
 * 단일 SHAP/모델 설명을 받는다. 채팅이 아님.
 * 모델 상세 화면의 AI 설명 카드, 섹션별 인사이트 모달에 사용.
 */
export async function postAiInsight(
  stayToken: string,
  predictionId: string,
  modelKey: string,
  forceRefresh = false,
): Promise<AiInsightResult> {
  if (MOCK_MODE) {
    return {
      interactionId: `mock-insight-${Date.now()}`,
      explanation:
        '현재 입력된 수치 기준으로 48시간 사망 위험도가 높게 예측되었으며, 주요 기여 요인은 lactate 상승과 평균 동맥압 저하입니다. 임상 판단은 담당 의료진의 평가가 필요합니다.',
      cached: false,
    };
  }
  const w = await request<WireAiInsightResponse>('/ai/insights', {
    method: 'POST',
    body: JSON.stringify({
      stay_token: stayToken,
      prediction_id: predictionId,
      model_key: modelKey,
      force_refresh: forceRefresh,
    }),
  });
  return {
    interactionId: w.interaction_id,
    explanation: w.explanation,
    cached: w.cached,
  };
}

// ============================================================
// AI Chat Session — POST /ai/chat/sessions
// ============================================================

export interface ChatSession {
  sessionKey: string;
  createdAt: string;
}

interface WireChatSessionResponse {
  interaction_id: string;
  interaction_type: string;
  session_key: string;
  created_at: string;
}

export async function createChatSession(
  stayToken: string,
  sessionTitle: string,
): Promise<ChatSession> {
  if (MOCK_MODE) {
    void stayToken;
    void sessionTitle;
    return {
      sessionKey: `mock-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
  }
  const w = await request<WireChatSessionResponse>('/ai/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({
      stay_token: stayToken,
      session_title: sessionTitle,
    }),
  });
  return {
    sessionKey: w.session_key,
    createdAt: w.created_at,
  };
}

// ============================================================
// Chat Message I/O
// ============================================================

/**
 * V4 wire role. UI 컴포넌트는 `'ai' | 'user'`를 쓰므로 호출 측에서 어댑트한다.
 */
export type ChatRole = 'user' | 'assistant';

export interface ChatMessageDTO {
  role: ChatRole;
  content: string;
}

interface WirePostMessageResponse {
  interaction_id: string;
  interaction_type: string;
  session_key: string;
  output_text: string;
  guardrail_result: unknown;
  created_at: string;
}

interface WireGetMessagesResponse {
  session_key: string;
  messages: Array<{
    interaction_id: string;
    role: ChatRole;
    content: string;
    created_at: string;
  }>;
}

export async function postChatMessage(
  sessionKey: string,
  message: string,
): Promise<ChatMessageDTO> {
  if (MOCK_MODE) {
    return {
      role: 'assistant',
      content:
        '현재 환자의 lactate 수치는 정상 범위를 초과합니다. 임상 판단은 담당 의료진의 평가가 필요합니다.',
    };
  }
  const w = await request<WirePostMessageResponse>(
    `/ai/chat/sessions/${encodeURIComponent(sessionKey)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ message }),
    },
  );
  return {
    role: 'assistant',
    content: w.output_text,
  };
}

export async function getChatMessages(
  sessionKey: string,
): Promise<ChatMessageDTO[]> {
  if (MOCK_MODE) {
    return [
      {
        role: 'user',
        content: '현재 환자 상태에 대해 알려주세요',
      },
      {
        role: 'assistant',
        content:
          '현재 환자의 주요 임상 지표가 악화 추세이며, 패혈증 진행 위험이 평가됩니다. 임상 판단은 담당 의료진의 평가가 필요합니다.',
      },
    ];
  }
  const w = await request<WireGetMessagesResponse>(
    `/ai/chat/sessions/${encodeURIComponent(sessionKey)}/messages`,
  );
  return w.messages.map((m) => ({ role: m.role, content: m.content }));
}

// ============================================================
// 호환 어댑터 — 기존 컴포넌트가 한 단계씩 마이그레이션할 수 있도록
// ============================================================

/**
 * 섹션별 AI 설명 (mock 매트릭스 lookup) — ModelDetailView/AiInsightModal에서 사용.
 * 백엔드 연결 시: `postAiInsight()` 호출로 교체. modelKey + section 매핑은 호출자가 처리.
 */
export async function getAiInsight(
  model: ModelKey,
  section: AiInsightSection,
): Promise<string> {
  return aiInsights[model]?.[section] ?? '';
}

/**
 * 채팅 인트로 텍스트. mock 모드에서만 의미가 있고, 백엔드 연결 시
 * createChatSession 직후 첫 메시지로 사용하거나 시스템 프롬프트로 대체.
 */
export async function getChatIntro(context: ChatContext): Promise<string> {
  if (context.type === 'patient') {
    return buildPatientChatIntro(context.stayToken);
  }
  return buildSectionChatIntro(context.modelKey, context.section);
}
