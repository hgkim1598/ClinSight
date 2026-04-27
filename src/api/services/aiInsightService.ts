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
 * 현재는 mock 매트릭스를 동기 조회하지만, 백엔드 연결 시 Bedrock fetch로 교체될 자리.
 */
export function getAiInsight(model: ModelKey, section: AiInsightSection): string {
  return aiInsights[model]?.[section] ?? '';
}

/**
 * 채팅 패널 진입 시 AI가 먼저 보내는 인트로 메시지.
 * 추후 Bedrock 호출(시스템 프롬프트 + 컨텍스트 결합)로 교체될 자리.
 */
export function getChatIntro(context: ChatContext): string {
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
export function getChatResponse(context: ChatContext, _userMessage: string): string {
  void _userMessage;
  return getChatResponseFromMock(context);
}
