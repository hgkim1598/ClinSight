import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { ChatContext } from '../types';
import { AiModeContext } from './aiMode';

interface AiModeProviderProps {
  children: ReactNode;
}

export function AiModeProvider({ children }: AiModeProviderProps) {
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const { pathname } = useLocation();

  const openChatPanel = useCallback((context: ChatContext) => {
    setChatContext(context);
    setChatPanelOpen(true);
  }, []);

  const closeChatPanel = useCallback(() => {
    // 패널만 숨긴다. chatContext 는 유지 → 같은 환자에서 다시 열면 대화/세션이 보존된다.
    setChatPanelOpen(false);
  }, []);

  // 라우트(pathname) 변경 시에만 완전 리셋: 패널 닫기 + 컨텍스트 비우기.
  // (모델 상세 전환처럼 같은 pathname 내 state 변경은 pathname 이 그대로라 영향 없음.)
  useEffect(() => {
    setChatPanelOpen(false);
    setChatContext(null);
  }, [pathname]);

  return (
    <AiModeContext.Provider
      value={{ chatPanelOpen, chatContext, openChatPanel, closeChatPanel }}
    >
      {children}
    </AiModeContext.Provider>
  );
}
