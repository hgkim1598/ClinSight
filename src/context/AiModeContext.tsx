import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChatContext } from '../types';

interface AiModeContextValue {
  chatPanelOpen: boolean;
  chatContext: ChatContext | null;
  openChatPanel: (context: ChatContext) => void;
  closeChatPanel: () => void;
}

const AiModeContext = createContext<AiModeContextValue | null>(null);

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

export function useAiMode(): AiModeContextValue {
  const ctx = useContext(AiModeContext);
  if (!ctx) {
    throw new Error('useAiMode must be used within AiModeProvider');
  }
  return ctx;
}
