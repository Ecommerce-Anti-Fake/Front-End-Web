import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import {
  CartItem,
  checkoutCartItem,
  getActiveCart,
  removeCartItem,
  updateCartItemQuantity,
} from '../lib/cart';

const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';

type OrderSnapshot = {
  id?: string;
  orderStatus?: string;
  paymentStatus?: string;
  buyerPayableAmount?: number | string;
  totalAmount?: number | string;
  [key: string]: unknown;
};

type PaymentMethod = 'COD' | 'BANK_TRANSFER';

function summarizeOrder(order: unknown): OrderSnapshot | null {
  if (!order || typeof order !== 'object') {
    return null;
  }

  return order as OrderSnapshot;
}

export function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedCartItemId, setSelectedCartItemId] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [checkedOutOrder, setCheckedOutOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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
    void reloadCart();
  }, []);

  async function reloadCart() {
    try {
      setLoading(true);
      setMessage(null);
      const cart = await getActiveCart();
      setItems(cart.items);
      setSelectedCartItemId((prev) =>
        cart.items.some((item) => item.id === prev) ? prev : (cart.items[0]?.id || ''),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tải giỏ hàng thất bại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    try {
      setMessage(null);
      const next = await updateCartItemQuantity(cartItemId, quantity);
      setItems(next.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cập nhật số lượng thất bại.');
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
      setMessage(error instanceof Error ? error.message : 'Xóa sản phẩm khỏi giỏ thất bại.');
    }
  }

  async function handleCheckoutRetail() {
    if (!selectedItem) {
      setMessage('Vui lòng chọn một sản phẩm để checkout.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setMessage(null);
      window.localStorage.setItem(ACTIVE_OFFER_KEY, selectedItem.offerId);
      const order = await checkoutCartItem(selectedItem.id, {
        affiliateCode: affiliateCode || undefined,
        paymentMethod,
      });
      const nextOrder = summarizeOrder(order);
      setCheckedOutOrder(nextOrder);
      setAffiliateCode('');
      setMessage('Đã tạo đơn hàng thành công.');
      await reloadCart();
      if (nextOrder?.id) {
        navigate(
          `/orders/${encodeURIComponent(String(nextOrder.id))}?fromCheckout=1&paymentMethod=${encodeURIComponent(paymentMethod)}`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout thất bại.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="cart-store-page">
      <BreadcrumbNav items={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]} />
      <h1>Giỏ hàng</h1>

      {message ? <div className="empty-state">{message}</div> : null}

      {loading ? (
        <div className="empty-state">Đang tải giỏ hàng...</div>
      ) : !items.length ? (
        <section className="cart-empty">
          <h2>Giỏ hàng đang trống</h2>
          <p>Hãy chọn offer chính hãng trong catalog để bắt đầu đặt hàng.</p>
          <Link className="primary-button link-button" to="/products">
            Tiếp tục mua hàng
          </Link>
          {checkedOutOrder?.id ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate(`/orders/${encodeURIComponent(String(checkedOutOrder.id))}`)}
            >
              Xem đơn vừa tạo
            </button>
          ) : null}
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-table">
            <div className="cart-table-head">
              <span>Sản phẩm</span>
              <span>Đơn giá</span>
              <span>Số lượng</span>
              <span>Tạm tính</span>
            </div>
            {items.map((item) => {
              const selected = selectedCartItemId === item.id;

              return (
                <article key={item.id} className={selected ? 'cart-line selected' : 'cart-line'}>
                  <button className="cart-product" type="button" onClick={() => setSelectedCartItemId(item.id)}>
                    <span className="cart-product-thumb">AF</span>
                    <span>
                      <strong>{item.offerTitleSnapshot}</strong>
                      <small>{item.shopNameSnapshot || 'Shop đã xác thực'}</small>
                    </span>
                  </button>
                  <strong>
                    {item.unitPriceSnapshot.toLocaleString('vi-VN')} {item.currencySnapshot}
                  </strong>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => void handleQuantityChange(item.id, Number(event.target.value))}
                  />
                  <div className="cart-line-total">
                    <strong>
                      {(item.unitPriceSnapshot * item.quantity).toLocaleString('vi-VN')} {item.currencySnapshot}
                    </strong>
                    <button type="button" onClick={() => void handleRemoveItem(item.id)}>
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="cart-summary">
            <h2>Tổng giỏ hàng</h2>
            <div>
              <span>Tạm tính</span>
              <strong>{cartTotal.toLocaleString('vi-VN')} VND</strong>
            </div>
            <div>
              <span>Sản phẩm đã chọn</span>
              <strong>{selectedItem?.offerTitleSnapshot || 'Chưa chọn'}</strong>
            </div>
            <label>
              <span>Mã affiliate</span>
              <input
                value={affiliateCode}
                onChange={(event) => setAffiliateCode(event.target.value)}
                placeholder="Nếu có mã affiliate"
              />
            </label>
            <div className="payment-method-panel">
              <span>Hình thức thanh toán</span>
              <div className="payment-method-options">
                <button
                  className={paymentMethod === 'COD' ? 'payment-method-option active' : 'payment-method-option'}
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                >
                  <strong>COD</strong>
                  <small>Giao hàng rồi thu tiền trực tiếp.</small>
                </button>
                <button
                  className={paymentMethod === 'BANK_TRANSFER' ? 'payment-method-option active' : 'payment-method-option'}
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                >
                  <strong>Chuyển khoản</strong>
                  <small>Checkout trước, sau đó xác nhận chuyển khoản ở trang đơn hàng.</small>
                </button>
              </div>
            </div>
            <div>
              <span>Ghi chú thanh toán</span>
              <strong>{paymentMethod === 'COD' ? 'Bạn sẽ xác nhận đã thu tiền khi giao hàng.' : 'Bạn sẽ đánh dấu đã thanh toán sau khi chuyển khoản.'}</strong>
            </div>
            <button className="primary-button" type="button" disabled={checkoutLoading} onClick={() => void handleCheckoutRetail()}>
              {checkoutLoading ? 'Đang xử lý...' : 'Tạo đơn hàng'}
            </button>
            <Link className="secondary-button link-button" to="/products">
              Tiếp tục mua hàng
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
