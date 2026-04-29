import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
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
      let loginResponse: Awaited<ReturnType<typeof login>> | null = null;

      if (mode === 'login') {
        loginResponse = await login(identifier, password);
      } else {
        await register({
          email: identifier.includes('@') ? identifier : undefined,
          phone: identifier.includes('@') ? undefined : identifier,
          displayName,
          password,
        });
        loginResponse = await login(identifier, password);
      }

      const explicitNextPath = (location.state as { nextPath?: string } | null)?.nextPath;
      const isAdmin = String(loginResponse?.user.role || '').toLowerCase() === 'admin';
      const nextPath = explicitNextPath || (isAdmin ? '/admin' : '/');
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Xác thực thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-exclusive-page">
      <header className="auth-exclusive-header">
        <div className="top-strip">
          <div className="site-container top-strip-inner">
            <span>Ưu đãi cho người dùng mới và shop đã xác thực</span>
            <Link to="/products">Mua ngay</Link>
            <span>Tiếng Việt</span>
          </div>
        </div>
        <div className="site-container auth-nav-row">
          <Link className="auth-logo" to="/">
            AntiFake
          </Link>
          <nav>
            <Link to="/">Trang chủ</Link>
            <Link to="/products">Sản phẩm</Link>
            <Link to="/shops">Mở shop</Link>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </nav>
        </div>
      </header>

      <main className="auth-exclusive-main">
        <section className="auth-art-panel" aria-hidden="true">
          <div className="auth-cart-visual">
            <span />
            <strong>AF</strong>
          </div>
        </section>

        <section className="auth-form-panel">
          <div>
            <BreadcrumbNav
              items={[
                { label: 'Trang chủ', to: '/' },
                { label: mode === 'login' ? 'Đăng nhập' : 'Đăng ký' },
              ]}
            />
            <h1>{mode === 'login' ? 'Đăng nhập AntiFake' : 'Tạo tài khoản AntiFake'}</h1>
            <p>{mode === 'login' ? 'Nhập thông tin để tiếp tục.' : 'Tạo tài khoản để mua hàng, mở shop và làm affiliate.'}</p>
          </div>

          <form className="auth-line-form" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <label>
                <span>Họ và tên</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
            ) : null}

            <label>
              <span>Email hoặc số điện thoại</span>
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
            </label>

            <label>
              <span>Mật khẩu</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>

            {error ? <div className="empty-state error">{error}</div> : null}

            <div className="auth-submit-row">
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
              {mode === 'login' ? (
                <button className="text-link" type="button">
                  Quên mật khẩu?
                </button>
              ) : null}
            </div>
          </form>

          <button className="auth-switch-link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </section>
      </main>

      <footer className="auth-exclusive-footer">
        <div className="site-container footer-bottom">Copyright © 2026 AntiFake Market. All rights reserved.</div>
      </footer>
    </div>
  );
}
