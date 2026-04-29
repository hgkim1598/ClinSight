import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChatContext } from '../types';
import { AiModeContext } from './aiMode';

interface AiModeProviderProps {
  children: ReactNode;
}

export function AiModeProvider({ children }: AiModeProviderProps) {
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

  const openChatPanel = useCallback((context: ChatContext) => {
    setChatContext(context);
    setChatPanelOpen(true);
  }, []);

  const closeChatPanel = useCallback(() => {
    setChatPanelOpen(false);
  }, []);

  return (
    <AiModeContext.Provider
      value={{ chatPanelOpen, chatContext, openChatPanel, closeChatPanel }}
    >
      {children}
    </AiModeContext.Provider>
  );
}
