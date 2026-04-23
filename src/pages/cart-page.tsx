import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageSection } from '../components/page-section';
import {
  CartItem,
  getActiveCart,
  removeCartItem,
  updateCartItemQuantity,
} from '../lib/cart';

const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';

export function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedCartItemId, setSelectedCartItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedCartItemId) ?? null,
    [items, selectedCartItemId],
  );
  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    async function loadCart() {
      try {
        setLoading(true);
        setMessage(null);
        const cart = await getActiveCart();
        setItems(cart.items);
        setSelectedCartItemId((prev) =>
          cart.items.some((item) => item.id === prev) ? prev : (cart.items[0]?.id || ''),
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Load cart failed');
      } finally {
        setLoading(false);
      }
    }

    void loadCart();
  }, []);

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    try {
      setMessage(null);
      const next = await updateCartItemQuantity(cartItemId, quantity);
      setItems(next.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update cart item failed');
    }
  }

  async function handleRemoveItem(cartItemId: string) {
    try {
      setMessage(null);
      const next = await removeCartItem(cartItemId);
      setItems(next.items);

      if (selectedCartItemId === cartItemId) {
        setSelectedCartItemId(next.items[0]?.id || '');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Remove cart item failed');
    }
  }

  function handleCheckoutRetail() {
    if (!selectedItem) {
      return;
    }

    window.localStorage.setItem(ACTIVE_OFFER_KEY, selectedItem.offerId);
    navigate(
      `/orders?offerId=${encodeURIComponent(selectedItem.offerId)}&quantity=${selectedItem.quantity}&cartItemId=${encodeURIComponent(selectedItem.id)}`,
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Cart</p>
        <h1>Mini cart va checkout draft</h1>
        <p className="muted">
          Day la buoc dem giua xem offer va tao order. Cart nay da doc va ghi truc tiep qua backend API.
        </p>
      </header>

      <PageSection title="Tong quan gio hang">
        <div className="context-grid">
          <div className="context-card">
            <p className="eyebrow">So item</p>
            <strong>{items.length}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Tong tam tinh</p>
            <strong>{cartTotal.toLocaleString('vi-VN')}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Selected checkout item</p>
            <strong>{selectedItem?.offerTitleSnapshot || 'Chua chon item'}</strong>
          </div>
        </div>
        {message ? <div className="empty-state error">{message}</div> : null}
      </PageSection>

      <PageSection title="Cart items">
        {loading ? (
          <div className="empty-state">Dang tai gio hang...</div>
        ) : !items.length ? (
          <div className="empty-state">
            Gio hang dang trong. <Link className="link-inline" to="/products">Qua catalog de them offer</Link>.
          </div>
        ) : (
          <div className="entity-grid">
            {items.map((item) => (
              <article key={item.id} className={selectedCartItemId === item.id ? 'entity-card active' : 'entity-card'}>
                <div className="entity-card-header">
                  <div>
                    <h3>{item.offerTitleSnapshot}</h3>
                    <p className="muted">{item.shopNameSnapshot || '-'}</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => setSelectedCartItemId(item.id)}>
                    {selectedCartItemId === item.id ? 'Dang chon' : 'Chon checkout'}
                  </button>
                </div>
                <div className="tag-row">
                  <span className="tag">
                    Gia: {item.unitPriceSnapshot.toLocaleString('vi-VN')} {item.currencySnapshot}
                  </span>
                  <span className="tag">Qty: {item.quantity}</span>
                  <span className="tag">
                    Tam tinh: {(item.unitPriceSnapshot * item.quantity).toLocaleString('vi-VN')} {item.currencySnapshot}
                  </span>
                </div>
                <label>
                  <span>So luong</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => void handleQuantityChange(item.id, Number(event.target.value))}
                  />
                </label>
                <div className="storefront-card-actions">
                  <Link className="secondary-button link-button" to={`/products/${item.offerId}`}>
                    Xem lai offer
                  </Link>
                  <button className="secondary-button" type="button" onClick={() => void handleRemoveItem(item.id)}>
                    Xoa item
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="Checkout draft">
        {!selectedItem ? (
          <div className="empty-state">Chon mot item trong gio hang de checkout.</div>
        ) : (
          <div className="offer-summary-panel">
            <span className="eyebrow">Retail checkout</span>
            <h2>{selectedItem.offerTitleSnapshot}</h2>
            <p className="muted">
              Offer {selectedItem.offerId} | Shop {selectedItem.shopNameSnapshot}
            </p>
            <div className="tag-row">
              <span className="tag">
                Gia: {selectedItem.unitPriceSnapshot.toLocaleString('vi-VN')} {selectedItem.currencySnapshot}
              </span>
              <span className="tag">So luong: {selectedItem.quantity}</span>
              <span className="tag">
                Tong: {(selectedItem.unitPriceSnapshot * selectedItem.quantity).toLocaleString('vi-VN')} {selectedItem.currencySnapshot}
              </span>
            </div>
            <div className="offer-actions">
              <button className="primary-button" type="button" onClick={handleCheckoutRetail}>
                Checkout retail
              </button>
            </div>
          </div>
        )}
      </PageSection>
    </div>
  );
}
