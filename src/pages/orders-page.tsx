import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiResult } from '../components/api-result';
import { KeyValueList } from '../components/key-value-list';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_SHOP_KEY = 'eaf-active-shop-id';
const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';

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

type OrderSnapshot = {
  id?: string;
  orderType?: string;
  orderStatus?: string;
  paymentStatus?: string;
  totalAmount?: number | string;
  quantity?: number | string;
  offerId?: string;
  buyerShopId?: string;
  sellerShopId?: string;
  [key: string]: unknown;
};

type MembershipRecord = {
  nodeId?: string;
  networkId?: string;
  networkName?: string;
  manufacturerShopName?: string;
  shopId?: string;
  shopName?: string;
  level?: number;
  relationshipStatus?: string;
  [key: string]: unknown;
};

function normalizeList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
}

function summarizeOrder(order: unknown): OrderSnapshot | null {
  if (!order || typeof order !== 'object') {
    return null;
  }

  return order as OrderSnapshot;
}

export function OrdersPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const memberships = useApiQuery('/distribution/my-memberships');
  const [retailForm, setRetailForm] = useState(initialRetailForm);
  const [wholesaleForm, setWholesaleForm] = useState(initialWholesaleForm);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<unknown>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderSnapshot | null>(null);

  const activeShopId = window.localStorage.getItem(ACTIVE_SHOP_KEY) || '';
  const activeOfferId = window.localStorage.getItem(ACTIVE_OFFER_KEY) || '';
  const checkoutOfferId = searchParams.get('offerId') || '';
  const checkoutQuantity = Number(searchParams.get('quantity') || '');
  const checkoutCartItemId = searchParams.get('cartItemId') || '';

  const membershipList = useMemo(
    () => normalizeList<MembershipRecord>(memberships.data, ['items', 'data', 'memberships']),
    [memberships.data],
  );
  const matchingMemberships = useMemo(
    () =>
      membershipList.filter(
        (membership) =>
          String(membership.shopId || '') === wholesaleForm.buyerShopId &&
          String(membership.relationshipStatus || '').toUpperCase() === 'ACTIVE',
      ),
    [membershipList, wholesaleForm.buyerShopId],
  );

  useEffect(() => {
    setRetailForm((prev) => ({
      ...prev,
      offerId: checkoutOfferId || prev.offerId || activeOfferId,
      quantity:
        Number.isFinite(checkoutQuantity) && checkoutQuantity > 0
          ? checkoutQuantity
          : prev.quantity,
    }));

    setWholesaleForm((prev) => ({
      ...prev,
      buyerShopId: prev.buyerShopId || activeShopId,
      offerId: prev.offerId || activeOfferId,
    }));
  }, [activeOfferId, activeShopId, checkoutOfferId, checkoutQuantity]);

  useEffect(() => {
    if (!matchingMemberships.length) {
      return;
    }

    const currentNodeStillValid = matchingMemberships.some(
      (membership) => String(membership.nodeId || '') === wholesaleForm.buyerDistributionNodeId,
    );

    if (currentNodeStillValid) {
      return;
    }

    setWholesaleForm((prev) => ({
      ...prev,
      buyerDistributionNodeId: String(matchingMemberships[0].nodeId || ''),
    }));
  }, [matchingMemberships, wholesaleForm.buyerDistributionNodeId]);

  async function createRetailOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await apiRequest<OrderSnapshot>('/orders/retail', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          offerId: retailForm.offerId,
          quantity: retailForm.quantity,
          affiliateCode: retailForm.affiliateCode || null,
        },
      });

      setCreatedOrder(summarizeOrder(response));
      setLookupResult(response);
      setMessage('Tao retail order thanh cong.');
      if (checkoutCartItemId) {
        try {
          await apiRequest(`/orders/cart/items/${checkoutCartItemId}`, {
            method: 'DELETE',
            accessToken: session?.accessToken,
          });
        } catch {
          // Khong lam fail order neu cleanup cart sau checkout gap loi.
        }
      }
      setRetailForm({
        ...initialRetailForm,
        offerId: window.localStorage.getItem(ACTIVE_OFFER_KEY) || '',
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create retail order failed');
    }
  }

  async function createWholesaleOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await apiRequest<OrderSnapshot>('/orders/wholesale', {
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

      setCreatedOrder(summarizeOrder(response));
      setLookupResult(response);
      setMessage('Tao wholesale order thanh cong.');
      setWholesaleForm({
        ...initialWholesaleForm,
        buyerShopId: window.localStorage.getItem(ACTIVE_SHOP_KEY) || '',
        offerId: window.localStorage.getItem(ACTIVE_OFFER_KEY) || '',
      });
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
      setCreatedOrder(summarizeOrder(response));
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Lookup order failed');
      setLookupResult(null);
      setCreatedOrder(null);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Orders</p>
        <h1>Tao va truy van order</h1>
        <p className="muted">
          Trang nay an theo active offer va active shop da chon tu luong truoc, de ban test giao dich lien mach hon.
        </p>
      </header>

      {checkoutOfferId ? (
        <div className="empty-state">
          Don retail dang duoc prefill tu gio hang. <Link className="link-inline" to="/cart">Quay lai gio hang</Link>
        </div>
      ) : null}

      <PageSection title="Ngu canh dang thao tac">
        <div className="context-grid">
          <div className="context-card">
            <p className="eyebrow">Active offer</p>
            <strong>{activeOfferId || 'Chua chon offer'}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Active buyer shop</p>
            <strong>{activeShopId || 'Chua chon shop'}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Buyer node goi y</p>
            <strong>{wholesaleForm.buyerDistributionNodeId || 'Khong dung in-network pricing'}</strong>
          </div>
        </div>
      </PageSection>

      {createdOrder ? (
        <PageSection title="Order vua thao tac">
          <KeyValueList
            items={[
              { label: 'Order id', value: createdOrder.id },
              { label: 'Order type', value: createdOrder.orderType },
              { label: 'Order status', value: createdOrder.orderStatus },
              { label: 'Payment status', value: createdOrder.paymentStatus },
              { label: 'Offer id', value: createdOrder.offerId },
              { label: 'Buyer shop id', value: createdOrder.buyerShopId },
              { label: 'Total amount', value: createdOrder.totalAmount },
            ]}
          />
        </PageSection>
      ) : null}

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

      <PageSection
        title="Wholesale order"
        description="Neu buyer co membership active trong network thi chon node o day de ap wholesale pricing."
      >
        <form className="panel-form two-columns" onSubmit={createWholesaleOrder}>
          <label>
            <span>Buyer shop id</span>
            <input
              value={wholesaleForm.buyerShopId}
              onChange={(event) =>
                setWholesaleForm((prev) => ({
                  ...prev,
                  buyerShopId: event.target.value,
                  buyerDistributionNodeId: '',
                }))
              }
              required
            />
          </label>
          <label>
            <span>Buyer distribution node</span>
            <select
              value={wholesaleForm.buyerDistributionNodeId}
              onChange={(event) =>
                setWholesaleForm((prev) => ({
                  ...prev,
                  buyerDistributionNodeId: event.target.value,
                }))
              }
            >
              <option value="">Khong dung node</option>
              {matchingMemberships.map((membership) => (
                <option key={String(membership.nodeId)} value={String(membership.nodeId || '')}>
                  {membership.networkName || membership.networkId} | {membership.shopName || membership.shopId} | level {String(membership.level ?? '-')}
                </option>
              ))}
            </select>
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
          {wholesaleForm.buyerShopId && !matchingMemberships.length ? (
            <div className="empty-state full-width">
              Shop nay chua co membership active, nen order se di theo gia thuong neu de trong buyer distribution node.
            </div>
          ) : null}
          <button className="primary-button full-width" type="submit">
            Tao wholesale order
          </button>
        </form>
      </PageSection>

      <PageSection title="Memberships co the dung cho wholesale">
        <ApiResult
          title="Memberships"
          loading={memberships.loading}
          error={memberships.error}
          data={matchingMemberships.length ? matchingMemberships : memberships.data}
        />
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
