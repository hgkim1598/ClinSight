import { createContext, useContext } from 'react';
import type { ChatContext } from '../types';

export interface AiModeContextValue {
  chatPanelOpen: boolean;
  chatContext: ChatContext | null;
  openChatPanel: (context: ChatContext) => void;
  closeChatPanel: () => void;
}

export const AiModeContext = createContext<AiModeContextValue | null>(null);

export function useAiMode(): AiModeContextValue {
  const ctx = useContext(AiModeContext);
  if (!ctx) {
    throw new Error('useAiMode must be used within AiModeProvider');
  }
  return ctx;
}
