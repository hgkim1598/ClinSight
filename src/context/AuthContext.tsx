/**
 * AuthContext — Provider only.
 *
 * - 컨텍스트 객체/타입은 `./authContextObj`, hook 은 `./useAuth`.
 *   (react-refresh 규칙: 컴포넌트 파일은 컴포넌트만 export)
 * - 세션 저장은 amazon-cognito-identity-js 가 localStorage 에 직접 한다.
 *   여기서는 그 결과(SignInResult)를 받아 React 상태로 반영만 한다.
 * - mock 모드(`VITE_USE_MOCK==='true'`)에서는 Cognito 호출을 일절 하지 않고
 *   바로 `authenticated` 로 고정한다 — 백엔드 미연결 상태에서도 화면이 그대로 떠야 하므로.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import {
  completeNewPassword as cognitoCompleteNewPassword,
  restoreSession,
  signIn,
  signOut as cognitoSignOut,
} from '../lib/cognito';
import { subscribe } from '../lib/tokenStore';
import {
  AuthCtx,
  type AuthContextValue,
  type AuthStatus,
  type LoginResult,
} from './authContextObj';

const MOCK_AUTH = import.meta.env.VITE_USE_MOCK === 'true';

interface SessionState {
  status: AuthStatus;
  idToken: string | null;
  username: string | null;
}

const INITIAL_STATE: SessionState = MOCK_AUTH
  ? { status: 'authenticated', idToken: null, username: 'mock-user' }
  : { status: 'loading', idToken: null, username: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);
  // NEW_PASSWORD_REQUIRED 진행 중인 CognitoUser. 컴포넌트 리렌더와 무관하므로 ref.
  const pendingUserRef = useRef<CognitoUser | null>(null);

  // 새로고침 시 SDK 가 보존한 세션을 비동기 복원.
  useEffect(() => {
    if (MOCK_AUTH) return;
    let cancelled = false;
    void restoreSession().then((s) => {
      if (cancelled) return;
      if (s) {
        setState({ status: 'authenticated', idToken: s.idToken, username: s.username });
      } else {
        setState({ status: 'unauthenticated', idToken: null, username: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 다른 탭에서의 로그인/로그아웃 동기화.
  useEffect(() => {
    if (MOCK_AUTH) return;
    return subscribe(() => {
      void restoreSession().then((s) => {
        if (s) {
          setState({ status: 'authenticated', idToken: s.idToken, username: s.username });
        } else {
          setState({ status: 'unauthenticated', idToken: null, username: null });
        }
      });
    });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    if (MOCK_AUTH) return { kind: 'success' };

    const result = await signIn(username, password);
    if (result.kind === 'success') {
      pendingUserRef.current = null;
      setState({
        status: 'authenticated',
        idToken: result.idToken,
        username: result.username,
      });
      return { kind: 'success' };
    }
    if (result.kind === 'newPasswordRequired') {
      pendingUserRef.current = result.user;
      return { kind: 'newPasswordRequired', requiredAttributes: result.requiredAttributes };
    }
    return { kind: 'error', code: result.code, message: result.message };
  }, []);

  const completeNewPassword = useCallback(
    async (newPassword: string, userAttributes: Record<string, string> = {}): Promise<LoginResult> => {
      if (MOCK_AUTH) return { kind: 'success' };

      const pending = pendingUserRef.current;
      if (!pending) {
        return {
          kind: 'error',
          code: 'NoPendingChallenge',
          message: '진행 중인 새 비밀번호 챌린지가 없습니다.',
        };
      }
      const result = await cognitoCompleteNewPassword(pending, newPassword, userAttributes);
      if (result.kind === 'success') {
        pendingUserRef.current = null;
        setState({
          status: 'authenticated',
          idToken: result.idToken,
          username: result.username,
        });
        return { kind: 'success' };
      }
      if (result.kind === 'error') {
        return { kind: 'error', code: result.code, message: result.message };
      }
      // newPasswordRequired 가 또 올 일은 없지만 타입 안전을 위해.
      return { kind: 'error', code: 'UnexpectedChallenge', message: '예기치 못한 응답입니다.' };
    },
    [],
  );

  const logout = useCallback(() => {
    if (!MOCK_AUTH) cognitoSignOut();
    pendingUserRef.current = null;
    setState({ status: 'unauthenticated', idToken: null, username: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      idToken: state.idToken,
      username: state.username,
      login,
      completeNewPassword,
      logout,
    }),
    [state, login, completeNewPassword, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
