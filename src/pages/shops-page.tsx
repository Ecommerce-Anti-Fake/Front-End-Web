import { FormEvent, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';
import { useApiQuery } from '../hooks/use-api-query';

const initialShopForm = {
  shopName: '',
  registrationType: 'NORMAL',
  businessType: 'COMPANY',
  categoryIds: 'demo-category-id',
  taxCode: '',
};

export function ShopsPage() {
  const { session } = useAuth();
  const myShops = useApiQuery('/shops/mine');
  const pending = useApiQuery('/shops/admin/pending-verification');
  const [form, setForm] = useState(initialShopForm);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/shops', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          shopName: form.shopName,
          registrationType: form.registrationType,
          businessType: form.businessType,
          taxCode: form.taxCode || null,
          categoryIds: form.categoryIds
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });

      setMessage('Tao shop thanh cong.');
      setForm(initialShopForm);
      await myShops.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create shop failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Shops workspace</h1>
      </header>

      <PageSection title="Tao shop moi" description="Dung form nay de hit truc tiep endpoint tao shop hien tai.">
        <form className="panel-form" onSubmit={handleCreateShop}>
          <label>
            <span>Shop name</span>
            <input
              value={form.shopName}
              onChange={(event) => setForm((prev) => ({ ...prev, shopName: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Registration type</span>
            <select
              value={form.registrationType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, registrationType: event.target.value }))
              }
            >
              <option value="NORMAL">NORMAL</option>
              <option value="HANDMADE">HANDMADE</option>
              <option value="MANUFACTURER">MANUFACTURER</option>
              <option value="DISTRIBUTOR">DISTRIBUTOR</option>
            </select>
          </label>
          <label>
            <span>Business type</span>
            <input
              value={form.businessType}
              onChange={(event) => setForm((prev) => ({ ...prev, businessType: event.target.value }))}
            />
          </label>
          <label>
            <span>Category ids</span>
            <input
              value={form.categoryIds}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryIds: event.target.value }))}
            />
          </label>
          <label>
            <span>Tax code</span>
            <input
              value={form.taxCode}
              onChange={(event) => setForm((prev) => ({ ...prev, taxCode: event.target.value }))}
            />
          </label>
          {message ? <div className="empty-state">{message}</div> : null}
          <button className="primary-button" type="submit">
            Tao shop
          </button>
        </form>
      </PageSection>

      <PageSection title="My shops">
        <ApiResult title="My shops" loading={myShops.loading} error={myShops.error} data={myShops.data} />
      </PageSection>

      <PageSection title="Pending verification">
        <ApiResult title="Pending shops" loading={pending.loading} error={pending.error} data={pending.data} />
      </PageSection>
    </div>
  );
}
