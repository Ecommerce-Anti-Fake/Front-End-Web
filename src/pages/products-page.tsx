import { FormEvent, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';
import { useApiQuery } from '../hooks/use-api-query';

const initialOfferForm = {
  shopId: '',
  categoryId: '',
  productModelId: '',
  title: '',
  description: '',
  price: 0,
  availableQuantity: 1,
  salesMode: 'RETAIL',
};

export function ProductsPage() {
  const { session } = useAuth();
  const models = useApiQuery('/products/models');
  const offers = useApiQuery('/products/offers');
  const [form, setForm] = useState(initialOfferForm);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreateOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/products/offers', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: form,
      });
      setMessage('Tao offer thanh cong.');
      setForm(initialOfferForm);
      await offers.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create offer failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Products va offers</h1>
      </header>

      <PageSection title="Danh sach product models">
        <ApiResult title="Product models" loading={models.loading} error={models.error} data={models.data} />
      </PageSection>

      <PageSection title="Tao offer">
        <form className="panel-form two-columns" onSubmit={handleCreateOffer}>
          <label>
            <span>Shop id</span>
            <input
              value={form.shopId}
              onChange={(event) => setForm((prev) => ({ ...prev, shopId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Category id</span>
            <input
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Product model id</span>
            <input
              value={form.productModelId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productModelId: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Sales mode</span>
            <select
              value={form.salesMode}
              onChange={(event) => setForm((prev) => ({ ...prev, salesMode: event.target.value }))}
            >
              <option value="RETAIL">RETAIL</option>
              <option value="WHOLESALE">WHOLESALE</option>
              <option value="BOTH">BOTH</option>
            </select>
          </label>
          <label className="full-width">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Price</span>
            <input
              type="number"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
            />
          </label>
          <label>
            <span>Available quantity</span>
            <input
              type="number"
              value={form.availableQuantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, availableQuantity: Number(event.target.value) }))
              }
            />
          </label>
          {message ? <div className="empty-state full-width">{message}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tao offer
          </button>
        </form>
      </PageSection>

      <PageSection title="Offers">
        <ApiResult title="Offers" loading={offers.loading} error={offers.error} data={offers.data} />
      </PageSection>
    </div>
  );
}
