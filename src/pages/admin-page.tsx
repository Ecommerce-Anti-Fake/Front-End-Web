import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';

export function AdminPage() {
  const dashboard = useApiQuery('/admin/dashboard');
  const moderation = useApiQuery('/admin/moderation-summary');
  const openDisputes = useApiQuery('/orders/admin/disputes/open');
  const pendingShops = useApiQuery('/shops/admin/pending-verification');
  const pendingKyc = useApiQuery('/user/admin/kyc/pending');

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Moderation va operations</h1>
      </header>

      <PageSection title="Dashboard">
        <ApiResult title="Admin dashboard" loading={dashboard.loading} error={dashboard.error} data={dashboard.data} />
      </PageSection>

      <PageSection title="Moderation summary">
        <ApiResult
          title="Moderation summary"
          loading={moderation.loading}
          error={moderation.error}
          data={moderation.data}
        />
      </PageSection>

      <PageSection title="Open disputes">
        <ApiResult
          title="Open disputes"
          loading={openDisputes.loading}
          error={openDisputes.error}
          data={openDisputes.data}
        />
      </PageSection>

      <PageSection title="Pending shops">
        <ApiResult
          title="Pending shops"
          loading={pendingShops.loading}
          error={pendingShops.error}
          data={pendingShops.data}
        />
      </PageSection>

      <PageSection title="Pending KYC">
        <ApiResult title="Pending KYC" loading={pendingKyc.loading} error={pendingKyc.error} data={pendingKyc.data} />
      </PageSection>
    </div>
  );
}
