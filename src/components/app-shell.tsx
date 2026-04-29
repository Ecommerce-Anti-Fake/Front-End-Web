import { Outlet } from 'react-router-dom';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function AppShell() {
  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="content-area">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
