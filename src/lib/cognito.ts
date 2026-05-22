/// <reference types="vite/client" />

/**
 * Cognito SRP 인증 래퍼.
 *
 * `amazon-cognito-identity-js`는 콜백 기반이라 그대로 쓰면 UI 코드가 지저분해진다.
 * 여기서 Promise + discriminated union 결과로 단순화한다.
 *
 * - SRP는 `authenticateUser()`의 기본 플로우이므로 별도 설정 불필요.
 * - 세션 저장은 SDK가 localStorage에 직접 관리한다 (키: `CognitoIdentityServiceProvider.<clientId>.*`).
 *   tokenStore는 이 SDK 세션을 읽는 얇은 래퍼로만 동작한다 — 별도 저장소 두지 않음.
 * - Public Client (Client Secret 없음) 전제.
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

export type SignInResult =
  | {
      kind: 'success';
      idToken: string;
      expiresAt: number; // epoch seconds
      username: string;
    }
  | {
      kind: 'newPasswordRequired';
      user: CognitoUser;
      userAttributes: Record<string, string>;
      requiredAttributes: string[];
    }
  | {
      kind: 'error';
      code: string;
      message: string;
    };

let cachedPool: CognitoUserPool | null = null;

/** 환경변수에서 UserPool 싱글톤을 구성. 누락 시 즉시 에러. */
export function getUserPool(): CognitoUserPool {
  if (cachedPool) return cachedPool;

  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

  if (!userPoolId || !clientId) {
    throw new Error(
      'Cognito 환경변수가 설정되지 않았습니다. .env 의 VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_CLIENT_ID 를 확인하세요.',
    );
  }

  cachedPool = new CognitoUserPool({
    UserPoolId: userPoolId,
    ClientId: clientId,
  });
  return cachedPool;
}

function sessionToSuccess(session: CognitoUserSession, username: string): SignInResult {
  const idToken = session.getIdToken();
  return {
    kind: 'success',
    idToken: idToken.getJwtToken(),
    expiresAt: idToken.getExpiration(),
    username,
  };
}

/** SRP 로그인. NEW_PASSWORD_REQUIRED 챌린지는 별도 분기로 노출. */
export function signIn(username: string, password: string): Promise<SignInResult> {
  const pool = getUserPool();
  const user = new CognitoUser({ Username: username, Pool: pool });
  const authDetails = new AuthenticationDetails({ Username: username, Password: password });

  return new Promise((resolve) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve(sessionToSuccess(session, user.getUsername()));
      },
      onFailure: (err: { code?: string; name?: string; message?: string }) => {
        resolve({
          kind: 'error',
          code: err?.code ?? err?.name ?? 'UnknownError',
          message: err?.message ?? '로그인에 실패했습니다.',
        });
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        resolve({
          kind: 'newPasswordRequired',
          user,
          userAttributes: (userAttributes ?? {}) as Record<string, string>,
          requiredAttributes: (requiredAttributes ?? []) as string[],
        });
      },
    });
  });
}

/**
 * NEW_PASSWORD_REQUIRED 챌린지 완료.
 *
 * SDK 알려진 함정: `userAttributes`에 `email_verified` / `phone_number_verified` 같은
 * 읽기 전용 속성이 섞여 있으면 `InvalidParameterException`이 발생한다.
 * 그래서 이 함수는 호출 측이 신경 안 쓰도록 내부에서 걸러낸다.
 * (필요한 속성만 채워 넘기는 게 안전한 기본값.)
 */
export function completeNewPassword(
  user: CognitoUser,
  newPassword: string,
  userAttributes: Record<string, string>,
): Promise<SignInResult> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(userAttributes)) {
    if (key === 'email_verified' || key === 'phone_number_verified') continue;
    sanitized[key] = value;
  }

  return new Promise((resolve) => {
    user.completeNewPasswordChallenge(newPassword, sanitized, {
      onSuccess: (session) => {
        resolve(sessionToSuccess(session, user.getUsername()));
      },
      onFailure: (err: { code?: string; name?: string; message?: string }) => {
        resolve({
          kind: 'error',
          code: err?.code ?? err?.name ?? 'UnknownError',
          message: err?.message ?? '새 비밀번호 설정에 실패했습니다.',
        });
      },
    });
  });
}

/** 새로고침 등으로 메모리 상태가 사라졌을 때 SDK가 저장한 세션을 복원. */
export function restoreSession(): Promise<{
  idToken: string;
  expiresAt: number;
  username: string;
} | null> {
  const pool = getUserPool();
  const user = pool.getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      const idToken = session.getIdToken();
      resolve({
        idToken: idToken.getJwtToken(),
        expiresAt: idToken.getExpiration(),
        username: user.getUsername(),
      });
    });
  });
}

/** 로컬 세션 즉시 제거. globalSignOut은 네트워크 실패 가능성이 있어 best-effort. */
export function signOut(): void {
  const pool = getUserPool();
  const user = pool.getCurrentUser();
  if (!user) return;
  user.signOut();
}
