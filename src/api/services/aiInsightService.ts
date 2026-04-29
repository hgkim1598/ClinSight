/**
 * AI Insight & Chat Service
 *
 * 현재: mock 매트릭스에서 동기 조회 (src/api/mock/aiInsights.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>() 또는 Bedrock SDK 호출로 교체
 *   3. endpoint 예시:
 *      - POST /ai/insight  { modelKey, section } → { text }
 *      - POST /ai/chat     { context, message } → { text }
 *      - 캐시 hit 체크는 백엔드 책임 (DDB AiInsightsCache)
 *
 * 참고: docs/DYNAMO_SCHEMA.md §10 AiInsightsCache + §16 ChatMessages
 */
import {
  aiInsights,
  buildPatientChatIntro,
  buildSectionChatIntro,
  getChatResponseFromMock,
} from '../mock/aiInsights';
import type {
  AiInsightSection,
  ChatContext,
  ModelKey,
} from '../../types';

/**
 * 섹션별 AI 설명 텍스트를 반환한다.
 * 백엔드 연결 시 Bedrock 호출로 교체될 자리.
 */
export async function getAiInsight(
  model: ModelKey,
  section: AiInsightSection,
): Promise<string> {
  return aiInsights[model]?.[section] ?? '';
}

/**
 * 채팅 패널 진입 시 AI가 먼저 보내는 인트로 메시지.
 * 추후 Bedrock 호출(시스템 프롬프트 + 컨텍스트 결합)로 교체될 자리.
 */
export async function getChatIntro(context: ChatContext): Promise<string> {
  if (context.type === 'patient') {
    return buildPatientChatIntro(context.patientId);
  }
  return buildSectionChatIntro(context.modelKey, context.section);
}

/**
 * 사용자 메시지에 대한 AI 응답.
 * 현재는 mock 응답 풀에서 랜덤 선택. 추후 Bedrock 호출로 교체될 자리이며,
 * userMessage는 현재 mock에서는 사용하지 않지만 인터페이스는 유지한다.
 */
export async function getChatResponse(
  context: ChatContext,
  _userMessage: string,
): Promise<string> {
  void _userMessage;
  return getChatResponseFromMock(context);
}
