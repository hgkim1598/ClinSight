import { useParams } from 'react-router-dom';
import FloatingChatButton from '../components/common/FloatingChatButton';

export default function DrilldownPage() {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <div>
      <h2>모델 상세</h2>
      <p>확률 추이, SHAP, Raw 지표가 여기에 들어올 예정</p>
      <FloatingChatButton patientId={id} />
    </div>
  );
}
