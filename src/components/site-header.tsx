import { FormEvent, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApiQuery } from '../hooks/use-api-query';
import { onCartChanged, type Cart } from '../lib/cart';
import { navigationItems } from '../lib/navigation';
import { useAuth } from '../modules/auth/auth-context';

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} VND`;
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="cart-icon-svg">
      <path d="M6.2 6h14.1l-1.7 8.4a2.2 2.2 0 0 1-2.2 1.8H9.2a2.2 2.2 0 0 1-2.1-1.7L4.8 3.8H2.9V2h3.3l.6 2.2h14.9l-.4 1.8H7.2l1.8 8.1c0 .2.2.3.4.3h7.2c.2 0 .4-.1.4-.3L18.2 7.8H6.6L6.2 6Zm3.1 12a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Zm7.5 0a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" />
    </svg>
  );
}

export function SiteHeader() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const cart = useApiQuery<Cart>('/orders/cart', Boolean(session?.accessToken));
  const cartItems = Array.isArray(cart.data?.items) ? cart.data.items : [];
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.unitPriceSnapshot || 0) * Number(item.quantity || 0), 0),
    [cartItems],
  );
  const isAdmin = String(session?.user.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!session?.accessToken) {
      return undefined;
    }

    return onCartChanged(() => {
      void cart.reload();
    });
  }, [cart, session?.accessToken]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = keyword.trim();
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
  }

  return (
    <header className="site-header exclusive-header">
      <div className="top-strip">
        <div className="site-container top-strip-inner">
          <span>Miễn phí kiểm tra nguồn gốc cho offer đã xác thực</span>
          <NavLink to="/products">Mua ngay</NavLink>
          <div className="top-links">
            <span>Tiếng Việt</span>
            <span>Hỗ trợ</span>
          </div>
        </div>
      </div>

      <div className="main-header">
        <div className="site-container main-header-inner">
          <NavLink to="/" className="brand-mark" aria-label="AntiFake Market">
            <span className="brand-cube" aria-hidden="true">
              AF
            </span>
            <span>
              <strong>AntiFake</strong>
              <small>Sàn hàng thật</small>
            </span>
          </NavLink>

          <nav className="desktop-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <form className="icon-search" onSubmit={handleSearch}>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Bạn đang tìm gì?"
                aria-label="Tìm kiếm"
              />
              <button type="submit" aria-label="Tìm kiếm" className="search-icon-button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10.8 4a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6Zm0 1.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm5.6 10.1 3.7 3.7-1.3 1.3-3.7-3.7 1.3-1.3Z" />
                </svg>
              </button>
            </form>

            {session ? (
              <div className="cart-menu">
                <NavLink to="/cart" className="cart-icon-button" aria-label="Giỏ hàng">
                  <CartIcon />
                  <span>{cart.loading ? '...' : cartCount}</span>
                </NavLink>
                <div className="cart-dropdown">
                  <div className="cart-dropdown-head">
                    <strong>Giỏ hàng của bạn</strong>
                    <small>{cartCount ? `${cartCount} sản phẩm` : 'Chưa có sản phẩm nào'}</small>
                  </div>

                  {cartItems.length ? (
                    <>
                      <div className="cart-preview-list">
                        {cartItems.slice(0, 3).map((item) => (
                          <NavLink key={item.id} to="/cart" className="cart-preview-item">
                            <span className="cart-preview-thumb">AF</span>
                            <span>
                              <strong>{item.offerTitleSnapshot}</strong>
                              <small>
                                {item.quantity} x {formatMoney(Number(item.unitPriceSnapshot || 0))}
                              </small>
                            </span>
                          </NavLink>
                        ))}
                      </div>

                      <div className="cart-dropdown-footer">
                        <div>
                          <span>Tạm tính</span>
                          <strong>{formatMoney(cartTotal)}</strong>
                        </div>
                        <div className="cart-dropdown-actions">
                          <NavLink to="/cart" className="secondary-button link-button">
                            Xem giỏ
                          </NavLink>
                          <NavLink to="/orders" className="primary-button link-button">
                            Đơn hàng
                          </NavLink>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">Giỏ hàng đang trống.</div>
                  )}
                </div>
              </div>
            ) : (
              <NavLink to="/auth" className="cart-icon-button" aria-label="Đăng nhập để xem giỏ hàng">
                <CartIcon />
                <span>0</span>
              </NavLink>
            )}

            {session ? (
              <div className="profile-menu">
                <button className="avatar-button" type="button" aria-label="Tài khoản">
                  {String(session.user.displayName || session.user.email || 'U').slice(0, 1).toUpperCase()}
                </button>
                <div className="profile-dropdown">
                  <div className="profile-dropdown-head">
                    <strong>{session.user.displayName || 'Tài khoản'}</strong>
                    <span>{session.user.email || session.user.phone || 'Chưa cập nhật thông tin'}</span>
                  </div>
                  <NavLink to="/user">Thông tin tài khoản</NavLink>
                  {isAdmin ? <NavLink to="/admin">Bảng quản trị</NavLink> : null}
                  <NavLink to="/shops">Cửa hàng của tôi</NavLink>
                  <NavLink to="/orders">Đơn hàng của tôi</NavLink>
                  <NavLink to="/affiliate">Affiliate</NavLink>
                  <button type="button" onClick={() => void logout()}>
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <NavLink to="/auth" className="login-link-button">
                Đăng nhập
              </NavLink>
            )}
          </div>
        </div>
      </div>

      <div className="mobile-nav-wrap">
        <nav className="site-container mobile-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
