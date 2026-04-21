import { FormEvent, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const initialRetailForm = {
  offerId: '',
  quantity: 1,
  affiliateCode: '',
};

const initialWholesaleForm = {
  buyerShopId: '',
  buyerDistributionNodeId: '',
  offerId: '',
  quantity: 1,
  affiliateCode: '',
};

export function OrdersPage() {
  const { session } = useAuth();
  const [retailForm, setRetailForm] = useState(initialRetailForm);
  const [wholesaleForm, setWholesaleForm] = useState(initialWholesaleForm);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<unknown>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createRetailOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await apiRequest('/orders/retail', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          offerId: retailForm.offerId,
          quantity: retailForm.quantity,
          affiliateCode: retailForm.affiliateCode || null,
        },
      });

      setMessage(`Tao retail order thanh cong: ${JSON.stringify(response)}`);
      setRetailForm(initialRetailForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create retail order failed');
    }
  }

  async function createWholesaleOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await apiRequest('/orders/wholesale', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          buyerShopId: wholesaleForm.buyerShopId,
          buyerDistributionNodeId: wholesaleForm.buyerDistributionNodeId || undefined,
          offerId: wholesaleForm.offerId,
          quantity: wholesaleForm.quantity,
          affiliateCode: wholesaleForm.affiliateCode || null,
        },
      });

      setMessage(`Tao wholesale order thanh cong: ${JSON.stringify(response)}`);
      setWholesaleForm(initialWholesaleForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create wholesale order failed');
    }
  }

  async function lookupOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupLoading(true);
    setLookupError(null);

    try {
      const response = await apiRequest(`/orders/${lookupId}`, {
        accessToken: session?.accessToken,
      });
      setLookupResult(response);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Lookup order failed');
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Orders</p>
        <h1>Tao va truy van order</h1>
      </header>

      <PageSection title="Retail order">
        <form className="panel-form" onSubmit={createRetailOrder}>
          <label>
            <span>Offer id</span>
            <input
              value={retailForm.offerId}
              onChange={(event) => setRetailForm((prev) => ({ ...prev, offerId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={retailForm.quantity}
              onChange={(event) =>
                setRetailForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <span>Affiliate code</span>
            <input
              value={retailForm.affiliateCode}
              onChange={(event) =>
                setRetailForm((prev) => ({ ...prev, affiliateCode: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Tao retail order
          </button>
        </form>
      </PageSection>

      <PageSection title="Wholesale order">
        <form className="panel-form two-columns" onSubmit={createWholesaleOrder}>
          <label>
            <span>Buyer shop id</span>
            <input
              value={wholesaleForm.buyerShopId}
              onChange={(event) =>
                setWholesaleForm((prev) => ({ ...prev, buyerShopId: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Buyer distribution node id</span>
            <input
              value={wholesaleForm.buyerDistributionNodeId}
              onChange={(event) =>
                setWholesaleForm((prev) => ({
                  ...prev,
                  buyerDistributionNodeId: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Offer id</span>
            <input
              value={wholesaleForm.offerId}
              onChange={(event) =>
                setWholesaleForm((prev) => ({ ...prev, offerId: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={wholesaleForm.quantity}
              onChange={(event) =>
                setWholesaleForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
              }
            />
          </label>
          <label className="full-width">
            <span>Affiliate code</span>
            <input
              value={wholesaleForm.affiliateCode}
              onChange={(event) =>
                setWholesaleForm((prev) => ({ ...prev, affiliateCode: event.target.value }))
              }
            />
          </label>
          <button className="primary-button full-width" type="submit">
            Tao wholesale order
          </button>
        </form>
      </PageSection>

      <PageSection title="Tra cuu order theo id">
        <form className="inline-form" onSubmit={lookupOrder}>
          <input value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="Order id" />
          <button className="primary-button" type="submit">
            Tra cuu
          </button>
        </form>
        {message ? <div className="empty-state">{message}</div> : null}
        <ApiResult title="Order detail" loading={lookupLoading} error={lookupError} data={lookupResult} />
      </PageSection>
    </div>
  );
}
