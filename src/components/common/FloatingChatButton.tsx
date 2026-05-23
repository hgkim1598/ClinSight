import { MessageCircle } from 'lucide-react';
import { useAiMode } from '../../context/aiMode';
import './FloatingChatButton.css';

interface FloatingChatButtonProps {
  stayToken: string;
  /** 헤더에 환자 이름을 표시하기 위한 토큰 (없으면 stayToken 폴백). */
  patientToken?: string;
}

export default function FloatingChatButton({
  stayToken,
  patientToken,
}: FloatingChatButtonProps) {
  const { chatPanelOpen, openChatPanel, closeChatPanel } = useAiMode();

  const handleClick = () => {
    if (chatPanelOpen) {
      closeChatPanel();
    } else {
      openChatPanel({ type: 'patient', stayToken, patientToken });
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
