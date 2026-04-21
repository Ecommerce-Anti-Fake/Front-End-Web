import { FormEvent, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';
import { useApiQuery } from '../hooks/use-api-query';

const initialNetworkForm = {
  brandId: '',
  manufacturerShopId: '',
  networkName: '',
};

export function DistributionPage() {
  const { session } = useAuth();
  const networks = useApiQuery('/distribution/networks');
  const memberships = useApiQuery('/distribution/my-memberships');
  const inventory = useApiQuery('/distribution/inventory-summary');
  const [form, setForm] = useState(initialNetworkForm);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreateNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/distribution/networks', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: form,
      });
      setMessage('Tao distribution network thanh cong.');
      setForm(initialNetworkForm);
      await networks.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create network failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Distribution va inventory</h1>
      </header>

      <PageSection title="Tao network">
        <form className="panel-form" onSubmit={handleCreateNetwork}>
          <label>
            <span>Brand id</span>
            <input
              value={form.brandId}
              onChange={(event) => setForm((prev) => ({ ...prev, brandId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Manufacturer shop id</span>
            <input
              value={form.manufacturerShopId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, manufacturerShopId: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Network name</span>
            <input
              value={form.networkName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, networkName: event.target.value }))
              }
              required
            />
          </label>
          {message ? <div className="empty-state">{message}</div> : null}
          <button className="primary-button" type="submit">
            Tao network
          </button>
        </form>
      </PageSection>

      <PageSection title="Networks">
        <ApiResult title="Networks" loading={networks.loading} error={networks.error} data={networks.data} />
      </PageSection>

      <PageSection title="Memberships">
        <ApiResult
          title="Memberships"
          loading={memberships.loading}
          error={memberships.error}
          data={memberships.data}
        />
      </PageSection>

      <PageSection title="Inventory summary">
        <ApiResult title="Inventory" loading={inventory.loading} error={inventory.error} data={inventory.data} />
      </PageSection>
    </div>
  );
}
