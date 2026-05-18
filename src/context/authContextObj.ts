import { createContext } from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * LoginPage 가 받는 결과 타입.
 * SDK의 CognitoUser 객체는 AuthContext 내부에 숨기고, LoginPage 에는
 * 다음 단계 분기에 필요한 정보만 노출한다.
 */
export type LoginResult =
  | { kind: 'success' }
  | { kind: 'newPasswordRequired'; requiredAttributes: string[] }
  | { kind: 'error'; code: string; message: string };

export interface AuthContextValue {
  status: AuthStatus;
  idToken: string | null;
  username: string | null;
  /** 일반 SRP 로그인. NEW_PASSWORD_REQUIRED 챌린지는 pending 상태로 내부 보관. */
  login: (username: string, password: string) => Promise<LoginResult>;
  /** login 이 newPasswordRequired 를 반환한 직후에만 의미 있음. */
  completeNewPassword: (
    newPassword: string,
    userAttributes?: Record<string, string>,
  ) => Promise<LoginResult>;
  logout: () => void;
}

export const AuthCtx = createContext<AuthContextValue | null>(null);
