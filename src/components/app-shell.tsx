import { NavLink, Outlet } from 'react-router-dom';
import { navigationItems } from '../lib/navigation';
import { useAuth } from '../modules/auth/auth-context';

export function AppShell() {
  const { session, logout } = useAuth();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Anti-fake commerce</p>
          <h1>Control panel</h1>
          <p className="muted">
            Frontend shell cho desktop va mobile, uu tien cac flow quan trong da co API.
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
