import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        await register({
          email: identifier.includes('@') ? identifier : undefined,
          phone: identifier.includes('@') ? undefined : identifier,
          displayName,
          password,
        });
        await login(identifier, password);
      }

      const nextPath = (location.state as { nextPath?: string } | null)?.nextPath || '/';
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Auth request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">Responsive web app</p>
        <h1>Van hanh san TMDT chong hang gia tren mot giao dien duy nhat</h1>
        <p className="muted">
          Repo nay duoc dung de thao tac nhanh voi gateway hien tai tai <code>{API_BASE_URL}</code>.
        </p>
      </section>

      <section className="auth-card">
        <div className="mode-switch">
          <button
            className={mode === 'login' ? 'pill active' : 'pill'}
            onClick={() => setMode('login')}
            type="button"
          >
            Dang nhap
          </button>
          <button
            className={mode === 'register' ? 'pill active' : 'pill'}
            onClick={() => setMode('register')}
            type="button"
          >
            Dang ky
          </button>
        </div>

        <form className="panel-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label>
              <span>Ten hien thi</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
          ) : null}

          <label>
            <span>Email hoac so dien thoai</span>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </label>

          <label>
            <span>Mat khau</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <div className="empty-state error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Dang xu ly...' : mode === 'login' ? 'Dang nhap' : 'Tao tai khoan'}
          </button>
        </form>
      </section>
    </div>
  );
}
