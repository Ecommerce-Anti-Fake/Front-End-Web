import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import { useApiQuery } from '../hooks/use-api-query';

type OrderItemRecord = {
  offerId?: string;
  offerTitleSnapshot?: string;
  unitPrice?: number | string;
  quantity?: number | string;
  verificationLevelSnapshot?: string;
};

type OrderRecord = {
  id?: string;
  orderMode?: string;
  orderStatus?: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentProviderRef?: string | null;
  escrowStatus?: string | null;
  sellerShopId?: string;
  sellerShopName?: string;
  buyerShopId?: string | null;
  buyerPayableAmount?: number | string;
  sellerReceivableAmount?: number | string;
  totalAmount?: number | string;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  items?: OrderItemRecord[];
  createdAt?: string;
  updatedAt?: string;
};

type TimelineStep = {
  key: string;
  label: string;
  helper: string;
  done: boolean;
  current: boolean;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown, currency = 'VND') {
  return `${toNumber(value).toLocaleString('vi-VN')} ${currency}`;
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

function normalizeList(data: unknown) {
  return Array.isArray(data) ? (data as OrderRecord[]) : [];
}

function statusLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    pending: 'Chờ xác nhận',
    paid: 'Đã thanh toán',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền',
    held: 'Đang giữ tiền',
    released: 'Đã giải ngân',
  };

  return labels[normalized] || value || '-';
}

function paymentMethodLabel(value?: string | null) {
  if (value === 'COD') {
    return 'Thanh toán khi nhận hàng';
  }

  if (value === 'BANK_TRANSFER') {
    return 'Chuyển khoản';
  }

  return value || 'Chưa chọn';
}

function orderStatusTone(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'paid') {
    return 'success';
  }
  if (normalized === 'cancelled' || normalized === 'refunded') {
    return 'danger';
  }
  return 'active';
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { orderId: routeOrderId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const ordersQuery = useApiQuery<OrderRecord[]>('/orders/mine');
  const [selectedOrderId, setSelectedOrderId] = useState(() => routeOrderId || searchParams.get('orderId') || '');

  const orderList = useMemo(() => normalizeList(ordersQuery.data), [ordersQuery.data]);

  useEffect(() => {
    if (!orderList.length) {
      return;
    }

    const orderIdFromQuery = routeOrderId || searchParams.get('orderId') || '';
    const targetOrderId = orderIdFromQuery || selectedOrderId;
    const hasTarget = targetOrderId && orderList.some((order) => String(order.id || '') === targetOrderId);

    if (hasTarget) {
      if (selectedOrderId !== targetOrderId) {
        setSelectedOrderId(targetOrderId);
      }
      return;
    }

    setSelectedOrderId(String(orderList[0].id || ''));
  }, [orderList, routeOrderId, searchParams, selectedOrderId]);

  useEffect(() => {
    if (routeOrderId) {
      if (selectedOrderId !== routeOrderId) {
        setSelectedOrderId(routeOrderId);
      }
      return;
    }

    const currentOrderId = searchParams.get('orderId') || '';
    if (!selectedOrderId) {
      if (currentOrderId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('orderId');
        setSearchParams(nextParams, { replace: true });
      }
      return;
    }

    if (currentOrderId !== selectedOrderId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('orderId', selectedOrderId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [routeOrderId, searchParams, selectedOrderId, setSearchParams]);

  const selectedOrder =
    orderList.find((order) => String(order.id || '') === selectedOrderId) ??
    orderList[0] ??
    null;

  const orderSummary = useMemo(() => {
    return orderList.reduce(
      (summary, order) => {
        const orderStatus = String(order.orderStatus || '').toLowerCase();
        if (orderStatus === 'pending') {
          summary.pending += 1;
        }
        if (orderStatus === 'paid') {
          summary.paid += 1;
        }
        if (orderStatus === 'completed') {
          summary.completed += 1;
        }
        summary.total += toNumber(order.buyerPayableAmount || order.totalAmount);
        return summary;
      },
      { pending: 0, paid: 0, completed: 0, total: 0 },
    );
  }, [orderList]);

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    const orderStatus = String(selectedOrder?.orderStatus || '').toLowerCase();
    const paymentStatus = String(selectedOrder?.paymentStatus || '').toLowerCase();
    const escrowStatus = String(selectedOrder?.escrowStatus || '').toLowerCase();
    const isCancelled = orderStatus === 'cancelled';
    const isRefunded = orderStatus === 'refunded' || paymentStatus === 'refunded';
    const isPaid = orderStatus === 'paid' || paymentStatus === 'paid';
    const isCompleted = orderStatus === 'completed';

    return [
      {
        key: 'created',
        label: 'Đơn hàng đã đặt',
        helper: 'Hệ thống đã ghi nhận đơn hàng của bạn.',
        done: Boolean(selectedOrder?.id),
        current: !isPaid && !isCancelled && !isRefunded && !isCompleted,
      },
      {
        key: 'paid',
        label: selectedOrder?.paymentMethod === 'COD' ? 'Chờ giao hàng và thu tiền' : 'Chờ xác nhận thanh toán',
        helper:
          selectedOrder?.paymentMethod === 'COD'
            ? 'Bạn sẽ thanh toán trực tiếp khi nhận hàng.'
            : 'Shop hoặc hệ thống sẽ xác nhận sau khi nhận chuyển khoản.',
        done: isPaid || isCompleted,
        current: !isPaid && !isCancelled && !isRefunded && !isCompleted,
      },
      {
        key: 'escrow',
        label: 'Đảm bảo giao dịch',
        helper:
          escrowStatus === 'released'
            ? 'Khoản tiền đã được giải ngân cho người bán.'
            : escrowStatus === 'held'
              ? 'Khoản tiền đang được giữ để bảo vệ giao dịch.'
              : 'Bước này sẽ cập nhật sau khi thanh toán được xác nhận.',
        done: escrowStatus === 'held' || escrowStatus === 'released',
        current: isPaid && !isCompleted && !isCancelled && !isRefunded,
      },
      {
        key: 'done',
        label: isCancelled ? 'Đơn hàng đã hủy' : isRefunded ? 'Đơn hàng đã hoàn tiền' : 'Hoàn tất',
        helper:
          isCancelled
            ? 'Đơn hàng đã bị hủy, không cần thao tác thêm.'
            : isRefunded
              ? 'Đơn hàng đã được hoàn tiền.'
              : 'Đơn hàng hoàn tất sau khi giao nhận thành công.',
        done: isCancelled || isRefunded || isCompleted,
        current: false,
      },
    ];
  }, [selectedOrder]);

  function selectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const nextQuery = searchParams.toString();
    navigate(`/orders/${encodeURIComponent(orderId)}${nextQuery ? `?${nextQuery}` : ''}`);
  }

  const selectedItems = selectedOrder?.items || [];
  const itemsTotal = selectedItems.reduce((sum, item) => sum + toNumber(item.unitPrice) * toNumber(item.quantity), 0);

  return (
    <div className="orders-dashboard-page">
      <BreadcrumbNav
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản của tôi', to: '/user' },
          { label: 'Đơn hàng của tôi' },
        ]}
      />

      <section className="orders-hero">
        <div>
          <span>Quản lý mua hàng</span>
          <h1>Đơn hàng của tôi</h1>
          <p>Theo dõi trạng thái đơn, thanh toán, sản phẩm đã đặt và tổng tiền trong một màn hình gọn hơn.</p>
        </div>
        <Link className="secondary-button link-button" to="/products">
          Tiếp tục mua hàng
        </Link>
      </section>

      <section className="order-summary-strip">
        <article>
          <span>Chờ xử lý</span>
          <strong>{orderSummary.pending}</strong>
        </article>
        <article>
          <span>Đã thanh toán</span>
          <strong>{orderSummary.paid}</strong>
        </article>
        <article>
          <span>Hoàn tất</span>
          <strong>{orderSummary.completed}</strong>
        </article>
        <article>
          <span>Tổng đã đặt</span>
          <strong>{formatMoney(orderSummary.total)}</strong>
        </article>
      </section>

      <section className="orders-layout">
        <aside className="orders-sidebar">
          <div className="orders-sidebar-head">
            <h2>Danh sách đơn</h2>
            <p>Chọn đơn để xem chi tiết.</p>
          </div>

          {ordersQuery.loading ? (
            <div className="empty-state">Đang tải đơn hàng...</div>
          ) : ordersQuery.error ? (
            <div className="empty-state error">{ordersQuery.error}</div>
          ) : orderList.length ? (
            <div className="order-list-panel">
              {orderList.map((order) => {
                const isActive = String(order.id || '') === String(selectedOrder?.id || '');
                const firstItem = order.items?.[0];

                return (
                  <button
                    key={String(order.id || '')}
                    type="button"
                    className={isActive ? 'order-list-card active' : 'order-list-card'}
                    onClick={() => selectOrder(String(order.id || ''))}
                  >
                    <div>
                      <strong>#{String(order.id || '').slice(0, 8)}</strong>
                      <span>{statusLabel(order.orderStatus)}</span>
                    </div>
                    <p>{firstItem?.offerTitleSnapshot || 'Đơn hàng'}</p>
                    <small>{formatDate(order.createdAt)}</small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              Bạn chưa có đơn hàng nào. <Link to="/products">Đi tới trang sản phẩm</Link>
            </div>
          )}
        </aside>

        <main className="orders-main">
          {selectedOrder ? (
            <>
              <section className="order-detail-card order-detail-top">
                <div className="order-detail-title">
                  <div>
                    <span>Chi tiết đơn hàng</span>
                    <h2>Đơn #{String(selectedOrder.id || '').slice(0, 12)}</h2>
                    <p>Ngày đặt: {formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <strong className={`order-status-badge ${orderStatusTone(selectedOrder.orderStatus)}`}>
                    {statusLabel(selectedOrder.orderStatus)}
                  </strong>
                </div>

                <div className="order-info-grid compact">
                  <article>
                    <span>Người bán</span>
                    <strong>{selectedOrder.sellerShopName || selectedOrder.sellerShopId || '-'}</strong>
                  </article>
                  <article>
                    <span>Loại đơn</span>
                    <strong>{selectedOrder.orderMode === 'WHOLESALE' ? 'Đơn sỉ' : 'Đơn lẻ'}</strong>
                  </article>
                  <article>
                    <span>Thanh toán</span>
                    <strong>{paymentMethodLabel(selectedOrder.paymentMethod)}</strong>
                  </article>
                  <article>
                    <span>Trạng thái thanh toán</span>
                    <strong>{statusLabel(selectedOrder.paymentStatus)}</strong>
                  </article>
                </div>
              </section>

              <section className="order-detail-card">
                <div className="order-section-title">
                  <h2>Thông tin giao hàng</h2>
                  <span>Địa chỉ nhận hàng</span>
                </div>

                <div className="order-shipping-box">
                  <strong>{selectedOrder.shippingName || 'Người nhận chưa cập nhật'}</strong>
                  <span>{selectedOrder.shippingPhone || 'Chưa có số điện thoại'}</span>
                  <p>{selectedOrder.shippingAddress || 'Chưa có địa chỉ giao hàng'}</p>
                </div>
              </section>

              <section className="order-detail-card">
                <div className="order-section-title">
                  <h2>Sản phẩm đã đặt</h2>
                  <span>{selectedItems.length} sản phẩm</span>
                </div>

                <div className="order-product-list">
                  {selectedItems.map((item, index) => (
                    <article key={`${item.offerId || 'item'}-${index}`} className="order-product-line">
                      <span className="cart-product-thumb">AF</span>
                      <div>
                        <strong>{item.offerTitleSnapshot || 'Sản phẩm chưa đặt tên'}</strong>
                        <small>Mức xác thực: {item.verificationLevelSnapshot || '-'}</small>
                      </div>
                      <span>{formatMoney(item.unitPrice || 0)}</span>
                      <span>x{toNumber(item.quantity)}</span>
                      <strong>{formatMoney(toNumber(item.unitPrice) * toNumber(item.quantity))}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="order-detail-card">
                <div className="order-section-title">
                  <h2>Thanh toán</h2>
                  <span>{statusLabel(selectedOrder.paymentStatus)}</span>
                </div>

                <div className="order-payment-box">
                  <div>
                    <span>Tạm tính</span>
                    <strong>{formatMoney(itemsTotal)}</strong>
                  </div>
                  <div>
                    <span>Người mua cần trả</span>
                    <strong>{formatMoney(selectedOrder.buyerPayableAmount || selectedOrder.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Mã tham chiếu</span>
                    <strong>{selectedOrder.paymentProviderRef || '-'}</strong>
                  </div>
                </div>
              </section>

              <section className="order-detail-card">
                <div className="order-section-title">
                  <h2>Tiến trình đơn hàng</h2>
                  <span>{statusLabel(selectedOrder.escrowStatus)}</span>
                </div>

                <div className="order-stepper">
                  {timelineSteps.map((step) => (
                    <article
                      key={step.key}
                      className={step.done ? 'order-step done' : step.current ? 'order-step current' : 'order-step'}
                    >
                      <span />
                      <div>
                        <strong>{step.label}</strong>
                        <small>{step.helper}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="order-support-card">
                <div>
                  <strong>Cần hỗ trợ đơn hàng?</strong>
                  <p>Nếu đơn có vấn đề, bạn nên liên hệ shop hoặc mở khiếu nại ở bước sau. Các nút nghiệp vụ như hoàn tiền, giải ngân, đánh dấu thanh toán sẽ nằm ở màn hình admin/seller, không đặt ở trang người mua.</p>
                </div>
                <Link className="secondary-button link-button" to="/products">
                  Mua thêm sản phẩm
                </Link>
              </section>
            </>
          ) : (
            <section className="order-detail-card">
              <div className="empty-state">Chưa có đơn hàng nào để hiển thị.</div>
            </section>
          )}
        </main>
      </section>
    </div>
  );
}
