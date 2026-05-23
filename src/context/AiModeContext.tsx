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
    setChatPanelOpen(false);
    // 이전 환자 컨텍스트가 남아 다음에 열 때 잘못된 환자가 보이는 것을 방지.
    setChatContext(null);
  }, []);

  // 라우트(pathname) 변경 시 채팅 패널 자동 닫기.
  // 모델 상세 전환처럼 같은 pathname 내 state 변경은 pathname 이 그대로라 영향 없음.
  useEffect(() => {
    closeChatPanel();
  }, [pathname, closeChatPanel]);

  return (
    <AiModeContext.Provider
      value={{ chatPanelOpen, chatContext, openChatPanel, closeChatPanel }}
    >
      {children}
    </AiModeContext.Provider>
  );
}
