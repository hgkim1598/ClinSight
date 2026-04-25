import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CreditCard } from 'lucide-react';
import './LoginPage.css';

type Stage = 'form' | 'splash';

export default function LoginPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('form');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const employeeIdRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = employeeId.trim();
    const pw = password.trim();
    if (!id && !pw) {
      employeeIdRef.current?.focus();
      return;
    }
    setStage('splash');
    window.setTimeout(() => navigate('/'), 1500);
  };

  const welcomeName = employeeId.trim() || '사용자';

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
            <label className="login__label" htmlFor="login-employee-id">
              직원번호
            </label>
            <input
              ref={employeeIdRef}
              id="login-employee-id"
              className="login__input"
              type="text"
              placeholder="DR-0000"
              autoComplete="username"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
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
            />
          </div>

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
            <button type="button" className="login__link">
              비밀번호 찾기
            </button>
          </div>

          <button type="submit" className="login__btn login__btn--primary">
            로그인
          </button>

          <div className="login__divider" role="separator">
            <span className="login__divider-text">또는</span>
          </div>

          <button type="button" className="login__btn login__btn--badge">
            <CreditCard size={18} />
            <span>ID 배지로 로그인</span>
          </button>

          <p className="login__footer">v4.2.1 · HIRA 인증 · © 2026 ClinSight</p>
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
