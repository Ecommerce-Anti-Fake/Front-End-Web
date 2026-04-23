import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { navigationItems } from '../lib/navigation';
import { useApiQuery } from '../hooks/use-api-query';
import { useAuth } from '../modules/auth/auth-context';

export function AppShell() {
  const { session, logout } = useAuth();
  const cart = useApiQuery<{ items?: Array<{ quantity?: number | string }> }>('/orders/cart');
  const cartCount = useMemo(
    () =>
      Array.isArray(cart.data?.items)
        ? cart.data.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        : 0,
    [cart.data],
  );

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Cho chinh hang</p>
          <h1>Anti-fake Market</h1>
          <p className="muted">
            San thuong mai cho shop da xac thuc, truy xuat nguon goc va kenh phan phoi dai ly.
          </p>
        </div>

        <nav className="nav-grid">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="session-card">
          <p className="session-name">{session?.user.displayName || session?.user.email || 'User'}</p>
          <p className="muted">Role: {session?.user.role || 'user'}</p>
          <p className="muted">Cart items: {cart.loading ? '...' : cartCount}</p>
          <button className="secondary-button" onClick={() => void logout()}>
            Dang xuat
          </button>
        </div>
      </aside>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
