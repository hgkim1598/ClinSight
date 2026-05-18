import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/**
 * 보호 라우트 가드.
 *
 * - `loading`     : 세션 복원 중. 깜빡임 방지를 위해 빈 화면.
 * - `unauthenticated` : `/login` 으로 리다이렉트. 원래 경로는 `state.from` 으로 전달
 *                       → 로그인 후 자동 복귀 가능.
 * - `authenticated` : 자식 라우트 렌더.
 *
 * mock 모드(`VITE_USE_MOCK=true`)에서는 AuthContext 가 즉시 `authenticated` 로
 * 고정되므로 자연히 통과한다.
 */
export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div aria-hidden="true" />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
