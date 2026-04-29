import { MessageCircle } from 'lucide-react';
import { useAiMode } from '../../context/aiMode';
import './FloatingChatButton.css';

interface FloatingChatButtonProps {
  patientId: string;
}

export default function FloatingChatButton({ patientId }: FloatingChatButtonProps) {
  const { chatPanelOpen, openChatPanel, closeChatPanel } = useAiMode();

  const handleClick = () => {
    if (chatPanelOpen) {
      closeChatPanel();
    } else {
      openChatPanel({ type: 'patient', patientId });
    }
  };

  return (
    <button
      type="button"
      className="floating-chat"
      onClick={handleClick}
      aria-label={chatPanelOpen ? '채팅 닫기' : '환자 AI 어시스턴트 열기'}
      title={chatPanelOpen ? '채팅 닫기' : '환자 AI 어시스턴트'}
    >
      <MessageCircle size={24} aria-hidden="true" />
    </button>
  );
}
