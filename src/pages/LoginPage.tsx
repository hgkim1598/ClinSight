import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, CreditCard } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import './LoginPage.css';

type Stage = 'form' | 'newPassword' | 'splash';

interface LocationStateFrom {
  from?: { pathname?: string };
}

/** Cognito 에러 코드를 사용자에게 보여줄 한글 메시지로 변환. */
function describeError(code: string, fallback: string): string {
  switch (code) {
    case 'NotAuthorizedException':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'UserNotFoundException':
      return '등록되지 않은 사용자입니다.';
    case 'PasswordResetRequiredException':
      return '비밀번호 재설정이 필요합니다. 관리자에게 문의해 주세요.';
    case 'UserNotConfirmedException':
      return '계정이 아직 확인되지 않았습니다. 관리자에게 문의해 주세요.';
    case 'InvalidPasswordException':
      return '비밀번호가 정책에 맞지 않습니다. 길이/문자 종류를 확인해 주세요.';
    case 'InvalidParameterException':
      return '입력값이 올바르지 않습니다.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return '시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    case 'NetworkError':
      return '네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.';
    default:
      return fallback || '로그인에 실패했습니다.';
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login, completeNewPassword } = useAuth();

  const [stage, setStage] = useState<Stage>('form');
  // TODO: 프로덕션 전 제거 — 개발/시연 편의용 기본값.
  const [email, setEmail] = useState('doctor01@clinsight-test.com');
  const [password, setPassword] = useState('ClinsightDoctor#1');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const from =
    (location.state as LocationStateFrom | null)?.from?.pathname ?? '/';

  // 이미 로그인된 상태로 /login 진입 시 원래 가려던 곳으로.
  // splash 단계에서는 finishAndNavigate 의 setTimeout 이 이동을 책임지므로 건너뜀
  // (그러지 않으면 로그인 직후 status 전환을 잡아 즉시 navigate → splash 가 렌더 기회 없음).
  useEffect(() => {
    if (status === 'authenticated' && stage !== 'splash') {
      navigate(from, { replace: true });
    }
  }, [status, stage, navigate, from]);

  // 챌린지로 전환되면 새 비번 필드에 포커스.
  useEffect(() => {
    if (stage === 'newPassword') {
      newPasswordRef.current?.focus();
    }
  }, [stage]);

  // 세션 복원 중에는 깜빡임 방지를 위해 폼을 숨김.
  if (status === 'loading') {
    return <div className="login" aria-hidden="true" />;
  }

  const finishAndNavigate = () => {
    setStage('splash');
    window.setTimeout(() => navigate(from, { replace: true }), 1500);
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = email.trim();
    const pw = password;
    if (!id || !pw) {
      emailRef.current?.focus();
      setErrorMsg('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await login(id, pw);
      if (result.kind === 'success') {
        finishAndNavigate();
        return;
      }
      if (result.kind === 'newPasswordRequired') {
        setStage('newPassword');
        return;
      }
      setErrorMsg(describeError(result.code, result.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewPasswordSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPassword || !newPasswordConfirm) {
      setErrorMsg('새 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await completeNewPassword(newPassword);
      if (result.kind === 'success') {
        finishAndNavigate();
        return;
      }
      if (result.kind === 'error') {
        setErrorMsg(describeError(result.code, result.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const welcomeName = email.trim() || '사용자';

  return (
    <div className="login">
      <div className="login__bg" aria-hidden="true" />

      {stage === 'form' && (
        <form className="login__card" onSubmit={handleSubmit} noValidate>
          <div className="login__brand">
            <span className="login__logo-mark">
              <Activity size={22} />
            </span>
            <span className="login__brand-name">ClinSight</span>
          </div>
          <p className="login__subtitle">ICU Sepsis CDSS · MIMIC-IV</p>

          <div className="login__field">
            <label className="login__label" htmlFor="login-email">
              이메일
            </label>
            <input
              ref={emailRef}
              id="login-email"
              className="login__input"
              type="email"
              placeholder="name@example.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              className="login__input"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {errorMsg && (
            <p className="login__error" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="login__row">
            <label className="login__remember" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                className="login__checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>이 기기 기억하기</span>
            </label>
            <button type="button" className="login__link" disabled>
              비밀번호 찾기
            </button>
          </div>

          <button
            type="submit"
            className="login__btn login__btn--primary"
            disabled={submitting}
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <div className="login__divider" role="separator">
            <span className="login__divider-text">또는</span>
          </div>

          <button
            type="button"
            className="login__btn login__btn--badge"
            disabled
            title="준비 중"
          >
            <CreditCard size={18} />
            <span>ID 배지로 로그인 (준비 중)</span>
          </button>

          <p className="login__footer">v4.2.1 · HIRA 인증 · © 2026 ClinSight</p>
        </form>
      )}

      {stage === 'newPassword' && (
        <form className="login__card" onSubmit={handleNewPasswordSubmit} noValidate>
          <div className="login__brand">
            <span className="login__logo-mark">
              <Activity size={22} />
            </span>
            <span className="login__brand-name">ClinSight</span>
          </div>
          <p className="login__subtitle">
            최초 로그인입니다. 사용할 새 비밀번호를 설정해 주세요.
          </p>

          <div className="login__field">
            <label className="login__label" htmlFor="login-new-password">
              새 비밀번호
            </label>
            <input
              ref={newPasswordRef}
              id="login-new-password"
              className="login__input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-new-password-confirm">
              새 비밀번호 확인
            </label>
            <input
              id="login-new-password-confirm"
              className="login__input"
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              disabled={submitting}
            />
          </div>

          {errorMsg && (
            <p className="login__error" role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="login__btn login__btn--primary"
            disabled={submitting}
          >
            {submitting ? '설정 중…' : '새 비밀번호로 로그인'}
          </button>

          <button
            type="button"
            className="login__btn login__btn--badge"
            onClick={() => {
              setStage('form');
              setNewPassword('');
              setNewPasswordConfirm('');
              setErrorMsg(null);
            }}
            disabled={submitting}
          >
            이전으로
          </button>
        </form>
      )}

      {stage === 'splash' && (
        <div className="login__splash" role="status" aria-live="polite">
          <div className="login__brand login__brand--lg">
            <span className="login__logo-mark login__logo-mark--lg">
              <Activity size={28} />
            </span>
            <span className="login__brand-name login__brand-name--lg">ClinSight</span>
          </div>
          <p className="login__welcome">
            <strong>{welcomeName}</strong>님, 환영합니다
          </p>
          <div className="login__progress" aria-hidden="true">
            <span className="login__progress-bar" />
          </div>
        </div>
      )}
    </div>
  );
}
